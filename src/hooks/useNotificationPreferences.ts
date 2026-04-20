import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useBusiness } from "./useBusiness";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import type { Json } from "@/integrations/supabase/types";
import type { Database } from "@/integrations/supabase/types";

type NotificationDeliveryStatus = Database["public"]["Enums"]["notification_delivery_status"];

// Types for notification preferences
export type NotificationTypeKey =
  | "low_stock_alert"
  | "daily_sales_summary"
  | "weekly_sales_report"
  | "monthly_sales_report"
  
  | "approval_request"
  | "approval_resolved"
  | "after_hours_alert"
  | "system_announcement";

export type NotificationChannel = "in_app" | "email" | "push";

export interface NotificationPreference {
  id: string;
  user_id: string;
  business_id: string;
  notification_type: NotificationTypeKey;
  in_app_enabled: boolean;
  email_enabled: boolean;
  push_enabled: boolean;
  branch_ids: string[] | null;
  settings: Record<string, unknown>;
  is_enabled: boolean;
  created_at: string;
  updated_at: string;
}

export interface NotificationDefault {
  id: string;
  notification_type: NotificationTypeKey;
  default_in_app_enabled: boolean;
  default_email_enabled: boolean;
  default_push_enabled: boolean;
  is_available: boolean;
  is_critical: boolean;
  is_enforced: boolean;
  default_settings: Record<string, unknown>;
  applicable_roles: string[] | null;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export interface NotificationAuditLog {
  id: string;
  business_id: string;
  branch_id: string | null;
  notification_type: NotificationTypeKey;
  channel: NotificationChannel;
  recipient_user_id: string | null;
  recipient_email: string | null;
  recipient_role: string | null;
  trigger_source: string;
  event_id: string | null;
  status: "pending" | "sent" | "delivered" | "failed" | "retrying";
  subject: string | null;
  content_preview: string | null;
  queued_at: string;
  sent_at: string | null;
  delivered_at: string | null;
  failed_at: string | null;
  error_message: string | null;
  error_code: string | null;
  metadata: Record<string, unknown>;
}

// Notification type metadata for UI
export const NOTIFICATION_TYPES: Record<
  NotificationTypeKey,
  {
    label: string;
    description: string;
    category: "inventory" | "sales" | "orders" | "system";
    icon: string;
    defaultChannels: { in_app: boolean; email: boolean; push: boolean };
  }
> = {
  low_stock_alert: {
    label: "Low Stock Alerts",
    description: "Get notified when inventory items fall below reorder threshold",
    category: "inventory",
    icon: "Package",
    defaultChannels: { in_app: true, email: false, push: false },
  },
  daily_sales_summary: {
    label: "Daily Sales Summary",
    description: "Receive a comprehensive daily sales report at end of business day",
    category: "sales",
    icon: "TrendingUp",
    defaultChannels: { in_app: true, email: true, push: false },
  },
  weekly_sales_report: {
    label: "Weekly Sales Report",
    description: "Receive a detailed weekly summary every Monday morning",
    category: "sales",
    icon: "Calendar",
    defaultChannels: { in_app: true, email: true, push: false },
  },
  monthly_sales_report: {
    label: "Monthly Sales Report",
    description: "Receive a comprehensive monthly sales report on the 1st of each month",
    category: "sales",
    icon: "CalendarDays",
    defaultChannels: { in_app: true, email: true, push: false },
  },
  approval_request: {
    label: "Approval Requests",
    description: "Notifications when approval is required for discounts, refunds, or adjustments",
    category: "orders",
    icon: "CheckCircle",
    defaultChannels: { in_app: true, email: true, push: false },
  },
  approval_resolved: {
    label: "Approval Resolved",
    description: "Notifications when your approval requests are approved or rejected",
    category: "orders",
    icon: "CheckCircle2",
    defaultChannels: { in_app: true, email: false, push: false },
  },
  after_hours_alert: {
    label: "After Hours Alerts",
    description: "Alerts for suspicious activity outside business hours",
    category: "system",
    icon: "Clock",
    defaultChannels: { in_app: true, email: true, push: false },
  },
  system_announcement: {
    label: "System Announcements",
    description: "Important platform-wide announcements and updates",
    category: "system",
    icon: "Bell",
    defaultChannels: { in_app: true, email: true, push: false },
  },
};

// Fetch user notification preferences
export function useUserNotificationPreferences() {
  const { user } = useAuth();
  const { data: business } = useBusiness();

  return useQuery({
    queryKey: ["user_notification_preferences", user?.id, business?.id],
    queryFn: async () => {
      if (!user || !business) return [];

      const { data, error } = await supabase
        .from("user_notification_preferences")
        .select("*")
        .eq("user_id", user.id)
        .eq("business_id", business.id);

      if (error) throw error;
      return data as NotificationPreference[];
    },
    enabled: !!user?.id && !!business?.id,
  });
}

// Fetch platform notification defaults
export function useNotificationDefaults() {
  return useQuery({
    queryKey: ["notification_defaults"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("notification_defaults")
        .select("*")
        .order("notification_type");

      if (error) throw error;
      return data as NotificationDefault[];
    },
  });
}

// Get effective preference (user preference or default)
export function useEffectiveNotificationPreference(notificationType: NotificationTypeKey) {
  const { data: userPreferences } = useUserNotificationPreferences();
  const { data: defaults } = useNotificationDefaults();

  const userPref = userPreferences?.find((p) => p.notification_type === notificationType);
  const defaultPref = defaults?.find((d) => d.notification_type === notificationType);

  if (!defaultPref) return null;

  // If platform disabled, not available
  if (!defaultPref.is_available) return null;

  // User has custom preference
  if (userPref) {
    return {
      ...userPref,
      is_critical: defaultPref.is_critical,
      is_enforced: defaultPref.is_enforced,
    };
  }

  // Return defaults
  return {
    notification_type: notificationType,
    in_app_enabled: defaultPref.default_in_app_enabled,
    email_enabled: defaultPref.default_email_enabled,
    push_enabled: defaultPref.default_push_enabled,
    is_enabled: true,
    branch_ids: null,
    settings: defaultPref.default_settings,
    is_critical: defaultPref.is_critical,
    is_enforced: defaultPref.is_enforced,
  };
}

// Update or create user notification preference
export function useUpdateNotificationPreference() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { data: business } = useBusiness();

