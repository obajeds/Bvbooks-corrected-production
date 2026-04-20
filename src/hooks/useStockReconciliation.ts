import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useBusiness } from "./useBusiness";
import { useBranchContext } from "@/contexts/BranchContext";
import { toast } from "sonner";
import { withRateLimit } from "@/lib/rateLimiting";

export interface ReconciliationSession {
  id: string;
  business_id: string;
  branch_id: string;
  started_by: string;
  status: string;
  total_items: number;
  items_counted: number;
  items_with_variance: number;
  completed_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface ReconciliationItem {
  id: string;
  reconciliation_id: string;
  product_id: string;
  system_quantity: number;
  physical_quantity: number | null;
  variance: number | null;
  status: string;
  applied_at: string | null;
  applied_by: string | null;
  notes: string | null;
  created_at: string;
  product?: {
    name: string;
    sku: string | null;
    category_id: string | null;
    categories?: { name: string } | null;
  };
}

export function useReconciliationHistory() {
  const { data: business } = useBusiness();
  const { currentBranch } = useBranchContext();

  return useQuery({
    queryKey: ["stock-reconciliations", business?.id, currentBranch?.id],
    queryFn: async (): Promise<ReconciliationSession[]> => {
      if (!business?.id || !currentBranch?.id) return [];

      const { data, error } = await supabase
        .from("stock_reconciliations")
        .select("*")
        .eq("business_id", business.id)
        .eq("branch_id", currentBranch.id)
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;
      return (data || []) as ReconciliationSession[];
    },
    enabled: !!business?.id && !!currentBranch?.id,
  });
}

export function useReconciliationSession(sessionId: string | null) {
  return useQuery({
    queryKey: ["stock-reconciliation-session", sessionId],
    queryFn: async () => {
      if (!sessionId) return null;

      const { data: session, error: sessionError } = await supabase
        .from("stock_reconciliations")
        .select("*")
        .eq("id", sessionId)
        .single();

      if (sessionError) throw sessionError;

      const { data: items, error: itemsError } = await supabase
        .from("stock_reconciliation_items")
        .select(`
          *,
          product:products!stock_reconciliation_items_product_id_fkey(
            name, sku, category_id,
            categories(name)
          )
        `)
        .eq("reconciliation_id", sessionId)
        .order("created_at", { ascending: true });

      if (itemsError) throw itemsError;

      return {
        session: session as ReconciliationSession,
        items: (items || []) as ReconciliationItem[],
      };
    },
    enabled: !!sessionId,
  });
}

export function useStartReconciliation() {
  const queryClient = useQueryClient();
  const { data: business } = useBusiness();
  const { currentBranch } = useBranchContext();

  return useMutation({
    mutationFn: async () => {
      if (!business?.id || !currentBranch?.id) throw new Error("Business/branch required");

      const { data: userData } = await supabase.auth.getUser();
      if (!userData?.user?.id) throw new Error("Not authenticated");

      // Get all branch stock items
      const { data: branchStock, error: stockError } = await supabase
        .from("branch_stock")
        .select("product_id, quantity")
        .eq("business_id", business.id)
        .eq("branch_id", currentBranch.id);

      if (stockError) throw stockError;

      if (!branchStock || branchStock.length === 0) {
        throw new Error("No stock items found for this branch");
      }

      // Create reconciliation session
      const { data: session, error: sessionError } = await supabase
        .from("stock_reconciliations")
        .insert({
          business_id: business.id,
          branch_id: currentBranch.id,
          started_by: userData.user.id,
          status: "in_progress",
          total_items: branchStock.length,
        })
        .select()
        .single();

      if (sessionError) throw sessionError;

      // Snapshot all items
      const itemRows = branchStock.map((bs) => ({
        reconciliation_id: session.id,
        product_id: bs.product_id,
        system_quantity: bs.quantity || 0,
        status: "pending",
      }));

      const { error: insertError } = await supabase
        .from("stock_reconciliation_items")
        .insert(itemRows);

      if (insertError) throw insertError;

      return session as ReconciliationSession;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["stock-reconciliations"] });
      toast.success("Reconciliation session started");
    },
    onError: (error) => {
      toast.error("Failed to start reconciliation", { description: error.message });
    },
  });
}

export function useUpdatePhysicalCount() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      itemId,
      physicalQuantity,
      sessionId,
    }: {
      itemId: string;
      physicalQuantity: number;
      sessionId: string;
    }) => {
      if (physicalQuantity < 0) throw new Error("Physical count cannot be negative");

      const { error } = await supabase
        .from("stock_reconciliation_items")
        .update({
          physical_quantity: physicalQuantity,
          status: "counted",
        })
        .eq("id", itemId);

      if (error) throw error;

      // Update session counters
      const { data: items } = await supabase
        .from("stock_reconciliation_items")
        .select("status, variance")
        .eq("reconciliation_id", sessionId);

      const counted = (items || []).filter((i) => i.status === "counted" || i.status === "applied").length;
      const withVariance = (items || []).filter((i) => i.variance !== null && i.variance !== 0).length;

      await supabase
        .from("stock_reconciliations")
        .update({
          items_counted: counted,
          items_with_variance: withVariance,
          updated_at: new Date().toISOString(),
        })
        .eq("id", sessionId);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["stock-reconciliation-session", variables.sessionId] });
    },
  });
}

