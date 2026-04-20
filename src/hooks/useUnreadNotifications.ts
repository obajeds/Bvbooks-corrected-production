import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useBusiness } from "./useBusiness";

export function useUnreadNotifications() {
  const { data: business } = useBusiness();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["unread_notification_count", business?.id],
    queryFn: async () => {
      if (!business) return 0;

      const { count, error } = await supabase
        .from("business_notifications")
        .select("*", { count: "exact", head: true })
        .eq("business_id", business.id)
        .eq("is_read", false);

      if (error) throw error;
      return count || 0;
    },
    enabled: !!business?.id,
    refetchInterval: 5 * 60 * 1000, // fallback polling every 5 min
  });

  // Real-time subscription with unique channel name per mount
  useEffect(() => {
    if (!business?.id) return;

    const uniqueId = crypto.randomUUID().slice(0, 8);
    const channel = supabase
      .channel(`unread-notif-${business.id}-${uniqueId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "business_notifications",
          filter: `business_id=eq.${business.id}`,
        },
        () => {
          queryClient.invalidateQueries({
            queryKey: ["unread_notification_count", business.id],
          });
          queryClient.invalidateQueries({
            queryKey: ["business_notifications", business.id],
          });
        }
      )
      .subscribe((status, err) => {
        if (err) {
          console.warn("[Notifications] Realtime failed, using polling:", err.message);
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [business?.id, queryClient]);

  return {
    unreadCount: query.data || 0,
    isLoading: query.isLoading,
  };
}
