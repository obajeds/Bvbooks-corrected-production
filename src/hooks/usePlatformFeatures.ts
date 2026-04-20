import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { RealtimeChannel } from "@supabase/supabase-js";

export interface PlatformFeature {
  id: string;
  feature_key: string;
  feature_name: string;
  is_enabled: boolean;
  category: string;
  description?: string | null;
}

/**
 * Hook to fetch and subscribe to platform-wide feature toggles (Super Admin controlled)
 * Features real-time sync via Supabase channels with robust connection handling
 */
export function usePlatformFeatures() {
  const queryClient = useQueryClient();
  const channelRef = useRef<RealtimeChannel | null>(null);

  const query = useQuery({
    queryKey: ["platform-features"],
    queryFn: async (): Promise<PlatformFeature[]> => {
      console.log("[PlatformFeatures] Fetching platform features...");
      const { data, error } = await supabase
        .from("platform_features")
        .select("id, feature_key, feature_name, is_enabled, category, description");

      if (error) {
        console.error("[PlatformFeatures] Error fetching features:", error);
        throw error;
      }
      console.log("[PlatformFeatures] Fetched", data?.length || 0, "features");
      return (data || []) as PlatformFeature[];
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Real-time subscription with unique channel name per mount to prevent collisions
  useEffect(() => {
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    const uniqueId = crypto.randomUUID().slice(0, 8);
    const channel = supabase
      .channel(`platform-features-${uniqueId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "platform_features",
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["platform-features"] });
        }
      )
      .subscribe((status, err) => {
        if (err) {
          console.warn("[PlatformFeatures] Realtime failed, using polling:", err.message);
        }
      });

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [queryClient]);

  return query;
}

/**
 * Check if a specific platform feature is enabled
 * Returns loading state and enabled status
 */
export function usePlatformFeatureEnabled(featureKey: string): {
  isEnabled: boolean;
  isLoading: boolean;
  feature: PlatformFeature | null;
} {
  const { data: features = [], isLoading } = usePlatformFeatures();
  
  const feature = features.find((f) => f.feature_key === featureKey) || null;
  
  // If feature not found in platform_features, default to enabled (backward compatibility)
  const isEnabled = feature ? feature.is_enabled : true;

  return { isEnabled, isLoading, feature };
}

/**
 * Get all features grouped by category for UI rendering
 */
export function usePlatformFeaturesByCategory() {
  const { data: features = [], isLoading } = usePlatformFeatures();
  
  const grouped = features.reduce((acc, feature) => {
    const category = feature.category || "General";
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(feature);
    return acc;
  }, {} as Record<string, PlatformFeature[]>);

  return { grouped, isLoading, features };
}

/**
 * Utility function to check if a feature is enabled (for use outside React components)
 */
export function isFeatureEnabledSync(
  features: PlatformFeature[],
  featureKey: string
): boolean {
  const feature = features.find((f) => f.feature_key === featureKey);
  return feature ? feature.is_enabled : true;
}

/**
 * Hook to check multiple features at once
 */
export function usePlatformFeaturesEnabled(featureKeys: string[]): {
  enabledFeatures: Record<string, boolean>;
  isLoading: boolean;
  allEnabled: boolean;
  anyEnabled: boolean;
} {
  const { data: features = [], isLoading } = usePlatformFeatures();
  
  const enabledFeatures = featureKeys.reduce((acc, key) => {
    const feature = features.find((f) => f.feature_key === key);
    acc[key] = feature ? feature.is_enabled : true;
    return acc;
  }, {} as Record<string, boolean>);

  const enabledValues = Object.values(enabledFeatures);
  const allEnabled = enabledValues.every(Boolean);
  const anyEnabled = enabledValues.some(Boolean);

  return { enabledFeatures, isLoading, allEnabled, anyEnabled };
}

/**
 * Hook to search/filter platform features
 */
export function useFilteredPlatformFeatures(searchQuery: string) {
  const { data: features = [], isLoading } = usePlatformFeatures();
  
  const filtered = searchQuery
    ? features.filter(
        (f) =>
          f.feature_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          f.feature_key.toLowerCase().includes(searchQuery.toLowerCase()) ||
          f.category.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : features;

  return { filtered, isLoading, total: features.length };
}
