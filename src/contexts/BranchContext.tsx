import { createContext, useContext, useState, useEffect, ReactNode, useCallback, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useBusiness } from "@/hooks/useBusiness";
import { ALL_PERMISSIONS, LEGACY_PERMISSION_MAPPING, expandPermissionsBidirectional, type PermissionKey } from "@/lib/permissions";

// STRICT RBAC: No legacy fallback permissions.
// Staff get ZERO permissions until explicitly assigned via role templates or staff_permissions.
// Only owner gets ALL_PERMISSIONS implicitly.

export interface Branch {
  id: string;
  business_id: string;
  name: string;
  address: string | null;
  phone: string | null;
  is_main: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface BranchAccess {
  branch: Branch;
  role_template_id: string | null;
  role_name: string | null;
  permissions: PermissionKey[];
  is_primary: boolean;
  expires_at: string | null;
}

interface BranchContextType {
  currentBranch: Branch | null;
  setCurrentBranch: (branch: Branch | null) => void;
  branches: Branch[];
  accessibleBranches: BranchAccess[];
  isLoading: boolean;
  isOwner: boolean;
  hasNoAccessibleBranches: boolean;
  currentBranchPermissions: PermissionKey[];
  currentRoleName: string | null;
  hasPermission: (permission: PermissionKey) => boolean;
  canAccessBranch: (branchId: string) => boolean;
  switchBranch: (branch: Branch) => void;
  showBranchSelector: boolean;
  setShowBranchSelector: (show: boolean) => void;
}

const BranchContext = createContext<BranchContextType | undefined>(undefined);

export function BranchProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [currentBranch, setCurrentBranchState] = useState<Branch | null>(null);
  const [showBranchSelector, setShowBranchSelector] = useState(false);

  // Reuse the shared useBusiness hook instead of a separate query
  const { data: business, isLoading: businessLoading } = useBusiness();

  const isOwner = !!business && business.owner_user_id === user?.id;

  // Fetch staffId only for non-owners (lightweight query)
  const { data: staffId, isLoading: staffIdLoading } = useQuery({
    queryKey: ["staff-id-for-branch", user?.id, business?.id],
    queryFn: async (): Promise<string | null> => {
      if (!user || !business) return null;
      const { data } = await supabase
        .from("staff")
        .select("id")
        .eq("user_id", user.id)
        .eq("is_active", true)
        .maybeSingle();
      return data?.id || null;
    },
    enabled: !!user && !!business && !isOwner,
    staleTime: 10 * 60 * 1000,
  });

  // Fetch all branches for the business (for owners)
  const { data: allBranches = [], isLoading: allBranchesLoading, fetchStatus: allBranchesFetchStatus } = useQuery({
    queryKey: ["all-branches", business?.id],
    queryFn: async (): Promise<Branch[]> => {
      if (!business?.id) return [];

      const { data, error } = await supabase
        .from("branches")
        .select("*")
        .eq("business_id", business.id)
        .eq("is_active", true)
        .order("is_main", { ascending: false })
        .order("name");

      if (error) throw error;
      return data || [];
    },
    enabled: !!business?.id,
  });

  // Fetch direct staff permissions from staff_permissions table
  const { data: directStaffPermissions = [], isLoading: directPermissionsLoading, fetchStatus: directPermissionsFetchStatus } = useQuery({
    queryKey: ["staff-direct-permissions", staffId],
    queryFn: async (): Promise<PermissionKey[]> => {
      if (!staffId) return [];

      const { data, error } = await supabase
        .from("staff_permissions")
        .select("permission")
        .eq("staff_id", staffId);

      if (error) throw error;
      return (data || []).map((p) => p.permission as PermissionKey);
    },
    enabled: !!staffId && !isOwner,
    staleTime: 30_000,
    refetchOnMount: "always" as const,
  });
  
  const isDirectPermissionsActuallyLoading = directPermissionsLoading && directPermissionsFetchStatus === 'fetching';

