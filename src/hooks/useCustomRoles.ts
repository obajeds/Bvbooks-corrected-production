import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useBusiness } from "./useBusiness";

export interface CustomRole {
  id: string;
  business_id: string;
  name: string;
  description: string | null;
  permissions: string[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface CustomRoleInsert {
  business_id: string;
  name: string;
  description?: string | null;
  permissions: string[];
}

interface CustomRoleUpdate {
  name?: string;
  description?: string | null;
  permissions?: string[];
  is_active?: boolean;
}

export function useCustomRoles() {
  const { data: business } = useBusiness();

  return useQuery({
    queryKey: ["custom-roles", business?.id],
    queryFn: async (): Promise<CustomRole[]> => {
      if (!business?.id) return [];

      const { data, error } = await supabase
        .from("custom_roles" as any)
        .select("*")
        .eq("business_id", business.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      
      return (data || []) as unknown as CustomRole[];
    },
    enabled: !!business?.id,
  });
}

export function useCreateCustomRole() {
  const queryClient = useQueryClient();
  const { data: business } = useBusiness();

  return useMutation({
    mutationFn: async (data: {
      name: string;
      description: string;
      permissions: string[];
    }) => {
      if (!business?.id) throw new Error("No business found");

      const insertData: CustomRoleInsert = {
        business_id: business.id,
        name: data.name,
        description: data.description || null,
        permissions: data.permissions,
      };

      const { data: result, error } = await supabase
        .from("custom_roles" as any)
        .insert(insertData as any)
        .select()
        .single();

      if (error) throw error;
      return result as unknown as CustomRole;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["custom-roles", business?.id] });
    },
  });
}

export function useUpdateCustomRole() {
  const queryClient = useQueryClient();
  const { data: business } = useBusiness();

  return useMutation({
    mutationFn: async (data: {
      id: string;
      name: string;
      description: string;
      permissions: string[];
      is_active?: boolean;
    }) => {
      const updateData: CustomRoleUpdate = {
        name: data.name,
        description: data.description || null,
        permissions: data.permissions,
        is_active: data.is_active ?? true,
      };

      const { data: result, error } = await supabase
        .from("custom_roles" as any)
        .update(updateData as any)
        .eq("id", data.id)
        .select()
        .single();

      if (error) throw error;
      return result as unknown as CustomRole;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["custom-roles", business?.id] });
    },
  });
}

export function useDeleteCustomRole() {
  const queryClient = useQueryClient();
  const { data: business } = useBusiness();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("custom_roles" as any)
        .delete()
        .eq("id", id);

      if (error) throw error;
      return { id };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["custom-roles", business?.id] });
    },
  });
}
