import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useBusiness } from "./useBusiness";
import { useBranchContext } from "@/contexts/BranchContext";
import { toast } from "sonner";

export interface Settlement {
  id: string;
  business_id: string;
  branch_id: string | null;
  cashier_id: string;
  payment_type: string;
  amount: number;
  source: string;
  reference: string | null;
  notes: string | null;
  settlement_date: string;
  created_at: string;
  created_by: string | null;
  // Joined data
  cashier?: {
    full_name: string;
  };
  branch?: {
    name: string;
  };
}

export interface PaymentSummary {
  cash: number;
  transfer: number;
  card: number;
  bank: number;
}

// Parse payment_method from sales (supports split payments format: "method:amount,method:amount")
function parsePaymentMethod(paymentMethod: string, totalAmount: number): PaymentSummary {
  const summary: PaymentSummary = { cash: 0, transfer: 0, card: 0, bank: 0 };
  
  if (!paymentMethod) return summary;
  
  // Check if it's a split payment (contains ':')
  if (paymentMethod.includes(':')) {
    const parts = paymentMethod.split(',');
    parts.forEach(part => {
      const [method, amountStr] = part.split(':');
      const amount = parseFloat(amountStr) || 0;
      const normalizedMethod = normalizePaymentMethod(method);
      if (normalizedMethod in summary) {
        summary[normalizedMethod as keyof PaymentSummary] += amount;
      }
    });
  } else {
    // Single payment method
    const normalizedMethod = normalizePaymentMethod(paymentMethod);
    if (normalizedMethod in summary) {
      summary[normalizedMethod as keyof PaymentSummary] = totalAmount;
    }
  }
  
  return summary;
}

// Normalize payment method names (pos -> card, etc.)
function normalizePaymentMethod(method: string): string {
  const normalized = method.trim().toLowerCase();
  // Map 'pos' to 'card' for consistency
  if (normalized === 'pos') return 'card';
  if (normalized === 'credit') return 'cash'; // Credit sales counted as cash for now
  return normalized;
}

