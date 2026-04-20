import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useBusiness } from "./useBusiness";

export interface BranchProductPrice {
  id: string;
  business_id: string;
  branch_id: string;
  product_id: string;
  selling_price: number;
  cost_price: number | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export function useBranchProductPrices(branchId: string | undefined) {
  const { data: business } = useBusiness();

  return useQuery({
    queryKey: ["branch-product-prices", branchId],
    queryFn: async (): Promise<BranchProductPrice[]> => {
      if (!business?.id || !branchId) return [];

      const { data, error } = await supabase
        .from("branch_product_prices")
        .select("*")
        .eq("business_id", business.id)
        .eq("branch_id", branchId)
        .eq("is_active", true);

      if (error) throw error;
      return data || [];
    },
    enabled: !!business?.id && !!branchId,
  });
}

export function useProductBranchPrices(productId: string | undefined) {
  const { data: business } = useBusiness();

  return useQuery({
    queryKey: ["product-branch-prices", productId],
    queryFn: async (): Promise<BranchProductPrice[]> => {
      if (!business?.id || !productId) return [];

      const { data, error } = await supabase
        .from("branch_product_prices")
        .select("*")
        .eq("business_id", business.id)
        .eq("product_id", productId)
        .eq("is_active", true);

      if (error) throw error;
      return data || [];
    },
    enabled: !!business?.id && !!productId,
  });
}

export function useSetBranchProductPrice() {
  const queryClient = useQueryClient();
  const { data: business } = useBusiness();

  return useMutation({
    mutationFn: async (data: {
      branch_id: string;
      product_id: string;
      selling_price: number;
      cost_price?: number | null;
    }) => {
      if (!business?.id) throw new Error("No business found");

      // Check if price already exists
      const { data: existing } = await supabase
        .from("branch_product_prices")
        .select("id")
        .eq("business_id", business.id)
        .eq("branch_id", data.branch_id)
        .eq("product_id", data.product_id)
        .single();

      if (existing) {
        // Update existing price
        const { data: updated, error } = await supabase
          .from("branch_product_prices")
          .update({
            selling_price: data.selling_price,
            cost_price: data.cost_price ?? null,
            is_active: true,
          })
          .eq("id", existing.id)
          .select()
          .single();

        if (error) throw error;
        return updated;
      } else {
        // Insert new price
        const { data: inserted, error } = await supabase
          .from("branch_product_prices")
          .insert({
            business_id: business.id,
            branch_id: data.branch_id,
            product_id: data.product_id,
            selling_price: data.selling_price,
            cost_price: data.cost_price ?? null,
          })
          .select()
          .single();

        if (error) throw error;
        return inserted;
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["branch-product-prices", variables.branch_id] });
      queryClient.invalidateQueries({ queryKey: ["product-branch-prices", variables.product_id] });
    },
  });
}

export function useDeleteBranchProductPrice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("branch_product_prices")
        .update({ is_active: false })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["branch-product-prices"] });
      queryClient.invalidateQueries({ queryKey: ["product-branch-prices"] });
    },
  });
}
