import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useBusiness } from "./useBusiness";
import { useBusinessPlan, type BVBooksPlan } from "./useFeatureGating";
import {
  STAFF_PER_BRANCH_RATIO,
  ADDON_STAFF_PER_BRANCH,
  calculateBranchCapacity,
  type BranchCapacityInfo,
} from "@/lib/subscriptionCapacity";

interface BranchAddonInfo {
  branchId: string;
  hasAddon: boolean;
  addonQuantity: number;
}

/**
 * Get all branch add-ons for the business (scoped by branch)
 */
export function useBranchAddons() {
  const { data: business } = useBusiness();

  return useQuery({
    queryKey: ["branch-addons", business?.id],
    queryFn: async (): Promise<BranchAddonInfo[]> => {
      if (!business?.id) return [];

      const { data, error } = await supabase
        .from("business_addons")
        .select(`
          branch_id,
          quantity,
          addon_features!inner(feature_key)
        `)
        .eq("business_id", business.id)
        .eq("status", "active")
        .not("branch_id", "is", null);

      if (error) throw error;

      // Group by branch
      const branchAddons = (data || [])
        .filter((a: { addon_features: { feature_key: string } }) => 
          a.addon_features?.feature_key === "extra_branch"
        )
        .reduce((acc: Map<string, number>, addon: { branch_id: string; quantity: number }) => {
          const current = acc.get(addon.branch_id) || 0;
          acc.set(addon.branch_id, current + addon.quantity);
          return acc;
        }, new Map<string, number>());

      return Array.from(branchAddons.entries()).map(([branchId, quantity]) => ({
        branchId,
        hasAddon: quantity > 0,
        addonQuantity: quantity,
      }));
    },
    enabled: !!business?.id,
  });
}

/**
 * Get staff capacity for a specific branch
 */
export function useBranchStaffCapacity(branchId: string | null) {
  const { data: business } = useBusiness();
  const { data: planInfo } = useBusinessPlan();
  const { data: branchAddons = [] } = useBranchAddons();

  return useQuery({
    queryKey: ["branch-staff-capacity", branchId, planInfo?.effectivePlan],
    queryFn: async (): Promise<BranchCapacityInfo | null> => {
      if (!branchId || !business?.id || !planInfo?.effectivePlan) return null;

      const plan = planInfo.effectivePlan;

      // Get branch name
      const { data: branch } = await supabase
        .from("branches")
        .select("name")
        .eq("id", branchId)
        .single();

      if (!branch) return null;

      // Get business owner to exclude
      const { data: businessData } = await supabase
        .from("businesses")
        .select("owner_user_id")
        .eq("id", business.id)
        .single();

      const ownerUserId = businessData?.owner_user_id;

      // Check if this branch has an add-on
      const branchAddon = branchAddons.find((a) => a.branchId === branchId);
      const hasAddon = branchAddon?.hasAddon || false;

      // Count staff in this specific branch (via branch assignments)
      let staffQuery = supabase
        .from("staff_branch_assignments")
        .select(`
          staff_id,
          staff!inner(id, user_id, role, is_active)
        `, { count: "exact", head: true })
        .eq("branch_id", branchId)
        .eq("is_active", true)
        .eq("staff.is_active", true)
        .neq("staff.role", "owner");

      const { count: staffCount } = await staffQuery;

      // If no branch assignments found, try counting staff directly assigned to business
      // (fallback for legacy data)
      let currentStaff = staffCount || 0;
      if (currentStaff === 0) {
        // Fallback: count active staff in business (divided evenly would be an option,
        // but for now we'll just show 0 for branches without assignments)
      }

      return calculateBranchCapacity(
        plan,
        branchId,
        branch.name,
        currentStaff,
        hasAddon
      );
    },
    enabled: !!branchId && !!business?.id && !!planInfo?.effectivePlan,
  });
}

/**
 * Get staff capacity for all branches in the business
 */
export function useAllBranchCapacities() {
  const { data: business } = useBusiness();
  const { data: planInfo } = useBusinessPlan();
  const { data: branchAddons = [] } = useBranchAddons();

  return useQuery({
    queryKey: ["all-branch-capacities", business?.id, planInfo?.effectivePlan],
    queryFn: async (): Promise<BranchCapacityInfo[]> => {
      if (!business?.id || !planInfo?.effectivePlan) return [];

      const plan = planInfo.effectivePlan;

      // Get all active branches
      const { data: branches, error: branchError } = await supabase
        .from("branches")
        .select("id, name")
        .eq("business_id", business.id)
        .eq("is_active", true);

      if (branchError || !branches) return [];

      // Get business owner to exclude
      const { data: businessData } = await supabase
        .from("businesses")
        .select("owner_user_id")
        .eq("id", business.id)
        .single();

      const ownerUserId = businessData?.owner_user_id;

      // Get staff counts per branch via assignments
      const { data: assignments } = await supabase
        .from("staff_branch_assignments")
        .select(`
          branch_id,
          staff!inner(id, user_id, role, is_active)
        `)
        .eq("is_active", true)
        .eq("staff.is_active", true)
        .neq("staff.role", "owner");

      // Count staff per branch
      const staffCounts = (assignments || []).reduce((acc: Map<string, number>, a: { 
        branch_id: string; 
        staff: { user_id: string | null } 
      }) => {
        // Skip if this is the owner
        if (ownerUserId && a.staff?.user_id === ownerUserId) return acc;
        
        const current = acc.get(a.branch_id) || 0;
        acc.set(a.branch_id, current + 1);
        return acc;
      }, new Map<string, number>());

      // Calculate capacity for each branch
      return branches.map((branch) => {
        const branchAddon = branchAddons.find((a) => a.branchId === branch.id);
        const hasAddon = branchAddon?.hasAddon || false;
        const currentStaff = staffCounts.get(branch.id) || 0;

        return calculateBranchCapacity(
          plan,
          branch.id,
          branch.name,
          currentStaff,
          hasAddon
        );
      });
    },
    enabled: !!business?.id && !!planInfo?.effectivePlan,
  });
}

/**
 * Check if staff can be added to a specific branch
 */
export function useCanAddStaffToBranch(branchId: string | null): {
  canAdd: boolean;
  isLoading: boolean;
  capacity: BranchCapacityInfo | null;
  message: string;
} {
  const { data: capacity, isLoading } = useBranchStaffCapacity(branchId);
  const { data: planInfo } = useBusinessPlan();

  if (isLoading || !capacity) {
    return {
      canAdd: false,
      isLoading,
      capacity: null,
      message: "Loading...",
    };
  }

  if (capacity.isBlocked) {
    const plan = planInfo?.effectivePlan || 'free';
    let message = `This branch has reached its staff limit (${capacity.currentStaff}/${capacity.totalCapacity}).`;
    
    if (!capacity.hasAddon && plan !== 'free') {
      message += " Purchase an add-on for this branch to add more staff.";
    } else if (plan === 'free') {
      message += " Upgrade your plan to add more staff.";
    } else {
      message += " Upgrade your plan or register a new business.";
    }

    return {
      canAdd: false,
      isLoading: false,
      capacity,
      message,
    };
  }

  return {
    canAdd: true,
    isLoading: false,
    capacity,
    message: `${capacity.currentStaff}/${capacity.totalCapacity} staff in this branch`,
  };
}
