import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useBusiness } from "./useBusiness";
import { useBranchContext } from "@/contexts/BranchContext";
import { toast } from "sonner";

export type FuelType = 'pms' | 'ago' | 'dpk' | 'lpg';
export type PumpUnit = 'L' | 'Kg';

export interface Pump {
  id: string;
  business_id: string;
  branch_id: string;
  name: string;
  fuel_type: FuelType;
  unit: PumpUnit;
  price_per_liter: number;
  current_meter_reading: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export function usePumps(branchId?: string) {
  const { data: business } = useBusiness();
  const { currentBranch } = useBranchContext();
  const targetBranchId = branchId || currentBranch?.id;

  return useQuery({
    queryKey: ["pumps", business?.id, targetBranchId],
    queryFn: async () => {
      if (!business?.id || !targetBranchId) return [];

      const { data, error } = await supabase
        .from("pumps")
        .select("*")
        .eq("business_id", business.id)
        .eq("branch_id", targetBranchId)
        .eq("is_active", true)
        .order("name");

      if (error) throw error;
      return data as Pump[];
    },
    enabled: !!business?.id && !!targetBranchId,
  });
}

export function useCreatePump() {
  const queryClient = useQueryClient();
  const { data: business } = useBusiness();

  return useMutation({
    mutationFn: async (pump: Omit<Pump, 'id' | 'business_id' | 'created_at' | 'updated_at'>) => {
      if (!business?.id) throw new Error("No business found");

      const { data, error } = await supabase
        .from("pumps")
        .insert({
          ...pump,
          business_id: business.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pumps"] });
      toast.success("Pump created successfully");
    },
    onError: (error: Error) => {
      toast.error(`Failed to create pump: ${error.message}`);
    },
  });
}

export function useUpdatePump() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Pump> & { id: string }) => {
      const { data, error } = await supabase
        .from("pumps")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pumps"] });
      queryClient.invalidateQueries({ queryKey: ["previous-closing-meter"] });
      toast.success("Pump updated successfully");
    },
    onError: (error: Error) => {
      toast.error(`Failed to update pump: ${error.message}`);
    },
  });
}

export function useDeletePump() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("pumps")
        .update({ is_active: false })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pumps"] });
      toast.success("Pump deleted successfully");
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete pump: ${error.message}`);
    },
  });
}
