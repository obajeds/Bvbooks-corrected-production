// Granular Permission Keys - matches the database enum and aligns 1:1 with menu structure
export type PermissionKey =
  // ============= SALES PERFORMANCE =============
  | 'sales.performance.view'      // View Sales Performance page
  | 'sales.reports.view'          // View Sales Reports
  | 'sales.data.export'           // Export Sales Data
  // Legacy sales keys for backward compatibility
  | 'pos.access'
  | 'pos.sale.create'
  | 'pos.sale.cancel'
  | 'pos.sale.refund'
  | 'pos.discount.apply'
  | 'pos.discount.override'
  | 'pos.rewards.redeem'
  | 'sales.view'
  | 'sales.view.all'
  | 'sales.edit'
  | 'sales.delete'
  
  // ============= STOCK CONTROL =============
  | 'stock.catalog.view'          // View Product Catalog
  | 'stock.catalog.manage'        // Manage Products (add/edit/delete)
  | 'stock.categories.view'       // View Categories
  | 'stock.categories.manage'     // Manage Categories
  | 'stock.levels.view'           // View Stock Levels
  | 'stock.adjust'                // Adjust Stock
  | 'stock.adjustments.history'   // View Stock Adjustments History
  | 'stock.suppliers.manage'      // Manage Suppliers
  | 'stock.orders.view'           // View Purchase Orders
  | 'stock.orders.create'         // Create Purchase Orders
  | 'stock.orders.approve'        // Approve Purchase Orders (Enterprise only)
  // Legacy inventory keys
  | 'inventory.view'
  | 'inventory.item.create'
  | 'inventory.item.edit'
  | 'inventory.item.delete'
  | 'inventory.adjust.create'
  | 'inventory.adjust.approve'
  | 'inventory.price.view_cost'
  | 'inventory.price.edit'
  
  // ============= CUSTOMERS =============
  | 'customers.overview.view'     // View Customers Overview
  | 'customers.activity.view'     // View Customer Activity
  | 'customers.groups.manage'     // Manage Customer Groups
  | 'customers.rewards.view'      // View Rewards & Loyalty
  | 'customers.rewards.manage'    // Manage Rewards & Loyalty
  // Legacy CRM keys
  | 'crm.view'
  | 'crm.manage'
  | 'crm.credit.manage'
  
  // ============= OPERATIONS =============
  | 'operations.expenses.record'  // Record Expenses
  | 'operations.expenses.view'    // View Expenses
  | 'operations.expenses.approve' // Approve Expenses (Enterprise only)
  | 'operations.approvals.view'   // View Approvals
  | 'operations.alerts.receive'   // Receive Alerts
  | 'operations.alerts.resolve'   // Resolve Alerts
  // Legacy expense keys
  | 'expenses.view'
  | 'expenses.create'
  | 'expenses.approve'
  // Legacy approval keys
  | 'approval.refund'
  | 'approval.stock_adjustment'
  | 'approval.discount'
  | 'approval.discount.stop'
  | 'approval.stock_transfer'
  | 'approval.expense'
  
  // ============= BUSINESS INSIGHTS =============
  | 'insights.reports.view'       // View Performance Reports
  | 'insights.financial.view'     // View Financial Overview
  | 'insights.settlements.view'   // View Settlements
  | 'insights.reconciliations.view' // View Reconciliations
  | 'insights.reports.export'     // Export Financial Reports
  // Legacy report/accounting keys
  | 'reports.view.summary'
  | 'reports.view.financial'
  | 'reports.view.inventory'
  | 'reports.export'
  | 'accounting.overview.view'
  | 'accounting.settlements.view'
  | 'accounting.settlements.manage'
  | 'accounting.reconciliations.view'
  | 'accounting.reconciliations.manage'
  
  // ============= PEOPLE & ACCESS =============
  | 'people.team.view'            // View Team Members
  | 'people.team.manage'          // Add / Remove Team Members
  | 'people.roles.assign'         // Assign Roles
  | 'people.departments.view'     // View Departments
  | 'people.departments.manage'   // Manage Departments
  | 'people.attendance.view'      // View Attendance
  | 'people.attendance.manage'    // Manage Attendance
  | 'people.payroll.view'         // View Payroll
  | 'people.payroll.manage'       // Manage Payroll
  | 'people.leave.view'           // View Leave Requests
  | 'people.leave.approve'        // Approve Leave Requests
  // Legacy staff keys
  | 'staff.view'
  | 'staff.manage'
  | 'staff.suspend'
  | 'staff.permissions.manage'
  
  // ============= SETTINGS =============
  | 'settings.business.view'      // View Business Settings
  | 'settings.business.manage'    // Manage Business Settings
  | 'settings.activity.view'      // View Activity Log
  | 'settings.activity.export'    // Export Activity Log
  | 'settings.help.access'        // Access Help Center
  // Legacy settings keys
  | 'settings.view'
  | 'settings.manage'
  | 'settings.branches.manage'
  | 'settings.rewards.manage'
  | 'audit.view'
  | 'support.help_center.view'
  | 'support.chat.access'
  | 'support.brm.contact'
  
  // ============= DASHBOARD WIDGETS =============
  | 'dashboard.profit.view'
  | 'dashboard.alerts.view'
  | 'dashboard.team_activity.view'
  | 'dashboard.top_selling.view'
  | 'dashboard.staff_risk.view'
  | 'dashboard.branch_performance.view'
  | 'dashboard.after_hours.view'
  
  // ============= GAS MODULE =============
  | 'gas.sales.entry'
  | 'gas.sales.view_own'
  | 'gas.summary.view'
  | 'gas.pumps.manage';

