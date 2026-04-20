import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useBusiness } from "./useBusiness";
import { startOfMonth, subMonths, format, startOfDay, subDays } from "date-fns";

export interface BranchPerformance {
  branchId: string;
  branchName: string;
  isMain: boolean;
  metrics: {
    salesCount: number;
    totalRevenue: number;
    avgOrderValue: number;
    salesGrowth: number; // Percentage vs last month
    stockValue: number;
    staffCount: number;
  };
  trend: "up" | "down" | "stable";
  ranking: number;
}

export interface BranchTrend {
  date: string;
  branchId: string;
  branchName: string;
  revenue: number;
}

export function useBranchPerformance() {
  const { data: business } = useBusiness();
  const businessId = business?.id;

  return useQuery({
    queryKey: ["branch-performance", businessId],
    queryFn: async (): Promise<BranchPerformance[]> => {
      if (!businessId) throw new Error("No business selected");

      const currentMonthStart = startOfMonth(new Date());
      const lastMonthStart = startOfMonth(subMonths(new Date(), 1));
      const lastMonthEnd = startOfMonth(new Date());

      // Get all branches
      const { data: branches, error: branchError } = await supabase
        .from("branches")
        .select("id, name, is_main")
        .eq("business_id", businessId)
        .eq("is_active", true);

      if (branchError) throw branchError;

      // Get current month sales by branch
      const { data: currentSales } = await supabase
        .from("sales")
        .select("branch_id, total_amount")
        .eq("business_id", businessId)
        .gte("created_at", currentMonthStart.toISOString());

      // Get last month sales by branch
      const { data: lastSales } = await supabase
        .from("sales")
        .select("branch_id, total_amount")
        .eq("business_id", businessId)
        .gte("created_at", lastMonthStart.toISOString())
        .lt("created_at", lastMonthEnd.toISOString());

      // Get stock values by branch (using branch_product_prices or default product prices)
      const { data: products } = await supabase
        .from("products")
        .select("stock_quantity, cost_price")
        .eq("business_id", businessId)
        .eq("is_active", true);

      // Get staff per branch
      const { data: staffAssignments } = await supabase
        .from("staff_branch_assignments")
        .select("branch_id, staff_id")
        .eq("is_active", true);

      const totalStockValue = (products || []).reduce(
        (sum, p) => sum + p.stock_quantity * p.cost_price,
        0
      );

      const branchPerformance: BranchPerformance[] = (branches || []).map((branch) => {
        const branchCurrentSales = (currentSales || []).filter((s) => s.branch_id === branch.id);
        const branchLastSales = (lastSales || []).filter((s) => s.branch_id === branch.id);
        const branchStaff = (staffAssignments || []).filter((s) => s.branch_id === branch.id);

        const totalRevenue = branchCurrentSales.reduce((sum, s) => sum + (s.total_amount || 0), 0);
        const lastRevenue = branchLastSales.reduce((sum, s) => sum + (s.total_amount || 0), 0);
        const salesCount = branchCurrentSales.length;
        const avgOrderValue = salesCount > 0 ? totalRevenue / salesCount : 0;

        // Calculate growth
        let salesGrowth = 0;
        if (lastRevenue > 0) {
          salesGrowth = ((totalRevenue - lastRevenue) / lastRevenue) * 100;
        } else if (totalRevenue > 0) {
          salesGrowth = 100;
        }

        // Determine trend
        let trend: BranchPerformance["trend"] = "stable";
        if (salesGrowth > 5) trend = "up";
        else if (salesGrowth < -5) trend = "down";

        // Distribute stock value evenly (simplified)
        const stockValue = branches!.length > 0 ? totalStockValue / branches!.length : 0;

        return {
          branchId: branch.id,
          branchName: branch.name,
          isMain: branch.is_main,
          metrics: {
            salesCount,
            totalRevenue,
            avgOrderValue,
            salesGrowth: Math.round(salesGrowth * 10) / 10,
            stockValue,
            staffCount: branchStaff.length,
          },
          trend,
          ranking: 0, // Will be set after sorting
        };
      });

      // Sort by revenue and assign rankings
      branchPerformance.sort((a, b) => b.metrics.totalRevenue - a.metrics.totalRevenue);
      branchPerformance.forEach((bp, index) => {
        bp.ranking = index + 1;
      });

      return branchPerformance;
    },
    enabled: !!businessId,
    refetchInterval: 300000,
  });
}

export function useBranchTrends() {
  const { data: business } = useBusiness();
  const businessId = business?.id;

  return useQuery({
    queryKey: ["branch-trends", businessId],
    queryFn: async (): Promise<BranchTrend[]> => {
      if (!businessId) throw new Error("No business selected");

      const last7Days = subDays(new Date(), 7);

      // Get branches
      const { data: branches } = await supabase
        .from("branches")
        .select("id, name")
        .eq("business_id", businessId)
        .eq("is_active", true);

      // Get sales for last 7 days
      const { data: sales } = await supabase
        .from("sales")
        .select("branch_id, total_amount, created_at")
        .eq("business_id", businessId)
        .gte("created_at", last7Days.toISOString());

      const trends: BranchTrend[] = [];
      const branchMap = new Map((branches || []).map((b) => [b.id, b.name]));

      // Group sales by date and branch
      const grouped: Record<string, Record<string, number>> = {};
      (sales || []).forEach((sale) => {
        const date = format(new Date(sale.created_at), "yyyy-MM-dd");
        const branchId = sale.branch_id || "unknown";
        if (!grouped[date]) grouped[date] = {};
        if (!grouped[date][branchId]) grouped[date][branchId] = 0;
        grouped[date][branchId] += sale.total_amount || 0;
      });

      Object.entries(grouped).forEach(([date, branchData]) => {
        Object.entries(branchData).forEach(([branchId, revenue]) => {
          trends.push({
            date,
            branchId,
            branchName: branchMap.get(branchId) || "Unknown",
            revenue,
          });
        });
      });

      return trends.sort((a, b) => a.date.localeCompare(b.date));
    },
    enabled: !!businessId,
  });
}
