import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useBusiness } from "./useBusiness";
import { toast } from "sonner";

export interface ApprovalRequest {
  id: string;
  business_id: string;
  request_type: string;
  requested_by: string;
  approved_by: string | null;
  status: string;
  amount: number | null;
  threshold_amount: number | null;
  reference_id: string | null;
  reference_type: string | null;
  notes: string | null;
  created_at: string;
  resolved_at: string | null;
  requester?: { full_name: string; role: string } | null;
  approver?: { full_name: string; role: string } | null;
}

export function useApprovalRequests(status?: string) {
  const { data: business } = useBusiness();

  return useQuery({
    queryKey: ["approval-requests", business?.id, status],
    queryFn: async (): Promise<ApprovalRequest[]> => {
      if (!business?.id) return [];

      let query = supabase
        .from("approval_requests")
        .select(`
          *,
          requester:staff!approval_requests_requested_by_fkey(full_name, role),
          approver:staff!approval_requests_approved_by_fkey(full_name, role)
        `)
        .eq("business_id", business.id)
        .order("created_at", { ascending: false });

      if (status) {
        query = query.eq("status", status);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data || [];
    },
    enabled: !!business?.id,
  });
}

export function usePendingApprovalCount() {
  const { data: business } = useBusiness();

  return useQuery({
    queryKey: ["pending-approval-count", business?.id],
    queryFn: async (): Promise<number> => {
      if (!business?.id) return 0;

      const { count, error } = await supabase
        .from("approval_requests")
        .select("*", { count: "exact", head: true })
        .eq("business_id", business.id)
        .eq("status", "pending");

      if (error) throw error;
      return count || 0;
    },
    enabled: !!business?.id,
  });
}

export function useCreateApprovalRequest() {
  const { data: business } = useBusiness();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (request: {
      request_type: string;
      requested_by: string;
      amount?: number;
      threshold_amount?: number;
      reference_id?: string;
      reference_type?: string;
      notes?: string;
    }) => {
      if (!business?.id) throw new Error("Business not found");

      const { data, error } = await supabase
        .from("approval_requests")
        .insert({
          business_id: business.id,
          ...request,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["approval-requests"] });
      queryClient.invalidateQueries({ queryKey: ["pending-approval-count"] });
      toast.success("Approval request submitted");
    },
    onError: (error) => {
      toast.error("Failed to submit request", { description: error.message });
    },
  });
}

export function useApproveRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ requestId, notes }: { requestId: string; notes?: string }) => {
      // Fetch existing record to preserve notes (JSON PO data)
      const { data: existing } = await supabase
        .from("approval_requests")
        .select("notes")
        .eq("id", requestId)
        .single();

      // Get current user's staff ID for approved_by
      const { data: { user } } = await supabase.auth.getUser();
      let approvedBy: string | null = null;
      if (user?.id) {
        const { data: staff } = await supabase
          .from("staff")
          .select("id")
          .eq("user_id", user.id)
          .limit(1)
          .maybeSingle();
        approvedBy = staff?.id || null;
      }

      const { data, error } = await supabase
        .from("approval_requests")
        .update({
          status: "approved",
          notes: existing?.notes || null,
          approved_by: approvedBy,
          resolved_at: new Date().toISOString(),
        })
        .eq("id", requestId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["approval-requests"] });
      queryClient.invalidateQueries({ queryKey: ["pending-approval-count"] });
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
      queryClient.invalidateQueries({ queryKey: ["todays_expenses"] });
      toast.success("Request approved");
    },
    onError: (error) => {
      toast.error("Failed to approve request", { description: error.message });
    },
  });
}

export function useRejectRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ requestId, notes }: { requestId: string; notes?: string }) => {
      // Fetch existing record to preserve notes (JSON PO data)
      const { data: existing } = await supabase
        .from("approval_requests")
        .select("notes")
        .eq("id", requestId)
        .single();

      // Get current user's staff ID for approved_by
      const { data: { user } } = await supabase.auth.getUser();
      let approvedBy: string | null = null;
      if (user?.id) {
        const { data: staff } = await supabase
          .from("staff")
          .select("id")
          .eq("user_id", user.id)
          .limit(1)
          .maybeSingle();
        approvedBy = staff?.id || null;
      }

      const { data, error } = await supabase
        .from("approval_requests")
        .update({
          status: "rejected",
          notes: existing?.notes || null,
          approved_by: approvedBy,
          resolved_at: new Date().toISOString(),
        })
        .eq("id", requestId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["approval-requests"] });
      queryClient.invalidateQueries({ queryKey: ["pending-approval-count"] });
      toast.success("Request rejected");
    },
    onError: (error) => {
      toast.error("Failed to reject request", { description: error.message });
    },
  });
}
