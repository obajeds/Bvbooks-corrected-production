import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useBusiness } from "./useBusiness";
import { useAuditLog } from "./useAuditLog";
import { useAuth } from "@/contexts/AuthContext";
import type { Tables } from "@/integrations/supabase/types";

export type Sale = Tables<"sales"> & {
  sale_items?: Tables<"sale_items">[];
  customer?: { id: string; name: string; email?: string | null; phone?: string | null } | null;
  created_by?: string | null;
};

export interface SaleItem {
  id: string;
  sale_id: string;
  product_id: string | null;
  product_name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  created_at: string;
}

export interface CreateSaleInput {
  branch_id?: string;
  customer_id?: string | null;
  subtotal: number;
  discount_amount?: number;
  tax_amount?: number;
  total_amount: number;
  payment_method: string;
  payment_status?: string;
  notes?: string | null;
  // New discount tracking fields
  discount_type?: "rewards_redemption" | "company_discount" | null;
  discount_reason?: string | null;
  discount_approved_by?: string | null;
  rewards_redeemed_value?: number;
  items: {
    product_id: string;
    product_name: string;
    quantity: number;
    unit_price: number;
    total_price: number;
    cost_price?: number;
    discount?: number;
  }[];
}

export interface UseSalesOptions {
  branchId?: string;
  staffFilter?: string; // filter by specific staff user_id (for managers)
  userRole?: string | null; // current user's role
  userId?: string; // current user's auth uid
}

