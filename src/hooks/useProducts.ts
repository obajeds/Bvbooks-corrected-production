import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useBusiness } from "./useBusiness";
import { generateSKU } from "@/lib/skuGenerator";
import type { Tables, TablesInsert } from "@/integrations/supabase/types";

type Product = Tables<"products">;

export function useProducts() {
  const { data: business } = useBusiness();

  return useQuery({
    queryKey: ["products", business?.id],
    queryFn: async (): Promise<Product[]> => {
      if (!business?.id) return [];

      const { data, error } = await supabase
        .from("products")
        .select("id, name, selling_price, cost_price, stock_quantity, low_stock_threshold, category_id, sku, barcode, unit, is_active, allows_decimal_quantity, allows_price_based_sale, image_url, created_at, business_id, description, quantity_type, updated_at")
        .eq("business_id", business.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!business?.id,
    staleTime: 5 * 60 * 1000, // Consider data fresh for 5 minutes
  });
}

export function useCreateProduct() {
  const queryClient = useQueryClient();
  const { data: business } = useBusiness();

  return useMutation({
    mutationFn: async (data: Omit<TablesInsert<"products">, "business_id">) => {
      if (!business) throw new Error("No business found");

      // Check product limit before creating
      const { count, error: countError } = await supabase
        .from("products")
        .select("*", { count: "exact", head: true })
        .eq("business_id", business.id);

      if (countError) throw countError;

      const currentCount = count || 0;
      const plan = business.subscription_plan || "free";
      const limits: Record<string, number> = {
        free: 50,
        professional: Infinity,
        enterprise: Infinity,
      };
      const limit = limits[plan] ?? 50;

      if (currentCount >= limit) {
        throw new Error(
          `You have reached your product limit (${limit} products). Please upgrade your plan to add more products.`
        );
      }

      // Auto-generate SKU if not provided
      let finalSku = (data as any).sku;
      if (!finalSku) {
        // Get category name if category_id exists
        let categoryName: string | null = null;
        if ((data as any).category_id) {
          const { data: catData } = await supabase
            .from("categories")
            .select("name")
            .eq("id", (data as any).category_id)
            .single();
          categoryName = catData?.name || null;
        }

        // Get existing SKUs for collision avoidance
        const { data: skuData } = await supabase
          .from("products")
          .select("sku")
          .eq("business_id", business.id);
        const existingSKUs = (skuData || [])
          .map((p) => p.sku)
          .filter(Boolean) as string[];

        finalSku = generateSKU(categoryName, (data as any).name, existingSKUs);
      }

      const { data: product, error } = await supabase
        .from("products")
        .insert({ ...data, sku: finalSku, business_id: business.id })
        .select()
        .single();

      if (error) throw error;

      // Auto-create barcode for the new product
      if (finalSku && product) {
        await supabase.from("barcodes").insert({
          product_id: product.id,
          business_id: business.id,
          barcode_value: finalSku.replace(/[^A-Z0-9]/g, ""),
          barcode_type: "Code128",
          source: "system_generated",
        });
      }

      return product;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["product-count"] });
      queryClient.invalidateQueries({ queryKey: ["branch-stock"] });
    },
  });
}

export function useUpdateProduct() {
  const queryClient = useQueryClient();
  const { data: business } = useBusiness();

  return useMutation({
    mutationFn: async ({ id, ...data }: Partial<Product> & { id: string }) => {
      if (!business?.id) throw new Error("No business found");

      const { data: product, error } = await supabase
        .from("products")
        .update(data)
        .eq("id", id)
        .eq("business_id", business.id)
        .select()
        .single();

      if (error) throw error;
      return product;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["branch-stock"] });
    },
  });
}

export function useDeleteProduct() {
  const queryClient = useQueryClient();
  const { data: business } = useBusiness();

  return useMutation({
    mutationFn: async (id: string) => {
      if (!business?.id) throw new Error("No business found");
      const { error } = await supabase
        .from("products")
        .delete()
        .eq("id", id)
        .eq("business_id", business.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["branch-stock"] });
    },
  });
}
