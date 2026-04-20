import { 
  Activity, ShoppingCart, Package, Users, BarChart3, ClipboardList, Settings, 
  Layers, Tags, Warehouse, Truck, Building2, Clock, Wallet, CalendarDays, 
  Receipt, Calculator, Bell, CheckCircle, Scale, HelpCircle, Fuel, FileText, 
  Gauge, Landmark, ArrowLeftRight, Briefcase, TrendingUp, Shield, UserCog, 
  Heart, Gift, CreditCard
} from "lucide-react";
import type { PermissionKey } from "@/lib/permissions";
import type { LucideIcon } from "lucide-react";

/**
 * Menu item configuration
 * Each item can have:
 * - platformFeatureKey: Key in platform_features (Super Admin toggle)
 * - planFeatureKey: Key in plan_features (subscription-based)
 * - permissions: Required permissions (any match = access)
 * - requireAllPermissions: Require ALL permissions to match
 * - ownerOnly: Only visible to business owners
 * - enterpriseOnly: Only visible on Enterprise plan
 */
export interface MenuItemConfig {
  id: string;
  path: string;
  label: string;
  icon: LucideIcon;
  /** Platform feature key for Super Admin toggle */
  platformFeatureKey?: string;
  /** Plan feature key for subscription gating */
  planFeatureKey?: string;
  /** Required permissions (any match = access unless requireAll is true) */
  permissions?: PermissionKey[];
  /** Require ALL permissions to match */
  requireAllPermissions?: boolean;
  /** Only visible to business owners */
  ownerOnly?: boolean;
  /** Only visible on Enterprise plan */
  enterpriseOnly?: boolean;
  /** Badge count key (e.g., 'pendingApprovals') */
  badgeKey?: string;
}

export interface MenuSectionConfig {
  id: string;
  label: string;
  icon: LucideIcon;
  /** If true, this is a direct link, not a collapsible section */
  isDirectLink?: boolean;
  /** Path for direct links */
  path?: string;
  /** Platform feature key for the entire section */
  platformFeatureKey?: string;
  /** Plan feature key for the entire section */
  planFeatureKey?: string;
  /** Permissions for direct link sections */
  permissions?: PermissionKey[];
  /** Child menu items */
  items?: MenuItemConfig[];
  /** Badge key for the section */
  badgeKey?: string;
  /** Show divider before this section */
  dividerBefore?: boolean;
}

/**
 * Complete sidebar menu configuration
 * This is the SINGLE SOURCE OF TRUTH for all menu items.
 * 
 * Both desktop and mobile navigation consume this configuration.
 * 
 * Menu → Feature Key Mapping (aligned with Super Admin):
 * 
 * SALES:
 *   - Point of Sale → sales.pos, sales.transactions
 *   - Sales Performance → reports.sales
 * 
 * STOCK CONTROL:
 *   - Product Catalog → inventory.products
 *   - Categories → inventory.products
 *   - Stock Levels → inventory.stock
 *   - Adjustments → inventory.adjustments
 *   - Suppliers → inventory.products
 *   - Purchase Orders → inventory.products
 * 
 * CUSTOMERS:
 *   - Overview → customers.core
 *   - Customer Activity → customers.core
 *   - Customer Groups → customers.core
 *   - Rewards & Loyalty → customers.rewards
 * 
 * OPERATIONS (Non-Gas):
 *   - Expenses → finance.expenses
 *   - Approvals & Alerts → approvals.workflows
 * 
 * BUSINESS INSIGHTS:
 *   - Performance Reports → reports.analytics
 *   - Financial Overview → finance.reports
 *   - Settlements → finance.reports
 *   - Reconciliations → finance.reports
 * 
 * PEOPLE & ACCESS:
 *   - Team Members → staff.management
 *   - Departments → staff.management
 *   - Attendance → staff.attendance
 *   - Payroll → staff.payroll
 *   - Leave Requests → staff.management
 * 
 * SETTINGS:
 *   - Business Settings → settings.business
 *   - Activity Log → activity.logs
 *   - Help Center → (always visible)
 */