export function useSales(branchIdOrOptions?: string | UseSalesOptions) {
  const { data: business } = useBusiness();

  // Support both legacy string param and new options object
  const options: UseSalesOptions = typeof branchIdOrOptions === "string"
    ? { branchId: branchIdOrOptions }
    : branchIdOrOptions || {};

  const { branchId, staffFilter, userRole, userId } = options;

  // Determine if the current role is restricted to own sales only
  const isRestrictedRole = userRole && ["cashier", "sales_rep"].includes(userRole.toLowerCase());

  return useQuery({
    queryKey: ["sales", business?.id, branchId, staffFilter, userRole, userId],
    queryFn: async (): Promise<Sale[]> => {
      if (!business?.id) return [];

      let query = supabase
        .from("sales")
        .select(`
          id, invoice_number, total_amount, payment_method, payment_status,
          created_at, created_by, branch_id, discount_amount, tax_amount,
          subtotal, notes, customer_id, business_id,
          discount_type, discount_reason, discount_approved_by, rewards_redeemed_value,
          sale_items (*),
          customer:customers (id, name, email, phone)
        `)
        .eq("business_id", business.id)
        .order("created_at", { ascending: false })
        .limit(100);

      if (branchId) {
        query = query.eq("branch_id", branchId);
      }

      // For restricted roles, always filter to own sales (matches RLS)
      if (isRestrictedRole && userId) {
        query = query.eq("created_by", userId);
      }
      // For managers/owners using the "Sold By" filter
      else if (staffFilter && staffFilter !== "all") {
        query = query.eq("created_by", staffFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as Sale[];
    },
    enabled: !!business?.id,
    staleTime: 5 * 60 * 1000,
  });
}

export function useSale(saleId: string) {
  return useQuery({
    queryKey: ["sale", saleId],
    queryFn: async (): Promise<Sale | null> => {
      if (!saleId) return null;

      const { data, error } = await supabase
        .from("sales")
        .select(`
          *,
          sale_items (*),
          customer:customers (id, name, email, phone)
        `)
        .eq("id", saleId)
        .single();

      if (error) throw error;
      return data as Sale;
    },
    enabled: !!saleId,
  });
}

/** Check if an error is a transport/network failure (not a server-side rejection) */
function isTransportError(error: unknown): boolean {
  const msg = (error as any)?.message || "";
  return (
    msg.includes("Failed to send a request to the Edge Function") ||
    msg.includes("Failed to send a request") ||
    msg.includes("FunctionsFetchError") ||
    msg.includes("Failed to fetch") ||
    msg.includes("Load failed") ||
    msg.includes("NetworkError") ||
    msg.includes("network") ||
    msg.includes("ERR_NETWORK")
  );
}

export interface CreateSaleOptions {
  /** Stable idempotency key – pass one to enable safe retries */
  idempotencyKey?: string;
}

export function useCreateSale() {
  const queryClient = useQueryClient();
  const { data: business } = useBusiness();

  return useMutation({
    mutationFn: async (input: CreateSaleInput & CreateSaleOptions) => {
      if (!business?.id) throw new Error("No business found");

      // Use caller-provided key (enables retry with same key) or generate one
      const idempotencyKey =
        input.idempotencyKey ||
        `sale_${business.id}_${Date.now()}_${crypto.randomUUID().slice(0, 8)}`;

      const invokeEdgeFunction = async () => {
        const { data, error } = await supabase.functions.invoke("process-sale", {
          body: {
            idempotency_key: idempotencyKey,
            business_id: business.id,
            branch_id: input.branch_id || null,
            customer_id: input.customer_id || null,
            subtotal: input.subtotal,
            discount_amount: input.discount_amount || 0,
            tax_amount: input.tax_amount || 0,
            total_amount: input.total_amount,
            payment_method: input.payment_method,
            payment_status: input.payment_status || "completed",
            notes: input.notes || null,
            discount_type: input.discount_type || null,
            discount_reason: input.discount_reason || null,
            discount_approved_by: input.discount_approved_by || null,
            rewards_redeemed_value: input.rewards_redeemed_value || 0,
            items: input.items.map((item) => ({
              product_id: item.product_id,
              product_name: item.product_name,
              quantity: item.quantity,
              unit_price: item.unit_price,
              total_price: item.total_price,
              cost_price: item.cost_price ?? 0,
              discount: item.discount ?? 0,
            })),
          },
        });

        if (error) {
          // SDK may wrap the body in context for non-2xx responses
          const context = (error as any).context;
          let message: string;
          if (typeof context === "object" && context?.ok === false && context?.error) {
            message = context.error;
          } else if (typeof context === "object" && context?.error) {
            message = context.error;
          } else {
            message = error.message || "Sale processing failed. Please try again.";
          }
          throw new Error(message);
        }
        if (data?.ok === false) throw new Error(data.error || 'Sale processing failed');
        if (data?.error) throw new Error(data.error);
        return data;
      };

      // Refresh session to ensure token is valid before sale
      const { error: refreshError } = await supabase.auth.refreshSession();
      if (refreshError) {
        throw new Error("Your session has expired. Please sign in again.");
      }

      // First attempt
      try {
        const data = await invokeEdgeFunction();
        return { id: data.sale_id, invoice_number: data.invoice_number };
      } catch (firstError) {
        // Only retry on transport errors – server rejections (stock, auth) should not retry
        if (!isTransportError(firstError)) throw firstError;

        // Retry once with the SAME idempotency key (safe: server deduplicates)
        try {
          const data = await invokeEdgeFunction();
          return { id: data.sale_id, invoice_number: data.invoice_number };
        } catch (retryError) {
          // Re-throw with a flag so the POS can decide to queue offline
          if (isTransportError(retryError)) {
            const err = new Error(
              "Unable to reach the server. The sale will be saved offline and synced automatically."
            );
            (err as any).isTransportError = true;
            throw err;
          }
          throw retryError;
        }
      }
    },
    onSuccess: () => {
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ["sales"] });
        queryClient.invalidateQueries({ queryKey: ["products"] });
        queryClient.invalidateQueries({ queryKey: ["branch-stock"] });
        queryClient.invalidateQueries({ queryKey: ["recent-sales"] });
        queryClient.invalidateQueries({ queryKey: ["weekly-sales"] });
      }, 0);
    },
  });
}

export function useDeleteSale() {
  const queryClient = useQueryClient();
  const { log } = useAuditLog();
  const { user } = useAuth();
  const { data: business } = useBusiness();

  return useMutation({
    mutationFn: async (saleId: string) => {
      if (!business?.id) throw new Error("No business found");

      // Get sale details before deletion for audit (scoped to business)
      const { data: sale } = await supabase
        .from("sales")
        .select("invoice_number, total_amount")
        .eq("id", saleId)
        .eq("business_id", business.id)
        .single();

      const { error } = await supabase
        .from("sales")
        .delete()
        .eq("id", saleId)
        .eq("business_id", business.id);
      if (error) throw error;

      // Log the deletion
      await log(
        "delete",
        "sale",
        sale?.invoice_number || saleId,
        {
          sale_id: saleId,
          invoice_number: sale?.invoice_number,
          total_amount: sale?.total_amount,
          user_id: user?.id,
          timestamp: new Date().toISOString(),
        },
        saleId
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sales"] });
    },
  });
}
