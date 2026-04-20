/**
 * Centralized feature access control
 * This is the SINGLE source of truth for checking feature access.
 * 
 * Use this everywhere:
 * - Sidebar rendering
 * - Page rendering  
 * - Route navigation
 * - Action buttons (POS, Stock adjust, etc.)
 */

import type { PermissionKey } from "@/lib/permissions";

export interface FeatureAccessState {
  // Data from hooks
  platformFeatures: Array<{ feature_key: string; is_enabled: boolean }>;
  planFeatures: Array<{ feature_key: string; is_enabled: boolean }>;
  overrides: Array<{ feature_key: string; is_enabled: boolean }>;
  effectivePlan: string | null;
  isOwner: boolean;
  hasPermission: (permission: PermissionKey) => boolean;
  /** Subscription status from useSubscriptionStatus hook */
  subscriptionStatus: 'active' | 'expired' | 'cancelled' | 'loading' | 'none' | null;
  /** Whether subscription is strictly active (calculated from isStrictlyActive) */
  isSubscriptionExpired: boolean;
  /** Optional: Check if a specific addon is accessible */
  isAddonAccessible?: (featureKey: string, branchId?: string) => boolean;
}

export interface FeatureAccessOptions {
  /** Platform feature key (Super Admin toggle) */
  platformKey?: string;
  /** Plan feature key (subscription tier) */
  planKey?: string;
  /** Required permissions */
  permissions?: PermissionKey[];
  /** Require ALL permissions (default: any) */
  requireAllPermissions?: boolean;
  /** Only for business owners */
  ownerOnly?: boolean;
  /** Only for Enterprise plan */
  enterpriseOnly?: boolean;
  /** Skip subscription check (for dashboard/billing) */
  skipSubscriptionCheck?: boolean;
  /** Addon feature key (if feature requires active addon) */
  addonKey?: string;
  /** Branch ID for branch-scoped addon check */
  branchId?: string;
}

export interface FeatureAccessResult {
  canAccess: boolean;
  reason: 'allowed' | 'platform_disabled' | 'plan_restricted' | 'permission_denied' | 'subscription_blocked' | 'owner_only' | 'enterprise_only' | 'addon_expired';
}

/**
 * canAccessFeature - The single function to check ALL access gates
 * 
 * Validates:
 * 1. Feature toggle is ON (Super Admin)
 * 2. Feature exists in client admin (implicit - we check platform_features)
 * 3. Feature allowed by plan
 * 4. Subscription is active
 * 5. User role permits it
 * 
 * @param state - Current feature access state from hooks
 * @param options - Feature requirements to check
 * @returns FeatureAccessResult with canAccess boolean and reason
 */
