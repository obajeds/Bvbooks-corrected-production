import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { Tables, TablesInsert } from "@/integrations/supabase/types";

type Business = Tables<"businesses">;

const CACHE_KEY = 'cached_business';

interface CachedBusinessData {
  data: Business | null;
  timestamp: number;
  userId?: string;
}

function getCachedBusiness(userId?: string, allowStale: boolean = false): Business | null {
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (!cached) return null;
    const parsed: CachedBusinessData = JSON.parse(cached);
    
    if (userId && parsed.userId && parsed.userId !== userId) {
      localStorage.removeItem(CACHE_KEY);
      return null;
    }
    
    if (!parsed.data) return null;
    
    const maxAge = allowStale ? 24 * 60 * 60 * 1000 : 30 * 60 * 1000;
    if (Date.now() - parsed.timestamp > maxAge) return null;
    
    return parsed.data;
  } catch {
    return null;
  }
}

function setCachedBusiness(data: Business | null, userId?: string) {
  try {
    // NEVER cache null — only cache positive results
    if (!data) return;
    const cacheData: CachedBusinessData = { data, timestamp: Date.now(), userId };
    localStorage.setItem(CACHE_KEY, JSON.stringify(cacheData));
  } catch {
    // localStorage might be full or unavailable
  }
}

/**
 * Primary business resolution using the security-definer RPC.
 * This bypasses RLS timing issues since it runs as definer.
 */
async function resolveBusinessViaRPC(): Promise<Business | null> {
  const { data: businessId, error: rpcError } = await supabase
    .rpc('get_user_accessible_business_id');
  
  if (rpcError) {
    console.warn('[useBusiness] RPC lookup failed:', rpcError.message);
    return null;
  }
  
  if (!businessId) return null;
  
  const { data: business, error: fetchError } = await supabase
    .from("businesses")
    .select("*")
    .eq("id", businessId)
    .maybeSingle();
  
  if (fetchError) {
    console.warn('[useBusiness] Business fetch after RPC failed:', fetchError.message);
    return null;
  }
  
  return business;
}

/**
 * Fallback: direct table queries (owner then staff).
 */
async function resolveBusinessDirect(userId: string): Promise<Business | null> {
  // Check owner
  const { data: ownedBusiness, error: ownerError } = await supabase
    .from("businesses")
    .select("*")
    .eq("owner_user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (ownerError) {
    if (ownerError.message?.includes('fetch') || ownerError.message?.includes('network')) {
      const cached = getCachedBusiness(userId);
      if (cached) return cached;
    }
    throw ownerError;
  }
  if (ownedBusiness) return ownedBusiness;

  // Check staff
  const { data: staffRecord, error: staffError } = await supabase
    .from("staff")
    .select("business_id")
    .eq("user_id", userId)
    .eq("is_active", true)
    .limit(1)
    .maybeSingle();

  if (staffError) {
    if (staffError.message?.includes('fetch') || staffError.message?.includes('network')) {
      const cached = getCachedBusiness(userId);
      if (cached) return cached;
    }
    throw staffError;
  }
  
  if (staffRecord?.business_id) {
    const { data: staffBusiness, error: businessError } = await supabase
      .from("businesses")
      .select("*")
      .eq("id", staffRecord.business_id)
      .maybeSingle();

    if (businessError) {
      if (businessError.message?.includes('fetch') || businessError.message?.includes('network')) {
        const cached = getCachedBusiness(userId);
        if (cached) return cached;
      }
      throw businessError;
    }
    return staffBusiness;
  }

  return null;
}

/**
 * Resolve business with bounded retry for fresh sessions.
 * On first null result, waits briefly and retries via RPC once more
 * to handle RLS propagation delays after login.
 */
async function resolveBusinessWithRetry(userId: string): Promise<Business | null> {
  // If offline, return cached immediately
  if (!navigator.onLine) {
    return getCachedBusiness(userId) || null;
  }

  // Primary: use security-definer RPC (immune to RLS timing)
  let business = await resolveBusinessViaRPC();
  
  if (business) {
    setCachedBusiness(business, userId);
    return business;
  }

  // If RPC returned null, it could be a genuine new user OR a propagation delay.
  // Check if this is a fresh sign-in (within last 10 seconds).
  const isFreshLogin = isRecentSignIn();
  
  if (isFreshLogin) {
    // Wait for RLS/auth to settle, then retry once
    await new Promise(r => setTimeout(r, 1500));
    business = await resolveBusinessViaRPC();
    if (business) {
      setCachedBusiness(business, userId);
      return business;
    }
    
    // Final fallback: try direct queries
    business = await resolveBusinessDirect(userId);
    if (business) {
      setCachedBusiness(business, userId);
      return business;
    }
  }

  // Truly no business found
  return null;
}

/** Check if user signed in within the last 10 seconds */
function isRecentSignIn(): boolean {
  const ts = sessionStorage.getItem('last_signin_timestamp');
  if (!ts) return false;
  return Date.now() - Number(ts) < 10_000;
}

export function useBusiness() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["business", user?.id],
    queryFn: async (): Promise<Business | null> => {
      if (!user) return null;
      return resolveBusinessWithRetry(user.id);
    },
    enabled: !!user,
    placeholderData: () => user ? getCachedBusiness(user.id, true) : null,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: () => navigator.onLine,
    retry: (failureCount) => {
      if (!navigator.onLine) return false;
      return failureCount < 2;
    },
    retryDelay: (attemptIndex) => Math.min(1000 * (attemptIndex + 1), 3000),
  });
}

export function useCreateBusiness() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (data: {
      trading_name: string;
      legal_name: string;
      category?: string;
      phone?: string;
      address?: string;
      description?: string;
      branch_name?: string;
      branch_address?: string;
      branch_phone?: string;
    }) => {
      if (!user) throw new Error("Not authenticated");

      const { data: existingBusiness, error: checkError } = await supabase
        .from("businesses")
        .select("id, trading_name")
        .eq("owner_user_id", user.id)
        .limit(1)
        .maybeSingle();

      if (checkError) throw checkError;

      if (existingBusiness) {
        throw new Error(`You already have a registered business: "${existingBusiness.trading_name}". Each account can only have one business.`);
      }

      const businessData: TablesInsert<"businesses"> = {
        trading_name: data.trading_name,
        legal_name: data.legal_name,
        category: data.category || "Retail",
        phone: data.phone || null,
        address: data.address || null,
        owner_user_id: user.id,
        owner_name: user.user_metadata?.full_name || user.email?.split("@")[0] || "Owner",
        owner_email: user.email || "",
      };

      const { data: business, error } = await supabase
        .from("businesses")
        .insert(businessData)
        .select()
        .single();

      if (error) throw error;

      if (business) {
        const branchData: TablesInsert<"branches"> = {
          business_id: business.id,
          name: data.branch_name || "Main Branch",
          address: data.branch_address || data.address || null,
          phone: data.branch_phone || data.phone || null,
          is_main: true,
          is_active: true,
        };

        const { error: branchError } = await supabase
          .from("branches")
          .insert(branchData);

        if (branchError) {
          console.error("Failed to create branch:", branchError);
        }
      }

      return business;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["business"] });
      queryClient.invalidateQueries({ queryKey: ["branches"] });
    },
  });
}

export function useUpdateBusiness() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...data }: Partial<Business> & { id: string }) => {
      const { data: business, error } = await supabase
        .from("businesses")
        .update(data)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return business;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["business"] });
    },
  });
}
