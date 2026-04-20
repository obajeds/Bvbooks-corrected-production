import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useBusiness } from "./useBusiness";

export interface PriceChange {
  productId: string;
  productName: string;
  oldPrice: number;
  newPrice: number;
}

export interface StockIssue {
  productId: string;
  productName: string;
  requestedQty: number;
  availableStock: number;
}

export interface ValidationResult<T> {
  isValid: boolean;
  priceChanges: PriceChange[];
  stockIssues: StockIssue[];
  updatedCart: T[];
}

export function useCheckoutValidation() {
  const { data: business } = useBusiness();
  const [isValidating, setIsValidating] = useState(false);

  const validateCart = useCallback(
    async <T extends { id: string; name: string; price: number; stock: number; quantity: number; priceAtTimeAdded?: number }>(
      cart: T[],
      branchId?: string
    ): Promise<ValidationResult<T>> => {
      if (!business?.id || cart.length === 0) {
        return { isValid: true, priceChanges: [], stockIssues: [], updatedCart: cart };
      }

      setIsValidating(true);
      try {
        const productIds = cart.map((item) => item.id);

        // Fetch fresh product prices
        const { data: freshProducts, error } = await supabase
          .from("products")
          .select("id, selling_price, stock_quantity, name")
          .eq("business_id", business.id)
          .in("id", productIds);

        if (error) throw error;

        // Fetch branch-specific stock if branchId provided
        let branchStockMap = new Map<string, number>();
        if (branchId) {
          const { data: branchStockData } = await supabase
            .from("branch_stock")
            .select("product_id, quantity")
            .eq("business_id", business.id)
            .eq("branch_id", branchId)
            .in("product_id", productIds);

          branchStockMap = new Map(
            (branchStockData || []).map((bs: any) => [bs.product_id, Number(bs.quantity)])
          );
        }

        const productMap = new Map(
          (freshProducts || []).map((p) => [p.id, p])
        );

        const priceChanges: PriceChange[] = [];
        const stockIssues: StockIssue[] = [];

        const updatedCart = cart.map((item) => {
          const fresh = productMap.get(item.id);
          if (!fresh) {
            stockIssues.push({
              productId: item.id,
              productName: item.name,
              requestedQty: item.quantity,
              availableStock: 0,
            });
            return item;
          }

          const currentPrice = Number(fresh.selling_price);
          const cartPrice = item.priceAtTimeAdded ?? item.price;

          if (Math.abs(currentPrice - cartPrice) > 0.01) {
            priceChanges.push({
              productId: item.id,
              productName: item.name,
              oldPrice: cartPrice,
              newPrice: currentPrice,
            });
          }

          // Use branch stock if available, else global
          const availableStock = branchId
            ? (branchStockMap.get(item.id) ?? fresh.stock_quantity)
            : fresh.stock_quantity;

          if (item.quantity > availableStock) {
            stockIssues.push({
              productId: item.id,
              productName: item.name,
              requestedQty: item.quantity,
              availableStock,
            });
          }

          return {
            ...item,
            price: currentPrice,
            stock: availableStock,
            priceAtTimeAdded: currentPrice,
          };
        });

        return {
          isValid: stockIssues.length === 0,
          priceChanges,
          stockIssues,
          updatedCart,
        };
      } finally {
        setIsValidating(false);
      }
    },
    [business?.id]
  );

  return { validateCart, isValidating };
}
