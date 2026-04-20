import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useBusiness } from "./useBusiness";

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

export function useUserBusiness() {
  const { data: business, isLoading } = useBusiness();

  return {
    data: business ? {
      id: business.id,
      name: business.trading_name,
      owner_user_id: business.owner_user_id,
    } : null,
    isLoading,
  };
}

export function useBranches(businessId: string | undefined) {
  return useQuery({
    queryKey: ["branches", businessId],
    queryFn: async (): Promise<Branch[]> => {
      if (!businessId) return [];

      const { data, error } = await supabase
        .from("branches")
        .select("*")
        .eq("business_id", businessId)
        .eq("is_active", true)
        .order("is_main", { ascending: false })
        .order("name");

      if (error) throw error;
      return data || [];
    },
    enabled: !!businessId,
  });
}

export function useCreateBranch() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      business_id: string;
      name: string;
      address?: string;
      phone?: string;
      is_main: boolean;
    }) => {
      const { data: branch, error } = await supabase
        .from("branches")
        .insert({
          business_id: data.business_id,
          name: data.name,
          address: data.address || null,
          phone: data.phone || null,
          is_main: data.is_main,
        })
        .select()
        .single();

      if (error) throw error;
      return branch;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["branches", variables.business_id] });
    },
  });
}

export function useUpdateBranch() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      id: string;
      name: string;
      address: string | null;
      phone: string | null;
    }) => {
      const { data: branch, error } = await supabase
        .from("branches")
        .update({
          name: data.name,
          address: data.address,
          phone: data.phone,
        })
        .eq("id", data.id)
        .select()
        .single();

      if (error) throw error;
      return branch;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["branches"] });
    },
  });
}

export function useSetMainBranch() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ branchId, businessId }: { branchId: string; businessId: string }) => {
      // Remove main from all branches of this business
      const { error: resetError } = await supabase
        .from("branches")
        .update({ is_main: false })
        .eq("business_id", businessId);
      if (resetError) throw resetError;

      // Set the selected branch as main
      const { error } = await supabase
        .from("branches")
        .update({ is_main: true })
        .eq("id", branchId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["branches"] });
    },
  });
}

export function useDeleteBranch() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("branches")
        .update({ is_active: false })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["branches"] });
    },
  });
}
