/**
 * BVBooks Subscription Capacity Rules (Branch-Scoped)
 * 
 * This module defines the capacity rules for branches and staff
 * based on subscription plans and add-ons.
 * 
 * Core Definitions:
 * - Branch: One physical business location
 * - Staff: Operational users (cashiers, sales staff, inventory officers)
 * - Owner/Admin: Primary admin - unlimited, free, never counted as staff
 * - Add-On: Branch-specific, applies only to the branch it is purchased for
 */

import type { BVBooksPlan } from "@/hooks/useFeatureGating";

// ============= Base Plan Capacity Rules =============

/**
 * Staff-per-branch ratios for base plan calculations
 * These ratios determine base staff limits per branch BEFORE add-ons
 */
export const STAFF_PER_BRANCH_RATIO: Record<BVBooksPlan, number> = {
  free: 2,         // 2 staff per branch
  professional: 3, // 3 staff per branch
  enterprise: 5,   // 5 staff per branch
};

/**
 * Base branch limits per plan (before add-ons)
 */
export const BASE_BRANCH_LIMITS: Record<BVBooksPlan, number> = {
  free: 1,
  professional: 2,
  enterprise: 3,
};

/**
 * Base staff limits per plan (calculated from branch × ratio)
 */
export const BASE_STAFF_LIMITS: Record<BVBooksPlan, number> = {
  free: 2,        // 1 × 2
  professional: 6, // 2 × 3
  enterprise: 15,  // 3 × 5
};

// ============= Add-On Rules =============

/**
 * Each branch add-on provides fixed capacity:
 * +1 branch, +2 staff (scoped to that branch only)
 */
export const ADDON_BRANCH_VALUE = 1;
export const ADDON_STAFF_PER_BRANCH = 2;

/**
 * Maximum number of branch add-ons allowed per plan
 */
export const MAX_BRANCH_ADDONS: Record<BVBooksPlan, number> = {
  free: 0,         // No add-ons allowed for free
  professional: 1, // Max 1 add-on
  enterprise: 2,   // Max 2 add-ons
};

/**
 * Whether add-ons are allowed for a plan
 */
export const ADDONS_ALLOWED: Record<BVBooksPlan, boolean> = {
  free: false,
  professional: true,
  enterprise: true,
};

// ============= Maximum Capacity (Plan + Max Add-ons) =============

/**
 * Maximum possible branches with all add-ons purchased
 */
export const MAX_BRANCHES_WITH_ADDONS: Record<BVBooksPlan, number> = {
  free: 1,         // 1 + 0 = 1
  professional: 3, // 2 + 1 = 3
  enterprise: 5,   // 3 + 2 = 5
};

/**
 * Maximum possible staff with all add-ons purchased (total across all branches)
 */
export const MAX_STAFF_WITH_ADDONS: Record<BVBooksPlan, number> = {
  free: 2,         // 2 + 0 = 2
  professional: 8, // 6 + (1 × 2) = 8
  enterprise: 19,  // 15 + (2 × 2) = 19
};

// ============= Business-Wide Capacity Info =============

export interface CapacityInfo {
  // Base plan limits
  baseBranches: number;
  baseStaff: number;
  staffPerBranchRatio: number;
  
  // Add-on info (business-wide totals)
  addonBranches: number;
  addonStaff: number;
  maxAddonBranches: number;
  remainingAddonSlots: number;
  addonsAllowed: boolean;
  
  // Total capacity (base + addons)
  totalBranches: number;
  totalStaff: number;
  
  // Maximum possible (with all add-ons)
  maxPossibleBranches: number;
  maxPossibleStaff: number;
  
  // Usage
  currentBranches: number;
  currentStaff: number;
  
  // Enforcement
  canAddBranch: boolean;
  canAddStaff: boolean;
  canBuyAddon: boolean;
  
  // Warnings & blocks
  branchUsagePercent: number;
  staffUsagePercent: number;
  isBranchWarning: boolean;
  isStaffWarning: boolean;
  isBranchBlocked: boolean;
  isStaffBlocked: boolean;
  
  // Upgrade messaging
  upgradeRequired: boolean;
  upgradeMessage: string;
}

// ============= Branch-Scoped Capacity Info =============

export interface BranchCapacityInfo {
  branchId: string;
  branchName: string;
  
  // Base capacity from plan (staff ratio)
  baseStaff: number;
  
  // Add-on capacity (only add-ons scoped to THIS branch)
  addonStaff: number;
  hasAddon: boolean;
  
  // Total capacity for this branch
  totalCapacity: number;
  
  // Current usage
  currentStaff: number;
  
  // Enforcement
  canAddStaff: boolean;
  usagePercent: number;
  isWarning: boolean;
  isBlocked: boolean;
}

/**
 * Calculate capacity info for a business (business-wide totals)
 */