// Permission categories aligned with sidebar menu structure
export const PERMISSION_CATEGORIES = {
  sales_performance: {
    label: 'Sales Performance',
    description: 'Access to sales analytics and performance data',
    menuPath: '/dashboard/sales',
    permissions: [
      { key: 'sales.performance.view', label: 'View Sales Performance', description: 'Access Sales Performance page with analytics' },
      { key: 'sales.reports.view', label: 'View Sales Reports', description: 'View detailed sales reports and history' },
      { key: 'sales.data.export', label: 'Export Sales Data', description: 'Download sales data as CSV/Excel' },
      { key: 'pos.access', label: 'Access Point of Sale', description: 'Use the POS system to process sales' },
      { key: 'pos.sale.create', label: 'Create Sales', description: 'Process new sales transactions' },
      { key: 'pos.sale.cancel', label: 'Cancel Sales', description: 'Cancel pending sales' },
      { key: 'pos.sale.refund', label: 'Request Refunds', description: 'Request refunds (requires approval)' },
      { key: 'pos.discount.apply', label: 'Apply Discounts', description: 'Apply company-funded discounts' },
      { key: 'pos.discount.override', label: 'Override Discount Limits', description: 'Apply discounts beyond role limits' },
      { key: 'pos.rewards.redeem', label: 'Redeem Customer Rewards', description: 'Apply customer reward points during checkout' },
    ],
  },
  stock_control: {
    label: 'Stock Control',
    description: 'Inventory operations and management',
    menuPath: '/dashboard/inventory',
    permissions: [
      { key: 'stock.catalog.view', label: 'View Product Catalog', description: 'Access All Items page to view products' },
      { key: 'stock.catalog.manage', label: 'Manage Products', description: 'Add, edit, delete products' },
      { key: 'stock.categories.view', label: 'View Categories', description: 'Access Categories page' },
      { key: 'stock.categories.manage', label: 'Manage Categories', description: 'Add, edit, delete categories' },
      { key: 'stock.levels.view', label: 'View Stock Levels', description: 'Access Stock Levels page' },
      { key: 'stock.adjust', label: 'Adjust Stock', description: 'Submit stock adjustments' },
      { key: 'stock.adjustments.history', label: 'View Stock Adjustments History', description: 'View past stock adjustments' },
      { key: 'stock.suppliers.manage', label: 'Manage Suppliers', description: 'Add, edit, delete suppliers' },
      { key: 'stock.orders.view', label: 'View Purchase Orders', description: 'Access Purchase Orders page' },
      { key: 'stock.orders.create', label: 'Create Purchase Orders', description: 'Create new purchase orders' },
      { key: 'stock.orders.approve', label: 'Approve Purchase Orders', description: 'Approve pending purchase orders (Enterprise only)', enterpriseOnly: true },
    ],
  },
  customers: {
    label: 'Customers',
    description: 'Customer data and engagement',
    menuPath: '/dashboard/customers',
    permissions: [
      { key: 'customers.overview.view', label: 'View Customers Overview', description: 'Access Customers Overview page' },
      { key: 'customers.activity.view', label: 'View Customer Activity', description: 'View customer purchase history and activity' },
      { key: 'customers.groups.manage', label: 'Manage Customer Groups', description: 'Create and manage customer groups' },
      { key: 'customers.rewards.view', label: 'View Rewards & Loyalty', description: 'View rewards program data' },
      { key: 'customers.rewards.manage', label: 'Manage Rewards & Loyalty', description: 'Configure rewards program settings' },
    ],
  },
  operations: {
    label: 'Operations',
    description: 'Operational control and approvals',
    menuPath: '/dashboard/expenses',
    permissions: [
      { key: 'operations.expenses.record', label: 'Record Expenses', description: 'Add new expense records' },
      { key: 'operations.expenses.view', label: 'View Expenses', description: 'Access Expenses page' },
      { key: 'operations.expenses.approve', label: 'Approve Expenses', description: 'Approve expense records (Enterprise only)', enterpriseOnly: true },
      { key: 'operations.approvals.view', label: 'View Approvals', description: 'Access Approvals page' },
      { key: 'operations.alerts.receive', label: 'Receive Alerts', description: 'Receive system alerts and notifications' },
      { key: 'operations.alerts.resolve', label: 'Resolve Alerts', description: 'Mark alerts as resolved' },
    ],
  },
  business_insights: {
    label: 'Business Insights',
    description: 'Reporting and financial visibility',
    menuPath: '/dashboard/reports',
    permissions: [
      { key: 'insights.reports.view', label: 'View Performance Reports', description: 'Access Performance Reports page' },
      { key: 'insights.financial.view', label: 'View Financial Overview', description: 'Access Financial Overview (P&L, cash flow)' },
      { key: 'insights.settlements.view', label: 'View Settlements', description: 'Access Settlements page' },
      { key: 'insights.reconciliations.view', label: 'View Reconciliations', description: 'Access Reconciliations page' },
      { key: 'insights.reports.export', label: 'Export Financial Reports', description: 'Download financial reports' },
    ],
  },
  people_access: {
    label: 'People & Access',
    description: 'Workforce and access control',
    menuPath: '/dashboard/staff',
    permissions: [
      { key: 'people.team.view', label: 'View Team Members', description: 'Access Team Members page' },
      { key: 'people.team.manage', label: 'Add / Remove Team Members', description: 'Invite, edit, or remove staff' },
      { key: 'people.roles.assign', label: 'Assign Roles', description: 'Assign roles and permissions to staff' },
      { key: 'people.departments.view', label: 'View Departments', description: 'Access Departments page' },
      { key: 'people.departments.manage', label: 'Manage Departments', description: 'Create and manage departments' },
      { key: 'people.attendance.view', label: 'View Attendance', description: 'Access Attendance page' },
      { key: 'people.attendance.manage', label: 'Manage Attendance', description: 'Record and edit attendance' },
      { key: 'people.payroll.view', label: 'View Payroll', description: 'Access Payroll page' },
      { key: 'people.payroll.manage', label: 'Manage Payroll', description: 'Process payroll payments' },
      { key: 'people.leave.view', label: 'View Leave Requests', description: 'View leave requests' },
      { key: 'people.leave.approve', label: 'Approve Leave Requests', description: 'Approve or reject leave requests' },
    ],
  },
  settings: {
    label: 'Settings',
    description: 'Configuration and support',
    menuPath: '/dashboard/settings',
    permissions: [
      { key: 'settings.business.view', label: 'View Business Settings', description: 'Access Business Settings page' },
      { key: 'settings.business.manage', label: 'Manage Business Settings', description: 'Change business configuration' },
      { key: 'settings.activity.view', label: 'View Activity Log', description: 'Access Activity Log page' },
      { key: 'settings.activity.export', label: 'Export Activity Log', description: 'Download activity log data' },
      { key: 'settings.help.access', label: 'Access Help Center', description: 'Access Help Center articles' },
    ],
  },
  gas_station: {
    label: 'Gas Station',
    description: 'Fuel station management (when enabled)',
    menuPath: '/dashboard/gas',
    permissions: [
      { key: 'gas.sales.entry', label: 'Enter Pump Sales', description: 'Access Cashier Entry page to record daily pump sales' },
      { key: 'gas.sales.view_own', label: 'View Own Sales', description: 'View your own pump sales entries' },
      { key: 'gas.summary.view', label: 'View Daily Summary', description: 'Access Daily Business Summary page for all cashiers' },
      { key: 'gas.pumps.manage', label: 'Manage Pumps', description: 'Add, edit, and delete fuel pumps' },
    ],
  },
} as const;

