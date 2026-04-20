/**
 * Unified Offline State Management Hook
 * Provides centralized offline status, sync queue management, and UI state
 */

import React, { useState, useEffect, useCallback, useRef, createContext, useContext, ReactNode } from 'react';
import { 
  initOfflineDB, 
  getTotalPendingCount, 
  getPendingSyncItems, 
  updateSyncQueueItem, 
  removeSyncQueueItem,
  SyncQueueItem 
} from '@/lib/offlineStorage';
import { 
  getCachedSession, 
  hasValidOfflineData,
  getOfflineAccessInfo 
} from '@/lib/offlineSession';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface OfflineState {
  // Connection status
  isOnline: boolean;
  isOfflineReady: boolean;
  
  // Sync status
  isSyncing: boolean;
  pendingCount: number;
  lastSyncTime: string | null;
  lastSyncResult: 'success' | 'partial' | 'failed' | null;
  
  // Offline access
  hasOfflineAccess: boolean;
  offlineExpiresAt: Date | null;
  offlineRemainingDays: number;
  
  // Actions
  triggerSync: () => Promise<void>;
  refreshOfflineStatus: () => Promise<void>;
}

const OfflineContext = createContext<OfflineState | null>(null);

export function useOfflineState(): OfflineState {
  const context = useContext(OfflineContext);
  if (!context) {
    throw new Error('useOfflineState must be used within OfflineProvider');
  }
  return context;
}

interface OfflineProviderProps {
  children: ReactNode;
}

