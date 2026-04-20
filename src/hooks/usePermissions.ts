import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useBusiness } from "./useBusiness";
import { useAuth } from "@/contexts/AuthContext";
import type { PermissionKey } from "@/lib/permissions";
import { ALL_PERMISSIONS, expandPermissionsBidirectional } from "@/lib/permissions";

export interface StaffPermission {
  id: string;
  staff_id: string;
  permission: PermissionKey;
  granted_by: string | null;
  granted_at: string;
  expires_at: string | null;
}

export interface RoleTemplate {
  id: string;
  business_id: string | null;
  name: string;
  description: string | null;
  permissions: PermissionKey[];
  is_system: boolean;
  is_active: boolean;
  is_locked: boolean;
  discount_limit: number;
  refund_limit: number;
  created_at: string;
  updated_at: string;
}

interface EnsureBranchAssignmentResult {
  repaired: boolean;
  branchId: string | null;
}

async function ensureStaffHasActiveBranchAssignment(
  staffId: string,
  options?: { preferredTemplateId?: string | null }
): Promise<EnsureBranchAssignmentResult> {
  const now = new Date();

  const { data: existingAssignments, error: existingError } = await supabase
    .from("staff_branch_assignments")
    .select("staff_id, branch_id, role_template_id, is_primary, is_active, expires_at")
    .eq("staff_id", staffId)
    .eq("is_active", true);

  if (existingError) throw existingError;

  const validAssignments = (existingAssignments || []).filter(
    (assignment) => !assignment.expires_at || new Date(assignment.expires_at) >= now
  );

  if (validAssignments.length > 0) {
    const primary = validAssignments.find((assignment) => assignment.is_primary);
    if (!primary) {
      const promotedBranchId = validAssignments[0].branch_id;
      await supabase
        .from("staff_branch_assignments")
        .update({ is_primary: false, updated_at: new Date().toISOString() })
        .eq("staff_id", staffId)
        .eq("is_active", true)
        .eq("is_primary", true);

      const { error: promoteError } = await supabase
        .from("staff_branch_assignments")
        .update({ is_primary: true, updated_at: new Date().toISOString() })
        .eq("staff_id", staffId)
        .eq("branch_id", promotedBranchId)
        .eq("is_active", true);

      if (promoteError) throw promoteError;
      return { repaired: true, branchId: promotedBranchId };
    }

    return { repaired: false, branchId: primary.branch_id };
  }

  const { data: staffRecord, error: staffError } = await supabase
    .from("staff")
    .select("id, business_id, branch_id, role")
    .eq("id", staffId)
    .eq("is_active", true)
    .maybeSingle();

  if (staffError) throw staffError;
  if (!staffRecord) return { repaired: false, branchId: null };

  let resolvedBranchId: string | null = null;

  if (staffRecord.branch_id) {
    const { data: preferredBranch, error: preferredBranchError } = await supabase
      .from("branches")
      .select("id")
      .eq("id", staffRecord.branch_id)
      .eq("business_id", staffRecord.business_id)
      .eq("is_active", true)
      .maybeSingle();

    if (preferredBranchError) throw preferredBranchError;
    resolvedBranchId = preferredBranch?.id ?? null;
  }

  if (!resolvedBranchId) {
    const { data: fallbackBranch, error: fallbackBranchError } = await supabase
      .from("branches")
      .select("id")
      .eq("business_id", staffRecord.business_id)
      .eq("is_active", true)
      .order("is_main", { ascending: false })
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (fallbackBranchError) throw fallbackBranchError;
    resolvedBranchId = fallbackBranch?.id ?? null;
  }

  if (!resolvedBranchId) return { repaired: false, branchId: null };

  let resolvedTemplateId = options?.preferredTemplateId ?? null;
  if (!resolvedTemplateId && staffRecord.role) {
    const { data: businessTemplate, error: businessTemplateError } = await supabase
      .from("role_templates")
      .select("id")
      .eq("business_id", staffRecord.business_id)
      .eq("is_active", true)
      .ilike("name", staffRecord.role)
      .limit(1)
      .maybeSingle();

    if (businessTemplateError) throw businessTemplateError;
    resolvedTemplateId = businessTemplate?.id ?? null;

    if (!resolvedTemplateId) {
      const { data: systemTemplate, error: systemTemplateError } = await supabase
        .from("role_templates")
        .select("id")
        .is("business_id", null)
        .eq("is_system", true)
        .eq("is_active", true)
        .ilike("name", staffRecord.role)
        .limit(1)
        .maybeSingle();

      if (systemTemplateError) throw systemTemplateError;
      resolvedTemplateId = systemTemplate?.id ?? null;
    }
  }

  const timestamp = new Date().toISOString();

  const { error: upsertError } = await supabase
    .from("staff_branch_assignments")
    .upsert(
      {
        staff_id: staffId,
        branch_id: resolvedBranchId,
        role_template_id: resolvedTemplateId,
        is_primary: true,
        is_active: true,
        expires_at: null,
        updated_at: timestamp,
      },
      { onConflict: "staff_id,branch_id" }
    );

  if (upsertError) throw upsertError;

  const { error: demoteError } = await supabase
    .from("staff_branch_assignments")
    .update({ is_primary: false, updated_at: timestamp })
    .eq("staff_id", staffId)
    .eq("is_active", true)
    .neq("branch_id", resolvedBranchId)
    .eq("is_primary", true);

  if (demoteError) throw demoteError;

  return { repaired: true, branchId: resolvedBranchId };
}

