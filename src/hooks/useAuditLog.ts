import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useBusiness } from "./useBusiness";
import { useAuth } from "@/contexts/AuthContext";

export type AuditAction =
  | "create"
  | "update"
  | "delete"
  | "view"
  | "login"
  | "logout"
  | "sale_completed"
  | "sale_refunded"
  | "stock_adjusted"
  | "stock_transferred"
  | "payment_received"
  | "discount_applied"
  | "customer_created"
  | "customer_updated"
  | "product_created"
  | "product_updated"
  | "product_deleted"
  | "expense_created"
  | "expense_updated"
  | "approval_requested"
  | "approval_granted"
  | "approval_denied"
  | "staff_invited"
  | "staff_updated"
  | "branch_created"
  | "branch_updated"
  | "settings_updated";

export type AuditEntityType =
  | "sale"
  | "product"
  | "customer"
  | "expense"
  | "staff"
  | "branch"
  | "inventory"
  | "approval"
  | "settings"
  | "auth"
  | "report";

interface AuditLogInput {
  action: AuditAction | string;
  entityType: AuditEntityType | string;
  entityId?: string;
  entityName?: string;
  details?: Record<string, any>;
  staffId?: string;
}

export function useAuditLog() {
  const queryClient = useQueryClient();
  const { data: business } = useBusiness();
  const { user } = useAuth();

  const logActivity = useMutation({
    mutationFn: async (input: AuditLogInput) => {
      if (!business?.id) {
        console.warn("No business found for audit log");
        return null;
      }

      const { data, error } = await supabase
        .from("activity_logs")
        .insert({
          business_id: business.id,
          user_id: user?.id || null,
          staff_id: input.staffId || null,
          action: input.action,
          entity_type: input.entityType,
          entity_id: input.entityId || null,
          entity_name: input.entityName || null,
          details: input.details ? JSON.stringify(input.details) : null,
        })
        .select()
        .single();

      if (error) {
        console.error("Failed to create audit log:", error);
        throw error;
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["activity_logs"] });
    },
  });

  // Helper function for quick logging
  const log = async (
    action: AuditAction | string,
    entityType: AuditEntityType | string,
    entityName?: string,
    details?: Record<string, any>,
    entityId?: string
  ) => {
    try {
      await logActivity.mutateAsync({
        action,
        entityType,
        entityId,
        entityName,
        details,
      });
    } catch (error) {
      // Log but don't throw - audit logging shouldn't break main functionality
      console.error("Audit log error:", error);
    }
  };

  return {
    logActivity,
    log,
    isLogging: logActivity.isPending,
  };
}

// Standalone function for use outside React components
export async function createAuditLog(
  businessId: string,
  userId: string | null,
  input: {
    action: string;
    entityType: string;
    entityId?: string;
    entityName?: string;
    details?: Record<string, any>;
    staffId?: string;
  }
) {
  const { error } = await supabase.from("activity_logs").insert({
    business_id: businessId,
    user_id: userId,
    staff_id: input.staffId || null,
    action: input.action,
    entity_type: input.entityType,
    entity_id: input.entityId || null,
    entity_name: input.entityName || null,
    details: input.details ? JSON.stringify(input.details) : null,
  });

  if (error) {
    console.error("Failed to create audit log:", error);
  }
}
