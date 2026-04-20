import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useBusiness } from "./useBusiness";
import { useBranchContext } from "@/contexts/BranchContext";
import type { Tables, TablesInsert } from "@/integrations/supabase/types";

type Staff = Tables<"staff">;

export function useStaffMembers() {
  const { data: business } = useBusiness();
  const { currentBranch, isOwner } = useBranchContext();

  return useQuery({
    queryKey: ["staff-members", business?.id, currentBranch?.id],
    queryFn: async (): Promise<Staff[]> => {
      if (!business) return [];

      // Get staff assigned to the current branch
      let staffIds: string[] = [];
      if (currentBranch?.id) {
        const { data: assignments } = await supabase
          .from("staff_branch_assignments")
          .select("staff_id")
          .eq("branch_id", currentBranch.id)
          .eq("is_active", true);
        staffIds = (assignments || []).map((a) => a.staff_id);
      }

      let query = supabase
        .from("staff")
        .select("*")
        .eq("business_id", business.id)
        .neq("role", "owner")
        .order("created_at", { ascending: false });

      if (currentBranch?.id && staffIds.length > 0) {
        if (isOwner) {
          // Owners see branch staff + unassigned staff
          const { data: allStaff } = await query;
          const filtered = (allStaff || []).filter(
            (s) => staffIds.includes(s.id) || !s.branch_id
          );
          const ownerUserId = business.owner_user_id;
          return filtered.filter((s) => !ownerUserId || s.user_id !== ownerUserId);
        }
        query = query.in("id", staffIds);
      } else if (currentBranch?.id && staffIds.length === 0) {
        // No staff assigned to this branch
        if (isOwner) {
          // Show unassigned staff only
          const { data: allStaff } = await query;
          const ownerUserId = business.owner_user_id;
          return (allStaff || []).filter(
            (s) => !s.branch_id && (!ownerUserId || s.user_id !== ownerUserId)
          );
        }
        return [];
      }

      const { data, error } = await query;
      if (error) throw error;

      const ownerUserId = business.owner_user_id;
      return (data || []).filter(
        (staff) => !ownerUserId || staff.user_id !== ownerUserId
      );
    },
    enabled: !!business?.id,
  });
}

export function useCreateStaffMember() {
  const queryClient = useQueryClient();
  const { data: business } = useBusiness();

  return useMutation({
    mutationFn: async (data: Omit<TablesInsert<"staff">, "business_id">) => {
      if (!business) throw new Error("No business found");

      const { data: staff, error } = await supabase
        .from("staff")
        .insert({ ...data, business_id: business.id })
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

export function useUpdateStaffMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...data }: Partial<Staff> & { id: string }) => {
      const { data: staff, error } = await supabase
        .from("staff")
        .update(data)
        .eq("id", id)
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

export function useDeleteStaffMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("staff").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["staff"] });
    },
  });
}
