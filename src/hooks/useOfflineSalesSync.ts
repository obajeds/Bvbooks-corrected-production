import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useBusiness } from "@/hooks/useBusiness";
import { toast } from "sonner";
import { 
  createSecureTransaction, 
  encryptAndStoreSales, 
  decryptStoredSales,
  prepareTransactionsForSync,
  clearEncryptedSales,
  type SignedTransaction,
} from "@/lib/offlineTransactionSecurity";
import { getDeviceSeed, logSecurityEvent } from "@/lib/crypto";

const DEVICE_FINGERPRINT_KEY = "bvbooks_device_fingerprint";

export interface OfflineSale {
  id: string;
  business_id: string;
  branch_id?: string;
  customer_id?: string;
  invoice_number: string;
  subtotal: number;
  discount_amount?: number;
  tax_amount?: number;
  total_amount: number;
  payment_method: 'cash' | 'card' | 'transfer' | 'credit' | 'mixed';
  payment_status?: 'completed' | 'pending' | 'partial';
  notes?: string;
  items: {
    product_id?: string;
    product_name: string;
    quantity: number;
    unit_price: number;
    total_price: number;
  }[];
  created_at: string;
}

export interface SecureOfflineSale extends SignedTransaction<OfflineSale> {}

export interface SyncStatus {
  isOnline: boolean;
  isSyncing: boolean;
  pendingCount: number;
  lastSyncTime: string | null;
  lastSyncResult: 'success' | 'partial' | 'failed' | null;
}

// Generate unique device fingerprint (stored securely)
function getDeviceFingerprint(): string {
  // Must match metadata.device_id generated during offline signing
  return getDeviceSeed();
}

// Get device name from user agent
function getDeviceName(): string {
  const ua = navigator.userAgent;
  if (/iPhone/.test(ua)) return "iPhone";
  if (/iPad/.test(ua)) return "iPad";
  if (/Android/.test(ua)) return "Android Device";
  if (/Windows/.test(ua)) return "Windows PC";
  if (/Mac/.test(ua)) return "Mac";
  if (/Linux/.test(ua)) return "Linux PC";
  return "Unknown Device";
}

// Load pending sales from encrypted storage
async function loadPendingSalesFromStorage(userId: string, businessId: string): Promise<SecureOfflineSale[]> {
  try {
    return await decryptStoredSales<SecureOfflineSale>(userId, businessId);
  } catch (e) {
    logSecurityEvent('decryption_failure', { 
      reason: 'load_failed',
      error: String(e)
    });
    return [];
  }
}

// Save pending sales to encrypted storage
async function savePendingSalesToStorage(
  sales: SecureOfflineSale[], 
  userId: string, 
  businessId: string
): Promise<void> {
  try {
    await encryptAndStoreSales(sales, userId, businessId);
  } catch (e) {
    logSecurityEvent('encryption_failure', { 
      reason: 'save_failed',
      error: String(e)
    });
    console.error("Failed to save offline sales queue:", e);
  }
}

const DEVICE_FINGERPRINT = getDeviceFingerprint();
const DEVICE_NAME = getDeviceName();