  // Fetch accessible branches for staff members with their permissions
  const { data: staffBranchAccessData, isLoading: staffBranchesLoading, fetchStatus: staffBranchesFetchStatus } = useQuery({
    queryKey: ["staff-branch-access", staffId],
    queryFn: async (): Promise<{ branches: BranchAccess[], staffRole: string }> => {
      if (!staffId) return { branches: [], staffRole: "staff" };

      const { data: assignments, error } = await supabase
        .from("staff_branch_assignments")
        .select(`
          branch_id,
          role_template_id,
          is_primary,
          expires_at,
          is_active,
          branches:branch_id (*),
          role_templates:role_template_id (id, name, permissions)
        `)
        .eq("staff_id", staffId)
        .eq("is_active", true);

      if (error) throw error;

      // Get staff role name from staff table
      const { data: staffData } = await supabase
        .from("staff")
        .select("role")
        .eq("id", staffId)
        .single();

      // STRICT: Never allow staff to display as "Owner" - that label is reserved for business owners
      const rawRole = staffData?.role || "staff";
      const staffRoleName = rawRole.toLowerCase() === "owner" ? "Staff" : rawRole;

      const branchAccessList = (assignments || [])
        .filter((a) => {
          // Filter out expired assignments
          if (a.expires_at && new Date(a.expires_at) < new Date()) {
            return false;
          }
          const branch = a.branches as Branch | null;
          return branch && branch.is_active;
        })
        .map((a) => {
          const branch = a.branches as Branch;
          const role = a.role_templates as { id: string; name: string; permissions: string[] } | null;

          // Only use role template permissions if they exist and are non-empty
          // Direct permissions will be merged later in accessibleBranches computation
          const rolePermissions = role?.permissions?.length 
            ? (role.permissions as PermissionKey[])
            : [];

          return {
            branch,
            role_template_id: a.role_template_id,
            role_name: role?.name || staffRoleName,
            permissions: rolePermissions,
            is_primary: a.is_primary,
            expires_at: a.expires_at,
          };
        });

      return { branches: branchAccessList, staffRole: staffRoleName.toLowerCase() };
    },
    enabled: !!staffId && !isOwner,
  });

  const staffBranchAccess = staffBranchAccessData?.branches || [];
  const staffRole = staffBranchAccessData?.staffRole || "staff";

  // STRICT RBAC: No legacy fallback. Empty permissions = no access.
  const effectiveStaffPermissions = useMemo(() => {
    return directStaffPermissions.length > 0 
      ? expandPermissionsBidirectional(directStaffPermissions) 
      : [];
  }, [directStaffPermissions]);

  // Compute accessible branches based on user type
  // For staff: merge role template permissions with effective staff permissions (direct or legacy)
  const accessibleBranches: BranchAccess[] = isOwner
    ? allBranches.map((branch) => ({
        branch,
        role_template_id: null,
        role_name: "Owner",
        permissions: ALL_PERMISSIONS,
        is_primary: branch.is_main,
        expires_at: null,
      }))
    : staffBranchAccess.map((ba) => ({
          ...ba,
          permissions: expandPermissionsBidirectional(
            Array.from(new Set([
              ...ba.permissions,
              ...effectiveStaffPermissions,
            ]))
          ) as PermissionKey[],
        }));

  // Get all branches (for owners it's all, for staff it's based on accessible branches)
  // STRICT: Staff can ONLY see branches they are explicitly assigned to
  const branches = isOwner
    ? allBranches
    : accessibleBranches.map((ba) => ba.branch);

  // Current branch permissions
  const currentBranchAccess = currentBranch
    ? accessibleBranches.find((ba) => ba.branch.id === currentBranch.id)
    : null;

  // STRICT RBAC: No fallback. Staff must have branch-scoped role template permissions.
  const rawBranchPermissions = currentBranchAccess?.permissions?.length 
    ? currentBranchAccess.permissions 
    : (isOwner ? ALL_PERMISSIONS : effectiveStaffPermissions);
  const currentBranchPermissions = isOwner 
    ? rawBranchPermissions 
    : expandPermissionsBidirectional(rawBranchPermissions);
  // STRICT: "Owner" label is ONLY for business owners (determined by owner_user_id), never for staff
  const displayStaffRole = staffRole.toLowerCase() === "owner" ? "Staff" : staffRole.charAt(0).toUpperCase() + staffRole.slice(1);
  const currentRoleName = currentBranchAccess?.role_name || (isOwner ? "Owner" : displayStaffRole);

  // Check if user has a specific permission in the current branch
  const hasPermission = useCallback(
    (permission: PermissionKey): boolean => {
      if (isOwner) return true;
      if (currentBranchPermissions.includes(permission)) return true;
      // Forward: legacy → canonical
      const canonical = LEGACY_PERMISSION_MAPPING[permission];
      if (canonical && currentBranchPermissions.includes(canonical)) return true;
      // Reverse: canonical → legacy
      for (const [legacyKey, canonicalKey] of Object.entries(LEGACY_PERMISSION_MAPPING)) {
        if (canonicalKey === permission && currentBranchPermissions.includes(legacyKey as PermissionKey)) {
          return true;
        }
      }
      return false;
    },
    [isOwner, currentBranchPermissions]
  );

  // Check if user can access a specific branch
  const canAccessBranch = useCallback(
    (branchId: string): boolean => {
      if (isOwner) return allBranches.some((b) => b.id === branchId);
      return accessibleBranches.some((ba) => ba.branch.id === branchId);
    },
    [isOwner, allBranches, accessibleBranches]
  );

