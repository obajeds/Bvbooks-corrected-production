import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useBusiness } from "./useBusiness";
import { useBranchContext } from "@/contexts/BranchContext";
import { startOfMonth, subMonths } from "date-fns";

export interface StaffRiskScore {
  staffId: string;
  staffName: string;
  riskScore: number; // 0-100, higher = more risky
  riskLevel: "low" | "medium" | "high" | "critical";
  metrics: {
    refundCount: number;
    refundAmount: number;
    voidCount: number;
    discountCount: number;
    totalDiscountAmount: number;
    avgDiscountPercent: number;
    salesCount: number;
  };
  flags: string[];
}

export function useStaffRiskScoring() {
  const { data: business } = useBusiness();
  const { currentBranch } = useBranchContext();
  const businessId = business?.id;
  const branchId = currentBranch?.id;

  return useQuery({
    queryKey: ["staff-risk-scoring", businessId, branchId],
    queryFn: async (): Promise<StaffRiskScore[]> => {
      if (!businessId) throw new Error("No business selected");

      const monthStart = startOfMonth(subMonths(new Date(), 1));

      // Get staff assigned to this branch
      let staffIds: string[] = [];
      if (branchId) {
        const { data: assignments } = await supabase
          .from("staff_branch_assignments")
          .select("staff_id")
          .eq("branch_id", branchId)
          .eq("is_active", true);
        staffIds = (assignments || []).map((a) => a.staff_id);
        if (staffIds.length === 0) return [];
      }

      // Get staff details
      let staffQuery = supabase
        .from("staff")
        .select("id, full_name")
        .eq("business_id", businessId)
        .eq("is_active", true);

      if (staffIds.length > 0) {
        staffQuery = staffQuery.in("id", staffIds);
      }

      const { data: staffList, error: staffError } = await staffQuery;
      if (staffError) throw staffError;

      // Get sales data scoped to branch
      let salesQuery = supabase
        .from("sales")
        .select("id, total_amount, discount_amount, created_at")
        .eq("business_id", businessId)
        .gte("created_at", monthStart.toISOString());

      if (branchId) {
        salesQuery = salesQuery.eq("branch_id", branchId);
      }

      const { data: salesData } = await salesQuery;

      // Get activity logs scoped to branch
      let logsQuery = supabase
        .from("activity_logs")
        .select("staff_id, action, entity_type, details, created_at")
        .eq("business_id", businessId)
        .in("action", ["refund", "void", "delete"])
        .gte("created_at", monthStart.toISOString());

      if (branchId) {
        logsQuery = logsQuery.eq("branch_id", branchId);
      }

      const { data: activityLogs } = await logsQuery;

      const staffRiskScores: StaffRiskScore[] = (staffList || []).map((staff) => {
        const staffLogs = (activityLogs || []).filter((l) => l.staff_id === staff.id);

        const refundLogs = staffLogs.filter((l) => l.action === "refund");
        const voidLogs = staffLogs.filter((l) => l.action === "void" || l.action === "delete");

        const refundCount = refundLogs.length;
        const refundAmount = refundLogs.reduce((sum, l) => {
          const details = l.details as any;
          return sum + (details?.amount || 0);
        }, 0);
        const voidCount = voidLogs.length;

        const discountLogs = staffLogs.filter((l) => {
          const details = l.details as any;
          return details?.discount_applied || details?.discount_amount;
        });
        const discountCount = discountLogs.length;
        const totalDiscountAmount = discountLogs.reduce((sum, l) => {
          const details = l.details as any;
          return sum + (details?.discount_amount || 0);
        }, 0);

        const salesLogs = staffLogs.filter((l) => l.entity_type === "sale" && l.action === "create");
        const salesCount = salesLogs.length || 1;
        const avgDiscountPercent = discountCount > 0 ? (totalDiscountAmount / (salesCount * 1000)) * 100 : 0;

        let riskScore = 0;
        const flags: string[] = [];

        if (salesCount > 0) {
          const refundRate = (refundCount / salesCount) * 100;
          if (refundRate > 20) { riskScore += 30; flags.push("Very high refund rate"); }
          else if (refundRate > 10) { riskScore += 20; flags.push("High refund rate"); }
          else if (refundRate > 5) { riskScore += 10; }
        }

        if (voidCount > 10) { riskScore += 25; flags.push("Excessive voids"); }
        else if (voidCount > 5) { riskScore += 15; flags.push("Multiple voids"); }
        else if (voidCount > 2) { riskScore += 5; }

        if (avgDiscountPercent > 20) { riskScore += 25; flags.push("Very high avg discount"); }
        else if (avgDiscountPercent > 10) { riskScore += 15; flags.push("High avg discount"); }
        else if (avgDiscountPercent > 5) { riskScore += 5; }

        if (refundAmount > 100000) { riskScore += 20; flags.push("High refund amount"); }
        else if (refundAmount > 50000) { riskScore += 10; }

        let riskLevel: StaffRiskScore["riskLevel"] = "low";
        if (riskScore >= 70) riskLevel = "critical";
        else if (riskScore >= 50) riskLevel = "high";
        else if (riskScore >= 25) riskLevel = "medium";

        return {
          staffId: staff.id,
          staffName: staff.full_name,
          riskScore: Math.min(riskScore, 100),
          riskLevel,
          metrics: {
            refundCount, refundAmount, voidCount, discountCount, totalDiscountAmount,
            avgDiscountPercent: Math.round(avgDiscountPercent * 10) / 10,
            salesCount,
          },
          flags,
        };
      });

      return staffRiskScores.sort((a, b) => b.riskScore - a.riskScore);
    },
    enabled: !!businessId && !!branchId,
    refetchInterval: 300000,
  });
}
