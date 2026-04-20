import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useBusiness } from "./useBusiness";
import { useBranchContext } from "@/contexts/BranchContext";
import { toast } from "sonner";

// Match actual DB enum values
export type ReconciliationStatus = 'pending' | 'balanced' | 'shortage' | 'excess';

export interface Reconciliation {
  id: string;
  business_id: string;
  branch_id: string | null;
  cashier_id: string;
  payment_type: string;
  sale_date: string;
  expected_amount: number;
  actual_amount: number;
  difference: number;
  status: ReconciliationStatus;
  reviewed_at: string | null;
  reviewed_by: string | null;
  review_notes: string | null;
  created_at: string;
  updated_at: string;
  // Joined data
  cashier?: {
    full_name: string;
  };
  branch?: {
    name: string;
  };
  reviewer?: {
    full_name: string;
  };
}

export function useReconciliations(dateRange?: { from: Date; to: Date }, status?: ReconciliationStatus) {
  const { data: business } = useBusiness();
  const { currentBranch } = useBranchContext();

  return useQuery({
    queryKey: ["reconciliations", business?.id, currentBranch?.id, dateRange, status],
    queryFn: async () => {
      if (!business?.id) return [];

      let query = supabase
        .from("reconciliations")
        .select(`
          *,
          cashier:staff!reconciliations_cashier_id_fkey(full_name),
          branch:branches!reconciliations_branch_id_fkey(name),
          reviewer:staff!reconciliations_reviewed_by_fkey(full_name)
        `)
        .eq("business_id", business.id)
        .order("sale_date", { ascending: false });

      // Filter by selected branch
      if (currentBranch?.id) {
        query = query.eq("branch_id", currentBranch.id);
      }

      // Filter by status if provided
      if (status) {
        query = query.eq("status", status);
      }

      // Filter by date range if provided
      if (dateRange?.from) {
        query = query.gte("sale_date", dateRange.from.toISOString().split('T')[0]);
      }
      if (dateRange?.to) {
        query = query.lte("sale_date", dateRange.to.toISOString().split('T')[0]);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as Reconciliation[];
    },
    enabled: !!business?.id,
  });
}

export function useReconciliationStats(dateRange?: { from: Date; to: Date }) {
  const { data: business } = useBusiness();
  const { currentBranch } = useBranchContext();

  return useQuery({
    queryKey: ["reconciliation-stats", business?.id, currentBranch?.id, dateRange],
    queryFn: async () => {
      if (!business?.id) return null;

      let query = supabase
        .from("reconciliations")
        .select("status, difference, expected_amount, actual_amount")
        .eq("business_id", business.id);

      if (currentBranch?.id) {
        query = query.eq("branch_id", currentBranch.id);
      }

      if (dateRange?.from) {
        query = query.gte("sale_date", dateRange.from.toISOString().split('T')[0]);
      }
      if (dateRange?.to) {
        query = query.lte("sale_date", dateRange.to.toISOString().split('T')[0]);
      }

      const { data, error } = await query;
      if (error) throw error;

      const stats = {
        total: data.length,
        pending: data.filter(r => r.status === 'pending').length,
        balanced: data.filter(r => r.status === 'balanced').length,
        shortage: data.filter(r => r.status === 'shortage').length,
        excess: data.filter(r => r.status === 'excess').length,
        totalExpected: data.reduce((sum, r) => sum + Number(r.expected_amount), 0),
        totalActual: data.reduce((sum, r) => sum + Number(r.actual_amount), 0),
        totalDifference: data.reduce((sum, r) => sum + Number(r.difference), 0),
      };

      return stats;
    },
    enabled: !!business?.id,
  });
}

export function useReviewReconciliation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      id, 
      status, 
      review_notes,
      reviewer_id 
    }: { 
      id: string; 
      status: ReconciliationStatus; 
      review_notes?: string;
      reviewer_id: string;
    }) => {
      const { data, error } = await supabase
        .from("reconciliations")
        .update({
          status,
          review_notes,
          reviewed_by: reviewer_id,
          reviewed_at: new Date().toISOString(),
        })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reconciliations"] });
      queryClient.invalidateQueries({ queryKey: ["reconciliation-stats"] });
      toast.success("Reconciliation updated successfully");
    },
    onError: (error: Error) => {
      toast.error(`Failed to update reconciliation: ${error.message}`);
    },
  });
}
