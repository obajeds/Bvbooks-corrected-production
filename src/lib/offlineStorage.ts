/**
 * Offline Storage Layer - IndexedDB-based local-first data storage
 * Provides append-only transaction logs, queue management, and conflict resolution
 */

const DB_NAME = 'bvbooks_offline_db';
const DB_VERSION = 1;

// Store names
const STORES = {
  SALES: 'offline_sales',
  STOCK_MOVEMENTS: 'offline_stock_movements',
  EXPENSES: 'offline_expenses',
  SYNC_QUEUE: 'sync_queue',
  CACHE: 'data_cache',
} as const;

export interface OfflineTransaction {
  id: string;
  type: 'sale' | 'stock_movement' | 'expense';
  data: unknown;
  created_at: string;
  synced: boolean;
  sync_attempts: number;
  last_sync_attempt?: string;
  sync_error?: string;
  business_id: string;
  branch_id?: string;
}

export interface SyncQueueItem {
  id: string;
  operation: 'create' | 'update' | 'delete';
  entity_type: string;
  entity_id?: string;
  payload: unknown;
  priority: number;
  created_at: string;
  retry_count: number;
  max_retries: number;
  last_attempt?: string;
  error?: string;
  status: 'pending' | 'in_progress' | 'failed' | 'completed';
}

export interface CachedData {
  key: string;
  data: unknown;
  timestamp: number;
  expiry_ms: number;
  business_id?: string;
}

let db: IDBDatabase | null = null;

/**
 * Initialize IndexedDB database
 */
export async function initOfflineDB(): Promise<IDBDatabase> {
  if (db) return db;

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      console.error('[OfflineDB] Failed to open database:', request.error);
      reject(request.error);
    };

    request.onsuccess = () => {
      db = request.result;
      console.log('[OfflineDB] Database opened successfully');
      resolve(db);
    };

    request.onupgradeneeded = (event) => {
      const database = (event.target as IDBOpenDBRequest).result;

      // Offline sales store
      if (!database.objectStoreNames.contains(STORES.SALES)) {
        const salesStore = database.createObjectStore(STORES.SALES, { keyPath: 'id' });
        salesStore.createIndex('business_id', 'business_id', { unique: false });
        salesStore.createIndex('synced', 'synced', { unique: false });
        salesStore.createIndex('created_at', 'created_at', { unique: false });
      }

      // Stock movements store
      if (!database.objectStoreNames.contains(STORES.STOCK_MOVEMENTS)) {
        const stockStore = database.createObjectStore(STORES.STOCK_MOVEMENTS, { keyPath: 'id' });
        stockStore.createIndex('business_id', 'business_id', { unique: false });
        stockStore.createIndex('synced', 'synced', { unique: false });
      }

      // Expenses store
      if (!database.objectStoreNames.contains(STORES.EXPENSES)) {
        const expenseStore = database.createObjectStore(STORES.EXPENSES, { keyPath: 'id' });
        expenseStore.createIndex('business_id', 'business_id', { unique: false });
        expenseStore.createIndex('synced', 'synced', { unique: false });
      }

      // Sync queue store
      if (!database.objectStoreNames.contains(STORES.SYNC_QUEUE)) {
        const queueStore = database.createObjectStore(STORES.SYNC_QUEUE, { keyPath: 'id' });
        queueStore.createIndex('status', 'status', { unique: false });
        queueStore.createIndex('priority', 'priority', { unique: false });
        queueStore.createIndex('entity_type', 'entity_type', { unique: false });
      }

      // Generic cache store
      if (!database.objectStoreNames.contains(STORES.CACHE)) {
        const cacheStore = database.createObjectStore(STORES.CACHE, { keyPath: 'key' });
        cacheStore.createIndex('business_id', 'business_id', { unique: false });
        cacheStore.createIndex('timestamp', 'timestamp', { unique: false });
      }
    };
  });
}

/**
 * Get database instance, initializing if needed
 */
async function getDB(): Promise<IDBDatabase> {
  if (db) return db;
  return initOfflineDB();
}

// =========================
// SYNC QUEUE OPERATIONS
// =========================