export function useOfflineSalesSync() {
  const { user } = useAuth();
  const { data: business } = useBusiness();
  
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isSyncing, setIsSyncing] = useState(false);
  const [pendingSales, setPendingSales] = useState<SecureOfflineSale[]>([]);
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);
  const [lastSyncResult, setLastSyncResult] = useState<'success' | 'partial' | 'failed' | null>(null);
  
  // Use refs to track values without causing re-renders
  const isSyncingRef = useRef(false);
  const businessIdRef = useRef(business?.id);
  const userIdRef = useRef(user?.id);

  // Keep refs in sync with state
  useEffect(() => {
    businessIdRef.current = business?.id;
  }, [business?.id]);

  useEffect(() => {
    userIdRef.current = user?.id;
  }, [user?.id]);

  // Load pending sales on mount (encrypted storage)
  useEffect(() => {
    const loadSales = async () => {
      if (user?.id && business?.id) {
        const stored = await loadPendingSalesFromStorage(user.id, business.id);
        setPendingSales(stored);
      }
    };
    loadSales();
  }, [user?.id, business?.id]);

  // Monitor online status
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      toast.success("Back online - syncing sales...");
    };
    
    const handleOffline = () => {
      setIsOnline(false);
      toast.warning("You're offline - sales will be saved locally (encrypted)");
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // Queue a sale for offline processing with signing and encryption
  const queueSale = useCallback(async (sale: Omit<OfflineSale, "id" | "created_at">) => {
    if (!businessIdRef.current || !userIdRef.current) {
      toast.error("Cannot queue sale - not authenticated");
      return null;
    }

    // Use proper UUID format for compatibility with sync-sales edge function
    const saleId = crypto.randomUUID();
    const newSale: OfflineSale = {
      ...sale,
      id: saleId,
      created_at: new Date().toISOString(),
    };

    try {
      // Create signed and secured transaction
      const secureTransaction = await createSecureTransaction(
        saleId,
        newSale,
        businessIdRef.current,
        sale.branch_id,
        userIdRef.current
      );

      setPendingSales(prev => {
        const updated = [...prev, secureTransaction];
        // Save with encryption
        savePendingSalesToStorage(updated, userIdRef.current!, businessIdRef.current!);
        return updated;
      });
      
      toast.info("Sale saved offline (encrypted & signed)");
      return newSale;
    } catch (error) {
      logSecurityEvent('encryption_failure', {
        reason: 'queue_sale_failed',
        error: String(error)
      });
      toast.error("Failed to save sale securely");
      return null;
    }
  }, []);

  // Sync pending sales to server with signature validation
  const syncPendingSales = useCallback(async () => {
    if (pendingSales.length === 0 || isSyncingRef.current) return;
    if (!navigator.onLine) return;
    if (!businessIdRef.current || !userIdRef.current) return;

    isSyncingRef.current = true;
    setIsSyncing(true);

    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session?.session?.access_token) {
        console.error("No auth session for sync");
        setIsSyncing(false);
        isSyncingRef.current = false;
        return;
      }

      // Validate signatures before sending
      const { valid, invalid } = await prepareTransactionsForSync(pendingSales);
      
      if (invalid.length > 0) {
        logSecurityEvent('signature_failure', {
          reason: 'pre_sync_validation_failed',
          invalidCount: invalid.length
        });
        toast.warning(`${invalid.length} transaction(s) failed integrity check and will be skipped`);
      }

      if (valid.length === 0) {
        setLastSyncResult('failed');
        toast.error("No valid transactions to sync");
        setIsSyncing(false);
        isSyncingRef.current = false;
        return;
      }

      // Extract payloads and signatures for sync
      const salesForSync = valid.map(tx => ({
        ...tx.payload,
        _signature: tx.signature,
        _metadata: tx.metadata,
      }));

      const response = await supabase.functions.invoke('sync-sales', {
        body: {
          device_fingerprint: DEVICE_FINGERPRINT,
          device_name: DEVICE_NAME,
          business_id: businessIdRef.current,
          sales: salesForSync,
        },
      });

      if (response.error) {
        console.error("Sync failed:", response.error);
        setLastSyncResult('failed');
        toast.error("Failed to sync sales");
      } else {
        const result = response.data;
        
        const syncedCount = result.results?.synced?.length || 0;
        const skippedCount = result.results?.skipped?.length || 0;
        const doneCount = syncedCount + skippedCount;

        if (doneCount === valid.length) {
          // All processed (synced or already existed as duplicates)
          setPendingSales([]);
          clearEncryptedSales();
          setLastSyncResult('success');
          if (syncedCount > 0) {
            toast.success(`Synced ${syncedCount} offline sale(s)`);
          } else {
            toast.success("Offline sales queue cleared (already synced)");
          }
        } else if (doneCount > 0) {
          // Partial — keep only truly failed/rejected
          const doneIds = new Set([
            ...(result.results?.synced || []),
            ...(result.results?.skipped || []),
          ]);
          const remainingSales = pendingSales.filter(s => !doneIds.has(s.id));
          setPendingSales(remainingSales);
          await savePendingSalesToStorage(remainingSales, userIdRef.current!, businessIdRef.current!);
          setLastSyncResult(remainingSales.length > 0 ? 'partial' : 'success');
          if (syncedCount > 0) {
            toast.warning(`Synced ${syncedCount} of ${valid.length} sales`);
          }
        } else {
          setLastSyncResult('failed');
          toast.error("Failed to sync sales");
        }
        
        setLastSyncTime(new Date().toISOString());
      }
    } catch (error) {
      console.error("Sync error:", error);
      setLastSyncResult('failed');
    } finally {
      setIsSyncing(false);
      isSyncingRef.current = false;
    }
  }, [pendingSales]);

  // Auto-sync immediately when coming back online
  useEffect(() => {
    if (isOnline && pendingSales.length > 0 && !isSyncingRef.current) {
      const timeoutId = setTimeout(() => {
        if (navigator.onLine && !isSyncingRef.current) {
          syncPendingSales();
        }
      }, 500);
      return () => clearTimeout(timeoutId);
    }
  }, [isOnline, pendingSales.length, syncPendingSales]);

  // Periodic sync every 10 seconds when online and has pending sales
  useEffect(() => {
    const intervalId = setInterval(() => {
      if (navigator.onLine && pendingSales.length > 0 && !isSyncingRef.current) {
        syncPendingSales();
      }
    }, 10000);

    return () => clearInterval(intervalId);
  }, [pendingSales.length, syncPendingSales]);

  // Initial sync on mount if user is logged in
  useEffect(() => {
    if (user?.id && business?.id && pendingSales.length > 0 && navigator.onLine && !isSyncingRef.current) {
      // Small delay to ensure auth is fully ready
      const timeoutId = setTimeout(() => {
        syncPendingSales();
      }, 1000);
      return () => clearTimeout(timeoutId);
    }
  }, [user?.id, business?.id, pendingSales.length, syncPendingSales]);

  const syncStatus: SyncStatus = {
    isOnline,
    isSyncing,
    pendingCount: pendingSales.length,
    lastSyncTime,
    lastSyncResult,
  };

  return {
    syncStatus,
    queueSale,
    syncPendingSales,
    isSyncing,
    pendingSales,
  };
}
