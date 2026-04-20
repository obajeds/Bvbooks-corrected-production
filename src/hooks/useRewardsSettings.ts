import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useBusiness } from "./useBusiness";

export interface RewardsSettings {
  id: string;
  business_id: string;
  points_per_naira: number;
  naira_per_point: number;
  is_enabled: boolean;
  min_points_to_redeem: number;
  max_discount_percent: number;
  points_expiry_months: number | null;
  created_at: string;
  updated_at: string;
}

export interface RewardsPreset {
  id: "ultra_conservative" | "conservative" | "standard" | "generous" | "disabled";
  name: string;
  description: string;
  points_per_naira: number;
  naira_per_point: number;
  is_enabled: boolean;
  min_points_to_redeem: number;
  max_discount_percent: number;
  effectiveReward: string;
  recommended?: boolean;
  warning?: string;
}

// BVBooks official reward presets
export const REWARDS_PRESETS: RewardsPreset[] = [
  {
    id: "ultra_conservative" as const,
    name: "Ultra Conservative",
    description: "Best for very low-margin businesses. Spend ₦10,000 → get ₦25 back.",
    points_per_naira: 0.25,
    naira_per_point: 0.01,
    is_enabled: true,
    min_points_to_redeem: 1000,
    max_discount_percent: 2.5,
    effectiveReward: "~0.25%",
  },
  {
    id: "conservative" as const,
    name: "Conservative Loyalty",
    description: "Best for low-margin businesses. Spend ₦10,000 → get ₦50 back.",
    points_per_naira: 0.5,
    naira_per_point: 0.01,
    is_enabled: true,
    min_points_to_redeem: 1000,
    max_discount_percent: 5,
    effectiveReward: "~0.5%",
  },
  {
    id: "standard",
    name: "Standard Loyalty",
    description: "Recommended for most merchants. Spend ₦10,000 → get ₦100 back.",
    points_per_naira: 1,
    naira_per_point: 0.01,
    is_enabled: true,
    min_points_to_redeem: 1000,
    max_discount_percent: 10,
    effectiveReward: "~1%",
    recommended: true,
  },
  {
    id: "generous",
    name: "Generous Loyalty",
    description: "Higher rewards for high-margin businesses. Spend ₦10,000 → get ₦200 back.",
    points_per_naira: 1,
    naira_per_point: 0.02,
    is_enabled: true,
    min_points_to_redeem: 1000,
    max_discount_percent: 10,
    effectiveReward: "~2%",
    warning: "Use only if margins allow.",
  },
  {
    id: "disabled",
    name: "Rewards Disabled",
    description: "For wholesale or no-rewards businesses.",
    points_per_naira: 0,
    naira_per_point: 0,
    is_enabled: false,
    min_points_to_redeem: 1000,
    max_discount_percent: 10,
    effectiveReward: "0%",
  },
];

// Safety limits (non-negotiable)
export const REWARDS_LIMITS = {
  maxPointsPerNaira: 10,
  minPointsToRedeem: 1000,
  maxDiscountPercent: 10,
  maxNairaPerPoint: 0.1, // ₦0.10 max
};

// Validation helpers
export function validateRewardsSettings(settings: Partial<RewardsSettings>): {
  valid: boolean;
  warnings: string[];
  errors: string[];
} {
  const warnings: string[] = [];
  const errors: string[] = [];

  if (settings.points_per_naira !== undefined) {
    if (settings.points_per_naira > 10) {
      errors.push("Points per ₦1 cannot exceed 10.");
    }
    if (settings.points_per_naira > 5) {
      warnings.push("High point rates increase reward cost.");
    }
  }

  if (settings.naira_per_point !== undefined) {
    if (settings.naira_per_point > 0.05) {
      warnings.push("This reward rate may reduce your profit.");
    }
    if (settings.naira_per_point > 0.1) {
      errors.push("Naira value per point cannot exceed ₦0.10.");
    }
  }

  return {
    valid: errors.length === 0,
    warnings,
    errors,
  };
}

// Calculate rewards for display
export function calculateRewardsSummary(pointsPerNaira: number, nairaPerPoint: number) {
  const pointsFor1Naira = nairaPerPoint > 0 ? Math.round(1 / nairaPerPoint) : 0;
  const effectivePercent = pointsPerNaira * nairaPerPoint * 100;
  
  return {
    pointsFor1NairaDiscount: pointsFor1Naira,
    effectiveRewardPercent: effectivePercent.toFixed(1),
    example100Points: nairaPerPoint * 100,
  };
}

export function useRewardsSettings() {
  const { data: business } = useBusiness();

  return useQuery({
    queryKey: ["rewards_settings", business?.id],
    queryFn: async () => {
      if (!business) return null;

      const { data, error } = await supabase
        .from("rewards_settings")
        .select("*")
        .eq("business_id", business.id)
        .maybeSingle();

      if (error) throw error;
      
      // Map database response to interface (handle new columns)
      if (data) {
        return {
          ...data,
          min_points_to_redeem: (data as any).min_points_to_redeem ?? 1000,
          max_discount_percent: (data as any).max_discount_percent ?? 10,
          points_expiry_months: (data as any).points_expiry_months ?? null,
        } as RewardsSettings;
      }
      return null;
    },
    enabled: !!business?.id,
  });
}

export function useUpsertRewardsSettings() {
  const queryClient = useQueryClient();
  const { data: business } = useBusiness();

  return useMutation({
    mutationFn: async (data: {
      points_per_naira?: number;
      naira_per_point?: number;
      is_enabled?: boolean;
      min_points_to_redeem?: number;
      max_discount_percent?: number;
      points_expiry_months?: number | null;
    }) => {
      if (!business) throw new Error("No business found");

      // Validate before saving
      const validation = validateRewardsSettings(data);
      if (!validation.valid) {
        throw new Error(validation.errors.join(" "));
      }

      // Enforce safety limits
      const safeData = {
        ...data,
        points_per_naira: Math.min(data.points_per_naira ?? 1, REWARDS_LIMITS.maxPointsPerNaira),
        naira_per_point: Math.min(data.naira_per_point ?? 0.01, REWARDS_LIMITS.maxNairaPerPoint),
        min_points_to_redeem: Math.max(data.min_points_to_redeem ?? 1000, 100),
        max_discount_percent: Math.min(data.max_discount_percent ?? 10, 50),
        business_id: business.id,
      };

      const { data: settings, error } = await supabase
        .from("rewards_settings")
        .upsert(safeData, { onConflict: "business_id" })
        .select()
        .single();

      if (error) throw error;
      return settings as RewardsSettings;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rewards_settings"] });
    },
  });
}