export async function addToSyncQueue(item: Omit<SyncQueueItem, 'id' | 'created_at' | 'retry_count' | 'status'>): Promise<string> {
  const database = await getDB();
  const id = `queue_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  const queueItem: SyncQueueItem = {
    ...item,
    id,
    created_at: new Date().toISOString(),
    retry_count: 0,
    status: 'pending',
  };

  return new Promise((resolve, reject) => {
    const transaction = database.transaction(STORES.SYNC_QUEUE, 'readwrite');
    const store = transaction.objectStore(STORES.SYNC_QUEUE);
    const request = store.add(queueItem);

    request.onsuccess = () => resolve(id);
    request.onerror = () => reject(request.error);
  });
}

export async function getPendingSyncItems(): Promise<SyncQueueItem[]> {
  const database = await getDB();
  
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(STORES.SYNC_QUEUE, 'readonly');
    const store = transaction.objectStore(STORES.SYNC_QUEUE);
    const index = store.index('status');
    const request = index.getAll('pending');

    request.onsuccess = () => {
      const items = request.result as SyncQueueItem[];
      // Sort by priority (higher first), then by created_at
      items.sort((a, b) => {
        if (b.priority !== a.priority) return b.priority - a.priority;
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      });
      resolve(items);
    };
    request.onerror = () => reject(request.error);
  });
}

export async function updateSyncQueueItem(id: string, updates: Partial<SyncQueueItem>): Promise<void> {
  const database = await getDB();
  
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(STORES.SYNC_QUEUE, 'readwrite');
    const store = transaction.objectStore(STORES.SYNC_QUEUE);
    const getRequest = store.get(id);

    getRequest.onsuccess = () => {
      if (getRequest.result) {
        const updated = { ...getRequest.result, ...updates };
        const putRequest = store.put(updated);
        putRequest.onsuccess = () => resolve();
        putRequest.onerror = () => reject(putRequest.error);
      } else {
        resolve();
      }
    };
    getRequest.onerror = () => reject(getRequest.error);
  });
}

export async function removeSyncQueueItem(id: string): Promise<void> {
  const database = await getDB();
  
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(STORES.SYNC_QUEUE, 'readwrite');
    const store = transaction.objectStore(STORES.SYNC_QUEUE);
    const request = store.delete(id);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function getSyncQueueCount(): Promise<number> {
  const database = await getDB();
  
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(STORES.SYNC_QUEUE, 'readonly');
    const store = transaction.objectStore(STORES.SYNC_QUEUE);
    const index = store.index('status');
    const request = index.count('pending');

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// =========================
// CACHE OPERATIONS
// =========================

export async function setCache(key: string, data: unknown, expiryMs: number = 30 * 60 * 1000, businessId?: string): Promise<void> {
  const database = await getDB();
  
  const cacheItem: CachedData = {
    key,
    data,
    timestamp: Date.now(),
    expiry_ms: expiryMs,
    business_id: businessId,
  };

  return new Promise((resolve, reject) => {
    const transaction = database.transaction(STORES.CACHE, 'readwrite');
    const store = transaction.objectStore(STORES.CACHE);
    const request = store.put(cacheItem);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function getCache<T>(key: string): Promise<T | null> {
  const database = await getDB();
  
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(STORES.CACHE, 'readonly');
    const store = transaction.objectStore(STORES.CACHE);
    const request = store.get(key);

    request.onsuccess = () => {
      const item = request.result as CachedData | undefined;
      if (!item) {
        resolve(null);
        return;
      }

      // Check if expired
      const isExpired = Date.now() - item.timestamp > item.expiry_ms;
      if (isExpired) {
        // Clean up expired cache
        deleteCache(key).catch(console.error);
        resolve(null);
        return;
      }

      resolve(item.data as T);
    };
    request.onerror = () => reject(request.error);
  });
}

export async function deleteCache(key: string): Promise<void> {
  const database = await getDB();
  
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(STORES.CACHE, 'readwrite');
    const store = transaction.objectStore(STORES.CACHE);
    const request = store.delete(key);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function clearBusinessCache(businessId: string): Promise<void> {
  const database = await getDB();
  
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(STORES.CACHE, 'readwrite');
    const store = transaction.objectStore(STORES.CACHE);
    const index = store.index('business_id');
    const request = index.openCursor(businessId);

    request.onsuccess = (event) => {
      const cursor = (event.target as IDBRequest).result;
      if (cursor) {
        cursor.delete();
        cursor.continue();
      } else {
        resolve();
      }
    };
    request.onerror = () => reject(request.error);
  });
}

// =========================
// OFFLINE SALES OPERATIONS
// =========================

export async function saveOfflineSale(sale: OfflineTransaction): Promise<void> {
  const database = await getDB();
  
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(STORES.SALES, 'readwrite');
    const store = transaction.objectStore(STORES.SALES);
    const request = store.put(sale);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function getUnsyncedSales(businessId?: string): Promise<OfflineTransaction[]> {
  const database = await getDB();
  
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(STORES.SALES, 'readonly');
    const store = transaction.objectStore(STORES.SALES);
    const request = store.getAll();

    request.onsuccess = () => {
      let results = (request.result as OfflineTransaction[]).filter(s => !s.synced);
      if (businessId) {
        results = results.filter(s => s.business_id === businessId);
      }
      resolve(results);
    };
    request.onerror = () => reject(request.error);
  });
}

export async function markSaleAsSynced(id: string): Promise<void> {
  const database = await getDB();
  
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(STORES.SALES, 'readwrite');
    const store = transaction.objectStore(STORES.SALES);
    const getRequest = store.get(id);

    getRequest.onsuccess = () => {
      if (getRequest.result) {
        const updated = { ...getRequest.result, synced: true };
        const putRequest = store.put(updated);
        putRequest.onsuccess = () => resolve();
        putRequest.onerror = () => reject(putRequest.error);
      } else {
        resolve();
      }
    };
    getRequest.onerror = () => reject(getRequest.error);
  });
}

export async function getOfflineSalesCount(businessId?: string): Promise<number> {
  const sales = await getUnsyncedSales(businessId);
  return sales.length;
}

// =========================
// CLEANUP OPERATIONS
// =========================

export async function cleanupSyncedData(olderThanDays: number = 7): Promise<void> {
  const database = await getDB();
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);
  
  const stores = [STORES.SALES, STORES.STOCK_MOVEMENTS, STORES.EXPENSES];
  
  for (const storeName of stores) {
    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.openCursor();

      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result;
        if (cursor) {
          const item = cursor.value as OfflineTransaction;
          if (item.synced && new Date(item.created_at) < cutoffDate) {
            cursor.delete();
          }
          cursor.continue();
        } else {
          resolve();
        }
      };
      request.onerror = () => reject(request.error);
    });
  }
}

/**
 * Get total pending sync count across all entity types
 */
export async function getTotalPendingCount(): Promise<{ sales: number; queue: number; total: number }> {
  const [sales, queue] = await Promise.all([
    getOfflineSalesCount(),
    getSyncQueueCount(),
  ]);
  
  return { sales, queue, total: sales + queue };
}
