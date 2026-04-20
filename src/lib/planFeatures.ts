// Only 3 distinct plans: Free, Professional, Enterprise
export type BVBooksPlan = 'free' | 'professional' | 'enterprise';

// Plan-gated features
export const ENTERPRISE_ONLY_FEATURES = {
  whatsappSupport: true,
  prioritySupport: true,
  advancedIntegrations: true,
  barcodeSystem: true,
  businessHours: true,
} as const;

// Helper to check if a plan has a specific feature
export function hasEnterpriseFeature(plan: BVBooksPlan | null | undefined): boolean {
  return plan === 'enterprise';
}

// WhatsApp support configuration
export const WHATSAPP_SUPPORT_CONFIG = {
  number: '+2349134423615',
  defaultMessage: 'Hello, I need help with BVBooks.',
  featureDescription: 'Get priority responses and direct WhatsApp support.',
  lockMessage: 'WhatsApp support is available on the Enterprise plan.',
} as const;

export interface CategoryFeatures {
  title: string;
  icon: string;
  available: boolean;
  features: string[];
  unavailable?: string[];
}

export interface PlanFeatureDetails {
  sales: CategoryFeatures;
  stockControl: CategoryFeatures;
  customers: CategoryFeatures;
  teamActivity: CategoryFeatures;
  expenses: CategoryFeatures;
  accounting: CategoryFeatures;
  businessInsights: CategoryFeatures;
  approvals: CategoryFeatures;
  notifications: CategoryFeatures;
  activityLog: CategoryFeatures;
  settings: CategoryFeatures;
}

export const CATEGORY_ORDER = [
  'sales',
  'stockControl',
  'customers',
  'teamActivity',
  'expenses',
  'accounting',
  'businessInsights',
  'approvals',
  'notifications',
  'activityLog',
  'settings'
] as const;

