import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useBusiness } from "./useBusiness";
import type { Tables, TablesInsert } from "@/integrations/supabase/types";

type Attendance = Tables<"attendance">;

export function useAttendance(date: string) {
  const { data: business } = useBusiness();

  return useQuery({
    queryKey: ["attendance", business?.id, date],
    queryFn: async () => {
      if (!business) return [];

      const { data, error } = await supabase
        .from("attendance")
        .select("*, staff(full_name)")
        .eq("business_id", business.id)
        .eq("date", date);

      if (error) throw error;
      return data || [];
    },
    enabled: !!business?.id && !!date,
  });
}

export function useCheckIn() {
  const queryClient = useQueryClient();
  const { data: business } = useBusiness();

  return useMutation({
    mutationFn: async ({ staff_id, date }: { staff_id: string; date: string }) => {
      if (!business) throw new Error("No business found");

      const { data, error } = await supabase
        .from("attendance")
        .insert({
          staff_id,
          business_id: business.id,
          date,
          clock_in: new Date().toISOString(),
          status: "present",
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["attendance"] });
    },
  });
}

export function useCheckOut() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (attendanceId: string) => {
      const { data, error } = await supabase
        .from("attendance")
        .update({ clock_out: new Date().toISOString() })
        .eq("id", attendanceId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["attendance"] });
    },
  });
}