export function useSettlements(dateRange?: { from: Date; to: Date }) {
  const { data: business } = useBusiness();
  const { currentBranch } = useBranchContext();

  // Real-time subscription disabled to prevent interference with offline sales

  return useQuery({
    queryKey: ["settlements", business?.id, currentBranch?.id, dateRange],
    queryFn: async () => {
      if (!business?.id) return [];

      let query = supabase
        .from("settlements")
        .select(`
          *,
          cashier:staff!settlements_cashier_id_fkey(full_name),
          branch:branches!settlements_branch_id_fkey(name)
        `)
        .eq("business_id", business.id)
        .order("settlement_date", { ascending: false });

      // Filter by selected branch
      if (currentBranch?.id) {
        query = query.eq("branch_id", currentBranch.id);
      }

      // Filter by date range if provided
      if (dateRange?.from) {
        query = query.gte("settlement_date", dateRange.from.toISOString().split('T')[0]);
      }
      if (dateRange?.to) {
        query = query.lte("settlement_date", dateRange.to.toISOString().split('T')[0]);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as Settlement[];
    },
    enabled: !!business?.id,
    // Disabled aggressive polling to prevent interference with offline sales
    refetchInterval: false,
    staleTime: 30000,
  });
}

// Hook to get payment summary from sales records with date range
export function useSalesPaymentSummary(dateRange?: { from: Date; to: Date }) {
  const { data: business } = useBusiness();
  const { currentBranch } = useBranchContext();

  // Real-time subscription disabled to prevent interference with offline sales

  return useQuery({
    queryKey: ["sales-payment-summary", business?.id, currentBranch?.id, dateRange],
    queryFn: async (): Promise<PaymentSummary> => {
      if (!business?.id) return { cash: 0, transfer: 0, card: 0, bank: 0 };

      let query = supabase
        .from("sales")
        .select("payment_method, total_amount")
        .eq("business_id", business.id);

      // Filter by selected branch
      if (currentBranch?.id) {
        query = query.eq("branch_id", currentBranch.id);
      }

      // Filter by date range if provided
      if (dateRange?.from) {
        query = query.gte("created_at", dateRange.from.toISOString());
      }
      if (dateRange?.to) {
        query = query.lte("created_at", dateRange.to.toISOString());
      }

      const { data, error } = await query;
      if (error) throw error;

      // Aggregate payment methods
      const summary: PaymentSummary = { cash: 0, transfer: 0, card: 0, bank: 0 };
      
      (data || []).forEach(sale => {
        const parsed = parsePaymentMethod(sale.payment_method, Number(sale.total_amount));
        summary.cash += parsed.cash;
        summary.transfer += parsed.transfer;
        summary.card += parsed.card;
        summary.bank += parsed.bank;
      });

      return summary;
    },
    enabled: !!business?.id,
    // Disabled aggressive polling to prevent interference with offline sales
    refetchInterval: false,
    staleTime: 30000,
  });
}

// Helper to get local day boundaries as ISO strings for server-side filtering
function getLocalDayBoundsISO(dateStr: string): { start: string; end: string } {
  // Use pure UTC boundaries to ensure consistency across all devices/timezones
  return {
    start: `${dateStr}T00:00:00.000Z`,
    end: `${dateStr}T23:59:59.999Z`,
  };
}

// Hook to get payment summary from sales records for a single date (e.g., for Daily Business Summary)
export function useDailySalesPaymentSummary(saleDate: string, branchId?: string, cashierUserId?: string, afterTimestamp?: string | null) {
  const { data: business } = useBusiness();
  const queryClient = useQueryClient();

  // Realtime subscription for instant updates when cashier submits sales
  useEffect(() => {
    if (!branchId || !business?.id) return;

    const channel = supabase
      .channel(`sales-payment-summary:${branchId}:${saleDate}`)
      .on('postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'sales',
          filter: `branch_id=eq.${branchId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["daily-sales-payment-summary", business?.id, branchId, saleDate] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [branchId, business?.id, saleDate, queryClient]);

  return useQuery({
    queryKey: ["daily-sales-payment-summary", business?.id, branchId, saleDate, cashierUserId, afterTimestamp],
    queryFn: async (): Promise<PaymentSummary> => {
      if (!business?.id || !saleDate) return { cash: 0, transfer: 0, card: 0, bank: 0 };

      // Server-side date filtering to avoid 1000-row limit
      const { start, end } = getLocalDayBoundsISO(saleDate);

      let query = supabase
        .from("sales")
        .select("payment_method, total_amount")
        .eq("business_id", business.id)
        .gte("created_at", start)
        .lte("created_at", end);

      // Filter by branch if provided
      if (branchId) {
        query = query.eq("branch_id", branchId);
      }

      // Filter by cashier if provided (scopes to individual cashier's sales)
      if (cashierUserId) {
        query = query.eq("created_by", cashierUserId);
      }

      // Filter to only include sales after the last gas entry submission
      if (afterTimestamp) {
        query = query.gt("created_at", afterTimestamp);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Aggregate payment methods
      const summary: PaymentSummary = { cash: 0, transfer: 0, card: 0, bank: 0 };
      
      (data || []).forEach(sale => {
        const parsed = parsePaymentMethod(sale.payment_method, Number(sale.total_amount));
        summary.cash += parsed.cash;
        summary.transfer += parsed.transfer;
        summary.card += parsed.card;
        summary.bank += parsed.bank;
      });

      return summary;
    },
    enabled: !!business?.id && !!saleDate,
    refetchInterval: 2 * 60 * 1000, // Poll every 2 min as fallback
    staleTime: 2 * 60 * 1000,
  });
}


export function useCreateSettlement() {
  const queryClient = useQueryClient();
  const { data: business } = useBusiness();
  const { currentBranch } = useBranchContext();

  return useMutation({
    mutationFn: async (settlement: {
      cashier_id: string;
      payment_type: string;
      amount: number;
      source: 'bank' | 'cash' | 'manual' | 'pos_terminal';
      reference?: string;
      notes?: string;
      settlement_date: string;
    }) => {
      if (!business?.id) throw new Error("No business found");

      const insertData = {
        cashier_id: settlement.cashier_id,
        payment_type: settlement.payment_type,
        amount: settlement.amount,
        source: settlement.source,
        reference: settlement.reference,
        notes: settlement.notes,
        settlement_date: settlement.settlement_date,
        business_id: business.id,
        branch_id: currentBranch?.id || null,
      };

      const { data, error } = await supabase
        .from("settlements")
        .insert(insertData as any)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["settlements"] });
      toast.success("Settlement recorded successfully");
    },
    onError: (error: Error) => {
      toast.error(`Failed to record settlement: ${error.message}`);
    },
  });
}