// Legacy permission key to new key mapping for backward compatibility
export const LEGACY_PERMISSION_MAPPING: Record<string, PermissionKey> = {
  // Sales/POS mappings
  'pos.access': 'pos.access',
  'pos.sale.create': 'pos.sale.create',
  'pos.sale.cancel': 'pos.sale.cancel',
  'pos.sale.refund': 'pos.sale.refund',
  'pos.discount.apply': 'pos.discount.apply',
  'pos.discount.override': 'pos.discount.override',
  'pos.rewards.redeem': 'pos.rewards.redeem',
  'sales.view': 'sales.reports.view',
  'sales.view.all': 'sales.reports.view',
  'sales.edit': 'sales.performance.view',
  'sales.delete': 'sales.performance.view',
  
  // Inventory to Stock Control mappings
  'inventory.view': 'stock.catalog.view',
  'inventory.item.create': 'stock.catalog.manage',
  'inventory.item.edit': 'stock.catalog.manage',
  'inventory.item.delete': 'stock.catalog.manage',
  'inventory.adjust.create': 'stock.adjust',
  'inventory.adjust.approve': 'stock.orders.approve',
  'inventory.price.view_cost': 'stock.catalog.view',
  'inventory.price.edit': 'stock.catalog.manage',
  
  // CRM to Customers mappings
  'crm.view': 'customers.overview.view',
  'crm.manage': 'customers.groups.manage',
  'crm.credit.manage': 'customers.groups.manage',
  
  // Expenses to Operations mappings
  'expenses.view': 'operations.expenses.view',
  'expenses.create': 'operations.expenses.record',
  'expenses.approve': 'operations.expenses.approve',
  'approval.refund': 'operations.approvals.view',
  'approval.stock_adjustment': 'operations.approvals.view',
  'approval.discount': 'operations.approvals.view',
  'approval.discount.stop': 'operations.approvals.view',
  'approval.stock_transfer': 'operations.approvals.view',
  'approval.expense': 'operations.approvals.view',
  
  // Reports/Accounting to Business Insights mappings
  'reports.view.summary': 'insights.reports.view',
  'reports.view.financial': 'insights.financial.view',
  'reports.view.inventory': 'insights.reports.view',
  'reports.export': 'insights.reports.export',
  'accounting.overview.view': 'insights.financial.view',
  'accounting.settlements.view': 'insights.settlements.view',
  'accounting.settlements.manage': 'insights.settlements.view',
  'accounting.reconciliations.view': 'insights.reconciliations.view',
  'accounting.reconciliations.manage': 'insights.reconciliations.view',
  
  // Staff to People & Access mappings
  'staff.view': 'people.team.view',
  'staff.manage': 'people.team.manage',
  'staff.suspend': 'people.team.manage',
  'staff.permissions.manage': 'people.roles.assign',
  
  // Settings mappings
  'settings.view': 'settings.business.view',
  'settings.manage': 'settings.business.manage',
  'settings.branches.manage': 'settings.business.manage',
  'settings.rewards.manage': 'customers.rewards.manage',
  'audit.view': 'settings.activity.view',
  'support.help_center.view': 'settings.help.access',
  'support.chat.access': 'settings.help.access',
  'support.brm.contact': 'settings.help.access',
};

