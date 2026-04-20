/**
 * Offline Status Bar
 * Always-visible indicator of offline status and pending sync items
 */

import { useOfflineState } from '@/hooks/useOfflineState';
import { Button } from '@/components/ui/button';
import { 
  Cloud, 
  CloudOff, 
  Loader2, 
  RefreshCw, 
  AlertCircle,
  CheckCircle2,
  WifiOff 
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface OfflineStatusBarProps {
  className?: string;
}

export function OfflineStatusBar({ className }: OfflineStatusBarProps) {
  const {
    isOnline,
    isOfflineReady,
    isSyncing,
    pendingCount,
    lastSyncResult,
    triggerSync,
  } = useOfflineState();

  // Don't show anything if online with no pending items and no recent issues
  if (isOnline && pendingCount === 0 && lastSyncResult !== 'failed') {
    return null;
  }

  const getStatusConfig = () => {
    if (!isOnline) {
      return {
        icon: WifiOff,
        label: 'Offline Mode',
        description: pendingCount > 0 
          ? `${pendingCount} item${pendingCount > 1 ? 's' : ''} will sync when online`
          : 'Working locally - data saved offline',
        variant: 'warning' as const,
        animate: false,
      };
    }

    if (isSyncing) {
      return {
        icon: Loader2,
        label: 'Syncing...',
        description: `Uploading ${pendingCount} item${pendingCount > 1 ? 's' : ''}`,
        variant: 'info' as const,
        animate: true,
      };
    }

    if (lastSyncResult === 'failed' && pendingCount > 0) {
      return {
        icon: AlertCircle,
        label: 'Sync Failed',
        description: `${pendingCount} item${pendingCount > 1 ? 's' : ''} pending - tap to retry`,
        variant: 'error' as const,
        animate: false,
      };
    }

    if (pendingCount > 0) {
      return {
        icon: Cloud,
        label: 'Pending Sync',
        description: `${pendingCount} item${pendingCount > 1 ? 's' : ''} waiting to sync`,
        variant: 'info' as const,
        animate: false,
      };
    }

    return {
      icon: CheckCircle2,
      label: 'All Synced',
      description: 'Everything is up to date',
      variant: 'success' as const,
      animate: false,
    };
  };

  const config = getStatusConfig();
  const Icon = config.icon;

  const variantStyles = {
    warning: 'bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-400',
    error: 'bg-destructive/10 border-destructive/30 text-destructive',
    info: 'bg-blue-500/10 border-blue-500/30 text-blue-600 dark:text-blue-400',
    success: 'bg-green-500/10 border-green-500/30 text-green-600 dark:text-green-400',
  };

  return (
    <div 
      className={cn(
        'flex items-center gap-3 px-4 py-2 border rounded-lg',
        variantStyles[config.variant],
        className
      )}
    >
      <Icon className={cn('h-5 w-5 shrink-0', config.animate && 'animate-spin')} />
      
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium">{config.label}</p>
        <p className="text-xs opacity-80 truncate">{config.description}</p>
      </div>

      {isOnline && pendingCount > 0 && !isSyncing && (
        <Button
          variant="ghost"
          size="sm"
          onClick={triggerSync}
          className="h-8 px-2 shrink-0"
        >
          <RefreshCw className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}

/**
 * Compact version for mobile or tight spaces
 */
export function OfflineStatusBadge() {
  const { isOnline, isSyncing, pendingCount } = useOfflineState();

  if (isOnline && pendingCount === 0) {
    return null;
  }

  return (
    <div className={cn(
      'flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium',
      isOnline 
        ? 'bg-blue-500/10 text-blue-600' 
        : 'bg-amber-500/10 text-amber-600'
    )}>
      {isSyncing ? (
        <Loader2 className="h-3 w-3 animate-spin" />
      ) : isOnline ? (
        <Cloud className="h-3 w-3" />
      ) : (
        <WifiOff className="h-3 w-3" />
      )}
      {pendingCount > 0 && <span>{pendingCount}</span>}
    </div>
  );
}
