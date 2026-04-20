import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useBusiness } from "./useBusiness";
import { withRateLimit } from "@/lib/rateLimiting";

interface ProcessTransferParams {
  requestId: string;
  productId: string;
  fromBranchId: string;
  toBranchId: string;
  quantity: number;
  staffId: string;
  notes?: string;
  idempotencyKey?: string;
}

export function useProcessStockTransfer() {
  const queryClient = useQueryClient();
  const { data: business } = useBusiness();

  return useMutation({
    mutationFn: async ({
      requestId,
      productId,
      fromBranchId,
      toBranchId,
      quantity,
      staffId,
      notes,
      idempotencyKey,
    }: ProcessTransferParams) => {
      if (!business?.id) throw new Error("Business not found");

      return withRateLimit('stock-movement', business.id, async () => {
        // Get product name
        const { data: product, error: productError } = await supabase
          .from("products")
          .select("name")
          .eq("id", productId)
          .single();

        if (productError) throw productError;
        if (!product) throw new Error("Product not found");

        // Get branch-specific stock for source branch
        const { data: branchStock, error: bsError } = await supabase
          .from("branch_stock")
          .select("quantity")
          .eq("product_id", productId)
          .eq("branch_id", fromBranchId)
          .maybeSingle();

        if (bsError) throw bsError;
        const currentStock = branchStock?.quantity ?? 0;

        if (currentStock < quantity) {
          throw new Error(`Insufficient branch stock. Available: ${currentStock}, Requested: ${quantity}`);
        }

        // Get branch names for notes
        const { data: fromBranch } = await supabase
          .from("branches")
          .select("name")
          .eq("id", fromBranchId)
          .single();

        const { data: toBranch } = await supabase
          .from("branches")
          .select("name")
          .eq("id", toBranchId)
          .single();

        // Record outgoing movement from source branch
        const { error: outMovementError } = await supabase
          .from("stock_movements")
          .insert({
            business_id: business.id,
            product_id: productId,
            branch_id: fromBranchId,
            movement_type: "transfer_out",
            quantity: -quantity,
            previous_quantity: currentStock,
            new_quantity: currentStock - quantity,
            created_by: staffId,
            reference_id: requestId,
            reference_type: "stock_transfer",
            notes: notes || `Transfer to ${toBranch?.name || 'branch'}`,
            ...(idempotencyKey ? { idempotency_key: `${idempotencyKey}_out` } : {}),
          });

        if (outMovementError) {
          if (outMovementError.code === "23505" && idempotencyKey) {
            return { success: true, productName: product.name };
          }
          throw outMovementError;
        }

        // Record incoming movement to destination branch
        const { error: inMovementError } = await supabase
          .from("stock_movements")
          .insert({
            business_id: business.id,
            product_id: productId,
            branch_id: toBranchId,
            movement_type: "transfer_in",
            quantity: quantity,
            previous_quantity: currentStock,
            new_quantity: currentStock,
            created_by: staffId,
            reference_id: requestId,
            reference_type: "stock_transfer",
            notes: notes || `Transfer from ${fromBranch?.name || 'branch'}`,
            ...(idempotencyKey ? { idempotency_key: `${idempotencyKey}_in` } : {}),
          });

        if (inMovementError) {
          if (inMovementError.code === "23505" && idempotencyKey) {
            return { success: true, productName: product.name };
          }
          throw inMovementError;
        }

        // Update branch_stock: decrement from source, increment to destination
        const { error: decError } = await supabase.rpc("atomic_decrement_stock", {
          p_product_id: productId,
          p_quantity: quantity,
          p_business_id: business.id,
          p_branch_id: fromBranchId,
        });
        if (decError) throw decError;

        // Increment destination branch (upsert)
        const { data: destStock } = await supabase
          .from("branch_stock")
          .select("quantity")
          .eq("product_id", productId)
          .eq("branch_id", toBranchId)
          .maybeSingle();

        const destQty = (destStock?.quantity ?? 0) + quantity;
        const { error: upsertError } = await supabase.from("branch_stock").upsert(
          {
            business_id: business.id,
            branch_id: toBranchId,
            product_id: productId,
            quantity: destQty,
          },
          { onConflict: "branch_id,product_id" }
        );
        if (upsertError) throw upsertError;

        return { success: true, productName: product.name };
      });
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["stock-movements"] });
      queryClient.invalidateQueries({ queryKey: ["approval-requests"] });
      queryClient.invalidateQueries({ queryKey: ["branch-stock"] });
      toast.success("Stock transfer completed", {
        description: `${data.productName} transferred successfully.`
      });
    },
    onError: (error) => {
      toast.error("Failed to process transfer", { description: error.message });
    },
  });
}