export function canAccessFeature(
  state: FeatureAccessState,
  options: FeatureAccessOptions
): FeatureAccessResult {
  const {
    platformKey,
    planKey,
    permissions = [],
    requireAllPermissions = false,
    ownerOnly = false,
    enterpriseOnly = false,
    skipSubscriptionCheck = false,
    addonKey,
    branchId,
  } = options;

  // 1. Owner-only check
  if (ownerOnly && !state.isOwner) {
    return { canAccess: false, reason: 'owner_only' };
  }

  // 2. Enterprise-only check
  if (enterpriseOnly && state.effectivePlan !== 'enterprise') {
    return { canAccess: false, reason: 'enterprise_only' };
  }

  // 3. Subscription status check (STRICT - no grace period)
  if (!skipSubscriptionCheck) {
    const tier = state.effectivePlan;
    // Free tier is always accessible
    if (tier && tier !== 'free') {
      // Use isSubscriptionExpired which is derived from isStrictlyActive
      if (state.isSubscriptionExpired) {
        return { canAccess: false, reason: 'subscription_blocked' };
      }
    }
  }

  // 4. Platform toggle check (Super Admin global kill switch)
  if (platformKey) {
    const feature = state.platformFeatures.find(p => p.feature_key === platformKey);
    // If feature exists in platform_features and is disabled, block
    if (feature && !feature.is_enabled) {
      return { canAccess: false, reason: 'platform_disabled' };
    }
  }

  // 5. Plan feature check (with override support)
  if (planKey) {
    // Check business override first
    const override = state.overrides.find(o => o.feature_key === planKey);
    if (override) {
      if (!override.is_enabled) {
        return { canAccess: false, reason: 'plan_restricted' };
      }
      // Override grants access, skip plan check
    } else {
      // Check plan feature
      const feature = state.planFeatures.find(f => f.feature_key === planKey);
      if (feature && !feature.is_enabled) {
        return { canAccess: false, reason: 'plan_restricted' };
      }
    }
  }

  // 6. Addon expiry check (if addon is required for this feature)
  if (addonKey && state.isAddonAccessible) {
    const isAccessible = state.isAddonAccessible(addonKey, branchId);
    if (!isAccessible) {
      return { canAccess: false, reason: 'addon_expired' };
    }
  }

  // 7. Permission check
  if (permissions.length > 0) {
    // Owners have all permissions
    if (!state.isOwner) {
      const hasAccess = requireAllPermissions
        ? permissions.every(p => state.hasPermission(p))
        : permissions.some(p => state.hasPermission(p));
      
      if (!hasAccess) {
        return { canAccess: false, reason: 'permission_denied' };
      }
    }
  }

  return { canAccess: true, reason: 'allowed' };
}

/**
 * Get user-friendly message for blocked reason
 */
export function getBlockedMessage(reason: FeatureAccessResult['reason']): string {
  switch (reason) {
    case 'platform_disabled':
      return 'This feature has been disabled by system admin.';
    case 'plan_restricted':
      return 'This feature is not available on your current plan. Please upgrade to access.';
    case 'permission_denied':
      return 'You do not have permission to access this feature.';
    case 'subscription_blocked':
      return 'Your subscription has expired. Please renew to continue.';
    case 'owner_only':
      return 'Only business owners can access this feature.';
    case 'enterprise_only':
      return 'This feature is only available on the Enterprise plan.';
    case 'addon_expired':
      return 'The add-on for this feature has expired. Please renew to continue.';
    default:
      return '';
  }
}

/**
 * Feature keys used across the system - aligned with Menu → Feature Mapping
 * 
 * PLATFORM KEYS: Super Admin toggles in platform_features table
 * PLAN KEYS: Subscription-based features in plan_features table
 */
export const FEATURE_KEYS = {
  // ============= PLATFORM FEATURE KEYS (Super Admin toggles) =============
  
  // Sales module
  SALES_POS: 'sales.pos',
  SALES_TRANSACTIONS: 'sales.transactions',
  SALES_REPORTS: 'reports.sales',
  
  // Stock Control module
  INVENTORY_PRODUCTS: 'inventory.products',
  INVENTORY_STOCK: 'inventory.stock',
  INVENTORY_ADJUSTMENTS: 'inventory.adjustments',
  
  // Customers module
  CUSTOMERS_CORE: 'customers.core',
  CUSTOMERS_REWARDS: 'customers.rewards',
  
  // Operations module (Non-Gas)
  FINANCE_EXPENSES: 'finance.expenses',
  APPROVALS_WORKFLOWS: 'approvals.workflows',
  
  // Business Insights module
  REPORTS_ANALYTICS: 'reports.analytics',
  FINANCE_REPORTS: 'finance.reports',
  
  // People & Access module
  STAFF_MANAGEMENT: 'staff.management',
  STAFF_ATTENDANCE: 'staff.attendance',
  STAFF_PAYROLL: 'staff.payroll',
  
  // Settings module
  SETTINGS_BUSINESS: 'settings.business',
  ACTIVITY_LOGS: 'activity.logs',
  
  // Gas module (Business type specific)
  GAS_MODULE: 'gas_module',
  
  // ============= LEGACY PLATFORM KEYS (for backward compatibility) =============
  SALES_REPORTS_LEGACY: 'sales_reports',
  INVENTORY_REPORTS_LEGACY: 'inventory_reports',
  EXPENSE_TRACKING_LEGACY: 'expense_tracking',
  CRM_MODULE_LEGACY: 'crm_module',
  APPROVALS_MODULE_LEGACY: 'approvals_module',
  ADVANCED_REPORTS_LEGACY: 'advanced_reports',
  FULL_AUDIT_TRAIL_LEGACY: 'full_audit_trail',
  
  // ============= PLAN FEATURE KEYS (Subscription tier) =============
  PLAN_SALES_CREATE: 'sales.create',
  PLAN_STOCK_IN_OUT: 'stock.in_out',
  PLAN_STOCK_ADJUSTMENTS: 'stock.adjustments',
  PLAN_CUSTOMERS_LIST: 'customers.list',
  PLAN_EXPENSES_RECORDING: 'expenses.recording',
  PLAN_APPROVALS_STOCK: 'approvals.stock',
  PLAN_INSIGHTS_DAILY: 'insights.daily_snapshot',
  PLAN_ACCOUNTING_SUMMARY: 'accounting.sales_summary',
  PLAN_TEAM_BASIC: 'team.basic_accounts',
  PLAN_TEAM_ADVANCED: 'team.advanced_roles',
  PLAN_ACTIVITY_SALES_STOCK: 'activity.sales_stock',
  PLAN_NOTIFICATIONS: 'notifications.in_app',
} as const;

