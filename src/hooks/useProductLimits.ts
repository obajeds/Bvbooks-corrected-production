import { useQuery } from "@tanstack/react-query";
import { useBusiness } from "./useBusiness";
import { useBusinessPlan, type BVBooksPlan } from "./useFeatureGating";
import { supabase } from "@/integrations/supabase/client";

const PRODUCT_LIMITS: Record<BVBooksPlan, number> = {
  free: 50,
  professional: 500,
  enterprise: Infinity,
};

export function getProductLimit(plan: BVBooksPlan | undefined): number {
  if (!plan) return 50;
  return PRODUCT_LIMITS[plan] ?? 50;
}

export function useProductLimits() {
  const { data: business, isLoading: businessLoading } = useBusiness();
  const { data: planInfo, isLoading: planLoading } = useBusinessPlan();

  const { data: productCount = 0, isLoading: countLoading } = useQuery({
    queryKey: ["product-count", business?.id],
    queryFn: async () => {
      if (!business?.id) return 0;

      const { count, error } = await supabase
        .from("products")
        .select("*", { count: "exact", head: true })
        .eq("business_id", business.id);

      if (error) throw error;
      return count || 0;
    },
    enabled: !!business?.id,
  });

  // Use effectivePlan from the new plan system
  const effectivePlan = planInfo?.effectivePlan || 'free';
  // Use limit from database if available, otherwise fall back to hardcoded limits
  const limit = planInfo?.planLimits?.max_products ?? getProductLimit(effectivePlan);
  const canAddProducts = limit === null || productCount < limit;
  const remainingProducts = limit === null ? Infinity : Math.max(0, limit - productCount);
  const isAtLimit = limit !== null && productCount >= limit;
  const isNearLimit = limit !== null && limit !== Infinity && productCount >= limit * 0.8;

  return {
    productCount,
    limit: limit ?? Infinity,
    canAddProducts,
    remainingProducts,
    isAtLimit,
    isNearLimit,
    plan: effectivePlan,
    isLoading: businessLoading || countLoading || planLoading,
  };
}
