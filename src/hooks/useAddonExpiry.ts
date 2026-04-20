import { useMemo, useEffect, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useBusiness } from "./useBusiness";
import { useSubscriptionStatus } from "./useSubscriptionStatus";
import { isBefore, isSameDay, differenceInDays } from "date-fns";

export type AddonAlignmentStatus = "aligned" | "expires_before" | "expires_after" | "expired" | "no_expiry";

export interface AddonExpiryInfo {
  id: string;
  addonFeatureId: string;
  featureKey: string;
  featureName: string;
  featureDescription: string | null;
  branchId: string | null;
  startDate: Date;
  endDate: Date | null;
  isExpired: boolean;
  expiresInDays: number | null;
  status: string;
  /** Billing cycle for this addon */
  billingPeriod: "monthly" | "quarterly" | "yearly" | null;
  /** Alignment status relative to main plan */
  alignmentStatus: AddonAlignmentStatus;
  /** Days difference from main plan expiry (positive = after, negative = before) */
  alignmentDays: number | null;
  /** Whether addon is inactive due to main plan expiry */
  inactiveDueToMainPlan: boolean;
}

export interface AddonExpiryResult {
  /** All addons with expiry info */
  addons: AddonExpiryInfo[];
  /** Addons that are currently expired */
  expiredAddons: AddonExpiryInfo[];
  /** Addons expiring soon (within 7 days) */
  expiringAddons: AddonExpiryInfo[];
  /** Addons that expire before main plan (misaligned) */
  misalignedAddons: AddonExpiryInfo[];
  /** Main plan expiry date for alignment reference */
  mainPlanExpiryDate: Date | null;
  /** Whether main plan is active (affects addon accessibility) */
  isMainPlanActive: boolean;
  /** Check if a specific addon feature is expired */
  isAddonExpired: (featureKey: string, branchId?: string) => boolean;
  /** Check if addon is accessible (active, not expired, AND main plan is active) */
  isAddonAccessible: (featureKey: string, branchId?: string) => boolean;
  /** Get expiry date for a specific addon */
  getAddonExpiryDate: (featureKey: string, branchId?: string) => Date | null;
  /** Get alignment status for a specific addon */
  getAddonAlignment: (featureKey: string, branchId?: string) => AddonAlignmentStatus;
  /** Loading state */
  isLoading: boolean;
  /** Refresh addon data */
  refresh: () => void;
}

/**
 * Hook to check addon expiry status with real-time updates.
 * Add-ons are now aligned with main plan expiry by default.
 * Branch-specific addons only affect their specific branch.
 * 
 * CRITICAL: Add-ons require main plan to be active.
 * If main plan expires, all add-ons become inaccessible.
 */
