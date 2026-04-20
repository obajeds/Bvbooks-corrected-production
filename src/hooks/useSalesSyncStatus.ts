import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useBranchContext } from "@/contexts/BranchContext";
import { useBusiness } from "@/hooks/useBusiness";
import { useOfflineSalesSync } from "@/hooks/useOfflineSalesSync";

export type SyncStatusLevel = "complete" | "syncing" | "incomplete";

export interface SalesSyncSummary {
  totalToday: number;
  syncedCount: number;
  pendingCount: number;
  failedCount: number;
  status: SyncStatusLevel;
  isOnline: boolean;
  isSyncing: boolean;
  lastSyncTime: string | null;
}

export function useSalesSyncStatus() {
  const { data: business } = useBusiness();
  const { currentBranch } = useBranchContext();
  const activeBranchId = currentBranch?.id;
  const {
    syncStatus,
    syncPendingSales,
    pendingSales,
  } = useOfflineSalesSync();

  // Query today's synced sales count from the server
  const todayStart = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d.toISOString();
  }, []);

  const { data: serverCount = 0 } = useQuery({
    queryKey: ["sales-sync-count-today", business?.id, activeBranchId, todayStart],
    queryFn: async () => {
      if (!business?.id) return 0;

      let query = supabase
        .from("sales")
        .select("id", { count: "exact", head: true })
        .eq("business_id", business.id)
        .gte("created_at", todayStart);

      if (activeBranchId) {
        query = query.eq("branch_id", activeBranchId);
      }

      const { count, error } = await query;
      if (error) {
        console.error("[SalesSyncStatus] Failed to fetch server count:", error);
        return 0;
      }
      return count ?? 0;
    },
    enabled: !!business?.id,
    refetchInterval: 30_000,
    staleTime: 10_000,
  });

  const pendingCount = syncStatus.pendingCount;
  // For now we treat all pending items as "pending" — the offline sync hook
  // doesn't differentiate failed vs pending at the individual item level,
  // but the lastSyncResult tells us if the last batch failed.
  const failedCount = syncStatus.lastSyncResult === "failed" && pendingCount > 0 ? pendingCount : 0;
  const actualPending = failedCount > 0 ? 0 : pendingCount;

  const totalToday = serverCount + pendingCount;

  const status: SyncStatusLevel = useMemo(() => {
    if (actualPending === 0 && failedCount === 0) return "complete";
    if (failedCount > 0) return "incomplete";
    return "syncing";
  }, [actualPending, failedCount]);

  const summary: SalesSyncSummary = {
    totalToday,
    syncedCount: serverCount,
    pendingCount: actualPending,
    failedCount,
    status,
    isOnline: syncStatus.isOnline,
    isSyncing: syncStatus.isSyncing,
    lastSyncTime: syncStatus.lastSyncTime,
  };

  return {
    summary,
    retrySyncSales: syncPendingSales,
    pendingSales,
  };
}