// Get all permission keys as a flat array (new keys only for role templates)
export const ALL_PERMISSIONS: PermissionKey[] = Object.values(PERMISSION_CATEGORIES).flatMap(
  (category) => category.permissions.map((p) => p.key as PermissionKey)
);

// Get all permission keys including legacy for validation
export const ALL_PERMISSION_KEYS: PermissionKey[] = [
  ...ALL_PERMISSIONS,
  ...Object.keys(LEGACY_PERMISSION_MAPPING) as PermissionKey[],
];

// Route to required permissions mapping
// Note: Routes with multiple permissions use OR logic (user needs ANY of them)
export const ROUTE_PERMISSIONS: Record<string, PermissionKey[]> = {
  '/': [], // Dashboard - accessible to all authenticated users
  '/dashboard': [],
  '/dashboard/pos': ['pos.access', 'sales.performance.view'],
  '/dashboard/sales': ['sales.performance.view', 'sales.reports.view', 'pos.access', 'sales.view'],
  '/dashboard/inventory/items': ['stock.catalog.view', 'inventory.view'],
  '/dashboard/inventory/categories': ['stock.categories.view', 'inventory.view'],
  '/dashboard/inventory/stock': ['stock.levels.view', 'inventory.view'],
  '/dashboard/inventory/adjustments': ['stock.adjust', 'stock.adjustments.history', 'inventory.adjust.create', 'inventory.adjust.approve'],
  '/dashboard/inventory/suppliers': ['stock.suppliers.manage', 'inventory.view'],
  '/dashboard/inventory/purchase-orders': ['stock.orders.view', 'inventory.view'],
  '/dashboard/customers': ['customers.overview.view', 'crm.view'],
  '/dashboard/customers/activity': ['customers.activity.view', 'crm.view'],
  '/dashboard/customers/groups': ['customers.groups.manage', 'crm.manage'],
  '/dashboard/customers/loyalty': ['customers.rewards.view', 'customers.rewards.manage', 'settings.rewards.manage'],
  '/dashboard/staff': ['people.team.view', 'staff.view'],
  '/dashboard/hrm/departments': ['people.departments.view', 'people.departments.manage', 'staff.manage'],
  '/dashboard/hrm/attendance': ['people.attendance.view', 'people.attendance.manage', 'staff.manage'],
  '/dashboard/hrm/payroll': ['people.payroll.view', 'people.payroll.manage'],
  '/dashboard/hrm/leave': ['people.leave.view', 'people.leave.approve', 'staff.manage'],
  '/dashboard/expenses': ['operations.expenses.view', 'expenses.view'],
  '/dashboard/accounting': ['insights.financial.view', 'accounting.overview.view'],
  '/dashboard/accounting/settlements': ['insights.settlements.view', 'accounting.settlements.view'],
  '/dashboard/accounting/reconciliations': ['insights.reconciliations.view', 'accounting.reconciliations.view'],
  '/dashboard/reports': ['insights.reports.view', 'reports.view.summary'],
  '/dashboard/notifications': [], // Accessible to all authenticated users
  '/dashboard/activity': ['settings.activity.view', 'audit.view'],
  '/dashboard/settings': ['settings.business.view', 'settings.view'],
  '/dashboard/approvals': ['operations.approvals.view', 'approval.refund', 'approval.stock_adjustment', 'approval.discount', 'approval.stock_transfer', 'approval.expense'],
  '/dashboard/help': ['settings.help.access', 'support.help_center.view'],
  '/dashboard/gas/sales-entry': ['gas.sales.entry'],
  '/dashboard/gas/pumps': ['gas.pumps.manage'],
  '/dashboard/gas/summary': ['gas.summary.view'],
};

