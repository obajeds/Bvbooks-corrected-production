import { useUserRole, hasPermission, getRoleBadgeColor } from "@/hooks/useUserRole";
import { useProfile } from "@/hooks/useProfile";
import { useBranchContext } from "@/contexts/BranchContext";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useFeatureAccess } from "@/hooks/useFeatureAccess";
import { FEATURE_KEYS } from "@/lib/featureAccess";
import { 
  ShoppingCart, 
  TrendingUp, 
  Users,
  Receipt,
  ShieldAlert
} from "lucide-react";

interface QuickAction {
  label: string;
  icon: React.ElementType;
  route: string;
  feature: string;
  platformKey?: string;
  planKey?: string;
}

const ALL_QUICK_ACTIONS: QuickAction[] = [
  { label: "POS", icon: ShoppingCart, route: "/dashboard/pos", feature: "pos", platformKey: FEATURE_KEYS.SALES_POS, planKey: FEATURE_KEYS.PLAN_SALES_CREATE },
  { label: "Sales", icon: TrendingUp, route: "/dashboard/sales", feature: "sales", platformKey: FEATURE_KEYS.SALES_REPORTS, planKey: FEATURE_KEYS.PLAN_SALES_CREATE },
  { label: "Customers", icon: Users, route: "/dashboard/customers", feature: "crm", platformKey: FEATURE_KEYS.CUSTOMERS_CORE, planKey: FEATURE_KEYS.PLAN_CUSTOMERS_LIST },
  { label: "Expenses", icon: Receipt, route: "/dashboard/expenses", feature: "expenses", platformKey: FEATURE_KEYS.FINANCE_EXPENSES, planKey: FEATURE_KEYS.PLAN_EXPENSES_RECORDING },
];

/**
 * Component to check if a quick action is accessible
 */
function QuickActionButton({ action, role }: { action: QuickAction; role: any }) {
  const navigate = useNavigate();
  const { canAccess, isLoading } = useFeatureAccess({
    platformKey: action.platformKey,
    planKey: action.planKey,
  });

  // Check both role permission and feature access
  const hasRolePermission = hasPermission(role as any, action.feature);
  const isAccessible = hasRolePermission && canAccess && !isLoading;

  if (!isAccessible) return null;

  return (
    <Button
      variant="outline"
      className="h-auto flex-col gap-2 py-4"
      onClick={() => navigate(action.route)}
    >
      <action.icon className="h-5 w-5" />
      {action.label}
    </Button>
  );
}

export function QuickActionsPanel() {
  const { data: roleData, isLoading: roleLoading } = useUserRole();
  const { data: profile, isLoading: profileLoading } = useProfile();
  const { currentBranchPermissions, isOwner } = useBranchContext();

  const role = roleData?.role;

  if (roleLoading || profileLoading) {
    return null;
  }

  const greeting = getGreeting();
  const firstName = profile?.full_name?.split(" ")[0] || "User";

  // Check if staff has no permissions assigned (pending role assignment)
  const hasNoPermissions = !isOwner && currentBranchPermissions.length === 0;

  return (
    <div className="space-y-6">
      {/* Welcome Message */}
      <div className="rounded-lg border bg-card p-6">
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-bold">
            {greeting}, {firstName}!
          </h1>
          <p className="text-sm text-muted-foreground flex items-center gap-2">
            {isOwner ? "Business Owner" : "You're logged in as"}
            {!isOwner && role && (
              <Badge className={getRoleBadgeColor(role)}>
                {role}
              </Badge>
            )}
          </p>
        </div>
      </div>

      {/* Pending Role Assignment Message */}
      {hasNoPermissions && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800 p-6 text-center">
          <ShieldAlert className="h-12 w-12 text-amber-500 mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-amber-800 dark:text-amber-200 mb-2">
            Awaiting Role Assignment
          </h2>
          <p className="text-sm text-amber-700 dark:text-amber-300 max-w-md mx-auto">
            Your account is awaiting role assignment. Please contact your administrator to get access to the system features.
          </p>
        </div>
      )}

      {/* Quick Actions - Only render if user has permissions */}
      {!hasNoPermissions && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Quick Actions</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
            {ALL_QUICK_ACTIONS.map((action) => (
              <QuickActionButton key={action.route} action={action} role={role} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}
