import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useBusiness } from "./useBusiness";

export interface AfterHoursAlert {
  id: string;
  business_id: string;
  branch_id: string | null;
  staff_id: string | null;
  alert_type: string;
  description: string;
  activity_time: string;
  is_reviewed: boolean;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
  staff?: { full_name: string } | null;
  branch?: { name: string } | null;
}

export interface BusinessHours {
  id: string;
  business_id: string;
  branch_id: string | null;
  day_of_week: number; // 0 = Sunday, 6 = Saturday
  open_time: string; // "09:00:00"
  close_time: string; // "18:00:00"
  is_closed: boolean;
}

export function useBusinessHours() {
  const { data: business } = useBusiness();

  return useQuery({
    queryKey: ["business-hours", business?.id],
    queryFn: async (): Promise<BusinessHours[]> => {
      if (!business?.id) return [];

      const { data, error } = await supabase
        .from("business_hours")
        .select("*")
        .eq("business_id", business.id);

      if (error) throw error;
      return data || [];
    },
    enabled: !!business?.id,
  });
}

export function useSetBusinessHours() {
  const queryClient = useQueryClient();
  const { data: business } = useBusiness();

  return useMutation({
    mutationFn: async (hours: {
      day_of_week: number;
      open_time: string;
      close_time: string;
      is_closed: boolean;
      branch_id?: string | null;
    }) => {
      if (!business?.id) throw new Error("No business found");

      // Check if hours exist for this day
      const { data: existing } = await supabase
        .from("business_hours")
        .select("id")
        .eq("business_id", business.id)
        .eq("day_of_week", hours.day_of_week)
        .is("branch_id", null)
        .single();

      if (existing) {
        const { error } = await supabase
          .from("business_hours")
          .update({
            open_time: hours.open_time,
            close_time: hours.close_time,
            is_closed: hours.is_closed,
          })
          .eq("id", existing.id);

        if (error) throw error;
      } else {
        const { error } = await supabase.from("business_hours").insert({
          business_id: business.id,
          branch_id: hours.branch_id || null,
          day_of_week: hours.day_of_week,
          open_time: hours.open_time,
          close_time: hours.close_time,
          is_closed: hours.is_closed,
        });

        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["business-hours"] });
    },
  });
}

export function useAfterHoursAlerts() {
  const { data: business } = useBusiness();

  return useQuery({
    queryKey: ["after-hours-alerts", business?.id],
    queryFn: async (): Promise<AfterHoursAlert[]> => {
      if (!business?.id) return [];

      const { data, error } = await supabase
        .from("after_hours_alerts")
        .select(`
          *,
          staff:staff_id(full_name),
          branch:branch_id(name)
        `)
        .eq("business_id", business.id)
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;
      return data || [];
    },
    enabled: !!business?.id,
  });
}

export function useReviewAfterHoursAlert() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ alertId, userId }: { alertId: string; userId: string }) => {
      const { error } = await supabase
        .from("after_hours_alerts")
        .update({
          is_reviewed: true,
          reviewed_by: userId,
          reviewed_at: new Date().toISOString(),
        })
        .eq("id", alertId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["after-hours-alerts"] });
    },
  });
}

// Function to check if current time is within business hours
export function isWithinBusinessHours(
  hours: BusinessHours[],
  branchId?: string | null
): boolean {
  const now = new Date();
  const dayOfWeek = now.getDay();
  const currentTime = now.toTimeString().slice(0, 8); // "HH:MM:SS"

  // First check branch-specific hours, then fallback to business-wide hours
  let dayHours = hours.find(
    (h) => h.day_of_week === dayOfWeek && h.branch_id === branchId
  );

  if (!dayHours && branchId) {
    // Fallback to business-wide hours
    dayHours = hours.find(
      (h) => h.day_of_week === dayOfWeek && h.branch_id === null
    );
  }

  if (!dayHours) {
    // No hours defined, assume open 24/7
    return true;
  }

  if (dayHours.is_closed) {
    return false;
  }

  return currentTime >= dayHours.open_time && currentTime <= dayHours.close_time;
}
