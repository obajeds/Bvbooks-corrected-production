import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface CustomerPurchase {
  id: string;
  invoice_number: string;
  total_amount: number;
  payment_method: string;
  created_at: string;
  items: {
    id: string;
    product_name: string;
    quantity: number;
    unit_price: number;
    total_price: number;
  }[];
}

export function useCustomerPurchaseHistory(customerId: string | null) {
  return useQuery({
    queryKey: ["customer-purchase-history", customerId],
    queryFn: async (): Promise<CustomerPurchase[]> => {
      if (!customerId) return [];

      const { data, error } = await supabase
        .from("sales")
        .select(`
          id,
          invoice_number,
          total_amount,
          payment_method,
          created_at,
          sale_items (
            id,
            product_name,
            quantity,
            unit_price,
            total_price
          )
        `)
        .eq("customer_id", customerId)
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;

      return (data || []).map((sale) => ({
        id: sale.id,
        invoice_number: sale.invoice_number,
        total_amount: Number(sale.total_amount),
        payment_method: sale.payment_method || "cash",
        created_at: sale.created_at,
        items: (sale.sale_items || []).map((item: any) => ({
          id: item.id,
          product_name: item.product_name,
          quantity: item.quantity,
          unit_price: Number(item.unit_price),
          total_price: Number(item.total_price),
        })),
      }));
    },
    enabled: !!customerId,
  });
}
