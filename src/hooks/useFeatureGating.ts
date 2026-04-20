import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useBusiness } from "./useBusiness";
import {
  BASE_BRANCH_LIMITS,
  BASE_STAFF_LIMITS,
  MAX_BRANCH_ADDONS,
  ADDON_STAFF_PER_BRANCH,
  ADDONS_ALLOWED,
  STAFF_PER_BRANCH_RATIO,
  calculateCapacity,
} from "@/lib/subscriptionCapacity";
import { 
  usePlatformFeatures, 
  usePlatformFeatureEnabled,
  usePlatformFeaturesByCategory,
  type PlatformFeature 
} from "./usePlatformFeatures";

// Re-export platform features hook for backward compatibility
export { 
  usePlatformFeatures, 
  usePlatformFeatureEnabled,
  usePlatformFeaturesByCategory,
  type PlatformFeature 
};

// Only 3 distinct plans: Free, Professional, Enterprise
export type BVBooksPlan = 'free' | 'professional' | 'enterprise';

export interface PlanFeature {
  id: string;
  plan: BVBooksPlan;
  feature_key: string;
  feature_name: string;
  category: string;
  is_enabled: boolean;
  limits: Record<string, unknown>;
  description: string | null;
}

export interface PlanLimit {
  id: string;
  plan: BVBooksPlan;
  max_branches: number;
  max_staff: number;
  max_products: number | null;
  trial_days: number | null;
  description: string | null;
  monthly_price: number;
  currency: string;
}

export interface BusinessPlanInfo {
  currentPlan: BVBooksPlan;
  trialEndsAt: string | null;
  isTrialExpired: boolean;
  effectivePlan: BVBooksPlan;
  planLimits: PlanLimit | null;
}

// Normalize plan from database
function normalizePlan(dbPlan: string | null): BVBooksPlan {
  if (!dbPlan) return 'free';
  if (dbPlan === 'professional' || dbPlan === 'basic') return 'professional';
  if (dbPlan === 'enterprise' || dbPlan === 'premium') return 'enterprise';
  return 'free';
}

// Get current business plan info
export function useBusinessPlan() {
  const { data: business } = useBusiness();

  return useQuery({
    queryKey: ["business-plan", business?.id],
    queryFn: async (): Promise<BusinessPlanInfo | null> => {
      if (!business?.id) return null;

      // Get business plan info - use subscription_plan as source of truth
      const { data: businessData, error: businessError } = await supabase
        .from("businesses")
        .select("subscription_plan, current_plan, trial_started_at, trial_ends_at, plan_started_at, plan_expires_at")
        .eq("id", business.id)
        .maybeSingle();

      if (businessError) {
        console.error("Error fetching business plan:", businessError);
        return null;
      }

      // Normalize: use subscription_plan as source of truth, fallback to current_plan
      // Treat 'starter' and 'trial' as 'free'
      const rawPlan = businessData?.subscription_plan || businessData?.current_plan;
      const currentPlan = normalizePlan(rawPlan);
      const trialEndsAt = businessData?.trial_ends_at;
      const isTrialExpired = false; // No longer relevant since trial = free
      const effectivePlan = currentPlan;

      // Get plan limits
      const { data: limitsData } = await supabase
        .from("plan_limits")
        .select("*")
        .eq("plan", effectivePlan)
        .single();

      return {
        currentPlan,
        trialEndsAt,
        isTrialExpired,
        effectivePlan,
        planLimits: limitsData as PlanLimit | null,
      };
    },
    enabled: !!business?.id,
  });
}

// Get all features for the current plan
export function usePlanFeatures() {
  const { data: planInfo } = useBusinessPlan();

  return useQuery({
    queryKey: ["plan-features", planInfo?.effectivePlan],
    queryFn: async (): Promise<PlanFeature[]> => {
      if (!planInfo?.effectivePlan) return [];

      const { data, error } = await supabase
        .from("plan_features")
        .select("*")
        .eq("plan", planInfo.effectivePlan);

      if (error) throw error;
      return (data || []) as PlanFeature[];
    },
    enabled: !!planInfo?.effectivePlan,
  });
}