// Hook to get current user's permissions
export function useCurrentUserPermissions() {
  const { user } = useAuth();
  const { data: business, isLoading: businessLoading } = useBusiness();

  return useQuery({
    queryKey: ["current-user-permissions", user?.id, business?.id],
    queryFn: async (): Promise<{ permissions: PermissionKey[]; isOwner: boolean }> => {
      if (!user || !business) {
        return { permissions: [], isOwner: false };
      }

      // Check if user is business owner - owners have all permissions
      if (business.owner_user_id === user.id) {
        return { permissions: ALL_PERMISSIONS, isOwner: true };
      }

      // Get staff record for this user
      const { data: staff } = await supabase
        .from("staff")
        .select("id, is_active")
        .eq("user_id", user.id)
        .eq("is_active", true)
        .maybeSingle();

      if (!staff) {
        return { permissions: [], isOwner: false };
      }

      // Get permissions for this staff member
      const { data: permissions, error } = await supabase
        .from("staff_permissions")
        .select("permission")
        .eq("staff_id", staff.id);

      if (error) {
        console.error("Error fetching permissions:", error);
        return { permissions: [], isOwner: false };
      }

      const rawPermissions = (permissions || []).map((p) => p.permission as PermissionKey);

      // Expand bidirectionally so both legacy and canonical checks work
      return {
        permissions: expandPermissionsBidirectional(rawPermissions),
        isOwner: false,
      };
    },
    // Wait for both user and business to be loaded before running query
    enabled: !!user && !businessLoading && !!business,
    staleTime: 5 * 60 * 1000,
  });
}

// Hook to get permissions for a specific staff member
export function useStaffPermissions(staffId: string | undefined) {
  return useQuery({
    queryKey: ["staff-permissions", staffId],
    queryFn: async (): Promise<PermissionKey[]> => {
      if (!staffId) return [];

      console.log("[useStaffPermissions] Fetching for staff:", staffId);

      const { data, error } = await supabase
        .from("staff_permissions")
        .select("permission")
        .eq("staff_id", staffId);

      if (error) {
        console.error("[useStaffPermissions] Query failed for staff:", staffId, error);
        throw error;
      }

      const permissions = (data || [])
        .map((p) => p.permission as PermissionKey)
        .filter((p): p is PermissionKey => typeof p === "string" && p.length > 0);
      console.log("[useStaffPermissions] Found", permissions.length, "permissions for staff:", staffId);
      return permissions;
    },
    enabled: !!staffId,
    retry: 2,
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 5000),
  });
}