export function OfflineProvider({ children }: OfflineProviderProps) {
  // Connection state
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isOfflineReady, setIsOfflineReady] = useState(false);
  
  // Sync state
  const [isSyncing, setIsSyncing] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);
  const [lastSyncResult, setLastSyncResult] = useState<'success' | 'partial' | 'failed' | null>(null);
  
  // Offline access state
  const [hasOfflineAccess, setHasOfflineAccess] = useState(false);
  const [offlineExpiresAt, setOfflineExpiresAt] = useState<Date | null>(null);
  const [offlineRemainingDays, setOfflineRemainingDays] = useState(0);
  
  // Refs to prevent concurrent syncs
  const isSyncingRef = useRef(false);
  const syncIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize offline database and check status
  useEffect(() => {
    const init = async () => {
      try {
        await initOfflineDB();
        setIsOfflineReady(true);
        
        // Check offline access
        const accessInfo = await getOfflineAccessInfo();
        setHasOfflineAccess(accessInfo.hasAccess);
        setOfflineExpiresAt(accessInfo.expiresAt);
        setOfflineRemainingDays(accessInfo.remainingDays);
        
        // Get pending count
        const counts = await getTotalPendingCount();
        setPendingCount(counts.total);
      } catch (error) {
        console.error('[Offline] Failed to initialize:', error);
        setIsOfflineReady(false);
      }
    };
    
    init();
  }, []);

  // Monitor online/offline status
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      toast.success("Back online", { 
        description: pendingCount > 0 ? "Syncing pending data..." : undefined,
        duration: 3000 
      });
    };
    
    const handleOffline = () => {
      setIsOnline(false);
      toast.warning("You're offline", {
        description: "Changes will be saved locally and synced when online",
        duration: 5000
      });
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [pendingCount]);

  // Refresh pending count periodically
  useEffect(() => {
    const refreshCount = async () => {
      try {
        const counts = await getTotalPendingCount();
        setPendingCount(counts.total);
      } catch (error) {
        console.error('[Offline] Failed to get pending count:', error);
      }
    };
    
    // Refresh every 5 seconds
    const interval = setInterval(refreshCount, 5000);
    return () => clearInterval(interval);
  }, []);

  // Background sync processor
  const processSync = useCallback(async () => {
    if (isSyncingRef.current || !navigator.onLine) return;
    
    isSyncingRef.current = true;
    setIsSyncing(true);

    try {
      const pendingItems = await getPendingSyncItems();
      
      if (pendingItems.length === 0) {
        setLastSyncResult('success');
        setLastSyncTime(new Date().toISOString());
        return;
      }

      let successCount = 0;
      let failCount = 0;

      for (const item of pendingItems) {
        try {
          // Update status to in_progress
          await updateSyncQueueItem(item.id, { 
            status: 'in_progress',
            last_attempt: new Date().toISOString(),
          });

          // Process based on entity type
          let success = false;
          
          switch (item.entity_type) {
            case 'sale':
              success = await syncSale(item);
              break;
            case 'stock_movement':
              success = await syncStockMovement(item);
              break;
            case 'expense':
              success = await syncExpense(item);
              break;
            default:
              console.warn('[Sync] Unknown entity type:', item.entity_type);
              success = false;
          }

          if (success) {
            await removeSyncQueueItem(item.id);
            successCount++;
          } else {
            await handleSyncFailure(item);
            failCount++;
          }
        } catch (error) {
          console.error('[Sync] Error processing item:', error);
          await handleSyncFailure(item, error instanceof Error ? error.message : 'Unknown error');
          failCount++;
        }
      }

      // Update sync result
      const counts = await getTotalPendingCount();
      setPendingCount(counts.total);
      setLastSyncTime(new Date().toISOString());

      if (failCount === 0) {
        setLastSyncResult('success');
        if (successCount > 0) {
          toast.success(`Synced ${successCount} item${successCount > 1 ? 's' : ''}`);
        }
      } else if (successCount > 0) {
        setLastSyncResult('partial');
        toast.warning(`Synced ${successCount} items, ${failCount} failed`);
      } else {
        setLastSyncResult('failed');
        toast.error('Sync failed - will retry automatically');
      }
    } catch (error) {
      console.error('[Sync] Background sync error:', error);
      setLastSyncResult('failed');
    } finally {
      isSyncingRef.current = false;
      setIsSyncing(false);
    }
  }, []);

  // Sync individual sale
  async function syncSale(item: SyncQueueItem): Promise<boolean> {
    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session?.session) return false;

      const response = await supabase.functions.invoke('sync-sales', {
        body: item.payload,
      });

      return !response.error;
    } catch {
      return false;
    }
  }

  // Sync stock movement
  async function syncStockMovement(item: SyncQueueItem): Promise<boolean> {
    try {
      const payload = item.payload as {
        business_id: string;
        product_id: string;
        quantity: number;
        movement_type: string;
        [key: string]: unknown;
      };
      const { error } = await supabase
        .from('stock_movements')
        .insert([payload]);
      
      return !error;
    } catch {
      return false;
    }
  }

  // Sync expense
  async function syncExpense(item: SyncQueueItem): Promise<boolean> {
    try {
      const payload = item.payload as {
        business_id: string;
        amount: number;
        description: string;
        [key: string]: unknown;
      };
      const { error } = await supabase
        .from('expenses')
        .insert([payload]);
      
      return !error;
    } catch {
      return false;
    }
  }

  // Handle sync failure with retry logic
  async function handleSyncFailure(item: SyncQueueItem, error?: string): Promise<void> {
    const newRetryCount = item.retry_count + 1;
    
    if (newRetryCount >= item.max_retries) {
      await updateSyncQueueItem(item.id, {
        status: 'failed',
        retry_count: newRetryCount,
        error: error || 'Max retries exceeded',
      });
    } else {
      await updateSyncQueueItem(item.id, {
        status: 'pending',
        retry_count: newRetryCount,
        error,
      });
    }
  }

  // Auto-sync when online and has pending items
  useEffect(() => {
    if (isOnline && pendingCount > 0 && !isSyncingRef.current) {
      // Small delay to ensure network is stable
      const timeoutId = setTimeout(processSync, 1000);
      return () => clearTimeout(timeoutId);
    }
  }, [isOnline, pendingCount, processSync]);

  // Periodic sync every 30 seconds when online
  useEffect(() => {
    if (isOnline) {
      syncIntervalRef.current = setInterval(() => {
        if (!isSyncingRef.current && pendingCount > 0) {
          processSync();
        }
      }, 30000);
    } else if (syncIntervalRef.current) {
      clearInterval(syncIntervalRef.current);
    }

    return () => {
      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current);
      }
    };
  }, [isOnline, pendingCount, processSync]);

  // Refresh offline status
  const refreshOfflineStatus = useCallback(async () => {
    const accessInfo = await getOfflineAccessInfo();
    setHasOfflineAccess(accessInfo.hasAccess);
    setOfflineExpiresAt(accessInfo.expiresAt);
    setOfflineRemainingDays(accessInfo.remainingDays);
    
    const counts = await getTotalPendingCount();
    setPendingCount(counts.total);
  }, []);

  const state: OfflineState = {
    isOnline,
    isOfflineReady,
    isSyncing,
    pendingCount,
    lastSyncTime,
    lastSyncResult,
    hasOfflineAccess,
    offlineExpiresAt,
    offlineRemainingDays,
    triggerSync: processSync,
    refreshOfflineStatus,
  };

  return React.createElement(OfflineContext.Provider, { value: state }, children);
}

// Export standalone hook for components that just need online status
export function useIsOnline(): boolean {
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return isOnline;
}
