import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useBusiness } from "./useBusiness";
import { useFeatureEnabled } from "./useFeatureGating";

export interface CreditTransaction {
  id: string;
  business_id: string;
  customer_id: string;
  sale_id: string | null;
  transaction_type: 'credit_sale' | 'payment' | 'adjustment';
  amount: number;
  balance_after: number;
  notes: string | null;
  created_by: string | null;
  created_at: string;
}

// Check if credit sales is enabled for the business
export function useCreditSalesEnabled() {
  const { data: business } = useBusiness();
  // Use the feature gating system to check if credit sales is enabled
  const { isEnabled, isLoading } = useFeatureEnabled('customers.credit_sales');
  
  return useQuery({
    queryKey: ["credit-sales-enabled", business?.id, isEnabled],
    queryFn: async () => {
      if (!business) return false;
      
      // Use the feature gating system
      if (!isEnabled) {
        return false;
      }
      
      // Check platform feature toggle (already handled by useFeatureEnabled, but double-check)
      const { data: platformFeature } = await supabase
        .from("platform_features")
        .select("is_enabled")
        .eq("feature_key", "credit_sales")
        .maybeSingle();
      
      if (platformFeature && !platformFeature.is_enabled) {
        return false;
      }
      
      // Check business-specific override
      const { data: override } = await supabase
        .from("business_plan_overrides")
        .select("is_enabled")
        .eq("business_id", business.id)
        .eq("feature_key", "credit_sales")
        .maybeSingle();
      
      // If there's an override, use it; otherwise use plan feature
      return override?.is_enabled ?? isEnabled;
    },
    enabled: !!business && !isLoading,
  });
}

// Get credit transactions for a customer
export function useCustomerCreditTransactions(customerId?: string) {
  const { data: business } = useBusiness();
  
  return useQuery({
    queryKey: ["credit-transactions", customerId],
    queryFn: async () => {
      if (!customerId || !business) return [];
      
      const { data, error } = await supabase
        .from("credit_transactions")
        .select("*")
        .eq("customer_id", customerId)
        .eq("business_id", business.id)
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data as CreditTransaction[];
    },
    enabled: !!customerId && !!business,
  });
}

// Record a credit sale
export function useRecordCreditSale() {
  const queryClient = useQueryClient();
  const { data: business } = useBusiness();
  
  return useMutation({
    mutationFn: async ({ 
      customerId, 
      saleId, 
      amount,
      notes 
    }: { 
      customerId: string; 
      saleId: string;
      amount: number;
      notes?: string;
    }) => {
      if (!business) throw new Error("Business not found");
      
      // Atomically update credit balance
      const { data: newBalance, error: creditError } = await (supabase.rpc as any)(
        "atomic_add_credit",
        {
          p_customer_id: customerId,
          p_amount: amount,
          p_business_id: business.id,
        }
      );

      if (creditError) throw creditError;

      // Insert credit transaction with the actual new balance
      const { data: transaction, error: txError } = await supabase
        .from("credit_transactions")
        .insert({
          customer_id: customerId,
          sale_id: saleId,
          transaction_type: 'credit_sale',
          amount: amount,
          balance_after: newBalance,
          notes: notes || `Credit sale - Invoice`,
        } as any)
        .select()
        .single();
      
      if (txError) throw txError;
      
      return transaction;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["credit-transactions", variables.customerId] });
      queryClient.invalidateQueries({ queryKey: ["customers"] });
    },
  });
}

// Record a credit payment
export function useRecordCreditPayment() {
  const queryClient = useQueryClient();
  const { data: business } = useBusiness();
  
  return useMutation({
    mutationFn: async ({ 
      customerId, 
      amount,
      notes 
    }: { 
      customerId: string; 
      amount: number;
      notes?: string;
    }) => {
      if (!business) throw new Error("Business not found");
      
      // Atomically deduct credit balance
      const { data: newBalance, error: creditError } = await (supabase.rpc as any)(
        "atomic_deduct_credit",
        {
          p_customer_id: customerId,
          p_amount: amount,
          p_business_id: business.id,
        }
      );

      if (creditError) throw creditError;

      // Insert credit payment transaction with actual new balance
      const { data: transaction, error: txError } = await supabase
        .from("credit_transactions")
        .insert({
          customer_id: customerId,
          transaction_type: 'payment',
          amount: -amount,
          balance_after: newBalance,
          notes: notes || `Credit payment received`,
        } as any)
        .select()
        .single();
      
      if (txError) throw txError;
      
      return transaction;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["credit-transactions", variables.customerId] });
      queryClient.invalidateQueries({ queryKey: ["customers"] });
    },
  });
}