// Hook to get role templates
export function useRoleTemplates() {
  const { data: business } = useBusiness();

  return useQuery({
    queryKey: ["role-templates", business?.id],
    queryFn: async (): Promise<RoleTemplate[]> => {
      // First, get business-specific role templates
      const { data: businessRoles, error: businessError } = await supabase
        .from("role_templates")
        .select("*")
        .eq("business_id", business?.id)
        .eq("is_active", true)
        .order("name");

      if (businessError) throw businessError;

      // If business has its own roles, use those (they're copies of system roles)
      // This prevents duplicates from showing both system and business copies
      if (businessRoles && businessRoles.length > 0) {
        return businessRoles as RoleTemplate[];
      }

      // Fallback to system roles if no business-specific roles exist
      const { data: systemRoles, error: systemError } = await supabase
        .from("role_templates")
        .select("*")
        .is("business_id", null)
        .eq("is_system", true)
        .eq("is_active", true)
        .order("name");

      if (systemError) throw systemError;

      return (systemRoles || []) as RoleTemplate[];
    },
    enabled: !!business?.id,
  });
}

// Hook to update staff permissions
export function useUpdateStaffPermissions() {
  const queryClient = useQueryClient();
  const { data: business } = useBusiness();

  return useMutation({
    mutationFn: async ({
      staffId,
      permissions,
    }: {
      staffId: string;
      permissions: PermissionKey[];
    }) => {
      const assignmentStatus = await ensureStaffHasActiveBranchAssignment(staffId);

      // Delete existing permissions
      const { error: deleteError } = await supabase
        .from("staff_permissions")
        .delete()
        .eq("staff_id", staffId);

      if (deleteError) throw deleteError;

      // Deduplicate and upsert new permissions
      const uniquePermissions = [...new Set(permissions)];

      if (uniquePermissions.length > 0) {
        const { error: insertError } = await supabase
          .from("staff_permissions")
          .upsert(
            uniquePermissions.map((permission) => ({
              staff_id: staffId,
              permission: permission as any,
            })),
            { onConflict: "staff_id,permission", ignoreDuplicates: true }
          );

        if (insertError) {
          console.error("Error upserting staff permissions:", insertError);
          throw insertError;
        }
      }

      // Log the permission change
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user && business?.id) {
        await supabase.from("permission_audit_logs").insert({
          business_id: business.id,
          staff_id: staffId,
          user_id: user.id,
          action: "permissions_updated",
          details: {
            permissions,
            branch_assignment_repaired: assignmentStatus.repaired,
          },
        });
      }

      return { staffId, permissions, assignmentRepaired: assignmentStatus.repaired };
    },
    onSuccess: (_, { staffId }) => {
      queryClient.invalidateQueries({ queryKey: ["staff-permissions", staffId] });
      queryClient.invalidateQueries({ queryKey: ["current-user-permissions"] });
      queryClient.invalidateQueries({ queryKey: ["staff-branch-access"] });
      queryClient.invalidateQueries({ queryKey: ["staff-branch-assignments", staffId] });
      queryClient.invalidateQueries({ queryKey: ["staff-direct-permissions"] });
      queryClient.invalidateQueries({ queryKey: ["user-role"] });
      queryClient.invalidateQueries({ queryKey: ["branch-permissions"] });
    },
  });
}