export const PLAN_FEATURE_DETAILS: Record<BVBooksPlan, PlanFeatureDetails> = {
  free: {
    sales: {
      title: "Sales",
      icon: "ShoppingCart",
      available: true,
      features: ["POS", "Create sales", "Fixed pricing only"],
      unavailable: ["No discounts", "No refunds"]
    },
    stockControl: {
      title: "Stock Control",
      icon: "Package",
      available: true,
      features: ["Stock in and stock out", "Manual adjustments (no approvals)"]
    },
    customers: {
      title: "Customers",
      icon: "Users",
      available: true,
      features: ["Customer list", "Customer sales history"]
    },
    teamActivity: {
      title: "Team Activity",
      icon: "UserCog",
      available: true,
      features: ["Basic staff accounts", "Simple roles only"]
    },
    expenses: {
      title: "Expenses",
      icon: "Receipt",
      available: false,
      features: [],
      unavailable: ["Not available"]
    },
    accounting: {
      title: "Accounting",
      icon: "Calculator",
      available: true,
      features: ["Sales summary", "Cash balance view"]
    },
    businessInsights: {
      title: "Business Insights",
      icon: "TrendingUp",
      available: true,
      features: ["Daily sales snapshot", "Low stock alerts"]
    },
    approvals: {
      title: "Approvals",
      icon: "CheckSquare",
      available: false,
      features: [],
      unavailable: ["Not available"]
    },
    notifications: {
      title: "Notifications",
      icon: "Bell",
      available: true,
      features: ["Low stock alerts only"]
    },
    activityLog: {
      title: "Activity Log",
      icon: "FileText",
      available: true,
      features: ["Sales and stock logs only"]
    },
    settings: {
      title: "Settings",
      icon: "Settings",
      available: true,
      features: ["Business profile", "Receipt and tax setup"]
    }
  },
  professional: {
    sales: {
      title: "Sales",
      icon: "ShoppingCart",
      available: true,
      features: ["Discounts with % limits", "Minimum price enforcement", "Restricted refunds"]
    },
    stockControl: {
      title: "Stock Control",
      icon: "Package",
      available: true,
      features: ["Adjustment thresholds", "Mandatory adjustment reasons", "Limited approvals", "Stock variance tracking"]
    },
    customers: {
      title: "Customers",
      icon: "Users",
      available: true,
      features: ["Credit sales", "Customer balance tracking", "Credit limits", "Manual payment reminders"]
    },
    teamActivity: {
      title: "Team Activity",
      icon: "UserCog",
      available: true,
      features: ["Advanced role permissions", "Shift-based access", "Session/device limits", "Branch isolation"]
    },
    expenses: {
      title: "Expenses",
      icon: "Receipt",
      available: true,
      features: ["Expense recording", "Expense categories", "Expense limits"]
    },
    accounting: {
      title: "Accounting",
      icon: "Calculator",
      available: true,
      features: ["Profit & Loss", "Cash flow", "Reversals (no delete)"]
    },
    businessInsights: {
      title: "Business Insights",
      icon: "TrendingUp",
      available: true,
      features: ["Daily sales/stock snapshots", "Basic loss risk indicators", "Stock shrinkage signals"]
    },
    approvals: {
      title: "Approvals",
      icon: "CheckSquare",
      available: true,
      features: ["Limited stock adjustment approvals"]
    },
    notifications: {
      title: "Notifications",
      icon: "Bell",
      available: true,
      features: ["In-app notifications", "Low stock alerts"]
    },
    activityLog: {
      title: "Activity Log",
      icon: "FileText",
      available: true,
      features: ["Sales, stock, expense, staff logs", "Limited export"]
    },
    settings: {
      title: "Settings",
      icon: "Settings",
      available: true,
      features: ["Business profile", "Receipt and tax setup", "Subscription", "Add-ons", "Notifications", "Branding", "Branches", "Permissions", "Units"]
    }
  },
  enterprise: {
    sales: {
      title: "Sales",
      icon: "ShoppingCart",
      available: true,
      features: ["Advanced pricing rules", "Branch-level pricing", "Split payments", "Approval-based refunds", "Full discount controls"]
    },
    stockControl: {
      title: "Stock Control",
      icon: "Package",
      available: true,
      features: ["Multi-branch inventory", "Transfers with approval", "Transfer variance tracking", "Strict no backdating"]
    },
    customers: {
      title: "Customers",
      icon: "Users",
      available: true,
      features: ["Branch-specific customers", "Central customer view", "Automated payment reminders", "Customer risk indicators"]
    },
    teamActivity: {
      title: "Team Activity",
      icon: "UserCog",
      available: true,
      features: ["Full role enforcement", "Staff performance metrics", "Branch-level staff visibility"]
    },
    expenses: {
      title: "Expenses",
      icon: "Receipt",
      available: true,
      features: ["Branch expense budgets", "Budget overrun alerts", "Full approval workflows"]
    },
    accounting: {
      title: "Accounting",
      icon: "Calculator",
      available: true,
      features: ["Branch-level P&L", "Consolidated reports", "Inter-branch reconciliation"]
    },
    businessInsights: {
      title: "Business Insights",
      icon: "TrendingUp",
      available: true,
      features: ["Loss risk indicators", "Staff risk scoring", "Branch performance trends"]
    },
    approvals: {
      title: "Approvals",
      icon: "CheckSquare",
      available: true,
      features: ["Discount approvals", "Refund approvals", "Stock adjustment approvals", "Expense approvals", "Multi-level approval chains"]
    },
    notifications: {
      title: "Notifications",
      icon: "Bell",
      available: true,
      features: ["Discount/refund/adjustment alerts", "After-hours activity alerts", "Risk pattern alerts"]
    },
    activityLog: {
      title: "Activity Log",
      icon: "FileText",
      available: true,
      features: ["Full immutable audit trail", "Filter by staff/branch/date", "Full export"]
    },
    settings: {
      title: "Settings",
      icon: "Settings",
      available: true,
      features: ["Everything in Professional", "Approval rules", "Advanced branch policies", "Control configurations"]
    }
  }
};

export const PLAN_SUMMARY = {
  free: {
    name: "Free",
    tagline: "Get started with essential features",
    branches: 1,
    staff: 2,
    price: 0,
    color: "bg-muted"
  },
  professional: {
    name: "Professional",
    tagline: "For growing businesses",
    branches: 2,
    staff: 6,
    price: 5500,
    color: "bg-blue-500"
  },
  enterprise: {
    name: "Enterprise",
    tagline: "Full control for multi-branch operations",
    branches: 3,
    staff: 15,
    price: 9499,
    color: "bg-primary",
    addonNote: "Need more? Purchase extra branches or staff from Add-ons"
  }
};
