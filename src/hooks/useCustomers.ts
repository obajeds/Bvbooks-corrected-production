import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useBusiness } from "./useBusiness";
import type { Tables, TablesInsert } from "@/integrations/supabase/types";

type Customer = Tables<"customers">;

export function useCustomers() {
  const { data: business } = useBusiness();

  return useQuery({
    queryKey: ["customers", business?.id],
    queryFn: async (): Promise<Customer[]> => {
      if (!business) return [];

      const { data, error } = await supabase
        .from("customers")
        .select("*")
        .eq("business_id", business.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!business?.id,
    staleTime: 5 * 60 * 1000,
  });
}

export function useCreateCustomer() {
  const queryClient = useQueryClient();
  const { data: business } = useBusiness();

  return useMutation({
    mutationFn: async (data: Omit<TablesInsert<"customers">, "business_id">) => {
      if (!business) throw new Error("No business found");

      const { error } = await supabase
        .from("customers")
        .insert({ ...data, business_id: business.id });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customers"] });
    },
  });
}

export function useUpdateCustomer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...data }: Partial<Customer> & { id: string }) => {
      const { data: customer, error } = await supabase
        .from("customers")
        .update(data)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return customer;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customers"] });
    },
  });
}

export function useDeleteCustomer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("customers").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customers"] });
    },
  });
}
