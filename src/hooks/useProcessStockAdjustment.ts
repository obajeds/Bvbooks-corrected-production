import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useBusiness } from "./useBusiness";
import { withRateLimit } from "@/lib/rateLimiting";

interface ProcessAdjustmentParams {
  requestId: string;
  productId: string;
  adjustmentType: "increase" | "decrease";
  quantity: number;
  previousQuantity: number;
  branchId?: string | null;
  staffId: string;
  notes?: string;
  idempotencyKey?: string;
}

export function useProcessStockAdjustment() {
  const queryClient = useQueryClient();
  const { data: business } = useBusiness();

  return useMutation({
    mutationFn: async ({
      requestId,
      productId,
      adjustmentType,
      quantity,
      previousQuantity,
      branchId,
      staffId,
      notes,
      idempotencyKey,
    }: ProcessAdjustmentParams) => {
      if (!business?.id) throw new Error("Business not found");

      return withRateLimit('stock-movement', business.id, async () => {
        // Calculate new quantity
        const newQuantity = adjustmentType === "increase"
          ? previousQuantity + quantity
          : previousQuantity - quantity;

        if (newQuantity < 0) {
          throw new Error("Stock adjustment would result in negative stock");
        }

        if (!branchId) throw new Error("Branch ID is required for stock adjustments");

        // Update branch_stock
        const { error: branchStockError } = await supabase
          .from("branch_stock")
          .upsert(
            {
              business_id: business.id,
              branch_id: branchId,
              product_id: productId,
              quantity: newQuantity,
            },
            { onConflict: "branch_id,product_id" }
          );

        if (branchStockError) throw branchStockError;

        // Recalculate global stock as SUM of all branches
        const { data: allBranchStock, error: sumError } = await supabase
          .from("branch_stock")
          .select("quantity")
          .eq("product_id", productId)
          .eq("business_id", business.id);

        if (sumError) console.error("Failed to fetch branch stock sum:", sumError);

        const globalTotal = (allBranchStock || []).reduce((sum, row) => sum + (row.quantity || 0), 0);

        const { error: productError } = await supabase
          .from("products")
          .update({ stock_quantity: globalTotal })
          .eq("id", productId);
        if (productError) console.error("Global stock sync error:", productError);

        // Get authenticated user ID for identity attribution
        const { data: userData } = await supabase.auth.getUser();
        const authUserId = userData?.user?.id || null;

        // Create stock movement record
        const movementType = adjustmentType === "increase" ? "in" : "out";
        const { error: movementError } = await supabase
          .from("stock_movements")
          .insert({
            business_id: business.id,
            product_id: productId,
            branch_id: branchId || null,
            movement_type: movementType,
            quantity: quantity,
            previous_quantity: previousQuantity,
            new_quantity: newQuantity,
            created_by: authUserId,
            reference_id: requestId,
            reference_type: "approval_request",
            notes: notes || `Stock ${movementType === "in" ? "In" : "Out"} of ${quantity}`,
            ...(idempotencyKey ? { idempotency_key: idempotencyKey } : {}),
          });

        if (movementError) {
          // Handle duplicate idempotency key as success
          if (movementError.code === "23505" && idempotencyKey) {
            return { newQuantity };
          }
          throw movementError;
        }

        return { newQuantity };
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["branch-stock"] });
      queryClient.invalidateQueries({ queryKey: ["stock-movements"] });
      toast.success("Stock adjustment processed successfully");
    },
    onError: (error) => {
      toast.error("Failed to process adjustment", { description: error.message });
    },
  });
}
