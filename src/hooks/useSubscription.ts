import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

export type SubscriptionTier = "free" | "professional" | "enterprise";

interface Subscription {
  id: string;
  tier: SubscriptionTier;
  status: string;
  plan_started_at: string | null;
  plan_expires_at: string | null;
}

interface SubscriptionData {
  subscription: Subscription | null;
}

const BRANCH_LIMITS: Record<SubscriptionTier, number> = {
  free: 1,
  professional: 10,
  enterprise: Infinity,
};

export function getBranchLimit(tier: SubscriptionTier | undefined): number {
  if (!tier) return 1;
  return BRANCH_LIMITS[tier] || 1;
}

export function useBusinessSubscription() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["business-subscription", user?.id],
    queryFn: async (): Promise<SubscriptionData> => {
      if (!user) return { subscription: null };

      // First check if user owns a business
      const { data: ownedBusiness } = await supabase
        .from("businesses")
        .select("id, subscription_plan, current_plan, account_status, plan_started_at, plan_expires_at, subscription_expiry")
        .eq("owner_user_id", user.id)
        .maybeSingle();

      if (ownedBusiness) {
        // Use plan_expires_at first, fallback to subscription_expiry for backwards compatibility
        const expiryDate = ownedBusiness.plan_expires_at || ownedBusiness.subscription_expiry;
        // Use subscription_plan as source of truth, fallback to current_plan
        const rawPlan = ownedBusiness.subscription_plan || ownedBusiness.current_plan;
        // Normalize 'trial' to 'free' for consistent handling
        const normalizedTier = (rawPlan as string) === 'trial'
          ? 'free'
          : (rawPlan as SubscriptionTier) || "free";
        return {
          subscription: {
            id: ownedBusiness.id,
            tier: normalizedTier,
            status: ownedBusiness.account_status || "active",
            plan_started_at: ownedBusiness.plan_started_at,
            plan_expires_at: expiryDate,
          },
        };
      }

      // Check if user is staff of a business
      const { data: staffRecord } = await supabase
        .from("staff")
        .select("business_id, businesses(id, subscription_plan, current_plan, account_status, plan_started_at, plan_expires_at, subscription_expiry)")
        .eq("user_id", user.id)
        .eq("is_active", true)
        .maybeSingle();

      if (staffRecord?.businesses) {
        const business = staffRecord.businesses as any;
        // Use plan_expires_at first, fallback to subscription_expiry for backwards compatibility
        const expiryDate = business.plan_expires_at || business.subscription_expiry;
        // Use subscription_plan as source of truth, fallback to current_plan
        const rawPlan = business.subscription_plan || business.current_plan;
        // Normalize 'trial' to 'free' for consistent handling
        const normalizedTier = (rawPlan as string) === 'trial'
          ? 'free'
          : (rawPlan as SubscriptionTier) || "free";
        return {
          subscription: {
            id: business.id,
            tier: normalizedTier,
            status: business.account_status || "active",
            plan_started_at: business.plan_started_at,
            plan_expires_at: expiryDate,
          },
        };
      }

      return { subscription: null };
    },
    enabled: !!user,
  });
}