// Note: usePlatformFeatures is now imported from ./usePlatformFeatures with real-time sync
// The export at the top of this file re-exports it for backward compatibility

// Get business-specific overrides
export function useBusinessOverrides() {
  const { data: business } = useBusiness();

  return useQuery({
    queryKey: ["business-overrides", business?.id],
    queryFn: async () => {
      if (!business?.id) return [];

      const { data, error } = await supabase
        .from("business_plan_overrides")
        .select("*")
        .eq("business_id", business.id)
        .or("expires_at.is.null,expires_at.gt.now()");

      if (error) throw error;
      return data || [];
    },
    enabled: !!business?.id,
  });
}

// Main hook to check if a feature is enabled
export function useFeatureEnabled(featureKey: string): {
  isEnabled: boolean;
  isLoading: boolean;
  limits: Record<string, unknown>;
  requiresUpgrade: boolean;
  availableInPlan: BVBooksPlan | null;
} {
  const { data: planInfo, isLoading: planLoading } = useBusinessPlan();
  const { data: features = [], isLoading: featuresLoading } = usePlanFeatures();
  const { data: overrides = [], isLoading: overridesLoading } = useBusinessOverrides();
  const { data: platformFeatures = [], isLoading: platformLoading } = usePlatformFeatures();

  const isLoading = planLoading || featuresLoading || overridesLoading || platformLoading;

  // Check platform feature first (super admin global toggle)
  const platformFeature = platformFeatures.find((p) => p.feature_key === featureKey);
  if (platformFeature && !platformFeature.is_enabled) {
    // Platform-wide disabled - completely hidden
    return {
      isEnabled: false,
      isLoading,
      limits: {},
      requiresUpgrade: false,
      availableInPlan: null,
    };
  }

  // Check business-specific override
  const override = overrides.find((o) => o.feature_key === featureKey);
  if (override) {
    return {
      isEnabled: override.is_enabled,
      isLoading,
      limits: (override.override_limits as Record<string, unknown>) || {},
      requiresUpgrade: false,
      availableInPlan: null,
    };
  }

  // Check plan features
  const feature = features.find((f) => f.feature_key === featureKey);
  const isEnabled = feature?.is_enabled ?? false;
  const limits = (feature?.limits as Record<string, unknown>) || {};

  // Find which plan has this feature enabled for upgrade prompts
  let availableInPlan: BVBooksPlan | null = null;
  if (!isEnabled) {
    const planOrder: BVBooksPlan[] = ['free', 'professional', 'enterprise'];
    const currentIndex = planOrder.indexOf(planInfo?.effectivePlan || 'free');
    for (let i = currentIndex + 1; i < planOrder.length; i++) {
      availableInPlan = planOrder[i];
      break;
    }
  }

  return {
    isEnabled,
    isLoading,
    limits,
    requiresUpgrade: !isEnabled && availableInPlan !== null,
    availableInPlan,
  };
}

