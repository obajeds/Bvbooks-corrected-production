import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  CheckCircle2,
  AlertCircle,
  Loader2,
  RefreshCw,
  Cloud,
  CloudOff,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useSalesSyncStatus, type SyncStatusLevel } from "@/hooks/useSalesSyncStatus";

interface SalesSyncStatusCardProps {
  compact?: boolean;
  className?: string;
}

const STATUS_CONFIG: Record<SyncStatusLevel, {
  icon: typeof CheckCircle2;
  label: string;
  dotColor: string;
  badgeBg: string;
}> = {
  complete: {
    icon: CheckCircle2,
    label: "All Synced",
    dotColor: "bg-green-500",
    badgeBg: "bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20",
  },
  syncing: {
    icon: Loader2,
    label: "Pending",
    dotColor: "bg-amber-500",
    badgeBg: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
  },
  incomplete: {
    icon: AlertCircle,
    label: "Failed",
    dotColor: "bg-destructive",
    badgeBg: "bg-destructive/10 text-destructive border-destructive/20",
  },
};

function SyncDetails() {
  const { summary, retrySyncSales } = useSalesSyncStatus();
  const config = STATUS_CONFIG[summary.status];
  const Icon = config.icon;
  const canRetry = summary.isOnline && (summary.pendingCount > 0 || summary.failedCount > 0) && !summary.isSyncing;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Icon className={cn("h-4 w-4", summary.isSyncing && "animate-spin",
          summary.status === "complete" ? "text-green-500" :
          summary.status === "syncing" ? "text-amber-500" : "text-destructive"
        )} />
        <span className="text-sm font-semibold">{config.label}</span>
        {!summary.isOnline && (
          <Badge variant="outline" className="text-[10px] px-1.5 py-0 gap-1">
            <CloudOff className="h-3 w-3" /> Offline
          </Badge>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2">
        <StatCell label="Total" value={summary.totalToday} />
        <StatCell label="Synced" value={summary.syncedCount} color="text-green-600 dark:text-green-400" />
        <StatCell label="Pending" value={summary.pendingCount} color="text-amber-600 dark:text-amber-400" />
        <StatCell label="Failed" value={summary.failedCount} color="text-destructive" />
      </div>

      {summary.lastSyncTime && (
        <p className="text-[10px] text-muted-foreground">
          Last sync: {new Date(summary.lastSyncTime).toLocaleTimeString()}
        </p>
      )}

      {canRetry && (
        <Button
          variant="outline"
          size="sm"
          className="w-full h-8 text-xs gap-1.5"
          onClick={retrySyncSales}
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Retry Sync
        </Button>
      )}
    </div>
  );
}

function StatCell({ label, value, color }: { label: string; value: number; color?: string }) {
  return (
    <div className="rounded-md bg-muted/50 px-2.5 py-1.5 text-center">
      <p className={cn("text-lg font-bold leading-none", color)}>{value}</p>
      <p className="text-[10px] text-muted-foreground mt-0.5">{label}</p>
    </div>
  );
}

/** Compact mode — small tappable pill for POS header */
function CompactSyncStatus({ className }: { className?: string }) {
  const { summary } = useSalesSyncStatus();
  const config = STATUS_CONFIG[summary.status];

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          className={cn(
            "flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium border cursor-pointer transition-colors hover:bg-muted/50",
            config.badgeBg,
            className
          )}
        >
          <span className={cn("h-2 w-2 rounded-full shrink-0", config.dotColor,
            summary.isSyncing && "animate-pulse"
          )} />
          {summary.pendingCount + summary.failedCount > 0 ? (
            <span>{summary.pendingCount + summary.failedCount}</span>
          ) : (
            <Cloud className="h-3 w-3" />
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-56 p-3" align="end">
        <p className="text-xs font-semibold text-muted-foreground mb-2">Today's Sales Sync</p>
        <SyncDetails />
      </PopoverContent>
    </Popover>
  );
}

/** Full mode — dashboard card */
function FullSyncStatus({ className }: { className?: string }) {
  const { summary, retrySyncSales } = useSalesSyncStatus();
  const config = STATUS_CONFIG[summary.status];
  const Icon = config.icon;
  const canRetry = summary.isOnline && (summary.pendingCount > 0 || summary.failedCount > 0) && !summary.isSyncing;

  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold">Today's Sales Sync</h3>
          <div className={cn(
            "flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium border",
            config.badgeBg
          )}>
            <Icon className={cn("h-3 w-3", summary.isSyncing && "animate-spin")} />
            {config.label}
          </div>
        </div>

        <div className="grid grid-cols-4 gap-2">
          <StatCell label="Total" value={summary.totalToday} />
          <StatCell label="Synced" value={summary.syncedCount} color="text-green-600 dark:text-green-400" />
          <StatCell label="Pending" value={summary.pendingCount} color="text-amber-600 dark:text-amber-400" />
          <StatCell label="Failed" value={summary.failedCount} color="text-destructive" />
        </div>

        <div className="flex items-center justify-between">
          {summary.lastSyncTime ? (
            <p className="text-[10px] text-muted-foreground">
              Last sync: {new Date(summary.lastSyncTime).toLocaleTimeString()}
            </p>
          ) : (
            <span />
          )}

          {canRetry && (
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs gap-1.5"
              onClick={retrySyncSales}
            >
              <RefreshCw className="h-3 w-3" />
              Retry Sync
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export function SalesSyncStatusCard({ compact = false, className }: SalesSyncStatusCardProps) {
  return compact
    ? <CompactSyncStatus className={className} />
    : <FullSyncStatus className={className} />;
}
