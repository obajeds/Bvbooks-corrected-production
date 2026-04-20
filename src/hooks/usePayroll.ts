import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useBusiness } from "./useBusiness";
import type { Tables, TablesInsert } from "@/integrations/supabase/types";

type Payroll = Tables<"payroll">;

export function usePayroll() {
  const { data: business } = useBusiness();

  return useQuery({
    queryKey: ["payroll", business?.id],
    queryFn: async () => {
      if (!business) return [];

      const { data, error } = await supabase
        .from("payroll")
        .select("*, staff(full_name)")
        .eq("business_id", business.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!business?.id,
  });
}

export function useCreatePayroll() {
  const queryClient = useQueryClient();
  const { data: business } = useBusiness();

  return useMutation({
    mutationFn: async (data: Omit<TablesInsert<"payroll">, "business_id">) => {
      if (!business) throw new Error("No business found");

      const net_salary = (data.basic_salary || 0) + (data.allowances || 0) - (data.deductions || 0);

      const { data: payroll, error } = await supabase
        .from("payroll")
        .insert({ ...data, business_id: business.id, net_salary })
        .select()
        .single();

      if (error) throw error;
      return payroll;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payroll"] });
    },
  });
}

export function useProcessPayroll() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase
        .from("payroll")
        .update({ status: "paid", paid_at: new Date().toISOString() })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payroll"] });
    },
  });
}
