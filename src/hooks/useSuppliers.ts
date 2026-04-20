import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useBusiness } from "./useBusiness";
import type { Tables, TablesInsert } from "@/integrations/supabase/types";

type Supplier = Tables<"suppliers">;

export function useSuppliers() {
  const { data: business } = useBusiness();

  return useQuery({
    queryKey: ["suppliers", business?.id],
    queryFn: async (): Promise<Supplier[]> => {
      if (!business) return [];

      const { data, error } = await supabase
        .from("suppliers")
        .select("*")
        .eq("business_id", business.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!business?.id,
  });
}

export function useCreateSupplier() {
  const queryClient = useQueryClient();
  const { data: business } = useBusiness();

  return useMutation({
    mutationFn: async (data: Omit<TablesInsert<"suppliers">, "business_id">) => {
      if (!business) throw new Error("No business found");

      const { data: supplier, error } = await supabase
        .from("suppliers")
        .insert({ ...data, business_id: business.id })
        .select()
        .single();

      if (error) throw error;
      return supplier;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["suppliers"] });
    },
  });
}

export function useUpdateSupplier() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...data }: Partial<Supplier> & { id: string }) => {
      const { data: supplier, error } = await supabase
        .from("suppliers")
        .update(data)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return supplier;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["suppliers"] });
    },
  });
}

export function useDeleteSupplier() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("suppliers").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["suppliers"] });
    },
  });
}
