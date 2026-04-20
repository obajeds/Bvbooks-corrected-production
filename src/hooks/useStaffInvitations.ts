import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useBusiness } from "./useBusiness";
import { toast } from "sonner";

export interface StaffInvitation {
  id: string;
  business_id: string;
  email: string;
  full_name: string;
  phone: string | null;
  invitation_token: string;
  expires_at: string;
  status: string;
  invited_by: string | null;
  accepted_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface InvitationBranchAssignment {
  id: string;
  invitation_id: string;
  branch_id: string;
  role_template_id: string | null;
  is_primary: boolean;
  expires_at: string | null;
  created_at: string;
  branches?: { id: string; name: string };
  role_templates?: { id: string; name: string };
}

export interface StaffBranchAssignment {
  id: string;
  staff_id: string;
  branch_id: string;
  role_template_id: string | null;
  is_primary: boolean;
  expires_at: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  branches?: { id: string; name: string };
  role_templates?: { id: string; name: string; permissions: string[] };
}

export interface BranchAssignmentInput {
  branch_id: string;
  role_template_id: string | null;
  is_primary: boolean;
  expires_at: string | null;
}

export interface SendInviteInput {
  email: string;
  full_name: string;
  phone?: string;
  branch_assignments: BranchAssignmentInput[];
}

// Fetch all invitations for the business
export function useStaffInvitations() {
  const { data: business } = useBusiness();

  return useQuery({
    queryKey: ["staff-invitations", business?.id],
    queryFn: async () => {
      if (!business?.id) return [];
      
      const { data, error } = await supabase
        .from("staff_invitations")
        .select("*")
        .eq("business_id", business.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as StaffInvitation[];
    },
    enabled: !!business?.id
  });
}

// Fetch branch assignments for a specific invitation
export function useInvitationBranchAssignments(invitationId: string | undefined) {
  return useQuery({
    queryKey: ["invitation-branch-assignments", invitationId],
    queryFn: async () => {
      if (!invitationId) return [];
      
      const { data, error } = await supabase
        .from("invitation_branch_assignments")
        .select(`
          *,
          branches:branch_id (id, name),
          role_templates:role_template_id (id, name)
        `)
        .eq("invitation_id", invitationId);

      if (error) throw error;
      return data as InvitationBranchAssignment[];
    },
    enabled: !!invitationId
  });
}

// Fetch branch assignments for a specific staff member
export function useStaffBranchAssignments(staffId: string | undefined) {
  return useQuery({
    queryKey: ["staff-branch-assignments", staffId],
    queryFn: async () => {
      if (!staffId) return [];
      
      const { data, error } = await supabase
        .from("staff_branch_assignments")
        .select(`
          *,
          branches:branch_id (id, name),
          role_templates:role_template_id (id, name, permissions)
        `)
        .eq("staff_id", staffId);

      if (error) throw error;
      return data as StaffBranchAssignment[];
    },
    enabled: !!staffId
  });
}

// Send staff invitation
export function useSendStaffInvite() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: SendInviteInput) => {
      // Refresh session before making the call to ensure valid token
      const { error: refreshError } = await supabase.auth.refreshSession();
      if (refreshError) {
        console.error("Session refresh failed:", refreshError);
        throw new Error("Session expired. Please log in again.");
      }

      const { data, error } = await supabase.functions.invoke("send-staff-invite", {
        body: input
      });

      if (error) {
        // Parse error message from response
        const errorBody = error.context?.body ? await error.context.json?.() : null;
        throw new Error(errorBody?.error || error.message || "Failed to send invitation");
      }
      if (data?.error) throw new Error(data.error);
      
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["staff-invitations"] });
      queryClient.invalidateQueries({ queryKey: ["staff-branch-assignments"] });
      queryClient.invalidateQueries({ queryKey: ["staff"] });
      
      if (data?.existing_staff) {
        toast.success(data.message || "Branch assignments updated!");
      } else {
        toast.success("Invitation sent successfully!");
      }
    },
    onError: (error: Error) => {
      // Show info toast for informational messages
      if (error.message?.includes("already has access")) {
        toast.info(error.message);
      } else if (error.message?.includes("already pending")) {
        toast.info("An invitation is already pending for this email. Cancel the existing one first or wait for it to expire.");
      } else {
        toast.error(error.message || "Failed to send invitation");
      }
    }
  });
}

// Cancel invitation
export function useCancelInvitation() {
  const queryClient = useQueryClient();
  const { data: business } = useBusiness();

  return useMutation({
    mutationFn: async (invitationId: string) => {
      const { error } = await supabase
        .from("staff_invitations")
        .update({ status: "cancelled" })
        .eq("id", invitationId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["staff-invitations"] });
      toast.success("Invitation cancelled");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to cancel invitation");
    }
  });
}

// Resend invitation
export function useResendInvitation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (invitation: StaffInvitation) => {
      // First get the branch assignments
      const { data: assignments, error: assignError } = await supabase
        .from("invitation_branch_assignments")
        .select("*")
        .eq("invitation_id", invitation.id);

      if (assignError) throw assignError;

      // Cancel the old invitation
      await supabase
        .from("staff_invitations")
        .update({ status: "cancelled" })
        .eq("id", invitation.id);

      // Send a new invitation
      const { data, error } = await supabase.functions.invoke("send-staff-invite", {
        body: {
          email: invitation.email,
          full_name: invitation.full_name,
          phone: invitation.phone,
          branch_assignments: assignments?.map(a => ({
            branch_id: a.branch_id,
            role_template_id: a.role_template_id,
            is_primary: a.is_primary,
            expires_at: a.expires_at
          })) || []
        }
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["staff-invitations"] });
      toast.success("Invitation resent successfully!");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to resend invitation");
    }
  });
}

// Get invitation by token (for acceptance page)
export function useInvitationByToken(token: string | null) {
  return useQuery({
    queryKey: ["invitation-by-token", token],
    queryFn: async () => {
      if (!token) return null;
      
      const { data, error } = await supabase
        .from("staff_invitations")
        .select(`
          *,
          invitation_branch_assignments (
            *,
            branches:branch_id (id, name),
            role_templates:role_template_id (id, name)
          )
        `)
        .eq("invitation_token", token)
        .eq("status", "pending")
        .single();

      if (error) {
        if (error.code === "PGRST116") return null; // Not found
        throw error;
      }
      
      return data;
    },
    enabled: !!token
  });
}

// Accept invitation
export function useAcceptInvitation() {
  return useMutation({
    mutationFn: async ({ token, password }: { token: string; password: string }) => {
      const { data, error } = await supabase.functions.invoke("accept-staff-invite", {
        body: { token, password }
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      
      return data;
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to accept invitation");
    }
  });
}