export function calculateCapacity(
  plan: BVBooksPlan,
  currentBranches: number,
  currentStaff: number,
  addonBranches: number = 0
): CapacityInfo {
  // Base limits
  const baseBranches = BASE_BRANCH_LIMITS[plan];
  const baseStaff = BASE_STAFF_LIMITS[plan];
  const staffPerBranchRatio = STAFF_PER_BRANCH_RATIO[plan];
  
  // Add-on calculations (fixed: +1 branch, +2 staff per addon)
  const addonStaff = addonBranches * ADDON_STAFF_PER_BRANCH;
  const maxAddonBranches = MAX_BRANCH_ADDONS[plan];
  const remainingAddonSlots = Math.max(0, maxAddonBranches - addonBranches);
  const addonsAllowed = ADDONS_ALLOWED[plan];
  
  // Total capacity
  const totalBranches = baseBranches + addonBranches;
  const totalStaff = baseStaff + addonStaff;
  
  // Maximum possible
  const maxPossibleBranches = MAX_BRANCHES_WITH_ADDONS[plan];
  const maxPossibleStaff = MAX_STAFF_WITH_ADDONS[plan];
  
  // Enforcement
  const canAddBranch = currentBranches < totalBranches;
  const canAddStaff = currentStaff < totalStaff;
  const canBuyAddon = addonsAllowed && remainingAddonSlots > 0;
  
  // Usage percentages
  const branchUsagePercent = totalBranches > 0 ? (currentBranches / totalBranches) * 100 : 0;
  const staffUsagePercent = totalStaff > 0 ? (currentStaff / totalStaff) * 100 : 0;
  
  // Warnings (80%+) and blocks (100%)
  const isBranchWarning = branchUsagePercent >= 80 && branchUsagePercent < 100;
  const isStaffWarning = staffUsagePercent >= 80 && staffUsagePercent < 100;
  const isBranchBlocked = currentBranches >= totalBranches;
  const isStaffBlocked = currentStaff >= totalStaff;
  
  // Upgrade messaging
  let upgradeRequired = false;
  let upgradeMessage = "";
  
  if (isBranchBlocked || isStaffBlocked) {
    if (!canBuyAddon) {
      upgradeRequired = true;
      if (plan === "free") {
        upgradeMessage = "Upgrade to Professional to add more capacity";
      } else if (plan === "professional") {
        upgradeMessage = "Upgrade to Enterprise for more branches and staff";
      } else {
        upgradeMessage = "Register a new business account or contact sales";
      }
    } else {
      upgradeMessage = "Purchase an add-on for more capacity";
    }
  }
  
  return {
    baseBranches,
    baseStaff,
    staffPerBranchRatio,
    addonBranches,
    addonStaff,
    maxAddonBranches,
    remainingAddonSlots,
    addonsAllowed,
    totalBranches,
    totalStaff,
    maxPossibleBranches,
    maxPossibleStaff,
    currentBranches,
    currentStaff,
    canAddBranch,
    canAddStaff,
    canBuyAddon,
    branchUsagePercent,
    staffUsagePercent,
    isBranchWarning,
    isStaffWarning,
    isBranchBlocked,
    isStaffBlocked,
    upgradeRequired,
    upgradeMessage,
  };
}

/**
 * Calculate per-branch capacity info
 */
export function calculateBranchCapacity(
  plan: BVBooksPlan,
  branchId: string,
  branchName: string,
  currentStaff: number,
  hasAddon: boolean = false
): BranchCapacityInfo {
  const baseStaff = STAFF_PER_BRANCH_RATIO[plan];
  const addonStaff = hasAddon ? ADDON_STAFF_PER_BRANCH : 0;
  const totalCapacity = baseStaff + addonStaff;
  
  const usagePercent = totalCapacity > 0 ? (currentStaff / totalCapacity) * 100 : 0;
  const isWarning = usagePercent >= 80 && usagePercent < 100;
  const isBlocked = currentStaff >= totalCapacity;
  
  return {
    branchId,
    branchName,
    baseStaff,
    addonStaff,
    hasAddon,
    totalCapacity,
    currentStaff,
    canAddStaff: currentStaff < totalCapacity,
    usagePercent,
    isWarning,
    isBlocked,
  };
}

/**
 * Get upgrade CTA based on current plan
 */
export function getUpgradeCTA(plan: BVBooksPlan): {
  action: "upgrade" | "addon" | "new_business" | "contact_sales";
  label: string;
  description: string;
} {
  switch (plan) {
    case "free":
      return {
        action: "upgrade",
        label: "Upgrade to Professional",
        description: "Get 2 branches, 6 staff, and access to add-ons",
      };
    case "professional":
      return {
        action: "upgrade",
        label: "Upgrade to Enterprise",
        description: "Get 3 branches, 15 staff, and up to 2 add-ons",
      };
    case "enterprise":
      return {
        action: "new_business",
        label: "Register New Business",
        description: "Create a separate business account for additional locations",
      };
    default:
      return {
        action: "upgrade",
        label: "Upgrade Plan",
        description: "Upgrade for more capacity",
      };
  }
}

/**
 * Format capacity display string (business-wide)
 */
export function formatCapacityDisplay(current: number, max: number, addonCount: number = 0): string {
  const addonSuffix = addonCount > 0 ? ` (+${addonCount} add-on)` : "";
  return `${current}/${max}${addonSuffix}`;
}

/**
 * Format branch capacity display string
 */
export function formatBranchCapacityDisplay(branchCapacity: BranchCapacityInfo): string {
  const addonSuffix = branchCapacity.hasAddon ? " (+addon)" : "";
  return `${branchCapacity.currentStaff}/${branchCapacity.totalCapacity}${addonSuffix}`;
}