export const SIDEBAR_MENU_CONFIG: MenuSectionConfig[] = [
  // 1. Control Center (Dashboard) - Always visible
  {
    id: 'control-center',
    label: 'Control Center',
    icon: Activity,
    isDirectLink: true,
    path: '/dashboard',
  },

  // 2. Point of Sale - Direct link
  {
    id: 'pos',
    label: 'Point of Sale',
    icon: ShoppingCart,
    isDirectLink: true,
    path: '/dashboard/pos',
    platformFeatureKey: 'sales.pos',
    planFeatureKey: 'sales.create',
    permissions: ['pos.access'],
  },

  // 3. Sales Performance - Direct link
  {
    id: 'sales-performance',
    label: 'Sales Performance',
    icon: TrendingUp,
    isDirectLink: true,
    path: '/dashboard/sales',
    platformFeatureKey: 'reports.sales',
    planFeatureKey: 'sales.create',
    permissions: ['pos.access', 'sales.view'],
  },

  // 4. Stock Control - Section with items
  {
    id: 'stock-control',
    label: 'Stock Control',
    icon: Package,
    platformFeatureKey: 'inventory.products',
    planFeatureKey: 'stock.in_out',
    items: [
      {
        id: 'product-catalog',
        path: '/dashboard/inventory/items',
        label: 'Product Catalog',
        icon: Layers,
        platformFeatureKey: 'inventory.products',
        planFeatureKey: 'stock.in_out',
        permissions: ['inventory.view'],
      },
      {
        id: 'categories',
        path: '/dashboard/inventory/categories',
        label: 'Categories',
        icon: Tags,
        platformFeatureKey: 'inventory.products',
        planFeatureKey: 'stock.in_out',
        permissions: ['inventory.view'],
      },
      {
        id: 'stock-levels',
        path: '/dashboard/inventory/stock',
        label: 'Stock Levels',
        icon: Warehouse,
        platformFeatureKey: 'inventory.stock',
        planFeatureKey: 'stock.in_out',
        permissions: ['inventory.view'],
      },
      {
        id: 'adjustments',
        path: '/dashboard/inventory/adjustments',
        label: 'Adjustments',
        icon: Scale,
        platformFeatureKey: 'inventory.adjustments',
        planFeatureKey: 'stock.adjustments',
        permissions: ['inventory.adjust.create', 'inventory.adjust.approve'],
      },
      {
        id: 'suppliers',
        path: '/dashboard/inventory/suppliers',
        label: 'Suppliers',
        icon: Truck,
        platformFeatureKey: 'inventory.products',
        planFeatureKey: 'stock.in_out',
        permissions: ['inventory.view'],
      },
      {
        id: 'purchase-orders',
        path: '/dashboard/inventory/purchase-orders',
        label: 'Purchase Orders',
        icon: ClipboardList,
        platformFeatureKey: 'inventory.products',
        planFeatureKey: 'stock.in_out',
        permissions: ['inventory.view'],
      },
      {
        id: 'stock-reconciliation',
        path: '/dashboard/inventory/reconciliation',
        label: 'Reconciliation',
        icon: ClipboardList,
        platformFeatureKey: 'inventory.adjustments',
        planFeatureKey: 'stock.adjustments',
        permissions: ['inventory.adjust.create', 'inventory.adjust.approve'],
      },
    ],
  },

  // 5. Customers - Section with items
  {
    id: 'customers',
    label: 'Customers',
    icon: Heart,
    platformFeatureKey: 'customers.core',
    planFeatureKey: 'customers.list',
    items: [
      {
        id: 'customers-overview',
        path: '/dashboard/customers',
        label: 'Overview',
        icon: BarChart3,
        platformFeatureKey: 'customers.core',
        planFeatureKey: 'customers.list',
        permissions: ['crm.view'],
      },
      {
        id: 'customer-activity',
        path: '/dashboard/customers/activity',
        label: 'Customer Activity',
        icon: Users,
        platformFeatureKey: 'customers.core',
        planFeatureKey: 'customers.list',
        permissions: ['crm.view'],
      },
      {
        id: 'customer-groups',
        path: '/dashboard/customers/groups',
        label: 'Customer Groups',
        icon: Tags,
        platformFeatureKey: 'customers.core',
        planFeatureKey: 'customers.list',
        permissions: ['crm.view'],
      },
      {
        id: 'rewards-loyalty',
        path: '/dashboard/customers/loyalty',
        label: 'Rewards & Loyalty',
        icon: Gift,
        platformFeatureKey: 'customers.rewards',
        planFeatureKey: 'customers.list',
        permissions: ['crm.view'],
      },
    ],
  },

  // 6. Operations - Section with items (Non-Gas, Gas items added dynamically)
  {
    id: 'operations',
    label: 'Operations',
    icon: Briefcase,
    items: [
      {
        id: 'expenses',
        path: '/dashboard/expenses',
        label: 'Expenses',
        icon: Receipt,
        platformFeatureKey: 'finance.expenses',
        planFeatureKey: 'expenses.recording',
        permissions: ['expenses.view'],
      },
      // Gas Operations items are added dynamically based on gas module flag
    ],
  },

  // 7. Approvals & Alerts - Direct link with divider
  {
    id: 'approvals-alerts',
    label: 'Approvals & Alerts',
    icon: Shield,
    isDirectLink: true,
    path: '/dashboard/approvals',
    platformFeatureKey: 'approvals.workflows',
    planFeatureKey: 'approvals.stock',
    permissions: ['approval.refund', 'approval.stock_adjustment', 'approval.discount', 'approval.stock_transfer', 'approval.expense'],
    badgeKey: 'pendingApprovals',
    dividerBefore: true,
  },

  // 8. Business Insights - Section with items
  {
    id: 'business-insights',
    label: 'Business Insights',
    icon: BarChart3,
    platformFeatureKey: 'reports.analytics',
    planFeatureKey: 'insights.daily_snapshot',
    items: [
      {
        id: 'performance-reports',
        path: '/dashboard/reports',
        label: 'Performance Reports',
        icon: TrendingUp,
        platformFeatureKey: 'reports.analytics',
        planFeatureKey: 'insights.daily_snapshot',
        permissions: ['reports.view.summary'],
      },
      {
        id: 'financial-overview',
        path: '/dashboard/accounting',
        label: 'Financial Overview',
        icon: Calculator,
        platformFeatureKey: 'finance.reports',
        planFeatureKey: 'accounting.sales_summary',
        permissions: ['accounting.overview.view'],
        ownerOnly: true,
      },
      {
        id: 'settlements',
        path: '/dashboard/accounting/settlements',
        label: 'Settlements',
        icon: Landmark,
        platformFeatureKey: 'finance.reports',
        planFeatureKey: 'accounting.sales_summary',
        permissions: ['accounting.settlements.view' as PermissionKey],
      },
      {
        id: 'reconciliations',
        path: '/dashboard/accounting/reconciliations',
        label: 'Reconciliations',
        icon: ArrowLeftRight,
        platformFeatureKey: 'finance.reports',
        planFeatureKey: 'accounting.sales_summary',
        permissions: ['accounting.reconciliations.view' as PermissionKey],
        ownerOnly: true,
      },
    ],
  },

  // 9. People & Access - Section with items (gated by platform toggle)
  {
    id: 'people-access',
    label: 'People & Access',
    icon: UserCog,
    platformFeatureKey: 'staff.management',
    planFeatureKey: 'team.basic_accounts',
    items: [
      {
        id: 'team-members',
        path: '/dashboard/staff',
        label: 'Team Members',
        icon: Users,
        platformFeatureKey: 'staff.management',
        planFeatureKey: 'team.basic_accounts',
        permissions: ['staff.view'],
      },
      {
        id: 'departments',
        path: '/dashboard/hrm/departments',
        label: 'Departments',
        icon: Building2,
        platformFeatureKey: 'staff.management',
        planFeatureKey: 'team.advanced_roles',
        permissions: ['staff.manage'],
      },
      {
        id: 'attendance',
        path: '/dashboard/hrm/attendance',
        label: 'Attendance',
        icon: Clock,
        platformFeatureKey: 'staff.attendance',
        planFeatureKey: 'team.advanced_roles',
        permissions: ['staff.manage'],
      },
      {
        id: 'payroll',
        path: '/dashboard/hrm/payroll',
        label: 'Payroll',
        icon: Wallet,
        platformFeatureKey: 'staff.payroll',
        ownerOnly: true,
      },
      {
        id: 'leave-requests',
        path: '/dashboard/hrm/leave',
        label: 'Leave Requests',
        icon: CalendarDays,
        platformFeatureKey: 'staff.management',
        planFeatureKey: 'team.advanced_roles',
        permissions: ['staff.manage'],
      },
    ],
  },

  // 10. Settings - Section with items
  {
    id: 'settings',
    label: 'Settings',
    icon: Settings,
    items: [
      {
        id: 'business-settings',
        path: '/dashboard/settings',
        label: 'Business Settings',
        icon: Settings,
        platformFeatureKey: 'settings.business',
        permissions: ['settings.view'],
      },
      {
        id: 'activity-log',
        path: '/dashboard/activity',
        label: 'Activity Log',
        icon: Activity,
        platformFeatureKey: 'activity.logs',
        planFeatureKey: 'activity.sales_stock',
        permissions: ['audit.view'],
      },
      {
        id: 'help-center',
        path: '/dashboard/help',
        label: 'Help Center',
        icon: HelpCircle,
        platformFeatureKey: 'help.center',
        permissions: ['support.help_center.view'],
      },
    ],
  },
];