  return useMutation({
    mutationFn: async (params: {
      notification_type: NotificationTypeKey;
      in_app_enabled?: boolean;
      email_enabled?: boolean;
      push_enabled?: boolean;
      is_enabled?: boolean;
      branch_ids?: string[] | null;
      settings?: Record<string, unknown>;
    }) => {
      if (!user || !business) throw new Error("Not authenticated");

      const { notification_type, ...updates } = params;

      // Check if preference exists
      const { data: existing } = await supabase
        .from("user_notification_preferences")
        .select("id")
        .eq("user_id", user.id)
        .eq("business_id", business.id)
        .eq("notification_type", notification_type)
        .maybeSingle();

      if (existing) {
        // Update - cast settings to Json
        const updateData: Record<string, unknown> = { ...updates };
        if (updates.settings) {
          updateData.settings = updates.settings as Json;
        }
        
        const { data, error } = await supabase
          .from("user_notification_preferences")
          .update(updateData)
          .eq("id", existing.id)
          .select()
          .single();

        if (error) throw error;
        return data;
      } else {
        // Insert with defaults merged
        const { data: defaults } = await supabase
          .from("notification_defaults")
          .select("*")
          .eq("notification_type", notification_type)
          .single();

        const insertSettings = (updates.settings ?? defaults?.default_settings ?? {}) as Json;

        const { data, error } = await supabase
          .from("user_notification_preferences")
          .insert({
            user_id: user.id,
            business_id: business.id,
            notification_type,
            in_app_enabled: updates.in_app_enabled ?? defaults?.default_in_app_enabled ?? true,
            email_enabled: updates.email_enabled ?? defaults?.default_email_enabled ?? false,
            push_enabled: updates.push_enabled ?? defaults?.default_push_enabled ?? false,
            is_enabled: updates.is_enabled ?? true,
            branch_ids: updates.branch_ids ?? null,
            settings: insertSettings,
          })
          .select()
          .single();

        if (error) throw error;
        return data;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user_notification_preferences"] });
    },
    onError: (error) => {
      console.error("Failed to update notification preference:", error);
      toast.error("Failed to update notification setting");
    },
  });
}

// Fetch notification audit logs
export function useNotificationAuditLogs(params?: {
  limit?: number;
  notificationType?: NotificationTypeKey;
  status?: NotificationDeliveryStatus;
}) {
  const { data: business } = useBusiness();

  return useQuery({
    queryKey: ["notification_audit_logs", business?.id, params],
    queryFn: async () => {
      if (!business) return [];

      let query = supabase
        .from("notification_audit_logs")
        .select("*")
        .eq("business_id", business.id)
        .order("queued_at", { ascending: false });

      if (params?.notificationType) {
        query = query.eq("notification_type", params.notificationType);
      }
      if (params?.status) {
        query = query.eq("status", params.status);
      }
      if (params?.limit) {
        query = query.limit(params.limit);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as NotificationAuditLog[];
    },
    enabled: !!business?.id,
  });
}

// Super Admin: Update notification defaults
export function useUpdateNotificationDefault() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      notification_type: NotificationTypeKey;
      is_available?: boolean;
      is_critical?: boolean;
      is_enforced?: boolean;
      default_in_app_enabled?: boolean;
      default_email_enabled?: boolean;
      default_push_enabled?: boolean;
      default_settings?: Json;
      applicable_roles?: string[] | null;
    }) => {
      const { notification_type, ...updates } = params;

      const { data, error } = await supabase
        .from("notification_defaults")
        .update(updates)
        .eq("notification_type", notification_type)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notification_defaults"] });
      toast.success("Notification default updated");
    },
    onError: (error) => {
      console.error("Failed to update notification default:", error);
      toast.error("Failed to update notification default");
    },
  });
}