// Normalize permission - converts legacy keys to new keys
export function normalizePermission(permission: PermissionKey): PermissionKey {
  return LEGACY_PERMISSION_MAPPING[permission] || permission;
}

// Normalize an array of permissions
export function normalizePermissions(permissions: PermissionKey[]): PermissionKey[] {
  const normalized = new Set<PermissionKey>();
  permissions.forEach(p => {
    normalized.add(p);
    // Also add the mapped version if it exists
    if (LEGACY_PERMISSION_MAPPING[p]) {
      normalized.add(LEGACY_PERMISSION_MAPPING[p]);
    }
  });
  return Array.from(normalized);
}

/**
 * Expand permissions bidirectionally: for each permission held,
 * add both the canonical target (forward) and all legacy keys that
 * map to it (reverse). This ensures `.includes()` checks work
 * regardless of whether the code uses legacy or canonical keys.
 */
export function expandPermissionsBidirectional(permissions: PermissionKey[]): PermissionKey[] {
  const expanded = new Set<PermissionKey>(permissions);
  
  for (const perm of permissions) {
    // Forward: legacy → canonical
    const canonical = LEGACY_PERMISSION_MAPPING[perm];
    if (canonical) {
      expanded.add(canonical);
    }
    
    // Reverse: if perm is a canonical key, add all legacy keys that map to it
    for (const [legacyKey, canonicalKey] of Object.entries(LEGACY_PERMISSION_MAPPING)) {
      if (canonicalKey === perm) {
        expanded.add(legacyKey as PermissionKey);
      }
    }
  }
  
  return Array.from(expanded);
}