// Hook to apply a role template to a staff member
// ATOMIC: Updates staff.role, staff_permissions, AND staff_branch_assignments.role_template_id
export function useApplyRoleTemplate() {
  const updatePermissions = useUpdateStaffPermissions();
  const queryClient = useQueryClient();
  const { data: business } = useBusiness();

  return useMutation({
    mutationFn: async ({
      staffId,
      templateId,
      template,
    }: {
      staffId: string;
      templateId: string;
      template: RoleTemplate;
    }) => {
      const assignmentStatus = await ensureStaffHasActiveBranchAssignment(staffId, {
        preferredTemplateId: templateId,
      });

      // 1. Update the staff role field with the template name
      const { error: roleUpdateError } = await supabase
        .from("staff")
        .update({ role: template.name.toLowerCase() })
        .eq("id", staffId);

      if (roleUpdateError) throw roleUpdateError;

      // 2. Update staff_permissions (delete + re-insert, deduplicated)
      const uniqueTemplatePermissions = [...new Set(template.permissions)];
      await updatePermissions.mutateAsync({
        staffId,
        permissions: uniqueTemplatePermissions,
      });

      // 3. CRITICAL: Update role_template_id on ALL active branch assignments for this staff
      // This is what BranchContext reads to determine permissions per branch
      const { error: branchAssignmentError } = await supabase
        .from("staff_branch_assignments")
        .update({ role_template_id: templateId, updated_at: new Date().toISOString() })
        .eq("staff_id", staffId)
        .eq("is_active", true);

      if (branchAssignmentError) throw branchAssignmentError;

      // 4. Log the role assignment
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user && business?.id) {
        await supabase.from("permission_audit_logs").insert({
          business_id: business.id,
          staff_id: staffId,
          user_id: user.id,
          action: "role_assigned",
          new_role: template.name,
          details: {
            template_id: templateId,
            permissions: template.permissions,
            branch_assignment_repaired: assignmentStatus.repaired,
          },
        });
      }

      return { staffId, template, assignmentRepaired: assignmentStatus.repaired };
    },
    onSuccess: (_, { staffId }) => {
      // Invalidate ALL permission-related queries to ensure immediate UI update
      queryClient.invalidateQueries({ queryKey: ["staff"] });
      queryClient.invalidateQueries({ queryKey: ["staff-permissions", staffId] });
      queryClient.invalidateQueries({ queryKey: ["current-user-permissions"] });
      queryClient.invalidateQueries({ queryKey: ["staff-branch-access"] });
      queryClient.invalidateQueries({ queryKey: ["staff-branch-assignments", staffId] });
      queryClient.invalidateQueries({ queryKey: ["staff-direct-permissions"] });
      queryClient.invalidateQueries({ queryKey: ["user-role"] });
      queryClient.invalidateQueries({ queryKey: ["branch-permissions"] });
    },
  });
}

// Hook to suspend/reactivate staff
export function useSuspendStaff() {
  const queryClient = useQueryClient();
  const { data: business } = useBusiness();

  return useMutation({
    mutationFn: async ({
      staffId,
      suspend,
    }: {
      staffId: string;
      suspend: boolean;
    }) => {
      const { error } = await supabase
        .from("staff")
        .update({ is_active: !suspend })
        .eq("id", staffId);

      if (error) throw error;

      // Log the action
      const { data: { user } } = await supabase.auth.getUser();
      if (user && business?.id) {
        await supabase.from("permission_audit_logs").insert({
          business_id: business.id,
          staff_id: staffId,
          user_id: user.id,
          action: suspend ? "staff_suspended" : "staff_reactivated",
        });
      }

      return { staffId, suspended: suspend };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["staff"] });
    },
  });
}

// Helper hook to check a specific permission
export function useHasPermission(permission: PermissionKey): boolean {
  const { data } = useCurrentUserPermissions();
  if (!data) return false;
  return data.isOwner || data.permissions.includes(permission);
}

// Helper hook to check multiple permissions (any match)
export function useHasAnyPermission(permissions: PermissionKey[]): boolean {
  const { data } = useCurrentUserPermissions();
  if (!data) return false;
  if (data.isOwner) return true;
  return permissions.some((p) => data.permissions.includes(p));
}

// Helper hook to check multiple permissions (all required)
export function useHasAllPermissions(permissions: PermissionKey[]): boolean {
  const { data } = useCurrentUserPermissions();
  if (!data) return false;
  if (data.isOwner) return true;
  return permissions.every((p) => data.permissions.includes(p));
}
