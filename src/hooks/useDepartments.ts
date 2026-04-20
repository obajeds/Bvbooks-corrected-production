import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useBusiness } from "./useBusiness";
import type { Tables, TablesInsert } from "@/integrations/supabase/types";

type Department = Tables<"departments">;

export function useDepartments() {
  const { data: business } = useBusiness();

  return useQuery({
    queryKey: ["departments", business?.id],
    queryFn: async () => {
      if (!business) return [];

      const { data, error } = await supabase
        .from("departments")
        .select("*")
        .eq("business_id", business.id)
        .order("name", { ascending: true });

      if (error) throw error;
      return data || [];
    },
    enabled: !!business?.id,
  });
}

export function useCreateDepartment() {
  const queryClient = useQueryClient();
  const { data: business } = useBusiness();

  return useMutation({
    mutationFn: async (data: Omit<TablesInsert<"departments">, "business_id">) => {
      if (!business) throw new Error("No business found");

      const { data: dept, error } = await supabase
        .from("departments")
        .insert({ ...data, business_id: business.id })
        .select()
        .single();

      if (error) throw error;
      return dept;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["departments"] });
    },
  });
}

export function useUpdateDepartment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...data }: Partial<Department> & { id: string }) => {
      const { data: dept, error } = await supabase
        .from("departments")
        .update(data)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return dept;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["departments"] });
    },
  });
}

export function useDeleteDepartment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("departments").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["departments"] });
    },
  });
}
