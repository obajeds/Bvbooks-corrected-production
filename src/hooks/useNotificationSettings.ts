import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useBusiness } from "./useBusiness";
import { toast } from "sonner";

export interface NotificationSettings {
  id: string;
  business_id: string;
  low_stock_alerts_enabled: boolean;
  low_stock_alerts_email: string | null;
  daily_sales_summary_enabled: boolean;
  daily_sales_summary_email: string | null;
  weekly_sales_summary_enabled: boolean;
  weekly_sales_summary_email: string | null;
  new_order_notifications: boolean;
  created_at: string;
  updated_at: string;
}

export function useNotificationSettings() {
  const { data: business } = useBusiness();

  return useQuery({
    queryKey: ["notification_settings", business?.id],
    queryFn: async () => {
      if (!business) return null;

      const { data, error } = await supabase
        .from("notification_settings")
        .select("*")
        .eq("business_id", business.id)
        .maybeSingle();

      if (error) throw error;
      
      // If no settings exist, return defaults
      if (!data) {
        return {
          id: "",
          business_id: business.id,
          low_stock_alerts_enabled: false,
          low_stock_alerts_email: business.owner_email || "",
          daily_sales_summary_enabled: false,
          daily_sales_summary_email: business.owner_email || "",
          weekly_sales_summary_enabled: false,
          weekly_sales_summary_email: business.owner_email || "",
          new_order_notifications: true,
          created_at: "",
          updated_at: "",
        } as NotificationSettings;
      }
      
      return data as NotificationSettings;
    },
    enabled: !!business?.id,
  });
}

export function useUpdateNotificationSettings() {
  const queryClient = useQueryClient();
  const { data: business } = useBusiness();

  return useMutation({
    mutationFn: async (settings: Partial<NotificationSettings>) => {
      if (!business) throw new Error("No business found");

      // Check if settings exist
      const { data: existing } = await supabase
        .from("notification_settings")
        .select("id")
        .eq("business_id", business.id)
        .maybeSingle();

      if (existing) {
        // Update existing
        const { data, error } = await supabase
          .from("notification_settings")
          .update({
            low_stock_alerts_enabled: settings.low_stock_alerts_enabled,
            low_stock_alerts_email: settings.low_stock_alerts_email,
            daily_sales_summary_enabled: settings.daily_sales_summary_enabled,
            daily_sales_summary_email: settings.daily_sales_summary_email,
            weekly_sales_summary_enabled: settings.weekly_sales_summary_enabled,
            weekly_sales_summary_email: settings.weekly_sales_summary_email,
            new_order_notifications: settings.new_order_notifications,
          })
          .eq("business_id", business.id)
          .select()
          .single();

        if (error) throw error;
        return data;
      } else {
        // Insert new
        const { data, error } = await supabase
          .from("notification_settings")
          .insert({
            business_id: business.id,
            low_stock_alerts_enabled: settings.low_stock_alerts_enabled ?? false,
            low_stock_alerts_email: settings.low_stock_alerts_email,
            daily_sales_summary_enabled: settings.daily_sales_summary_enabled ?? false,
            daily_sales_summary_email: settings.daily_sales_summary_email,
            weekly_sales_summary_enabled: settings.weekly_sales_summary_enabled ?? false,
            weekly_sales_summary_email: settings.weekly_sales_summary_email,
            new_order_notifications: settings.new_order_notifications ?? true,
          })
          .select()
          .single();

        if (error) throw error;
        return data;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notification_settings"] });
      toast.success("Notification settings saved successfully");
    },
    onError: (error) => {
      console.error("Failed to save notification settings:", error);
      toast.error("Failed to save notification settings");
    },
  });
}
