import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useBusiness } from "./useBusiness";
import { useBusinessPlan, type BVBooksPlan } from "./useFeatureGating";
import type { Database } from "@/integrations/supabase/types";

type SubscriptionPlan = Database["public"]["Enums"]["subscription_plan"];

export type BillingPeriod = 'monthly' | 'quarterly' | 'yearly';

export interface AddonFeature {
  id: string;
  feature_key: string;
  feature_name: string;
  description: string | null;
  price_per_unit: number;
  price_quarterly: number;
  price_yearly: number;
  currency: string;
  billing_period: string;
  is_active: boolean;
  applicable_plans: SubscriptionPlan[];
  created_at: string;
  updated_at: string;
}

export const BILLING_PERIOD_LABELS: Record<BillingPeriod, string> = {
  monthly: 'Monthly',
  quarterly: 'Quarterly (10% off)',
  yearly: 'Yearly (20% off)',
};

export const BILLING_PERIOD_MONTHS: Record<BillingPeriod, number> = {
  monthly: 1,
  quarterly: 3,
  yearly: 12,
};

export interface BusinessAddon {
  id: string;
  business_id: string;
  addon_feature_id: string;
  branch_id: string | null;
  quantity: number;
  status: string;
  start_date: string;
  end_date: string | null;
  billing_period: string | null;
  payment_reference: string | null;
  amount_paid: number;
  created_at: string;
  updated_at: string;
  addon_feature?: AddonFeature;
}

// Hook for fetching all addon features (for super admin)
export function useAddonFeatures() {
  return useQuery({
    queryKey: ["addon-features"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("addon_features")
        .select("*")
        .order("feature_name", { ascending: true });

      if (error) throw error;
      return data as AddonFeature[];
    },
  });
}

// Hook for fetching active addon features (for business owners) - filtered by their plan
export function useActiveAddonFeatures() {
  const { data: business } = useBusiness();
  const { data: planInfo } = useBusinessPlan();
  
  // Map new plan to subscription_plan for addon filtering
  const planMapping: Record<BVBooksPlan, SubscriptionPlan> = {
    free: 'free',
    professional: 'professional',
    enterprise: 'enterprise',
  };
  
  const effectivePlan = planInfo?.effectivePlan || 'free';
  const legacyPlan = planMapping[effectivePlan];
  
  return useQuery({
    queryKey: ["addon-features", "active", effectivePlan],
    queryFn: async () => {
      if (!business) return [];
      
      // Free tier cannot purchase addons
      if (effectivePlan === 'free') {
        return [];
      }
      
      const { data, error } = await supabase
        .from("addon_features")
        .select("*")
        .eq("is_active", true)
        .contains("applicable_plans", [legacyPlan])
        .order("feature_name", { ascending: true });

      if (error) throw error;
      return data as AddonFeature[];
    },
    enabled: !!business && !!planInfo,
  });
}

// Helper function to get price for a billing period
export function getAddonPrice(addon: AddonFeature, period: BillingPeriod): number {
  switch (period) {
    case 'quarterly':
      return addon.price_quarterly || addon.price_per_unit * 3 * 0.9;
    case 'yearly':
      return addon.price_yearly || addon.price_per_unit * 12 * 0.8;
    default:
      return addon.price_per_unit;
  }
}

// Hook for creating addon features (super admin)
export function useCreateAddonFeature() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      feature_key: string;
      feature_name: string;
      description?: string | null;
      price_per_unit: number;
      currency?: string;
      billing_period?: string;
      is_active?: boolean;
      applicable_plans?: SubscriptionPlan[];
    }) => {
      const { data: result, error } = await supabase
        .from("addon_features")
        .insert(data)
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["addon-features"] });
    },
  });
}

// Hook for updating addon features (super admin)
export function useUpdateAddonFeature() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...data }: {
      id: string;
      feature_key?: string;
      feature_name?: string;
      description?: string | null;
      price_per_unit?: number;
      price_quarterly?: number;
      price_yearly?: number;
      currency?: string;
      billing_period?: string;
      is_active?: boolean;
      applicable_plans?: SubscriptionPlan[];
    }) => {
      const { data: result, error } = await supabase
        .from("addon_features")
        .update(data)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["addon-features"] });
    },
  });
}

// Hook for deleting addon features (super admin)
export function useDeleteAddonFeature() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("addon_features").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["addon-features"] });
    },
  });
}

// Hook for fetching business addons
export function useBusinessAddons(businessId?: string) {
  return useQuery({
    queryKey: ["business-addons", businessId],
    queryFn: async () => {
      if (!businessId) return [];
      
      const { data, error } = await supabase
        .from("business_addons")
        .select("*, addon_feature:addon_features(*)")
        .eq("business_id", businessId)
        .eq("status", "active");

      if (error) throw error;
      return data as (BusinessAddon & { addon_feature: AddonFeature })[];
    },
    enabled: !!businessId,
  });
}

// Hook to calculate branch limit based on plan + addons
export function useBranchLimit() {
  const { data: business } = useBusiness();
  const { data: planInfo } = useBusinessPlan();
  const { data: addons } = useBusinessAddons(business?.id);

  // Use the new current_plan via useBusinessPlan for proper limits
  const baseLimits: Record<BVBooksPlan, number> = {
    free: 1,
    professional: 2,
    enterprise: 3, // Limited to 3, can purchase add-ons for more
  };

  const effectivePlan = planInfo?.effectivePlan || 'free';
  const baseLimit = planInfo?.planLimits?.max_branches ?? baseLimits[effectivePlan] ?? 1;

  // Count extra branches from addons
  const extraBranches = addons?.reduce((acc, addon) => {
    if (addon.addon_feature?.feature_key === "extra_branch") {
      return acc + addon.quantity;
    }
    return acc;
  }, 0) || 0;

  return {
    baseLimit,
    extraBranches,
    totalLimit: baseLimit + extraBranches,
    plan: effectivePlan,
    isUnlimited: false, // No plan has unlimited branches anymore
  };
}

// Hook to check if business has email notifications addon
export function useHasEmailAddon() {
  const { data: business } = useBusiness();
  const { data: addons, isLoading } = useBusinessAddons(business?.id);

  const hasEmailAddon = addons?.some(
    addon => addon.addon_feature?.feature_key === "email_notifications"
  ) || false;

  return {
    hasEmailAddon,
    isLoading,
  };
}

// Hook for purchasing an addon
export function usePurchaseAddon() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      businessId, 
      addonFeatureId, 
      quantity = 1,
      paymentReference,
      amountPaid,
    }: { 
      businessId: string; 
      addonFeatureId: string;
      quantity?: number;
      paymentReference?: string;
      amountPaid: number;
    }) => {
      // Check if addon already exists for this business
      const { data: existing } = await supabase
        .from("business_addons")
        .select("*")
        .eq("business_id", businessId)
        .eq("addon_feature_id", addonFeatureId)
        .eq("status", "active")
        .maybeSingle();

      if (existing) {
        // Update quantity
        const { data, error } = await supabase
          .from("business_addons")
          .update({ 
            quantity: existing.quantity + quantity,
            amount_paid: existing.amount_paid + amountPaid,
          })
          .eq("id", existing.id)
          .select()
          .single();

        if (error) throw error;
        return data;
      }

      // Create new addon subscription
      const { data, error } = await supabase
        .from("business_addons")
        .insert({
          business_id: businessId,
          addon_feature_id: addonFeatureId,
          quantity,
          payment_reference: paymentReference,
          amount_paid: amountPaid,
          status: "active",
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["business-addons"] });
    },
  });
}