// Hook to check branch limits with full capacity info
export function useBranchLimits() {
  const { data: business } = useBusiness();
  const { data: planInfo } = useBusinessPlan();

  return useQuery({
    queryKey: ["branch-limits", business?.id, planInfo?.effectivePlan],
    queryFn: async () => {
      if (!business?.id || !planInfo?.effectivePlan) {
        return { 
          currentBranches: 0, 
          maxBranches: 1, 
          canAddBranch: false, 
          addonBranches: 0,
          maxAddonBranches: 0,
          remainingAddonSlots: 0,
          addonsAllowed: false,
          baseBranches: 1,
        };
      }

      const plan = planInfo.effectivePlan;

      // Count current branches
      const { count: branchCount } = await supabase
        .from("branches")
        .select("*", { count: "exact", head: true })
        .eq("business_id", business.id)
        .eq("is_active", true);

      // Get addon branches
      const { data: addons } = await supabase
        .from("business_addons")
        .select(`
          quantity,
          addon_features!inner(feature_key)
        `)
        .eq("business_id", business.id)
        .eq("status", "active");

      const addonBranches = (addons || [])
        .filter((a: { addon_features: { feature_key: string } }) => 
          a.addon_features?.feature_key === "extra_branch"
        )
        .reduce((sum: number, a: { quantity: number }) => sum + (a.quantity || 0), 0);

      // Use centralized capacity constants
      const baseBranches = BASE_BRANCH_LIMITS[plan];
      const maxAddonBranches = MAX_BRANCH_ADDONS[plan];
      const remainingAddonSlots = Math.max(0, maxAddonBranches - addonBranches);
      const addonsAllowed = ADDONS_ALLOWED[plan];
      
      const maxBranches = baseBranches + addonBranches;
      const currentBranches = branchCount || 0;

      return {
        currentBranches,
        maxBranches,
        canAddBranch: currentBranches < maxBranches,
        addonBranches,
        baseBranches,
        maxAddonBranches,
        remainingAddonSlots,
        addonsAllowed,
        // Can buy addon if: addons are allowed AND still have addon slots
        canBuyAddon: addonsAllowed && remainingAddonSlots > 0,
        // Usage warning at 80%
        usagePercent: maxBranches > 0 ? (currentBranches / maxBranches) * 100 : 0,
      };
    },
    enabled: !!business?.id && !!planInfo?.effectivePlan,
  });
}

// Hook to check staff limits with full capacity info
export function useStaffLimits() {
  const { data: business } = useBusiness();
  const { data: planInfo } = useBusinessPlan();

  return useQuery({
    queryKey: ["staff-limits", business?.id, planInfo?.effectivePlan],
    queryFn: async () => {
      if (!business?.id || !planInfo?.effectivePlan) {
        return { 
          currentStaff: 0, 
          maxStaff: 2, 
          canAddStaff: false, 
          addonStaff: 0, 
          branchBonusStaff: 0,
          baseStaff: 2,
          addonsAllowed: false,
        };
      }

      const plan = planInfo.effectivePlan;

      // Get business owner user_id to exclude from staff count
      const { data: businessData } = await supabase
        .from("businesses")
        .select("owner_user_id")
        .eq("id", business.id)
        .single();

      const ownerUserId = businessData?.owner_user_id;

      // Count current staff, excluding the business owner by user_id AND role
      let staffQuery = supabase
        .from("staff")
        .select("*", { count: "exact", head: true })
        .eq("business_id", business.id)
        .eq("is_active", true)
        .neq("role", "owner"); // Always exclude owner role

      if (ownerUserId) {
        staffQuery = staffQuery.neq("user_id", ownerUserId);
      }

      const { count: staffCount } = await staffQuery;

      // Get all addons
      const { data: addons } = await supabase
        .from("business_addons")
        .select(`
          quantity,
          addon_features!inner(feature_key)
        `)
        .eq("business_id", business.id)
        .eq("status", "active");

      // Count direct staff add-ons (if any exist in future)
      const directAddonStaff = (addons || [])
        .filter((a: { addon_features: { feature_key: string } }) => 
          a.addon_features?.feature_key === "extra_staff"
        )
        .reduce((sum: number, a: { quantity: number }) => sum + (a.quantity || 0), 0);

      // Count branch add-ons - each branch add-on gives fixed +2 staff
      const addonBranches = (addons || [])
        .filter((a: { addon_features: { feature_key: string } }) => 
          a.addon_features?.feature_key === "extra_branch"
        )
        .reduce((sum: number, a: { quantity: number }) => sum + (a.quantity || 0), 0);
      
      // Use centralized capacity constants
      const baseStaff = BASE_STAFF_LIMITS[plan];
      const branchBonusStaff = addonBranches * ADDON_STAFF_PER_BRANCH;
      const addonStaff = directAddonStaff + branchBonusStaff;
      const addonsAllowed = ADDONS_ALLOWED[plan];

      const maxStaff = baseStaff + addonStaff;
      const currentStaff = staffCount || 0;

      return {
        currentStaff,
        maxStaff,
        canAddStaff: currentStaff < maxStaff,
        addonStaff,
        branchBonusStaff,
        baseStaff,
        addonsAllowed,
        // Usage warning at 80%
        usagePercent: maxStaff > 0 ? (currentStaff / maxStaff) * 100 : 0,
      };
    },
    enabled: !!business?.id && !!planInfo?.effectivePlan,
  });
}

