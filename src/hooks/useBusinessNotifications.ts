import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useBusiness } from "./useBusiness";
import type { TablesInsert } from "@/integrations/supabase/types";

export function useBusinessNotifications() {
  const { data: business } = useBusiness();

  return useQuery({
    queryKey: ["business_notifications", business?.id],
    queryFn: async () => {
      if (!business) return [];

      const { data, error } = await supabase
        .from("business_notifications")
        .select("*")
        .eq("business_id", business.id)
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;
      return data || [];
    },
    enabled: !!business?.id,
  });
}

export function useMarkNotificationAsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase
        .from("business_notifications")
        .update({ is_read: true })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["business_notifications"] });
      queryClient.invalidateQueries({ queryKey: ["unread_notification_count"] });
    },
  });
}

export function useCreateNotification() {
  const queryClient = useQueryClient();
  const { data: business } = useBusiness();

  return useMutation({
    mutationFn: async (data: Omit<TablesInsert<"business_notifications">, "business_id">) => {
      if (!business) throw new Error("No business found");

      const { data: notification, error } = await supabase
        .from("business_notifications")
        .insert({ ...data, business_id: business.id })
        .select()
        .single();

      if (error) throw error;
      return notification;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["business_notifications"] });
    },
  });
}