/**
 * Gas Operations sub-items (added to Operations when gas module is enabled)
 * These are injected dynamically based on business type
 */
export const GAS_OPERATIONS_ITEMS: MenuItemConfig[] = [
  {
    id: 'gas-sales-entry',
    path: '/dashboard/gas/sales-entry',
    label: 'Cashier Entry',
    icon: Gauge,
    platformFeatureKey: 'gas_module',
    permissions: ['gas.sales.entry' as PermissionKey],
  },
  {
    id: 'gas-pump-management',
    path: '/dashboard/gas/pumps',
    label: 'Pump Management',
    icon: Fuel,
    platformFeatureKey: 'gas_module',
    permissions: ['gas.pumps.manage' as PermissionKey],
  },
  {
    id: 'gas-daily-summary',
    path: '/dashboard/gas/summary',
    label: 'Daily Summary',
    icon: FileText,
    platformFeatureKey: 'gas_module',
    permissions: ['gas.summary.view' as PermissionKey],
  },
];

/**
 * Map routes to their required feature keys for route protection
 * This is the single source of truth for route-level access control
 */
export const ROUTE_FEATURE_MAP: Record<string, { platformKey?: string; planKey?: string; permissions?: PermissionKey[] }> = {
  // Dashboard - always accessible
  '/dashboard': {},
  
  // Sales routes
  '/dashboard/sales': { platformKey: 'reports.sales', planKey: 'sales.create', permissions: ['pos.access', 'sales.view'] },
  '/dashboard/pos': { platformKey: 'sales.pos', planKey: 'sales.create', permissions: ['pos.access'] },
  
  // Stock Control routes
  '/dashboard/inventory': { platformKey: 'inventory.products', planKey: 'stock.in_out', permissions: ['inventory.view'] },
  '/dashboard/inventory/items': { platformKey: 'inventory.products', planKey: 'stock.in_out', permissions: ['inventory.view'] },
  '/dashboard/inventory/categories': { platformKey: 'inventory.products', planKey: 'stock.in_out', permissions: ['inventory.view'] },
  '/dashboard/inventory/stock': { platformKey: 'inventory.stock', planKey: 'stock.in_out', permissions: ['inventory.view'] },
  '/dashboard/inventory/adjustments': { platformKey: 'inventory.adjustments', planKey: 'stock.adjustments', permissions: ['inventory.adjust.create', 'inventory.adjust.approve'] },
  '/dashboard/inventory/suppliers': { platformKey: 'inventory.products', planKey: 'stock.in_out', permissions: ['inventory.view'] },
  '/dashboard/inventory/purchase-orders': { platformKey: 'inventory.products', planKey: 'stock.in_out', permissions: ['inventory.view'] },
  '/dashboard/inventory/reconciliation': { platformKey: 'inventory.adjustments', planKey: 'stock.adjustments', permissions: ['inventory.adjust.create', 'inventory.adjust.approve'] },
  
  
  // Customer routes
  '/dashboard/customers': { platformKey: 'customers.core', planKey: 'customers.list', permissions: ['crm.view'] },
  '/dashboard/customers/activity': { platformKey: 'customers.core', planKey: 'customers.list', permissions: ['crm.view'] },
  '/dashboard/customers/groups': { platformKey: 'customers.core', planKey: 'customers.list', permissions: ['crm.view'] },
  '/dashboard/customers/loyalty': { platformKey: 'customers.rewards', planKey: 'customers.list', permissions: ['crm.view'] },
  '/dashboard/crm': { platformKey: 'customers.core', planKey: 'customers.list', permissions: ['crm.view'] },
  
  // Operations routes
  '/dashboard/expenses': { platformKey: 'finance.expenses', planKey: 'expenses.recording', permissions: ['expenses.view'] },
  '/dashboard/approvals': { platformKey: 'approvals.workflows', planKey: 'approvals.stock', permissions: ['approval.refund', 'approval.stock_adjustment', 'approval.discount', 'approval.stock_transfer', 'approval.expense'] },
  
  // Gas routes (Business type specific)
  '/dashboard/gas': { platformKey: 'gas_module' },
  '/dashboard/gas/sales-entry': { platformKey: 'gas_module', permissions: ['gas.sales.entry' as PermissionKey] },
  '/dashboard/gas/pumps': { platformKey: 'gas_module', permissions: ['gas.pumps.manage' as PermissionKey] },
  '/dashboard/gas/summary': { platformKey: 'gas_module', permissions: ['gas.summary.view' as PermissionKey] },
  
  // Business Insights routes
  '/dashboard/reports': { platformKey: 'reports.analytics', planKey: 'insights.daily_snapshot', permissions: ['reports.view.summary'] },
  '/dashboard/accounting': { platformKey: 'finance.reports', planKey: 'accounting.sales_summary', permissions: ['accounting.overview.view'] },
  '/dashboard/accounting/settlements': { platformKey: 'finance.reports', planKey: 'accounting.sales_summary', permissions: ['accounting.settlements.view' as PermissionKey] },
  '/dashboard/accounting/reconciliations': { platformKey: 'finance.reports', planKey: 'accounting.sales_summary', permissions: ['accounting.reconciliations.view' as PermissionKey] },
  
  // People & Access routes
  '/dashboard/staff': { platformKey: 'staff.management', planKey: 'team.basic_accounts', permissions: ['staff.view'] },
  '/dashboard/hrm': { platformKey: 'staff.management', planKey: 'team.advanced_roles', permissions: ['staff.manage'] },
  '/dashboard/hrm/departments': { platformKey: 'staff.management', planKey: 'team.advanced_roles', permissions: ['staff.manage'] },
  '/dashboard/hrm/attendance': { platformKey: 'staff.attendance', planKey: 'team.advanced_roles', permissions: ['staff.manage'] },
  '/dashboard/hrm/payroll': { platformKey: 'staff.payroll', planKey: 'team.advanced_roles' },
  '/dashboard/hrm/leave': { platformKey: 'staff.management', planKey: 'team.advanced_roles', permissions: ['staff.manage'] },
  
  // Settings routes
  '/dashboard/settings': { platformKey: 'settings.business', permissions: ['settings.view'] },
  '/dashboard/activity': { platformKey: 'activity.logs', planKey: 'activity.sales_stock', permissions: ['audit.view'] },
  '/dashboard/help': { permissions: ['support.help_center.view'] },
  '/dashboard/notifications': { planKey: 'notifications.in_app' },
};

