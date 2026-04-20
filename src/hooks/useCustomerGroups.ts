import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useBusiness } from "./useBusiness";

interface CustomerGroup {
  id: string;
  business_id: string;
  name: string;
  description: string | null;
  credit_limit: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export function useCustomerGroups() {
  const { data: business } = useBusiness();

  return useQuery({
    queryKey: ["customer_groups", business?.id],
    queryFn: async () => {
      if (!business) return [];

      const { data, error } = await supabase
        .from("customer_groups")
        .select("*")
        .eq("business_id", business.id)
        .order("name", { ascending: true });

      if (error) throw error;
      return (data || []) as CustomerGroup[];
    },
    enabled: !!business?.id,
  });
}

export function useCreateCustomerGroup() {
  const queryClient = useQueryClient();
  const { data: business } = useBusiness();

  return useMutation({
    mutationFn: async (data: { name: string; description?: string; credit_limit?: number }) => {
      if (!business) throw new Error("No business found");

      const { data: group, error } = await supabase
        .from("customer_groups")
        .insert({ ...data, business_id: business.id })
        .select()
        .single();

      if (error) throw error;
      return group as CustomerGroup;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customer_groups"] });
    },
  });
}

export function useUpdateCustomerGroup() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...data }: Partial<CustomerGroup> & { id: string }) => {
      const { data: group, error } = await supabase
        .from("customer_groups")
        .update(data)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return group as CustomerGroup;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customer_groups"] });
    },
  });
}

export function useDeleteCustomerGroup() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("customer_groups").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customer_groups"] });
    },
  });
}
