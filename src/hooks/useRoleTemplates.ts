import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useBusiness } from "./useBusiness";
import type { PermissionKey } from "@/lib/permissions";
import { toast } from "sonner";

export interface RoleTemplate {
  id: string;
  business_id: string | null;
  name: string;
  description: string | null;
  permissions: PermissionKey[];
  discount_limit: number;
  refund_limit: number;
  is_system: boolean;
  is_active: boolean;
  is_locked: boolean;
  created_at: string;
  updated_at: string;
}

export function useRoleTemplatesManagement() {
  const { data: business } = useBusiness();

  return useQuery({
    queryKey: ["role-templates-management", business?.id],
    queryFn: async (): Promise<RoleTemplate[]> => {
      if (!business?.id) return [];

      console.log("[RoleTemplates] Fetching for business:", business.id);

      // First, get business-specific role templates
      const { data: businessRoles, error: businessError } = await supabase
        .from("role_templates")
        .select("*")
        .eq("business_id", business.id)
        .eq("is_active", true)
        .order("name");

      if (businessError) {
        console.error("[RoleTemplates] Error fetching business roles:", businessError);
        throw businessError;
      }

      console.log("[RoleTemplates] Business roles found:", businessRoles?.length || 0);

      // If business has its own roles, use those (they're copies of system roles)
      if (businessRoles && businessRoles.length > 0) {
        return businessRoles as RoleTemplate[];
      }

      // Fallback to system roles if no business-specific roles exist
      console.log("[RoleTemplates] No business roles, fetching system roles...");
      const { data: systemRoles, error: systemError } = await supabase
        .from("role_templates")
        .select("*")
        .is("business_id", null)
        .eq("is_system", true)
        .eq("is_active", true)
        .order("name");

      if (systemError) {
        console.error("[RoleTemplates] Error fetching system roles:", systemError);
        throw systemError;
      }

      console.log("[RoleTemplates] System roles found:", systemRoles?.length || 0);
      return (systemRoles || []) as RoleTemplate[];
    },
    enabled: !!business?.id,
    staleTime: 30 * 1000,
    retry: 2,
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 5000),
  });
}

// Helper function to sync permissions to all staff with a given role
async function syncRolePermissionsToStaff(
  templateId: string,
  templateName: string,
  permissions: PermissionKey[]
): Promise<{ synced: number; total: number }> {
  try {
    const { data, error } = await supabase.functions.invoke("sync-role-permissions", {
      body: { templateId, templateName, permissions },
    });

    if (error) {
      console.error("Error syncing permissions:", error);
      throw error;
    }

    return { synced: data?.synced || 0, total: data?.total || 0 };
  } catch (err) {
    console.error("Failed to sync permissions:", err);
    throw err;
  }
}

export function useCreateRoleTemplate() {
  const queryClient = useQueryClient();
  const { data: business } = useBusiness();

  return useMutation({
    mutationFn: async (data: {
      name: string;
      description: string;
      permissions: PermissionKey[];
      discount_limit?: number;
      refund_limit?: number;
    }) => {
      if (!business?.id) throw new Error("No business found");

      const { data: result, error } = await supabase
        .from("role_templates")
        .insert({
          business_id: business.id,
          name: data.name,
          description: data.description || null,
          permissions: data.permissions as any,
          discount_limit: data.discount_limit || 0,
          refund_limit: data.refund_limit || 0,
          is_system: false,
        } as any)
        .select()
        .single();

      if (error) throw error;
      return result as RoleTemplate;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["role-templates"] });
      queryClient.invalidateQueries({ queryKey: ["role-templates-management"] });
    },
  });
}

export function useUpdateRoleTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      id: string;
      name: string;
      description: string;
      permissions: PermissionKey[];
      discount_limit?: number;
      refund_limit?: number;
      is_active?: boolean;
    }) => {
      // First update the role template
      const { data: result, error } = await supabase
        .from("role_templates")
        .update({
          name: data.name,
          description: data.description || null,
          permissions: data.permissions as any,
          discount_limit: data.discount_limit || 0,
          refund_limit: data.refund_limit || 0,
          is_active: data.is_active ?? true,
        } as any)
        .eq("id", data.id)
        .select()
        .single();

      if (error) throw error;

      // Sync permissions to all staff members with this role (non-blocking)
      let syncResult = { synced: 0, total: 0 };
      try {
        syncResult = await syncRolePermissionsToStaff(
          data.id,
          data.name,
          data.permissions
        );
      } catch (syncErr) {
        console.warn("[RoleTemplates] Sync failed (non-blocking):", syncErr);
      }

      return { 
        template: result as RoleTemplate, 
        syncResult 
      };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["role-templates"] });
      queryClient.invalidateQueries({ queryKey: ["staff"] });
      queryClient.invalidateQueries({ queryKey: ["staff-permissions"] });
      queryClient.invalidateQueries({ queryKey: ["current-user-permissions"] });
      
      if (data.syncResult.total > 0) {
        toast.success(
          `Role updated. Synced permissions to ${data.syncResult.synced} staff member(s).`
        );
      }
    },
  });
}

export function useDeleteRoleTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("role_templates")
        .delete()
        .eq("id", id);

      if (error) throw error;
      return { id };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["role-templates"] });
      queryClient.invalidateQueries({ queryKey: ["role-templates-management"] });
    },
  });
}

export function useLockRoleTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, lock }: { id: string; lock: boolean }) => {
      const { data: result, error } = await supabase
        .from("role_templates")
        .update({ is_locked: lock })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return result as RoleTemplate;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["role-templates"] });
    },
  });
}