// Combined hook for full capacity info
export function useCapacityInfo() {
  const { data: business } = useBusiness();
  const { data: planInfo } = useBusinessPlan();
  const { data: branchLimits, isLoading: branchLoading } = useBranchLimits();
  const { data: staffLimits, isLoading: staffLoading } = useStaffLimits();

  const isLoading = branchLoading || staffLoading;
  const plan = planInfo?.effectivePlan || 'free';

  if (!branchLimits || !staffLimits) {
    return {
      isLoading,
      capacity: calculateCapacity(plan, 0, 0, 0),
      plan,
    };
  }

  const capacity = calculateCapacity(
    plan,
    branchLimits.currentBranches,
    staffLimits.currentStaff,
    branchLimits.addonBranches
  );

  return {
    isLoading,
    capacity,
    plan,
    businessId: business?.id,
  };
}

// Hook to get all plan limits for display
export function useAllPlanLimits() {
  return useQuery({
    queryKey: ["all-plan-limits"],
    queryFn: async (): Promise<PlanLimit[]> => {
      const { data, error } = await supabase
        .from("plan_limits")
        .select("*")
        .order("monthly_price");

      if (error) throw error;
      return (data || []) as PlanLimit[];
    },
  });
}

// Feature categories for UI grouping
export const FEATURE_CATEGORIES = [
  'Sales',
  'Stock Control',
  'Customers',
  'Team Activity',
  'Expenses',
  'Accounting',
  'Business Insights',
  'Approvals',
  'Notifications',
  'Activity Log',
  'Settings',
] as const;

// Map features to sidebar items for visibility control
export const SIDEBAR_FEATURE_MAP: Record<string, string[]> = {
  '/': ['insights.daily_snapshot'],
  '/pos': ['sales.create'],
  '/sales': ['sales.create'],
  '/inventory': ['stock.in_out'],
  '/inventory/items': ['stock.in_out'],
  '/inventory/stock': ['stock.in_out'],
  '/inventory/adjustments': ['stock.adjustments'],
  '/inventory/categories': ['stock.in_out'],
  '/inventory/suppliers': ['stock.in_out'],
  '/inventory/purchase-orders': ['stock.in_out'],
  '/crm': ['customers.list'],
  '/expenses': ['expenses.recording'],
  '/accounting': ['accounting.sales_summary'],
  '/reports': ['accounting.profit_loss'],
  '/staff': ['team.basic_accounts'],
  '/approvals': ['approvals.stock', 'approvals.discount', 'approvals.refund', 'approvals.expense'],
  '/activity': ['activity.sales_stock'],
  '/notifications': ['notifications.in_app'],
  '/settings': ['settings.business_profile'],
  '/hrm/attendance': ['team.advanced_roles'],
  '/hrm/departments': ['team.advanced_roles'],
  '/hrm/leave': ['team.advanced_roles'],
  '/hrm/payroll': ['team.advanced_roles'],
};

// Helper to check if any feature in a list is enabled
export function useAnyFeatureEnabled(featureKeys: string[]): boolean {
  const { data: features = [] } = usePlanFeatures();
  const { data: overrides = [] } = useBusinessOverrides();
  const { data: platformFeatures = [] } = usePlatformFeatures();

  for (const key of featureKeys) {
    // Check platform toggle first (super admin)
    const platformFeature = platformFeatures.find((p) => p.feature_key === key);
    if (platformFeature && !platformFeature.is_enabled) continue;
    
    const override = overrides.find((o) => o.feature_key === key);
    if (override?.is_enabled) return true;
    
    const feature = features.find((f) => f.feature_key === key);
    if (feature?.is_enabled) return true;
  }

  return false;
}
