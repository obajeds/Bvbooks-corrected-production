import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useBusiness } from "./useBusiness";

export function useAttendanceHistory(startDate?: string, endDate?: string) {
  const { data: business } = useBusiness();

  return useQuery({
    queryKey: ["attendance-history", business?.id, startDate, endDate],
    queryFn: async () => {
      if (!business) return [];

      let query = supabase
        .from("attendance")
        .select("*, staff:staff_id(full_name, role)")
        .eq("business_id", business.id)
        .order("date", { ascending: false })
        .order("clock_in", { ascending: false })
        .limit(200);

      if (startDate) {
        query = query.gte("date", startDate);
      }
      if (endDate) {
        query = query.lte("date", endDate);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    enabled: !!business?.id,
  });
}
