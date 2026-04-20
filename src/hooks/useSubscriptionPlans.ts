import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Crown, Rocket, Star } from "lucide-react";
import { ReactNode, createElement } from "react";
import type { BVBooksPlan } from "@/hooks/useFeatureGating";

export interface SubscriptionPlan {
  id: BVBooksPlan;
  name: string;
  description: string;
  monthlyPrice: number;
  yearlyPrice: number;
  currency: string;
  features: string[];
  icon: ReactNode;
  popular?: boolean;
  maxBranches: number;
  maxStaff: number;
  maxProducts: number | null;
}

interface PlanLimitRow {
  id: string;
  plan: string;
  description: string | null;
  monthly_price: number;
  currency: string;
  max_branches: number;
  max_staff: number;
  max_products: number | null;
  trial_days: number | null;
  created_at: string;
  updated_at: string;
}

// Map plan IDs to display names
const PLAN_NAMES: Record<string, string> = {
  free: "Free",
  professional: "Professional",
  enterprise: "Enterprise",
};

// Map plan IDs to icons
const PLAN_ICONS: Record<string, ReactNode> = {
  free: createElement(Star, { className: "h-6 w-6" }),
  professional: createElement(Rocket, { className: "h-6 w-6" }),
  enterprise: createElement(Crown, { className: "h-6 w-6" }),
};

// Static features per plan with capacity rules
const PLAN_FEATURES: Record<string, string[]> = {
  free: [
    "1 Branch",
    "2 Staff (2 per branch)",
    "Basic POS & sales",
    "Stock in/out tracking",
    "Customer list",
    "Daily sales snapshot",
    "Low stock alerts",
  ],
  professional: [
    "2 Branches",
    "6 Staff (3 per branch)",
    "1 Add-on available (+1 branch, +2 staff)",
    "Discounts with limits",
    "Refunds with approval",
    "Credit sales & tracking",
    "Expense recording",
    "Profit & Loss reports",
    "Stock variance tracking",
    "Advanced permissions",
    "In-app notifications",
  ],
  enterprise: [
    "3 Branches",
    "15 Staff (5 per branch)",
    "2 Add-ons available (+2 branches, +4 staff)",
    "Full discount & refund controls",
    "Multi-branch stock transfers",
    "Branch-level pricing",
    "Full approval workflows",
    "Loss risk indicators",
    "Staff risk scoring",
    "Branch performance trends",
    "Full audit trail",
    "After-hours alerts",
    "Advanced configs",
  ],
};

// Billing period discounts - 17% off for yearly (₦55,000/yr for Professional, ₦94,000/yr for Enterprise)
export const BILLING_DISCOUNTS: Record<string, { discount: number; label: string; months: number; savingsLabel: string }> = {
  monthly: { discount: 0, label: 'Monthly', months: 1, savingsLabel: '' },
  quarterly: { discount: 10, label: 'Quarterly', months: 3, savingsLabel: 'Save 10%' },
  yearly: { discount: 17, label: 'Yearly', months: 12, savingsLabel: 'Save 17%' },
};

export type BillingPeriod = 'monthly' | 'quarterly' | 'yearly';

export function calculatePrice(monthlyPrice: number, billingPeriod: BillingPeriod): number {
  const { discount, months } = BILLING_DISCOUNTS[billingPeriod];
  const totalWithoutDiscount = monthlyPrice * months;
  return Math.round(totalWithoutDiscount * (1 - discount / 100));
}

export function getMonthlyEquivalent(monthlyPrice: number, billingPeriod: BillingPeriod): number {
  const { discount } = BILLING_DISCOUNTS[billingPeriod];
  return Math.round(monthlyPrice * (1 - discount / 100));
}

// Direct fetch function for real-time data
export async function fetchSubscriptionPlans(): Promise<SubscriptionPlan[]> {
  const { data, error } = await supabase
    .from("plan_limits")
    .select("*")
    .order("monthly_price", { ascending: true });

  if (error) throw error;

  if (!data || data.length === 0) {
    return getDefaultPlans();
  }

  return (data as PlanLimitRow[]).map((row) => {
    const planId = row.plan as BVBooksPlan;
    const yearlyPrice = Math.round(row.monthly_price * 12 * 0.8);

    return {
      id: planId,
      name: PLAN_NAMES[planId] || planId,
      description: row.description || "",
      monthlyPrice: row.monthly_price,
      yearlyPrice,
      currency: row.currency,
      features: generateFeatures(planId, row),
      icon: PLAN_ICONS[planId] || PLAN_ICONS.free,
      popular: planId === "professional",
      maxBranches: row.max_branches,
      maxStaff: row.max_staff,
      maxProducts: row.max_products,
    };
  });
}

export function useSubscriptionPlans() {
  return useQuery({
    queryKey: ["subscription-plans"],
    queryFn: fetchSubscriptionPlans,
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
  });
}

function generateFeatures(planId: string, row: PlanLimitRow): string[] {
  // Generate dynamic features based on limits with ratio info
  const features: string[] = [];
  
  // Add branch info with ratio context
  const staffRatio = planId === "free" ? 2 : planId === "professional" ? 3 : 5;
  features.push(`${row.max_branches} Branch${row.max_branches > 1 ? 'es' : ''}`);
  features.push(`${row.max_staff} Staff (${staffRatio} per branch)`);
  
  // Add addon info based on plan
  if (planId === "professional") {
    features.push("1 Add-on available (+1 branch, +2 staff)");
  } else if (planId === "enterprise") {
    features.push("2 Add-ons available (+2 branches, +4 staff)");
  }
  
  if (row.max_products) {
    features.push(`Up to ${row.max_products} products`);
  } else if (planId === "enterprise") {
    features.push("Unlimited products");
  }

  // Add static features based on plan, skipping the first 3 (branch/staff/addon)
  const staticFeatures = PLAN_FEATURES[planId] || [];
  features.push(...staticFeatures.slice(3));

  return features;
}

function getDefaultPlans(): SubscriptionPlan[] {
  return [
    {
      id: "free",
      name: "Free",
      description: "Basic visibility for small businesses",
      monthlyPrice: 0,
      yearlyPrice: 0,
      currency: "NGN",
      icon: PLAN_ICONS.free,
      maxBranches: 1,
      maxStaff: 2,
      maxProducts: 50,
      features: PLAN_FEATURES.free,
    },
    {
      id: "professional",
      name: "Professional",
      description: "Introduce control to your business",
      monthlyPrice: 5500,
      yearlyPrice: Math.round(5500 * 12 * 0.8),
      currency: "NGN",
      popular: true,
      icon: PLAN_ICONS.professional,
      maxBranches: 2,
      maxStaff: 6,
      maxProducts: 500,
      features: PLAN_FEATURES.professional,
    },
    {
      id: "enterprise",
      name: "Enterprise",
      description: "Full discipline and loss prevention",
      monthlyPrice: 9499,
      yearlyPrice: Math.round(9499 * 12 * 0.8),
      currency: "NGN",
      icon: PLAN_ICONS.enterprise,
      maxBranches: 3,
      maxStaff: 15,
      maxProducts: null,
      features: PLAN_FEATURES.enterprise,
    },
  ];
}
