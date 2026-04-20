import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Cloud, CloudOff, Loader2, CheckCircle2, AlertCircle, RefreshCw } from "lucide-react";
import { useOfflineState } from "@/hooks/useOfflineState";
import { cn } from "@/lib/utils";

interface SyncStatusIndicatorProps {
  compact?: boolean;
  showButton?: boolean;
}

export function SyncStatusIndicator({ compact = false, showButton = true }: SyncStatusIndicatorProps) {
  const { isOnline, isSyncing, pendingCount, lastSyncTime, lastSyncResult, triggerSync } = useOfflineState();
  
  const getStatusConfig = () => {
    if (!isOnline) {
      return {
        icon: CloudOff,
        label: "Offline",
        description: `${pendingCount} item${pendingCount !== 1 ? 's' : ''} queued`,
        color: "text-amber-500",
        bgColor: "bg-amber-500/10",
      };
    }
    
    if (isSyncing) {
      return {
        icon: Loader2,
        label: "Syncing...",
        description: "Uploading offline data",
        color: "text-blue-500",
        bgColor: "bg-blue-500/10",
        animate: true,
      };
    }
    
    if (pendingCount > 0) {
      return {
        icon: AlertCircle,
        label: "Pending",
        description: `${pendingCount} item${pendingCount !== 1 ? 's' : ''} to sync`,
        color: "text-amber-500",
        bgColor: "bg-amber-500/10",
      };
    }
    
    if (lastSyncResult === 'failed') {
      return {
        icon: AlertCircle,
        label: "Sync Failed",
        description: "Tap to retry",
        color: "text-destructive",
        bgColor: "bg-destructive/10",
      };
    }
    
    if (lastSyncResult === 'partial') {
      return {
        icon: AlertCircle,
        label: "Partial Sync",
        description: "Some items failed to sync",
        color: "text-amber-500",
        bgColor: "bg-amber-500/10",
      };
    }
    
    return {
      icon: lastSyncResult === 'success' ? CheckCircle2 : Cloud,
      label: "Online",
      description: lastSyncTime 
        ? `Last sync: ${new Date(lastSyncTime).toLocaleTimeString()}`
        : "Ready to sync",
      color: "text-green-500",
      bgColor: "bg-green-500/10",
    };
  };
  
  const config = getStatusConfig();
  const Icon = config.icon;

  if (compact) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className={cn(
              "flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium",
              config.bgColor,
              config.color
            )}>
              <Icon className={cn("h-3 w-3", config.animate && "animate-spin")} />
              {pendingCount > 0 && (
                <span>{pendingCount}</span>
              )}
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <p className="font-medium">{config.label}</p>
            <p className="text-xs text-muted-foreground">{config.description}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <div className={cn(
      "flex items-center gap-3 px-3 py-2 rounded-lg",
      config.bgColor
    )}>
      <Icon className={cn("h-5 w-5", config.color, config.animate && "animate-spin")} />
      <div className="flex-1">
        <p className={cn("text-sm font-medium", config.color)}>{config.label}</p>
        <p className="text-xs text-muted-foreground">{config.description}</p>
      </div>
      {showButton && pendingCount > 0 && isOnline && !isSyncing && (
        <Button
          variant="ghost"
          size="sm"
          onClick={triggerSync}
          disabled={isSyncing}
          className="h-8 px-2"
        >
          <RefreshCw className={cn("h-4 w-4", isSyncing && "animate-spin")} />
        </Button>
      )}
    </div>
  );
}
