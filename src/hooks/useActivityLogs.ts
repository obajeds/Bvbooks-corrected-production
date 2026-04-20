import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useBusiness } from "./useBusiness";
import { useBranchContext } from "@/contexts/BranchContext";
import type { TablesInsert } from "@/integrations/supabase/types";

export function useActivityLogs() {
  const { data: business } = useBusiness();
  const { currentBranch, isOwner } = useBranchContext();

  return useQuery({
    queryKey: ["activity_logs", business?.id, currentBranch?.id, isOwner ? "owner" : "staff"],
    queryFn: async () => {
      if (!business) return [];

      let query = supabase
        .from("activity_logs")
        .select("*, staff(full_name, role)")
        .eq("business_id", business.id)
        .order("created_at", { ascending: false })
        .limit(100);

      if (currentBranch?.id) {
        if (isOwner) {
          // Owners see branch-specific + unassigned records
          query = query.or(`branch_id.eq.${currentBranch.id},branch_id.is.null`);
        } else {
          query = query.eq("branch_id", currentBranch.id);
        }
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    enabled: !!business?.id && !!currentBranch?.id,
  });
}

export function useCreateActivityLog() {
  const queryClient = useQueryClient();
  const { data: business } = useBusiness();

  return useMutation({
    mutationFn: async (data: Omit<TablesInsert<"activity_logs">, "business_id">) => {
      if (!business) throw new Error("No business found");

      const { data: log, error } = await supabase
        .from("activity_logs")
        .insert({ ...data, business_id: business.id })
        .select()
        .single();

      if (error) throw error;
      return log;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["activity_logs"] });
    },
  });
}