export function useAddonExpiry(): AddonExpiryResult {
  const { data: business } = useBusiness();
  const { isStrictlyActive: isMainPlanActive, hadPaidPlan } = useSubscriptionStatus();
  const queryClient = useQueryClient();
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const { data: rawAddons = [], isLoading, refetch } = useQuery({
    queryKey: ["business-addons-expiry", business?.id],
    queryFn: async () => {
      if (!business?.id) return [];

      const { data, error } = await supabase
        .from("business_addons")
        .select(`
          id,
          addon_feature_id,
          branch_id,
          start_date,
          end_date,
          status,
          billing_period,
          addon_feature:addon_features(feature_key, feature_name, description)
        `)
        .eq("business_id", business.id);

      if (error) {
        console.error("[AddonExpiry] Failed to fetch addons:", error);
        throw error;
      }

      return data || [];
    },
    enabled: !!business?.id,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchInterval: 10 * 60 * 1000, // Refresh every 10 min to catch expiry
  });

  // Real-time subscription with unique channel name per mount
  useEffect(() => {
    if (!business?.id) return;

    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    const uniqueId = crypto.randomUUID().slice(0, 8);
    const channel = supabase
      .channel(`addon-expiry-${business.id}-${uniqueId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "business_addons",
          filter: `business_id=eq.${business.id}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["business-addons-expiry", business.id] });
        }
      )
      .subscribe((status, err) => {
        if (err) {
          console.warn("[AddonExpiry] Realtime failed, using polling:", err.message);
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

  // Get main plan expiry date for alignment calculation
  const mainPlanExpiryDate = business?.plan_expires_at ? new Date(business.plan_expires_at) : null;

  const result = useMemo((): AddonExpiryResult => {
    const now = new Date();
    const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    const addons: AddonExpiryInfo[] = rawAddons.map((addon: any) => {
      const startDate = new Date(addon.start_date);
      const endDate = addon.end_date ? new Date(addon.end_date) : null;
      const isExpired = endDate ? isBefore(endDate, now) : false;
      
      // Add-on is inactive if main plan is expired (even if addon itself is valid)
      const inactiveDueToMainPlan = hadPaidPlan && !isMainPlanActive;
      
      let expiresInDays: number | null = null;
      if (endDate && !isExpired) {
        expiresInDays = differenceInDays(endDate, now);
      }

      // Calculate alignment status relative to main plan
      let alignmentStatus: AddonAlignmentStatus = "no_expiry";
      let alignmentDays: number | null = null;

      if (isExpired) {
        alignmentStatus = "expired";
      } else if (endDate && mainPlanExpiryDate) {
        if (isSameDay(endDate, mainPlanExpiryDate)) {
          alignmentStatus = "aligned";
          alignmentDays = 0;
        } else if (isBefore(endDate, mainPlanExpiryDate)) {
          alignmentStatus = "expires_before";
          alignmentDays = -differenceInDays(mainPlanExpiryDate, endDate);
        } else {
          alignmentStatus = "expires_after";
          alignmentDays = differenceInDays(endDate, mainPlanExpiryDate);
        }
      }

      // Parse billing period
      const billingPeriod = addon.billing_period as "monthly" | "quarterly" | "yearly" | null;

      return {
        id: addon.id,
        addonFeatureId: addon.addon_feature_id,
        featureKey: addon.addon_feature?.feature_key || "",
        featureName: addon.addon_feature?.feature_name || "Unknown Addon",
        featureDescription: addon.addon_feature?.description || null,
        branchId: addon.branch_id,
        startDate,
        endDate,
        isExpired,
        expiresInDays,
        status: addon.status,
        billingPeriod,
        alignmentStatus,
        alignmentDays,
        inactiveDueToMainPlan,
      };
    });

    // Filter expired and expiring addons
    const expiredAddons = addons.filter(a => a.isExpired || a.status !== "active");
    const expiringAddons = addons.filter(a => 
      !a.isExpired && 
      a.status === "active" && 
      a.endDate && 
      a.endDate <= sevenDaysFromNow
    );
    
    // Misaligned addons (expire before main plan)
    const misalignedAddons = addons.filter(a => 
      a.alignmentStatus === "expires_before" && 
      a.status === "active"
    );

    const isAddonExpired = (featureKey: string, branchId?: string): boolean => {
      const matchingAddons = addons.filter(a => {
        if (a.featureKey !== featureKey) return false;
        // If branchId is specified and addon is branch-specific, match exactly
        if (branchId && a.branchId) {
          return a.branchId === branchId;
        }
        // If addon is not branch-specific (null), it applies globally
        if (!a.branchId) return true;
        // If branchId not specified but addon is branch-specific, check any
        return true;
      });

      // No matching addon found = not purchased, not "expired" but not accessible
      if (matchingAddons.length === 0) return false;

      // Check if ALL matching addons are expired
      return matchingAddons.every(a => a.isExpired || a.status !== "active");
    };

    const isAddonAccessible = (featureKey: string, branchId?: string): boolean => {
      // CRITICAL: If main plan is expired, no addons are accessible
      if (hadPaidPlan && !isMainPlanActive) {
        return false;
      }
      
      const matchingAddons = addons.filter(a => {
        if (a.featureKey !== featureKey) return false;
        if (branchId && a.branchId) {
          return a.branchId === branchId;
        }
        if (!a.branchId) return true;
        return true;
      });

      // No matching addon = not accessible
      if (matchingAddons.length === 0) return false;

      // At least one addon must be active and not expired
      return matchingAddons.some(a => !a.isExpired && a.status === "active");
    };

    const getAddonExpiryDate = (featureKey: string, branchId?: string): Date | null => {
      const matchingAddons = addons.filter(a => {
        if (a.featureKey !== featureKey) return false;
        if (branchId && a.branchId) {
          return a.branchId === branchId;
        }
        if (!a.branchId) return true;
        return true;
      });

      if (matchingAddons.length === 0) return null;

      // Return the latest expiry date among active addons
      const activeDates = matchingAddons
        .filter(a => a.status === "active" && a.endDate)
        .map(a => a.endDate!.getTime());

      if (activeDates.length === 0) return null;
      return new Date(Math.max(...activeDates));
    };

    const getAddonAlignment = (featureKey: string, branchId?: string): AddonAlignmentStatus => {
      const matchingAddons = addons.filter(a => {
        if (a.featureKey !== featureKey) return false;
        if (branchId && a.branchId) {
          return a.branchId === branchId;
        }
        if (!a.branchId) return true;
        return true;
      });

      if (matchingAddons.length === 0) return "no_expiry";
      
      // Return the alignment status of the first active addon
      const activeAddon = matchingAddons.find(a => a.status === "active" && !a.isExpired);
      return activeAddon?.alignmentStatus || "expired";
    };

    return {
      addons,
      expiredAddons,
      expiringAddons,
      misalignedAddons,
      mainPlanExpiryDate,
      isMainPlanActive: hadPaidPlan ? isMainPlanActive : true, // True free tier always "active"
      isAddonExpired,
      isAddonAccessible,
      getAddonExpiryDate,
      getAddonAlignment,
      isLoading,
      refresh: refetch,
    };
  }, [rawAddons, isLoading, refetch, mainPlanExpiryDate, isMainPlanActive, hadPaidPlan]);

  return result;
}

/**
 * Hook specifically for checking if a business has any active addons
 * that are currently expired and need attention.
 */
export function useHasExpiredAddons(): { hasExpired: boolean; count: number; isLoading: boolean } {
  const { expiredAddons, isLoading } = useAddonExpiry();
  
  return {
    hasExpired: expiredAddons.length > 0,
    count: expiredAddons.length,
    isLoading,
  };
}
