import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useBusiness } from "./useBusiness";
import type { Tables, TablesInsert } from "@/integrations/supabase/types";

type PurchaseOrder = Tables<"purchase_orders">;

export interface PurchaseOrderRequest {
  id: string;
  po_number: string;
  supplier_name: string;
  total_amount: number;
  expected_date: string | null;
  notes: string | null;
  status: string;
  created_at: string;
  resolved_at: string | null;
  approved_by_name: string | null;
  source: "approval_request";
}

export function usePurchaseOrderRequests() {
  const { data: business } = useBusiness();

  return useQuery({
    queryKey: ["purchase_order_requests", business?.id],
    queryFn: async () => {
      if (!business) return [];

      const { data, error } = await supabase
        .from("approval_requests")
        .select("*, approver:approved_by(full_name)")
        .eq("business_id", business.id)
        .eq("request_type", "purchase_order")
        .order("created_at", { ascending: false });

      if (error) throw error;

      return (data || []).map((req: any): PurchaseOrderRequest => {
        let parsed: any = {};
        try {
          parsed = typeof req.notes === "string" ? JSON.parse(req.notes) : {};
        } catch {}

        return {
          id: req.id,
          po_number: parsed.poNumber || "—",
          supplier_name: parsed.supplierName || "Unknown",
          total_amount: parsed.totalAmount ?? req.amount ?? 0,
          expected_date: parsed.expectedDate || null,
          notes: parsed.orderNotes || null,
          status: req.status,
          created_at: req.created_at,
          resolved_at: req.resolved_at || null,
          approved_by_name: req.approver?.full_name || null,
          source: "approval_request",
        };
      });
    },
    enabled: !!business?.id,
  });
}

export function usePurchaseOrders() {
  const { data: business } = useBusiness();

  return useQuery({
    queryKey: ["purchase_orders", business?.id],
    queryFn: async () => {
      if (!business) return [];

      const { data, error } = await supabase
        .from("purchase_orders")
        .select("*, suppliers(name)")
        .eq("business_id", business.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!business?.id,
  });
}

export function useCreatePurchaseOrder() {
  const queryClient = useQueryClient();
  const { data: business } = useBusiness();

  return useMutation({
    mutationFn: async (data: Omit<TablesInsert<"purchase_orders">, "business_id">) => {
      if (!business) throw new Error("No business found");

      const { data: order, error } = await supabase
        .from("purchase_orders")
        .insert({ ...data, business_id: business.id })
        .select()
        .single();

      if (error) throw error;
      return order;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["purchase_orders"] });
    },
  });
}

export function useUpdatePurchaseOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...data }: Partial<PurchaseOrder> & { id: string }) => {
      const { data: order, error } = await supabase
        .from("purchase_orders")
        .update(data)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return order;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["purchase_orders"] });
    },
  });
}

export function useDeletePurchaseOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("purchase_orders").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["purchase_orders"] });
    },
  });
}