export function useApplyReconciliationItem() {
  const queryClient = useQueryClient();
  const { data: business } = useBusiness();

  return useMutation({
    mutationFn: async ({
      item,
      sessionId,
    }: {
      item: ReconciliationItem;
      sessionId: string;
    }) => {
      if (!business?.id) throw new Error("Business not found");

      return withRateLimit("stock-movement", business.id, async () => {
        // Re-fetch authoritative values from DB to prevent stale-state race condition
        const { data: freshItem, error: freshError } = await supabase
          .from("stock_reconciliation_items")
          .select("physical_quantity, system_quantity, variance, status")
          .eq("id", item.id)
          .single();

        if (freshError || !freshItem) throw new Error("Reconciliation item not found");
        if (freshItem.status === "applied") throw new Error("Already applied");
        if (freshItem.physical_quantity === null || freshItem.physical_quantity === undefined) {
          throw new Error("Physical count is required");
        }
        if (freshItem.physical_quantity < 0) throw new Error("Physical count cannot be negative");
        if (freshItem.variance === null || freshItem.variance === 0) {
          throw new Error("No variance to apply");
        }

        const { data: userData } = await supabase.auth.getUser();
        const authUserId = userData?.user?.id || null;

        // Get session for branch_id
        const { data: session } = await supabase
          .from("stock_reconciliations")
          .select("branch_id")
          .eq("id", sessionId)
          .single();

        if (!session) throw new Error("Session not found");

        const branchId = session.branch_id;
        const newQuantity = freshItem.physical_quantity!;
        const previousQuantity = freshItem.system_quantity;
        const variance = freshItem.variance!;

        const idempotencyKey = `recon_${business.id}_${item.product_id}_${sessionId}`;

        // Update branch_stock
        const { error: bsError } = await supabase
          .from("branch_stock")
          .upsert(
            {
              business_id: business.id,
              branch_id: branchId,
              product_id: item.product_id,
              quantity: newQuantity,
            },
            { onConflict: "branch_id,product_id" }
          );

        if (bsError) throw bsError;

        // Recalculate global stock
        const { data: allBranchStock } = await supabase
          .from("branch_stock")
          .select("quantity")
          .eq("product_id", item.product_id)
          .eq("business_id", business.id);

        const globalTotal = (allBranchStock || []).reduce((sum, row) => sum + (row.quantity || 0), 0);

        await supabase
          .from("products")
          .update({ stock_quantity: globalTotal })
          .eq("id", item.product_id);

        // Create stock movement audit record
        const movementType = variance > 0 ? "in" : "out";
        const { error: movementError } = await supabase
          .from("stock_movements")
          .insert({
            business_id: business.id,
            product_id: item.product_id,
            branch_id: branchId,
            movement_type: movementType,
            quantity: Math.abs(variance),
            previous_quantity: previousQuantity,
            new_quantity: newQuantity,
            created_by: authUserId,
            reference_id: sessionId,
            reference_type: "reconciliation",
            notes: `Reconciliation: ${variance > 0 ? "+" : ""}${variance} (system: ${previousQuantity}, physical: ${newQuantity})`,
            idempotency_key: idempotencyKey,
          });

        if (movementError) {
          if (movementError.code === "23505" && idempotencyKey) {
            // Already applied — idempotent
          } else {
            throw movementError;
          }
        }

        // Mark item as applied
        await supabase
          .from("stock_reconciliation_items")
          .update({
            status: "applied",
            applied_at: new Date().toISOString(),
            applied_by: authUserId,
          })
          .eq("id", item.id);

        return { newQuantity };
      });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["stock-reconciliation-session", variables.sessionId] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["branch-stock"] });
      queryClient.invalidateQueries({ queryKey: ["stock-movements"] });
    },
    onError: (error) => {
      toast.error("Failed to apply reconciliation", { description: error.message });
    },
  });
}

export function useCompleteReconciliation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (sessionId: string) => {
      const { error } = await supabase
        .from("stock_reconciliations")
        .update({
          status: "completed",
          completed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", sessionId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["stock-reconciliations"] });
      queryClient.invalidateQueries({ queryKey: ["stock-reconciliation-session"] });
      toast.success("Reconciliation completed");
    },
    onError: (error) => {
      toast.error("Failed to complete reconciliation", { description: error.message });
    },
  });
}
