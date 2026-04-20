import { useEffect, useRef, useCallback, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useBusinessSubscription, type SubscriptionTier } from "./useSubscription";
import { useBusiness } from "./useBusiness";
import { cacheSubscription, getCachedSubscription, type OfflineSubscriptionData } from "@/lib/offlineSession";

export type SubscriptionStatus = "active" | "expired" | "cancelled" | "loading" | "none";

export interface SubscriptionStatusResult {
  /** Current subscription status */
  status: SubscriptionStatus;
  /** Subscription tier */
  tier: SubscriptionTier | null;
  /** Whether access to paid features is allowed */
  hasAccess: boolean;
  /** Whether subscription is strictly active (no grace) */
  isStrictlyActive: boolean;
  /** Human-readable message */
  message: string | null;
  /** Trigger a manual refresh */
  refresh: () => void;
  /** Loading state */
  isLoading: boolean;
  /** Expiry date if available */
  expiryDate: Date | null;
  /** Whether user previously had a paid plan */
  hadPaidPlan: boolean;
}

/**
 * Real-time subscription status monitoring with STRICT enforcement.
 * NO grace period - ACTIVE status is the only state that grants access.
 */
export function useSubscriptionStatus(): SubscriptionStatusResult {
  const queryClient = useQueryClient();
  const { data: subscriptionData, isLoading } = useBusinessSubscription();
  const { data: business } = useBusiness();
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const [offlineCachedData, setOfflineCachedData] = useState<OfflineSubscriptionData | null>(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  // Monitor online status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Load cached subscription when offline
  useEffect(() => {
    if (!isOnline && !subscriptionData) {
      getCachedSubscription().then(cached => {
        if (cached) {
          setOfflineCachedData(cached);
        }
      });
    }
  }, [isOnline, subscriptionData]);

  const refresh = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["business-subscription"] });
  }, [queryClient]);

  // Real-time subscription with unique channel name per mount to prevent collisions
  useEffect(() => {
    if (!business?.id) return;

    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    const uniqueId = crypto.randomUUID().slice(0, 8);
    const channel = supabase
      .channel(`sub-status-${business.id}-${uniqueId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "businesses",
          filter: `id=eq.${business.id}`,
        },
        () => {
          setTimeout(() => {
            queryClient.invalidateQueries({ queryKey: ["business-subscription"] });
            queryClient.invalidateQueries({ queryKey: ["business"] });
          }, 0);
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "subscriptions",
          filter: `business_id=eq.${business.id}`,
        },
        () => {
          setTimeout(() => {
            queryClient.invalidateQueries({ queryKey: ["business-subscription"] });
            queryClient.invalidateQueries({ queryKey: ["business-plan"] });
          }, 0);
        }
      )
      .subscribe((status, err) => {
        if (err) {
          console.warn("[SubscriptionStatus] Realtime failed, using polling:", err.message);
        }
      });

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [business?.id, queryClient]);

  const result = useMemo((): SubscriptionStatusResult => {
    // When offline and loading, try to use cached data
    if (isLoading && !isOnline && offlineCachedData) {
      const expiryDate = offlineCachedData.plan_expires_at ? new Date(offlineCachedData.plan_expires_at) : null;
      return {
        status: offlineCachedData.is_active ? "active" : "expired",
        tier: offlineCachedData.tier as SubscriptionTier,
        hasAccess: offlineCachedData.is_active,
        isStrictlyActive: offlineCachedData.is_active,
        message: !isOnline ? "Offline mode - using cached subscription status" : null,
        refresh,
        isLoading: false,
        expiryDate,
        hadPaidPlan: !!expiryDate,
      };
    }

    if (isLoading) {
      return {
        status: "loading",
        tier: null,
        hasAccess: true, // Optimistic: prevent blocked overlay flash during loading
        isStrictlyActive: true,
        message: null,
        refresh,
        isLoading: true,
        expiryDate: null,
        hadPaidPlan: false,
      };
    }

    const subscription = subscriptionData?.subscription;

    // No subscription data - check if we have offline cached data
    if (!subscription) {
      // If offline with cached data, use it
      if (!isOnline && offlineCachedData) {
        const expiryDate = offlineCachedData.plan_expires_at ? new Date(offlineCachedData.plan_expires_at) : null;
        return {
          status: offlineCachedData.is_active ? "active" : "expired",
          tier: offlineCachedData.tier as SubscriptionTier,
          hasAccess: offlineCachedData.is_active,
          isStrictlyActive: offlineCachedData.is_active,
          message: "Offline mode - using cached subscription status",
          refresh,
          isLoading: false,
          expiryDate,
          hadPaidPlan: !!expiryDate,
        };
      }
      
      return {
        status: "none",
        tier: "free",
        hasAccess: true, // Free tier always has basic access
        isStrictlyActive: true,
        message: null,
        refresh,
        isLoading: false,
        expiryDate: null,
        hadPaidPlan: false,
      };
    }

    const { tier, status, plan_expires_at } = subscription;

    // CRITICAL: Check for expired paid subscription FIRST
    const now = new Date();
    const expiryDate = plan_expires_at ? new Date(plan_expires_at) : null;
    const hadPaidPlan = expiryDate !== null;
    const isExpired = expiryDate ? expiryDate < now : false;

    // If they had a paid plan that expired, enforce lockout
    if (hadPaidPlan && isExpired) {
      return {
        status: "expired",
        tier,
        hasAccess: false,
        isStrictlyActive: false,
        message: "Your subscription has expired. Renew now to continue using premium features.",
        refresh,
        isLoading: false,
        expiryDate,
        hadPaidPlan,
      };
    }

    // True free tier (never had a paid plan) is always active
    if (tier === "free" && !hadPaidPlan) {
      return {
        status: "active",
        tier: "free",
        hasAccess: true,
        isStrictlyActive: true,
        message: null,
        refresh,
        isLoading: false,
        expiryDate: null,
        hadPaidPlan: false,
      };
    }

    // Trial status
    if (status === "trial" && !hadPaidPlan) {
      return {
        status: "active",
        tier: "free",
        hasAccess: true,
        isStrictlyActive: true,
        message: null,
        refresh,
        isLoading: false,
        expiryDate: null,
        hadPaidPlan: false,
      };
    }

    const isStatusActive = status === "active" || status === "trial";
    const isStrictlyActive = isStatusActive && !isExpired;

    if (!isStrictlyActive) {
      const subscriptionStatus: SubscriptionStatus = isExpired ? "expired" : "cancelled";
      return {
        status: subscriptionStatus,
        tier,
        hasAccess: false,
        isStrictlyActive: false,
        message: isExpired
          ? "Your subscription has expired. Renew now to continue using premium features."
          : "Your subscription is inactive. Please renew to restore access.",
        refresh,
        isLoading: false,
        expiryDate,
        hadPaidPlan,
      };
    }

    return {
      status: "active",
      tier,
      hasAccess: true,
      isStrictlyActive: true,
      message: null,
      refresh,
      isLoading: false,
      expiryDate,
      hadPaidPlan,
    };
  }, [subscriptionData, isLoading, refresh, isOnline, offlineCachedData]);

  // Cache subscription data for offline use - OUTSIDE useMemo to avoid side effects during render
  useEffect(() => {
    const subscription = subscriptionData?.subscription;
    if (subscription && isOnline && business?.id) {
      const cacheData: OfflineSubscriptionData = {
        tier: subscription.tier,
        status: subscription.status,
        plan_expires_at: subscription.plan_expires_at,
        is_active: subscription.status === 'active' && (!subscription.plan_expires_at || new Date(subscription.plan_expires_at) > new Date()),
        cached_at: new Date().toISOString(),
      };
      cacheSubscription(cacheData, business.id).catch(console.error);
    }
  }, [subscriptionData?.subscription, isOnline, business?.id]);

  return result;
}

/**
 * Check if a specific action is allowed based on subscription status.
 * STRICT: Only ACTIVE subscription allows write operations.
 */
export function useCanPerformAction(action: SubscriptionAction): boolean {
  const { status, tier, isStrictlyActive } = useSubscriptionStatus();

  // Read-only actions allowed even when expired
  if (READ_ONLY_ACTIONS.includes(action)) {
    return true;
  }

  // Free tier has limited actions
  if (tier === "free") {
    return FREE_TIER_ALLOWED_ACTIONS.includes(action);
  }

  // Paid features require strictly active subscription
  return isStrictlyActive;
}

export type SubscriptionAction =
  | "create_sale"
  | "add_expense"
  | "add_customer"
  | "add_stock"
  | "adjust_stock"
  | "view_reports"
  | "export_reports"
  | "manage_staff"
  | "manage_branches"
  | "apply_discount"
  | "create_invoice"
  | "view_dashboard"
  | "view_billing";

// Actions that are ALWAYS allowed (read-only)
const READ_ONLY_ACTIONS: SubscriptionAction[] = [
  "view_dashboard",
  "view_billing",
  "view_reports",
];

// Actions allowed on free tier
const FREE_TIER_ALLOWED_ACTIONS: SubscriptionAction[] = [
  "create_sale",
  "add_customer",
  "view_reports",
  "view_dashboard",
  "view_billing",
];

// Actions blocked when subscription is expired/cancelled
export const BLOCKED_ACTIONS_ON_EXPIRY: SubscriptionAction[] = [
  "create_sale",
  "add_expense",
  "add_stock",
  "adjust_stock",
  "manage_staff",
  "manage_branches",
  "apply_discount",
  "create_invoice",
  "export_reports",
];
