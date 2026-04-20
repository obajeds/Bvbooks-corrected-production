import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useBusiness } from "./useBusiness";
import type { Tables, TablesInsert } from "@/integrations/supabase/types";

type LeaveRequest = Tables<"leave_requests">;

export function useLeaveRequests() {
  const { data: business } = useBusiness();

  return useQuery({
    queryKey: ["leave_requests", business?.id],
    queryFn: async () => {
      if (!business) return [];

      const { data, error } = await supabase
        .from("leave_requests")
        .select(`
          *,
          staff:staff_id(id, full_name, role),
          approver:approved_by(id, full_name)
        `)
        .eq("business_id", business.id)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Failed to fetch leave requests:", error);
        throw error;
      }
      return data || [];
    },
    enabled: !!business?.id,
  });
}

export function useCreateLeaveRequest() {
  const queryClient = useQueryClient();
  const { data: business } = useBusiness();

  return useMutation({
    mutationFn: async (data: Omit<TablesInsert<"leave_requests">, "business_id">) => {
      if (!business) throw new Error("No business found");

      const { data: request, error } = await supabase
        .from("leave_requests")
        .insert({ ...data, business_id: business.id })
        .select()
        .single();

      if (error) throw error;
      return request;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leave_requests"] });
    },
  });
}

export function useApproveLeaveRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      // Get current user's staff ID for approved_by
      const { data: { user } } = await supabase.auth.getUser();
      let approvedBy: string | null = null;
      if (user) {
        const { data: staffRecord } = await supabase
          .from("staff")
          .select("id")
          .eq("user_id", user.id)
          .limit(1)
          .maybeSingle();
        approvedBy = staffRecord?.id || null;
      }

      const { data, error } = await supabase
        .from("leave_requests")
        .update({ 
          status: "approved", 
          approved_at: new Date().toISOString(),
          approved_by: approvedBy,
        })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leave_requests"] });
    },
  });
}

export function useRejectLeaveRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase
        .from("leave_requests")
        .update({ status: "rejected" })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leave_requests"] });
    },
  });
}
