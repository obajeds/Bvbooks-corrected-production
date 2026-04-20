import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useBusiness } from "./useBusiness";
import { useBranchContext } from "@/contexts/BranchContext";
import { useAuth } from "@/contexts/AuthContext";

export interface StockMovementData {
  id: string;
  product_id: string;
  movement_type: string;
  quantity: number;
  notes: string | null;
  created_at: string;
  previous_quantity: number;
  new_quantity: number;
  branch_id: string | null;
  reference_id?: string | null;
  reference_type?: string | null;
  products?: { name: string } | null;
  created_by?: string | null;
  branches?: { name: string } | null;
}

interface StockMovement {
  id: string;
  product?: { name: string } | null;
  type: "in" | "out" | "adjustment" | "transfer";
  quantity: number;
  created_at: string;
}

export function useRecentStockMovements(limit: number = 5) {
  const { data: business } = useBusiness();
  const { currentBranch } = useBranchContext();
  const branchId = currentBranch?.id;

  return useQuery({
    queryKey: ["recent-stock-movements", business?.id, branchId, limit],
    queryFn: async (): Promise<StockMovement[]> => {
      if (!business?.id || !branchId) return [];

      const { data, error } = await supabase
        .from("stock_movements")
        .select(`
          id,
          movement_type,
          quantity,
          created_at,
          product:products (name)
        `)
        .eq("business_id", business.id)
        .eq("branch_id", branchId)
        .order("created_at", { ascending: false })
        .limit(limit);

      if (error) throw error;

      return (data || []).map(item => ({
        id: item.id,
        product: item.product,
        type: item.movement_type as "in" | "out" | "adjustment" | "transfer",
        quantity: item.quantity,
        created_at: item.created_at,
      }));
    },
    enabled: !!business?.id && !!branchId,
  });
}

interface StockMovementsFilter {
  startDate?: Date;
  endDate?: Date;
  branchId?: string;
}

export function useStockMovements(filter?: StockMovementsFilter) {
  const { data: business } = useBusiness();
  const { currentBranch } = useBranchContext();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const effectiveBranchId = filter?.branchId || currentBranch?.id;

  const query = useQuery({
    queryKey: ["stock-movements", business?.id, filter?.startDate?.toISOString(), filter?.endDate?.toISOString(), effectiveBranchId],
    queryFn: async (): Promise<StockMovementData[]> => {
      if (!business?.id || !effectiveBranchId) return [];

      let queryBuilder = supabase
        .from("stock_movements")
        .select(`
          id,
          product_id,
          movement_type,
          quantity,
          notes,
          created_at,
          previous_quantity,
          new_quantity,
          branch_id,
          created_by,
          reference_id,
          reference_type,
          products (name)
        `)
        .eq("business_id", business.id)
        .eq("branch_id", effectiveBranchId)
        .order("created_at", { ascending: false })
        .limit(500);

      if (filter?.startDate) {
        queryBuilder = queryBuilder.gte("created_at", filter.startDate.toISOString());
      }
      if (filter?.endDate) {
        queryBuilder = queryBuilder.lte("created_at", filter.endDate.toISOString());
      }

      const { data, error } = await queryBuilder;

      if (error) throw error;
      
      // Cast to expected type
      return (data || []).map(item => ({
        ...item,
        branches: null // Will be populated separately if needed
      })) as StockMovementData[];
    },
    enabled: !!business?.id && !!effectiveBranchId,
  });

  const createStockMovement = useMutation({
    mutationFn: async (movement: {
      business_id: string;
      branch_id: string | null;
      product_id: string;
      movement_type: string;
      quantity: number;
      previous_quantity: number;
      new_quantity: number;
      notes: string | null;
      created_by?: string | null;
    }) => {
      const { data: userData } = await supabase.auth.getUser();
      
      const { error: movementError } = await supabase
        .from("stock_movements")
        .insert({
          ...movement,
          created_by: userData?.user?.id || null,
        });

      if (movementError) throw movementError;

      const { error: productError } = await supabase
        .from("products")
        .update({ stock_quantity: movement.new_quantity })
        .eq("id", movement.product_id);

      if (productError) throw productError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["stock-movements"] });
      queryClient.invalidateQueries({ queryKey: ["recent-stock-movements"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
    },
  });

  const updateStockMovement = useMutation({
    mutationFn: async ({
      id,
      notes,
      quantity,
      movement_type,
      product_id,
      old_quantity,
    }: {
      id: string;
      notes?: string;
      quantity?: number;
      movement_type?: string;
      product_id: string;
      old_quantity: number;
    }) => {
      const { data: product, error: fetchError } = await supabase
        .from("products")
        .select("stock_quantity")
        .eq("id", product_id)
        .single();

      if (fetchError) throw fetchError;

      let newProductStock = product.stock_quantity;
      if (quantity !== undefined && quantity !== old_quantity) {
        const stockDiff = quantity - old_quantity;
        newProductStock = product.stock_quantity + stockDiff;
      }

      const updateData: Record<string, any> = {};
      if (notes !== undefined) updateData.notes = notes;
      if (quantity !== undefined) {
        updateData.quantity = quantity;
        updateData.new_quantity = newProductStock;
      }
      if (movement_type !== undefined) updateData.movement_type = movement_type;

      const { error: updateError } = await supabase
        .from("stock_movements")
        .update(updateData)
        .eq("id", id);

      if (updateError) throw updateError;

      if (quantity !== undefined && quantity !== old_quantity) {
        const { error: productError } = await supabase
          .from("products")
          .update({ stock_quantity: newProductStock })
          .eq("id", product_id);

        if (productError) throw productError;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["stock-movements"] });
      queryClient.invalidateQueries({ queryKey: ["recent-stock-movements"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
    },
  });

  const deleteStockMovement = useMutation({
    mutationFn: async ({
      id,
      product_id,
      quantity,
    }: {
      id: string;
      product_id: string;
      quantity: number;
    }) => {
      const { data: product, error: fetchError } = await supabase
        .from("products")
        .select("stock_quantity")
        .eq("id", product_id)
        .single();

      if (fetchError) throw fetchError;

      const newStock = product.stock_quantity - quantity;

      const { error: deleteError } = await supabase
        .from("stock_movements")
        .delete()
        .eq("id", id);

      if (deleteError) throw deleteError;

      const { error: productError } = await supabase
        .from("products")
        .update({ stock_quantity: newStock })
        .eq("id", product_id);

      if (productError) throw productError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["stock-movements"] });
      queryClient.invalidateQueries({ queryKey: ["recent-stock-movements"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
    },
  });

  return {
    ...query,
    createStockMovement,
    updateStockMovement,
    deleteStockMovement,
  };
}