/**
 * Menu section to feature keys mapping
 * Used for quick lookups when checking section visibility
 */
export const MENU_FEATURE_MAP = {
  // Sales section
  'sales': {
    platformKeys: [FEATURE_KEYS.SALES_POS, FEATURE_KEYS.SALES_TRANSACTIONS, FEATURE_KEYS.SALES_REPORTS],
    planKeys: [FEATURE_KEYS.PLAN_SALES_CREATE],
  },
  
  // Stock Control section
  'stock-control': {
    platformKeys: [FEATURE_KEYS.INVENTORY_PRODUCTS, FEATURE_KEYS.INVENTORY_STOCK, FEATURE_KEYS.INVENTORY_ADJUSTMENTS],
    planKeys: [FEATURE_KEYS.PLAN_STOCK_IN_OUT, FEATURE_KEYS.PLAN_STOCK_ADJUSTMENTS],
  },
  
  // Customers section
  'customers': {
    platformKeys: [FEATURE_KEYS.CUSTOMERS_CORE, FEATURE_KEYS.CUSTOMERS_REWARDS],
    planKeys: [FEATURE_KEYS.PLAN_CUSTOMERS_LIST],
  },
  
  // Operations section (Non-Gas)
  'operations': {
    platformKeys: [FEATURE_KEYS.FINANCE_EXPENSES, FEATURE_KEYS.APPROVALS_WORKFLOWS],
    planKeys: [FEATURE_KEYS.PLAN_EXPENSES_RECORDING],
  },
  
  // Business Insights section
  'business-insights': {
    platformKeys: [FEATURE_KEYS.REPORTS_ANALYTICS, FEATURE_KEYS.FINANCE_REPORTS],
    planKeys: [FEATURE_KEYS.PLAN_INSIGHTS_DAILY, FEATURE_KEYS.PLAN_ACCOUNTING_SUMMARY],
  },
  
  // People & Access section
  'people-access': {
    platformKeys: [FEATURE_KEYS.STAFF_MANAGEMENT, FEATURE_KEYS.STAFF_ATTENDANCE, FEATURE_KEYS.STAFF_PAYROLL],
    planKeys: [FEATURE_KEYS.PLAN_TEAM_BASIC, FEATURE_KEYS.PLAN_TEAM_ADVANCED],
  },
  
  // Settings section
  'settings': {
    platformKeys: [FEATURE_KEYS.SETTINGS_BUSINESS, FEATURE_KEYS.ACTIVITY_LOGS],
    planKeys: [FEATURE_KEYS.PLAN_ACTIVITY_SALES_STOCK],
  },
} as const;
