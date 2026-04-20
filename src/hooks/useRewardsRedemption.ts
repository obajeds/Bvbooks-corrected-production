import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useRewardsSettings, REWARDS_LIMITS } from "./useRewardsSettings";

export interface CustomerRewardsVault {
  customerId: string;
  customerName: string;
  rewardPoints: number;
  rewardValue: number; // Naira value
}

export interface RedemptionCalculation {
  maxRedeemable: number; // Based on cart and discount cap
  vaultBalance: number; // Customer's available balance
  applicableAmount: number; // min(maxRedeemable, vaultBalance)
  isEligible: boolean; // Has enough to redeem
  message: string;
}

// Predefined discount reasons (no free text allowed)
export const DISCOUNT_REASONS = [
  { id: "promo_campaign", label: "Promo / Campaign" },
  { id: "customer_service", label: "Customer Service Recovery" },
  { id: "staff_discount", label: "Staff Discount" },
  { id: "pricing_error", label: "Pricing Error Correction" },
  { id: "management_approval", label: "Management Approval" },
] as const;

export type DiscountReasonId = typeof DISCOUNT_REASONS[number]["id"];

/**
 * Calculate redeemable rewards amount based on cart total and customer vault
 */
export function calculateRedemption(
  cartTotal: number,
  vaultBalance: number,
  maxDiscountPercent: number = REWARDS_LIMITS.maxDiscountPercent
): RedemptionCalculation {
  // Max discount allowed based on cart and cap
  const maxRedeemable = (cartTotal * maxDiscountPercent) / 100;
  
  // Applicable amount is the minimum of what's allowed and what's available
  const applicableAmount = Math.min(maxRedeemable, vaultBalance);
  
  // Customer is eligible if they have at least some balance
  const isEligible = vaultBalance > 0;
  
  let message = "";
  if (!isEligible) {
    message = "No rewards available to redeem";
  } else if (vaultBalance < maxRedeemable) {
    message = `Full vault balance of ₦${vaultBalance.toFixed(2)} will be applied`;
  } else {
    message = `Maximum ₦${maxRedeemable.toFixed(2)} (${maxDiscountPercent}% cap) will be applied`;
  }
  
  return {
    maxRedeemable,
    vaultBalance,
    applicableAmount,
    isEligible,
    message,
  };
}

/**
 * Hook to get customer rewards vault information
 */
export function useCustomerRewardsVault(customerId: string | null) {
  const queryClient = useQueryClient();
  
  const getVault = async (): Promise<CustomerRewardsVault | null> => {
    if (!customerId) return null;
    
    const { data, error } = await supabase
      .from("customers")
      .select("id, name, reward_points, reward_points_value")
      .eq("id", customerId)
      .single();
    
    if (error || !data) return null;
    
    return {
      customerId: data.id,
      customerName: data.name,
      rewardPoints: data.reward_points ?? 0,
      rewardValue: data.reward_points_value ?? 0,
    };
  };
  
  return { getVault };
}

/**
 * Hook to deduct rewards from customer vault
 */
export function useDeductRewards() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ 
      customerId, 
      amount 
    }: { 
      customerId: string; 
      amount: number; 
    }) => {
      // Call the database function to deduct rewards
      const { data, error } = await supabase.rpc("deduct_customer_rewards", {
        p_customer_id: customerId,
        p_amount: amount,
      });
      
      if (error) throw error;
      if (!data) throw new Error("Insufficient rewards balance");
      
      return { success: true, deductedAmount: amount };
    },
    onSuccess: (_, variables) => {
      // Invalidate customer queries to refresh vault balance
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      queryClient.invalidateQueries({ queryKey: ["customer", variables.customerId] });
    },
  });
}

/**
 * Main hook for rewards redemption in POS
 */
export function useRewardsRedemption() {
  const { data: rewardsSettings } = useRewardsSettings();
  const deductRewards = useDeductRewards();
  
  const maxDiscountPercent = rewardsSettings?.max_discount_percent ?? REWARDS_LIMITS.maxDiscountPercent;
  const isRewardsEnabled = rewardsSettings?.is_enabled ?? false;
  
  /**
   * Calculate what can be redeemed for a given cart and customer
   */
  const calculateForCheckout = (
    cartTotal: number,
    customerVaultBalance: number
  ): RedemptionCalculation => {
    if (!isRewardsEnabled) {
      return {
        maxRedeemable: 0,
        vaultBalance: customerVaultBalance,
        applicableAmount: 0,
        isEligible: false,
        message: "Rewards program is not enabled",
      };
    }
    
    return calculateRedemption(cartTotal, customerVaultBalance, maxDiscountPercent);
  };
  
  /**
   * Process rewards redemption during checkout
   */
  const processRedemption = async (
    customerId: string,
    amount: number
  ) => {
    return deductRewards.mutateAsync({ customerId, amount });
  };
  
  return {
    isRewardsEnabled,
    maxDiscountPercent,
    calculateForCheckout,
    processRedemption,
    isProcessing: deductRewards.isPending,
  };
}
