import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useBusiness } from "./useBusiness";
import { useBranchContext } from "@/contexts/BranchContext";
import type { Tables } from "@/integrations/supabase/types";

export type Staff = Tables<"staff"> & {
  branch?: { id: string; name: string } | null;
  department?: { id: string; name: string } | null;
};

export interface StaffMember {
  id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  role: string;
  is_active: boolean;
  branch_id: string | null;
  department_id: string | null;
  salary: number;
  hire_date: string | null;
  created_at: string;
  user_id: string | null;
  branch?: { id: string; name: string } | null;
  department?: { id: string; name: string } | null;
}

export function useStaff() {
  const { data: business } = useBusiness();
  const { currentBranch, isOwner } = useBranchContext();

  return useQuery({
    queryKey: ["staff", business?.id, currentBranch?.id],
    queryFn: async (): Promise<StaffMember[]> => {
      if (!business?.id) return [];

      // Get staff assigned to current branch
      let branchStaffIds: string[] = [];
      if (currentBranch?.id) {
        const { data: assignments } = await supabase
          .from("staff_branch_assignments")
          .select("staff_id")
          .eq("branch_id", currentBranch.id)
          .eq("is_active", true);
        branchStaffIds = (assignments || []).map((a) => a.staff_id);
      }

      const { data, error } = await supabase
        .from("staff")
        .select(`
          *,
          branch:branches (id, name),
          department:departments!staff_department_id_fkey (id, name)
        `)
        .eq("business_id", business.id)
        .neq("role", "owner")
        .order("created_at", { ascending: false });

      if (error) throw error;

      let staffData = (data || []) as StaffMember[];

      // Filter by branch assignment
      if (currentBranch?.id) {
        if (isOwner) {
          // Owners see branch staff + unassigned staff
          staffData = staffData.filter(
            (s) => branchStaffIds.includes(s.id) || !s.branch_id
          );
        } else {
          staffData = staffData.filter((s) => branchStaffIds.includes(s.id));
        }
      }

      // Filter out owner and deduplicate
      const seenUserIds = new Set<string>();
      const seenEmails = new Set<string>();
      const uniqueStaff: StaffMember[] = [];

      for (const member of staffData) {
        if (member.user_id && member.user_id === business.owner_user_id) continue;
        if (member.user_id && seenUserIds.has(member.user_id)) continue;
        if (member.email && seenEmails.has(member.email.toLowerCase())) continue;

        if (member.user_id) seenUserIds.add(member.user_id);
        if (member.email) seenEmails.add(member.email.toLowerCase());
        uniqueStaff.push(member);
      }

      return uniqueStaff.sort((a, b) => a.full_name.localeCompare(b.full_name));
    },
    enabled: !!business?.id,
  });
}

export function useCreateStaff() {
  const queryClient = useQueryClient();
  const { data: business } = useBusiness();

  return useMutation({
    mutationFn: async (data: Omit<Tables<"staff">, "id" | "business_id" | "created_at" | "updated_at">) => {
      if (!business?.id) throw new Error("No business found");

      const { data: staff, error } = await supabase
        .from("staff")
        .insert({ ...data, business_id: business.id })
        .select()
        .single();

      if (error) throw error;

      let resolvedBranchId = staff.branch_id;

      if (!resolvedBranchId) {
        const { data: fallbackBranch, error: fallbackBranchError } = await supabase
          .from("branches")
          .select("id")
          .eq("business_id", business.id)
          .eq("is_active", true)
          .order("is_main", { ascending: false })
          .order("created_at", { ascending: true })
          .limit(1)
          .maybeSingle();

        if (fallbackBranchError) throw fallbackBranchError;
        resolvedBranchId = fallbackBranch?.id ?? null;
      }

      if (resolvedBranchId) {
        let resolvedTemplateId: string | null = null;

        if (staff.role) {
          const { data: roleTemplate, error: roleTemplateError } = await supabase
            .from("role_templates")
            .select("id")
            .eq("business_id", business.id)
            .eq("is_active", true)
            .ilike("name", staff.role)
            .limit(1)
            .maybeSingle();

          if (roleTemplateError) throw roleTemplateError;
          resolvedTemplateId = roleTemplate?.id ?? null;
        }

        const { error: assignmentError } = await supabase
          .from("staff_branch_assignments")
          .upsert(
            {
              staff_id: staff.id,
              branch_id: resolvedBranchId,
              role_template_id: resolvedTemplateId,
              is_primary: true,
              is_active: true,
              expires_at: null,
              updated_at: new Date().toISOString(),
            },
            { onConflict: "staff_id,branch_id" }
          );

        if (assignmentError) throw assignmentError;

        if (!staff.branch_id) {
          const { error: branchUpdateError } = await supabase
            .from("staff")
            .update({ branch_id: resolvedBranchId })
            .eq("id", staff.id);

          if (branchUpdateError) throw branchUpdateError;
          return { ...staff, branch_id: resolvedBranchId };
        }
      }

      return staff;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["staff"] });
    },
  });
}

export function useUpdateStaff() {
  const queryClient = useQueryClient();
  const { data: business } = useBusiness();

  return useMutation({
    mutationFn: async ({ id, ...data }: Partial<Tables<"staff">> & { id: string }) => {
      if (!business?.id) throw new Error("No business found");

      const { data: staff, error } = await supabase
        .from("staff")
        .update(data)
        .eq("id", id)
        .eq("business_id", business.id)
        .select()
        .single();

      if (error) throw error;
      return staff;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["staff"] });
    },
  });
}

export function useDeleteStaff() {
  const queryClient = useQueryClient();
  const { data: business } = useBusiness();

  return useMutation({
    mutationFn: async (id: string) => {
      const { data: staffMember } = await supabase
        .from("staff")
        .select("email")
        .eq("id", id)
        .single();

      await supabase
        .from("staff_branch_assignments")
        .delete()
        .eq("staff_id", id);

      await supabase
        .from("staff_permissions")
        .delete()
        .eq("staff_id", id);

      const { error } = await supabase
        .from("staff")
        .delete()
        .eq("id", id);

      if (error) throw error;

      if (staffMember?.email && business?.id) {
        await supabase
          .from("staff_invitations")
          .delete()
          .eq("email", staffMember.email)
          .eq("business_id", business.id);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["staff"] });
      queryClient.invalidateQueries({ queryKey: ["staff-invitations"] });
    },
  });
}