  // Switch branch with logging
  const switchBranch = useCallback(
    async (branch: Branch) => {
      const previousBranchId = currentBranch?.id;
      setCurrentBranchState(branch);
      if (user) localStorage.setItem(`currentBranchId_${user.id}`, branch.id);

      if (previousBranchId && previousBranchId !== branch.id && business?.id && user) {
        try {
          const { data: staff } = await supabase
            .from("staff")
            .select("id")
            .eq("user_id", user.id)
            .eq("business_id", business.id)
            .maybeSingle();

          await supabase.from("branch_access_logs").insert([{
            business_id: business.id,
            user_id: user.id,
            staff_id: staff?.id || null,
            branch_id: branch.id,
            action: "switch_branch",
            previous_branch_id: previousBranchId,
            details: { branch_name: branch.name },
          }]);
        } catch (error) {
          console.error("Failed to log branch switch:", error);
        }
      }

      queryClient.invalidateQueries({ queryKey: ["branch-permissions"] });
    },
    [currentBranch, business, user, queryClient]
  );

  // Only consider a query loading if it's actually fetching
  const isAllBranchesActuallyLoading = allBranchesLoading && allBranchesFetchStatus === 'fetching';
  const isStaffBranchesActuallyLoading = staffBranchesLoading && staffBranchesFetchStatus === 'fetching';
  
  // For staff, also wait for direct permissions AND ensure branches are loaded
  const staffNeedsMoreData = !isOwner && staffId && (
    isDirectPermissionsActuallyLoading || 
    (allBranches.length === 0 && isAllBranchesActuallyLoading)
  );
  
  const isLoading = businessLoading || (!!user && !isOwner && !business && staffIdLoading) || isAllBranchesActuallyLoading || isStaffBranchesActuallyLoading || !!staffNeedsMoreData;
  const hasNoAccessibleBranches = !isOwner && !!staffId && !isLoading && accessibleBranches.length === 0;

  // Auto-select branch when branches load
  useEffect(() => {
    if (branches.length > 0 && !currentBranch) {
      localStorage.removeItem("currentBranchId");
      const savedBranchId = user ? localStorage.getItem(`currentBranchId_${user.id}`) : null;
      let selectedBranch: Branch | null = null;

      if (savedBranchId) {
        selectedBranch = branches.find((b) => b.id === savedBranchId) || null;
      }

      if (!selectedBranch) {
        if (isOwner) {
          selectedBranch = branches.find((b) => b.is_main) || branches[0];
        } else {
          const primaryAccess = accessibleBranches.find((ba) => ba.is_primary);
          selectedBranch = primaryAccess?.branch || branches[0];
        }
      }

      if (selectedBranch) {
        setCurrentBranchState(selectedBranch);
        if (user) localStorage.setItem(`currentBranchId_${user.id}`, selectedBranch.id);
      }

      if (!isOwner && branches.length > 1 && !savedBranchId) {
        setShowBranchSelector(true);
      }
    }
  }, [branches, currentBranch, isOwner, accessibleBranches, isLoading, user]);

  // Correct wrong branch after all data loads
  useEffect(() => {
    if (!isOwner && !isLoading && currentBranch && accessibleBranches.length > 0) {
      const isOnAccessibleBranch = accessibleBranches.some(
        (ba) => ba.branch.id === currentBranch.id
      );
      if (!isOnAccessibleBranch) {
        const primaryAccess = accessibleBranches.find((ba) => ba.is_primary);
        const correctBranch = primaryAccess?.branch || accessibleBranches[0]?.branch;
        if (correctBranch) {
          setCurrentBranchState(correctBranch);
          if (user) localStorage.setItem(`currentBranchId_${user.id}`, correctBranch.id);
        }
      }
    }
  }, [isOwner, isLoading, currentBranch, accessibleBranches, user]);

  // Clear branch when user logs out
  useEffect(() => {
    if (!user) {
      setCurrentBranchState(null);
    }
  }, [user]);

  // Wrapper for setCurrentBranch that respects access
  const setCurrentBranch = useCallback(
    (branch: Branch | null) => {
      if (branch && !canAccessBranch(branch.id)) {
        console.warn("User does not have access to this branch");
        return;
      }
      if (branch) {
        switchBranch(branch);
      } else {
        setCurrentBranchState(null);
      }
    },
    [canAccessBranch, switchBranch]
  );

  return (
    <BranchContext.Provider
      value={{
        currentBranch,
        setCurrentBranch,
        branches,
        accessibleBranches,
        isLoading,
        isOwner,
        hasNoAccessibleBranches,
        currentBranchPermissions,
        currentRoleName,
        hasPermission,
        canAccessBranch,
        switchBranch,
        showBranchSelector,
        setShowBranchSelector,
      }}
    >
      {children}
    </BranchContext.Provider>
  );
}

export function useBranchContext() {
  const context = useContext(BranchContext);
  if (!context) {
    throw new Error("useBranchContext must be used within a BranchProvider");
  }
  return context;
}
