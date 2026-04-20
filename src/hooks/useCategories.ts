import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useBusiness } from "./useBusiness";
import type { Tables, TablesInsert } from "@/integrations/supabase/types";

type Category = Tables<"categories">;

export function useCategories() {
  const { data: business } = useBusiness();

  return useQuery({
    queryKey: ["categories", business?.id],
    queryFn: async (): Promise<Category[]> => {
      if (!business) return [];

      const { data, error } = await supabase
        .from("categories")
        .select("*")
        .eq("business_id", business.id)
        .order("name", { ascending: true });

      if (error) throw error;
      return data || [];
    },
    enabled: !!business?.id,
    staleTime: 5 * 60 * 1000,
  });
}

export function useCreateCategory() {
  const queryClient = useQueryClient();
  const { data: business } = useBusiness();

  return useMutation({
    mutationFn: async (data: Omit<TablesInsert<"categories">, "business_id">) => {
      if (!business) throw new Error("No business found");

      const { data: category, error } = await supabase
        .from("categories")
        .insert({ ...data, business_id: business.id })
        .select()
        .single();

      if (error) throw error;
      return category;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
    },
  });
}

export function useUpdateCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...data }: Partial<Category> & { id: string }) => {
      const { data: category, error } = await supabase
        .from("categories")
        .update(data)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return category;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
    },
  });
}

export function useDeleteCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("categories").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
    },
  });
}