// Helper to check if a user has any of the required permissions
export function hasAnyPermission(
  userPermissions: PermissionKey[],
  requiredPermissions: PermissionKey[]
): boolean {
  if (requiredPermissions.length === 0) return true;
  const normalized = normalizePermissions(userPermissions);
  return requiredPermissions.some((p) => normalized.includes(p) || normalized.includes(normalizePermission(p)));
}

// Helper to check if a user has all required permissions
export function hasAllPermissions(
  userPermissions: PermissionKey[],
  requiredPermissions: PermissionKey[]
): boolean {
  if (requiredPermissions.length === 0) return true;
  const normalized = normalizePermissions(userPermissions);
  return requiredPermissions.every((p) => normalized.includes(p) || normalized.includes(normalizePermission(p)));
}

// Get permission category for a given permission key
export function getPermissionCategory(permission: PermissionKey): string | null {
  for (const [categoryKey, category] of Object.entries(PERMISSION_CATEGORIES)) {
    if (category.permissions.some(p => p.key === permission)) {
      return categoryKey;
    }
  }
  // Check legacy mappings
  const normalizedPerm = normalizePermission(permission);
  for (const [categoryKey, category] of Object.entries(PERMISSION_CATEGORIES)) {
    if (category.permissions.some(p => p.key === normalizedPerm)) {
      return categoryKey;
    }
  }
  return null;
}

// Check if permission is enterprise-only
export function isEnterpriseOnly(permission: PermissionKey): boolean {
  for (const category of Object.values(PERMISSION_CATEGORIES)) {
    const perm = category.permissions.find(p => p.key === permission);
    if (perm && 'enterpriseOnly' in perm) {
      return perm.enterpriseOnly === true;
    }
  }
  return false;
}
