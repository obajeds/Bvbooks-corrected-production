import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useBusiness } from "./useBusiness";
import { useBusinessPlan } from "./useFeatureGating";
import { useBranchContext } from "@/contexts/BranchContext";

export interface DiscountPermissions {
  // Rewards redemption (customer-funded)
  canRedeemRewards: boolean;
  
  // Company discount (business-funded)
  canApplyCompanyDiscount: boolean;
  companyDiscountLimit: number; // Percentage limit for company discounts
  
  // Override capability
  canOverrideDiscount: boolean;
  
  // Role info (display only — NOT used for access decisions)
  role: string;
  isOwner: boolean;
  
  // Legacy compatibility
  discountLimit: number;
  canApplyDiscount: boolean;
  
  // Plan gating
  isFreePlan: boolean;
  requiresUpgrade: boolean;
}

export function useDiscountLimit() {
  const { user } = useAuth();
  const { data: business } = useBusiness();
  const { data: planInfo } = useBusinessPlan();
  const { hasPermission } = useBranchContext();

  const isFreePlan = planInfo?.effectivePlan === 'free';

  // Permission checks via BranchContext (respects legacy key bridge + role templates)
  const hasApplyPermission = hasPermission("pos.discount.apply" as any);
  const hasOverridePermission = hasPermission("pos.discount.override" as any);

  return useQuery({
    queryKey: ["discount-limit", user?.id, business?.id, planInfo?.effectivePlan, hasApplyPermission, hasOverridePermission],
    queryFn: async (): Promise<DiscountPermissions> => {
      const defaultPermissions: DiscountPermissions = {
        canRedeemRewards: false,
        canApplyCompanyDiscount: false,
        companyDiscountLimit: 0,
        canOverrideDiscount: false,
        role: "cashier",
        isOwner: false,
        // Legacy
        discountLimit: 0,
        canApplyDiscount: false,
        // Plan gating
        isFreePlan: true,
        requiresUpgrade: true,
      };

      if (!user) return defaultPermissions;

      // Business owners ALWAYS have full discount access regardless of plan
      if (business?.owner_user_id === user.id) {
        return {
          canRedeemRewards: true,
          canApplyCompanyDiscount: true,
          companyDiscountLimit: 100,
          canOverrideDiscount: true,
          role: "owner",
          isOwner: true,
          discountLimit: 100,
          canApplyDiscount: true,
          isFreePlan,
          requiresUpgrade: false,
        };
      }

      // Get staff record
      const { data: staff } = await supabase
        .from("staff")
        .select("id, role, is_active")
        .eq("user_id", user.id)
        .eq("is_active", true)
        .maybeSingle();

      if (!staff) return defaultPermissions;

      // FREE PLAN RESTRICTION: Staff (non-owners) cannot apply company discounts on free plan
      if (isFreePlan) {
        return {
          canRedeemRewards: true,
          canApplyCompanyDiscount: false,
          companyDiscountLimit: 0,
          canOverrideDiscount: false,
          role: staff.role ?? "staff",
          isOwner: false,
          discountLimit: 0,
          canApplyDiscount: false,
          isFreePlan: true,
          requiresUpgrade: false,
        };
      }

      // Get the role template to find discount limit (single source of truth)
      const { data: roleTemplate } = await supabase
        .from("role_templates")
        .select("discount_limit")
        .or(`business_id.eq.${business?.id},business_id.is.null`)
        .eq("name", staff.role.charAt(0).toUpperCase() + staff.role.slice(1))
        .eq("is_active", true)
        .order("business_id", { nullsFirst: false })
        .limit(1)
        .maybeSingle();

      const templateLimit = roleTemplate?.discount_limit ?? 10;

      // PERMISSION-BASED LOGIC: No role-name checks.
      // Access is determined solely by granted permissions.
      const canApplyCompanyDiscount = hasApplyPermission || hasOverridePermission;
      const companyDiscountLimit = canApplyCompanyDiscount ? templateLimit : 0;
      const canOverrideDiscount = hasOverridePermission;

      // All staff can redeem rewards (customer-funded, no business risk)
      const canRedeemRewards = true;

      return {
        canRedeemRewards,
        canApplyCompanyDiscount,
        companyDiscountLimit,
        canOverrideDiscount,
        role: staff.role ?? "staff",
        isOwner: false,
        // Legacy compatibility
        discountLimit: canApplyCompanyDiscount ? companyDiscountLimit : 0,
        canApplyDiscount: canApplyCompanyDiscount,
        // Plan gating
        isFreePlan: false,
        requiresUpgrade: false,
      };
    },
    enabled: !!user,
  });
}
