import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useBusiness } from "./useBusiness";

export interface BarcodeSettings {
  id: string;
  business_id: string;
  is_enabled: boolean;
  barcode_type: string;
  allow_manufacturer_barcode: boolean;
  allow_barcode_printing: boolean;
  created_at: string;
  updated_at: string;
}

export function useBarcodeSettings() {
  const { data: business } = useBusiness();

  return useQuery({
    queryKey: ["barcode-settings", business?.id],
    queryFn: async (): Promise<BarcodeSettings | null> => {
      if (!business) return null;

      const { data, error } = await supabase
        .from("barcode_settings")
        .select("*")
        .eq("business_id", business.id)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!business?.id,
  });
}

export function useUpdateBarcodeSettings() {
  const queryClient = useQueryClient();
  const { data: business } = useBusiness();

  return useMutation({
    mutationFn: async (settings: Partial<BarcodeSettings>) => {
      if (!business) throw new Error("No business found");

      // Check if settings exist
      const { data: existing } = await supabase
        .from("barcode_settings")
        .select("id")
        .eq("business_id", business.id)
        .maybeSingle();

      if (existing) {
        // Update existing
        const { data, error } = await supabase
          .from("barcode_settings")
          .update(settings)
          .eq("business_id", business.id)
          .select()
          .single();

        if (error) throw error;
        return data;
      } else {
        // Insert new
        const { data, error } = await supabase
          .from("barcode_settings")
          .insert({ ...settings, business_id: business.id })
          .select()
          .single();

        if (error) throw error;
        return data;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["barcode-settings"] });
    },
  });
}
