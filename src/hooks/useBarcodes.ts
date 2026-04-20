import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useBusiness } from "./useBusiness";

export interface Barcode {
  id: string;
  product_id: string;
  business_id: string;
  barcode_value: string;
  barcode_type: string;
  source: "system_generated" | "manufacturer";
  is_active: boolean;
  created_by: string | null;
  created_at: string;
}

// Generate a unique barcode value (Code128 compatible)
export function generateBarcodeValue(sku: string, productId: string): string {
  // Use SKU if available, otherwise generate from product ID
  if (sku && sku.trim()) {
    return sku.toUpperCase().replace(/[^A-Z0-9]/g, "");
  }
  // Generate a short unique code from product ID
  const shortId = productId.replace(/-/g, "").slice(0, 12).toUpperCase();
  return `BV${shortId}`;
}

export function useBarcodes() {
  const { data: business } = useBusiness();

  return useQuery({
    queryKey: ["barcodes", business?.id],
    queryFn: async (): Promise<Barcode[]> => {
      if (!business) return [];

      const { data, error } = await supabase
        .from("barcodes")
        .select("*")
        .eq("business_id", business.id)
        .eq("is_active", true)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return (data || []).map(item => ({
        ...item,
        source: item.source as "system_generated" | "manufacturer"
      }));
    },
    enabled: !!business?.id,
    staleTime: 5 * 60 * 1000,
  });
}

export function useBarcodeByValue() {
  const { data: business } = useBusiness();

  return useMutation({
    mutationFn: async (barcodeValue: string): Promise<{ product_id: string } | null> => {
      if (!business) throw new Error("No business found");

      const { data, error } = await supabase
        .from("barcodes")
        .select("product_id")
        .eq("business_id", business.id)
        .eq("barcode_value", barcodeValue.trim())
        .eq("is_active", true)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
  });
}

export function useCreateBarcode() {
  const queryClient = useQueryClient();
  const { data: business } = useBusiness();

  return useMutation({
    mutationFn: async (data: {
      product_id: string;
      barcode_value: string;
      source?: "system_generated" | "manufacturer";
    }) => {
      if (!business) throw new Error("No business found");

      // Check if barcode value already exists
      const { data: existing } = await supabase
        .from("barcodes")
        .select("id")
        .eq("business_id", business.id)
        .eq("barcode_value", data.barcode_value)
        .eq("is_active", true)
        .maybeSingle();

      if (existing) {
        throw new Error("Barcode value already exists");
      }

      // Deactivate any existing barcodes for this product
      await supabase
        .from("barcodes")
        .update({ is_active: false })
        .eq("product_id", data.product_id)
        .eq("is_active", true);

      // Create new barcode
      const { data: barcode, error } = await supabase
        .from("barcodes")
        .insert({
          product_id: data.product_id,
          business_id: business.id,
          barcode_value: data.barcode_value,
          barcode_type: "Code128",
          source: data.source || "system_generated",
        })
        .select()
        .single();

      if (error) throw error;
      return barcode;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["barcodes"] });
    },
  });
}

export function useRegenerateBarcode() {
  const queryClient = useQueryClient();
  const { data: business } = useBusiness();

  return useMutation({
    mutationFn: async (data: { product_id: string; new_barcode_value: string }) => {
      if (!business) throw new Error("No business found");

      // Deactivate old barcode
      await supabase
        .from("barcodes")
        .update({ is_active: false })
        .eq("product_id", data.product_id)
        .eq("business_id", business.id)
        .eq("is_active", true);

      // Create new barcode
      const { data: barcode, error } = await supabase
        .from("barcodes")
        .insert({
          product_id: data.product_id,
          business_id: business.id,
          barcode_value: data.new_barcode_value,
          barcode_type: "Code128",
          source: "system_generated",
        })
        .select()
        .single();

      if (error) throw error;
      return barcode;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["barcodes"] });
    },
  });
}
