import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const OFFLINE_SALES_KEY = "bvbooks_offline_sales";
const OFFLINE_PRODUCTS_KEY = "bvbooks_offline_products";
const OFFLINE_BARCODES_KEY = "bvbooks_offline_barcodes";

interface OfflineSale {
  id: string;
  items: any[];
  total: number;
  paymentMethod: string;
  customerName?: string;
  branchId: string;
  businessId: string;
  createdAt: string;
}

export function useOfflineSync(businessId: string | undefined, branchId: string | undefined) {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingSales, setPendingSales] = useState<OfflineSale[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);

  // Monitor online status
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      toast.success("Back online - syncing data...");
    };
    
    const handleOffline = () => {
      setIsOnline(false);
      toast.warning("You're offline - sales will be saved locally");
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // Load pending sales from localStorage
  useEffect(() => {
    const stored = localStorage.getItem(OFFLINE_SALES_KEY);
    if (stored) {
      try {
        setPendingSales(JSON.parse(stored));
      } catch (e) {
        console.error("Failed to parse offline sales:", e);
      }
    }
  }, []);

  // Sync pending sales when back online
  useEffect(() => {
    if (isOnline && pendingSales.length > 0 && !isSyncing) {
      syncPendingSales();
    }
  }, [isOnline, pendingSales.length]);

  // Cache products locally for offline use
  const cacheProducts = useCallback((products: any[]) => {
    try {
      localStorage.setItem(OFFLINE_PRODUCTS_KEY, JSON.stringify({
        data: products,
        timestamp: Date.now(),
      }));
    } catch (e) {
      console.error("Failed to cache products:", e);
    }
  }, []);

  // Cache barcodes locally for offline use
  const cacheBarcodes = useCallback((barcodes: any[]) => {
    try {
      localStorage.setItem(OFFLINE_BARCODES_KEY, JSON.stringify({
        data: barcodes,
        timestamp: Date.now(),
      }));
    } catch (e) {
      console.error("Failed to cache barcodes:", e);
    }
  }, []);

  // Get cached products
  const getCachedProducts = useCallback(() => {
    try {
      const stored = localStorage.getItem(OFFLINE_PRODUCTS_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        // Cache valid for 24 hours
        if (Date.now() - parsed.timestamp < 24 * 60 * 60 * 1000) {
          return parsed.data;
        }
      }
    } catch (e) {
      console.error("Failed to get cached products:", e);
    }
    return null;
  }, []);

  // Get cached barcodes
  const getCachedBarcodes = useCallback(() => {
    try {
      const stored = localStorage.getItem(OFFLINE_BARCODES_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        // Cache valid for 24 hours
        if (Date.now() - parsed.timestamp < 24 * 60 * 60 * 1000) {
          return parsed.data;
        }
      }
    } catch (e) {
      console.error("Failed to get cached barcodes:", e);
    }
    return null;
  }, []);

  // Queue a sale for offline processing
  const queueOfflineSale = useCallback((sale: Omit<OfflineSale, "id" | "createdAt">) => {
    // Use proper UUID format for compatibility with sync-sales edge function
    const newSale: OfflineSale = {
      ...sale,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
    };

    const updated = [...pendingSales, newSale];
    setPendingSales(updated);
    localStorage.setItem(OFFLINE_SALES_KEY, JSON.stringify(updated));
    
    toast.info("Sale saved offline - will sync when online");
    return newSale;
  }, [pendingSales]);

  // Sync pending sales to server
  const syncPendingSales = useCallback(async () => {
    if (pendingSales.length === 0 || isSyncing) return;

    setIsSyncing(true);
    const failedSales: OfflineSale[] = [];
    let successCount = 0;

    for (const sale of pendingSales) {
      try {
        // Generate invoice number
        const invoiceNumber = `INV-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;

        // Create sale record
        const { data: saleData, error: saleError } = await supabase
          .from("sales")
          .insert({
            business_id: sale.businessId,
            branch_id: sale.branchId,
            invoice_number: invoiceNumber,
            subtotal: sale.total,
            total_amount: sale.total,
            payment_method: sale.paymentMethod,
            payment_status: "completed",
            notes: sale.customerName ? `Customer: ${sale.customerName} (Offline sale)` : "Offline sale",
          })
          .select()
          .single();

        if (saleError) throw saleError;

        // Create sale items
        const saleItems = sale.items.map((item: any) => ({
          sale_id: saleData.id,
          product_id: item.id,
          product_name: item.name,
          quantity: item.quantity,
          unit_price: item.price,
          total_price: item.price * item.quantity,
        }));

        const { error: itemsError } = await supabase
          .from("sale_items")
          .insert(saleItems);

        if (itemsError) throw itemsError;

        // Update product stock
        for (const item of sale.items) {
          const { error: stockError } = await supabase
            .from("products")
            .update({ stock_quantity: item.stock - item.quantity })
            .eq("id", item.id);
          
          if (stockError) {
            console.error("Failed to update stock for product:", item.id, stockError);
          }
        }

        successCount++;
      } catch (error) {
        console.error("Failed to sync sale:", error);
        failedSales.push(sale);
      }
    }

    // Update pending sales with only failed ones
    setPendingSales(failedSales);
    localStorage.setItem(OFFLINE_SALES_KEY, JSON.stringify(failedSales));

    setIsSyncing(false);

    if (successCount > 0) {
      toast.success(`Synced ${successCount} offline sale${successCount > 1 ? 's' : ''}`);
    }
    if (failedSales.length > 0) {
      toast.error(`${failedSales.length} sale${failedSales.length > 1 ? 's' : ''} failed to sync`);
    }
  }, [pendingSales, isSyncing]);

  return {
    isOnline,
    pendingSales,
    pendingSalesCount: pendingSales.length,
    isSyncing,
    queueOfflineSale,
    syncPendingSales,
    cacheProducts,
    cacheBarcodes,
    getCachedProducts,
    getCachedBarcodes,
  };
}