// Super Admin: Fetch all notification audit logs (across all businesses)
export function useAllNotificationAuditLogs(params?: {
  limit?: number;
  businessId?: string;
  notificationType?: NotificationTypeKey;
  status?: NotificationDeliveryStatus;
  fromDate?: string;
  toDate?: string;
}) {
  return useQuery({
    queryKey: ["all_notification_audit_logs", params],
    queryFn: async () => {
      let query = supabase
        .from("notification_audit_logs")
        .select(`
          *,
          businesses:business_id (trading_name)
        `)
        .order("queued_at", { ascending: false });

      if (params?.businessId) {
        query = query.eq("business_id", params.businessId);
      }
      if (params?.notificationType) {
        query = query.eq("notification_type", params.notificationType);
      }
      if (params?.status) {
        query = query.eq("status", params.status);
      }
      if (params?.fromDate) {
        query = query.gte("queued_at", params.fromDate);
      }
      if (params?.toDate) {
        query = query.lte("queued_at", params.toDate);
      }
      if (params?.limit) {
        query = query.limit(params.limit);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });
}

// Notification event statistics for super admin
export function useNotificationStats() {
  return useQuery({
    queryKey: ["notification_stats"],
    queryFn: async () => {
      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
      const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();

      // Today's stats
      const { data: todayData } = await supabase
        .from("notification_audit_logs")
        .select("status")
        .gte("queued_at", todayStart);

      // Week stats
      const { data: weekData } = await supabase
        .from("notification_audit_logs")
        .select("status, notification_type")
        .gte("queued_at", weekStart);

      const todaySent = todayData?.filter((n) => n.status === "sent" || n.status === "delivered").length || 0;
      const todayFailed = todayData?.filter((n) => n.status === "failed").length || 0;
      const weekSent = weekData?.filter((n) => n.status === "sent" || n.status === "delivered").length || 0;
      const weekFailed = weekData?.filter((n) => n.status === "failed").length || 0;

      // Type breakdown
      const typeBreakdown: Record<string, number> = {};
      weekData?.forEach((n) => {
        typeBreakdown[n.notification_type] = (typeBreakdown[n.notification_type] || 0) + 1;
      });

      return {
        today: { sent: todaySent, failed: todayFailed, total: (todayData?.length || 0) },
        week: { sent: weekSent, failed: weekFailed, total: (weekData?.length || 0) },
        typeBreakdown,
      };
    },
  });
}