/**
 * Get feature requirements for a given route path
 */
export function getRouteFeatureRequirements(pathname: string): { platformKey?: string; planKey?: string; permissions?: PermissionKey[] } | null {
  // Exact match first
  if (ROUTE_FEATURE_MAP[pathname]) {
    return ROUTE_FEATURE_MAP[pathname];
  }

  // Prefix match for nested routes
  const sortedRoutes = Object.keys(ROUTE_FEATURE_MAP)
    .filter(route => route !== '/dashboard')
    .sort((a, b) => b.length - a.length);

  for (const route of sortedRoutes) {
    if (pathname.startsWith(route)) {
      return ROUTE_FEATURE_MAP[route];
    }
  }

  return null;
}

/**
 * Get all menu item IDs for a given section
 * Useful for bulk operations
 */
export function getSectionItemIds(sectionId: string): string[] {
  const section = SIDEBAR_MENU_CONFIG.find(s => s.id === sectionId);
  if (!section) return [];
  if (section.isDirectLink) return [section.id];
  return section.items?.map(i => i.id) ?? [];
}

/**
 * Find a menu item by path
 */
export function findMenuItemByPath(path: string): MenuItemConfig | MenuSectionConfig | null {
  for (const section of SIDEBAR_MENU_CONFIG) {
    if (section.isDirectLink && section.path === path) {
      return section;
    }
    if (section.items) {
      const item = section.items.find(i => i.path === path);
      if (item) return item;
    }
  }
  return null;
}
