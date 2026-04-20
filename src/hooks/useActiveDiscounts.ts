import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useBusiness } from "./useBusiness";
import { useBranchContext } from "@/contexts/BranchContext";
import { useToast } from "./use-toast";

export interface ActiveDiscount {
  id: string;
  business_id: string;
  branch_id: string | null;
  discount_percent: number;
  reason: string;
  approved_by: string;
  approval_request_id: string | null;
  started_at: string;
  stopped_at: string | null;
  stopped_by: string | null;
  is_active: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
  approver?: { full_name: string; role: string } | null;
  stopper?: { full_name: string; role: string } | null;
}

export function useActiveDiscounts() {
  const { data: business } = useBusiness();
  const { currentBranch } = useBranchContext();

  return useQuery({
    queryKey: ["active-discounts", business?.id, currentBranch?.id],
    queryFn: async (): Promise<ActiveDiscount[]> => {
      if (!business?.id) return [];

      const query = supabase
        .from("active_discounts")
        .select(`
          *,
          approver:staff!active_discounts_approved_by_fkey(full_name, role),
          stopper:staff!active_discounts_stopped_by_fkey(full_name, role)
        `)
        .eq("business_id", business.id)
        .order("created_at", { ascending: false });

      const { data, error } = await query;

      if (error) throw error;
      return (data || []) as ActiveDiscount[];
    },
    enabled: !!business?.id,
  });
}

export function useCurrentActiveDiscount() {
  const { data: business } = useBusiness();
  const { currentBranch } = useBranchContext();

  return useQuery({
    queryKey: ["current-active-discount", business?.id, currentBranch?.id],
    queryFn: async (): Promise<ActiveDiscount | null> => {
      if (!business?.id) return null;

      // First try to find a branch-specific active discount
      if (currentBranch?.id) {
        const { data: branchDiscount, error: branchError } = await supabase
          .from("active_discounts")
          .select("*")
          .eq("business_id", business.id)
          .eq("branch_id", currentBranch.id)
          .eq("is_active", true)
          .maybeSingle();

        if (!branchError && branchDiscount) {
          return branchDiscount as ActiveDiscount;
        }
      }

      // Fall back to business-wide discount (no branch_id)
      const { data: businessDiscount, error: businessError } = await supabase
        .from("active_discounts")
        .select("*")
        .eq("business_id", business.id)
        .is("branch_id", null)
        .eq("is_active", true)
        .maybeSingle();

      if (businessError) throw businessError;
      return businessDiscount as ActiveDiscount | null;
    },
    enabled: !!business?.id,
  });
}

export function useCreateActiveDiscount() {
  const { data: business } = useBusiness();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (discount: {
      branch_id?: string | null;
      discount_percent: number;
      reason: string;
      approved_by: string;
      approval_request_id?: string;
      notes?: string;
    }) => {
      if (!business?.id) throw new Error("Business not found");

      // First, deactivate any existing active discounts for the same scope
      const deactivateQuery = supabase
        .from("active_discounts")
        .update({ is_active: false, stopped_at: new Date().toISOString() })
        .eq("business_id", business.id)
        .eq("is_active", true);

      if (discount.branch_id) {
        await deactivateQuery.eq("branch_id", discount.branch_id);
      } else {
        await deactivateQuery.is("branch_id", null);
      }

      // Create new active discount
      const { data, error } = await supabase
        .from("active_discounts")
        .insert({
          business_id: business.id,
          branch_id: discount.branch_id || null,
          discount_percent: discount.discount_percent,
          reason: discount.reason,
          approved_by: discount.approved_by,
          approval_request_id: discount.approval_request_id || null,
          notes: discount.notes || null,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["active-discounts"] });
      queryClient.invalidateQueries({ queryKey: ["current-active-discount"] });
      toast({ title: "Discount activated successfully" });
    },
    onError: (error) => {
      toast({ title: "Failed to activate discount", description: error.message, variant: "destructive" });
    },
  });
}

export function useStopActiveDiscount() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ discountId, stoppedBy }: { discountId: string; stoppedBy: string }) => {
      const { data, error } = await supabase
        .from("active_discounts")
        .update({
          is_active: false,
          stopped_at: new Date().toISOString(),
          stopped_by: stoppedBy,
        })
        .eq("id", discountId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["active-discounts"] });
      queryClient.invalidateQueries({ queryKey: ["current-active-discount"] });
      toast({ title: "Discount stopped successfully" });
    },
    onError: (error) => {
      toast({ title: "Failed to stop discount", description: error.message, variant: "destructive" });
    },
  });
}
