import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useBranchContext } from "@/contexts/BranchContext";
import { ALL_PERMISSIONS, type PermissionKey } from "@/lib/permissions";

export interface BranchAccess {
  branch_id: string;
  branch_name: string;
  role_template_id: string | null;
  role_name: string | null;
  permissions: PermissionKey[];
  is_primary: boolean;
  expires_at: string | null;
}

/**
 * Hook to get all branches a staff member has access to with their roles/permissions
 */
export function useStaffAccessibleBranches() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["staff-accessible-branches", user?.id],
    queryFn: async (): Promise<BranchAccess[]> => {
      if (!user) return [];

      // First check if user is a business owner
      const { data: ownedBusiness } = await supabase
        .from("businesses")
        .select("id")
        .eq("owner_user_id", user.id)
        .maybeSingle();

      if (ownedBusiness) {
        // Business owners have access to all branches
        const { data: branches, error } = await supabase
          .from("branches")
          .select("id, name, is_main")
          .eq("business_id", ownedBusiness.id)
          .eq("is_active", true)
          .order("is_main", { ascending: false })
          .order("name");

        if (error) throw error;

        return (branches || []).map((branch) => ({
          branch_id: branch.id,
          branch_name: branch.name,
          role_template_id: null,
          role_name: "Owner",
          permissions: ALL_PERMISSIONS,
          is_primary: branch.is_main,
          expires_at: null,
        }));
      }

      // For staff, get their branch assignments with role templates
      const { data: staffData } = await supabase
        .from("staff")
        .select("id, business_id")
        .eq("user_id", user.id)
        .eq("is_active", true)
        .maybeSingle();

      if (!staffData) return [];

      const { data: assignments, error } = await supabase
        .from("staff_branch_assignments")
        .select(`
          branch_id,
          role_template_id,
          is_primary,
          expires_at,
          branches:branch_id (id, name),
          role_templates:role_template_id (id, name, permissions)
        `)
        .eq("staff_id", staffData.id)
        .eq("is_active", true);

      if (error) throw error;

      return (assignments || [])
        .filter((a) => {
          // Filter out expired assignments
          if (a.expires_at && new Date(a.expires_at) < new Date()) {
            return false;
          }
          return a.branches && typeof a.branches === "object";
        })
        .map((a) => {
          const branch = a.branches as { id: string; name: string };
          const role = a.role_templates as { id: string; name: string; permissions: string[] } | null;

          return {
            branch_id: branch.id,
            branch_name: branch.name,
            role_template_id: a.role_template_id,
            role_name: role?.name || null,
            permissions: (role?.permissions || []) as PermissionKey[],
            is_primary: a.is_primary,
            expires_at: a.expires_at,
          };
        });
    },
    enabled: !!user,
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
  });
}

/**
 * Hook to get permissions for the currently selected branch
 */
export function useBranchPermissions() {
  const { user } = useAuth();
  const { currentBranch } = useBranchContext();
  const { data: accessibleBranches = [] } = useStaffAccessibleBranches();

  return useQuery({
    queryKey: ["branch-permissions", user?.id, currentBranch?.id],
    queryFn: async (): Promise<{
      permissions: PermissionKey[];
      roleName: string | null;
      isOwner: boolean;
    }> => {
      if (!user || !currentBranch) {
        return { permissions: [], roleName: null, isOwner: false };
      }

      // Check if user is business owner
      const { data: ownedBusiness } = await supabase
        .from("businesses")
        .select("id")
        .eq("owner_user_id", user.id)
        .eq("id", currentBranch.business_id)
        .maybeSingle();

      if (ownedBusiness) {
        return {
          permissions: ALL_PERMISSIONS,
          roleName: "Owner",
          isOwner: true,
        };
      }

      // Find the branch access for current branch
      const branchAccess = accessibleBranches.find(
        (ba) => ba.branch_id === currentBranch.id
      );

      if (!branchAccess) {
        return { permissions: [], roleName: null, isOwner: false };
      }

      return {
        permissions: branchAccess.permissions,
        roleName: branchAccess.role_name,
        isOwner: false,
      };
    },
    enabled: !!user && !!currentBranch,
  });
}

/**
 * Hook to check if user has a specific permission in the current branch
 */
export function useHasBranchPermission(permission: PermissionKey): boolean {
  const { data } = useBranchPermissions();
  
  if (!data) return false;
  if (data.isOwner) return true;
  
  return data.permissions.includes(permission);
}

/**
 * Hook to log branch access events
 */
export function useBranchAccessLog() {
  const { user } = useAuth();

  const logBranchAccess = async (
    businessId: string,
    branchId: string | null,
    action: "login" | "switch_branch" | "access_denied" | "logout",
    details?: Record<string, string | number | boolean | null>,
    previousBranchId?: string | null
  ) => {
    if (!user) return;

    try {
      // Get staff_id if applicable
      const { data: staff } = await supabase
        .from("staff")
        .select("id")
        .eq("user_id", user.id)
        .eq("business_id", businessId)
        .maybeSingle();

      await supabase.from("branch_access_logs").insert([{
        business_id: businessId,
        user_id: user.id,
        staff_id: staff?.id || null,
        branch_id: branchId,
        action,
        previous_branch_id: previousBranchId || null,
        details: details || null,
      }]);
    } catch (error) {
      console.error("Failed to log branch access:", error);
    }
  };

  return { logBranchAccess };
}
