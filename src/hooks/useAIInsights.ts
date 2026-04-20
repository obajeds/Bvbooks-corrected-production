import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useBusiness } from "./useBusiness";
import { toast } from "sonner";

export interface AIInsightsData {
  success: boolean;
  period: string;
  generatedAt: string;
  dataSummary: {
    salesCount: number;
    totalRevenue: number;
    avgOrderValue: number;
    stockMovements: number;
    staffCount: number;
  };
  insights: {
    salesPatterns: {
      peakHours: string[];
      peakDays: string[];
      trendingProducts: string[];
      seasonalInsights: string;
      recommendations: string[];
    };
    lossPreventionAlerts: {
      highRiskAreas: string[];
      unusualDiscounts: string;
      inventoryAnomalies: string[];
      recommendations: string[];
    };
    staffPerformance: {
      topPerformers: string[];
      needsImprovement: string[];
      anomalies: string[];
      recommendations: string[];
    };
    overallHealth: {
      score: number;
      summary: string;
      criticalAlerts: string[];
      opportunities: string[];
    };
  };
}

export function useAIInsights(period: string = "month") {
  const { data: business } = useBusiness();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["ai-insights", business?.id, period],
    queryFn: async (): Promise<AIInsightsData | null> => {
      if (!business?.id) return null;

      const { data, error } = await supabase.functions.invoke("ai-sales-insights", {
        body: { businessId: business.id, period },
      });

      if (error) {
        console.error("Error fetching AI insights:", error);
        throw error;
      }

      return data as AIInsightsData;
    },
    enabled: false, // Manual trigger only
    staleTime: 1000 * 60 * 30, // Cache for 30 minutes
    retry: 1,
  });

  const generateInsights = useMutation({
    mutationFn: async (insightPeriod: string = "month") => {
      if (!business?.id) throw new Error("No business found");

      const { data, error } = await supabase.functions.invoke("ai-sales-insights", {
        body: { businessId: business.id, period: insightPeriod },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      return data as AIInsightsData;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(["ai-insights", business?.id, data.period], data);
      toast.success("AI insights generated successfully");
    },
    onError: (error: Error) => {
      console.error("Error generating insights:", error);
      if (error.message.includes("addon not active")) {
        toast.error("AI Insights addon is not active. Please purchase or activate it.");
      } else {
        toast.error("Failed to generate insights. Please try again.");
      }
    },
  });

  return {
    ...query,
    generateInsights,
    isGenerating: generateInsights.isPending,
  };
}

export function useHasAIInsightsAddon() {
  const { data: business } = useBusiness();

  return useQuery({
    queryKey: ["has-ai-insights-addon", business?.id],
    queryFn: async (): Promise<boolean> => {
      if (!business?.id) return false;

      const { data, error } = await supabase
        .from("business_addons")
        .select("id, addon_feature:addon_features(feature_key)")
        .eq("business_id", business.id)
        .eq("status", "active");

      if (error) {
        console.error("Error checking addon:", error);
        return false;
      }

      return data?.some((addon: any) => addon.addon_feature?.feature_key === "ai_insights") || false;
    },
    enabled: !!business?.id,
  });
}
