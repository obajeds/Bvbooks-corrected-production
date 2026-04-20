import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useBusiness } from "./useBusiness";
import { useBranchContext } from "@/contexts/BranchContext";

export interface BranchStockItem {
  id: string;
  business_id: string;
  branch_id: string;
  product_id: string;
  quantity: number;
  low_stock_threshold: number;
  created_at: string;
  updated_at: string;
}

export function useBranchStock(branchId?: string) {
  const { data: business } = useBusiness();
  const { currentBranch } = useBranchContext();
  const effectiveBranchId = branchId || currentBranch?.id;

  return useQuery({
    queryKey: ["branch-stock", business?.id, effectiveBranchId],
    queryFn: async (): Promise<BranchStockItem[]> => {
      if (!business?.id || !effectiveBranchId) return [];

      const { data, error } = await supabase
        .from("branch_stock")
        .select("*")
        .eq("business_id", business.id)
        .eq("branch_id", effectiveBranchId);

      if (error) throw error;
      return (data || []) as BranchStockItem[];
    },
    enabled: !!business?.id && !!effectiveBranchId,
    staleTime: 5 * 60 * 1000,
  });
}

export function useUpsertBranchStock() {
  const queryClient = useQueryClient();
  const { data: business } = useBusiness();

  return useMutation({
    mutationFn: async ({
      branchId,
      productId,
      quantity,
      lowStockThreshold,
    }: {
      branchId: string;
      productId: string;
      quantity: number;
      lowStockThreshold?: number;
    }) => {
      if (!business?.id) throw new Error("No business found");

      const { data, error } = await supabase
        .from("branch_stock")
        .upsert(
          {
            business_id: business.id,
            branch_id: branchId,
            product_id: productId,
            quantity,
            low_stock_threshold: lowStockThreshold ?? 0,
          },
          { onConflict: "branch_id,product_id" }
        )
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["branch-stock"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
    },
  });
}
