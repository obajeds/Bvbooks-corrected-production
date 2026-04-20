import { useState } from "react";
import { useUserRole, getRoleBadgeColor } from "@/hooks/useUserRole";
import { useProfile } from "@/hooks/useProfile";
import { useBusiness } from "@/hooks/useBusiness";
import { useBusinessHealth } from "@/hooks/useBusinessHealth";
import { useBusinessPlan } from "@/hooks/useFeatureGating";
import { useBranches } from "@/hooks/useBranches";

import { useBranchContext } from "@/contexts/BranchContext";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "react-router-dom";
import { 
  Plus, 
  Receipt,
  UserPlus,
  PackagePlus,
  Building2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { PermissionKey } from "@/lib/permissions";

// Dashboard components
import BusinessBRMContact from "@/components/brm/BusinessBRMContact";
import { BusinessHealthDashboard } from "./BusinessHealthDashboard";
import { SalesSyncStatusCard } from "@/components/pos/SalesSyncStatusCard";
import { AdminBusinessOverview } from "./AdminBusinessOverview";

interface QuickAction {
  label: string;
  icon: React.ElementType;
  route: string;
  /** Required permission keys - any match = visible */
  permissions: PermissionKey[];
  color?: string;
  freePlan?: boolean;
}

const ALL_QUICK_ACTIONS: QuickAction[] = [
  { label: "New Sale", icon: Plus, route: "/pos", permissions: ['pos.access'], color: "text-primary", freePlan: true },
  { label: "Add Expense", icon: Receipt, route: "/expenses", permissions: ['expenses.view', 'expenses.create'], color: "text-orange-500", freePlan: false },
  { label: "Add Customer", icon: UserPlus, route: "/crm", permissions: ['crm.view', 'crm.manage'], color: "text-blue-500", freePlan: true },
  { label: "Add Stock", icon: PackagePlus, route: "/inventory/stock", permissions: ['inventory.view'], color: "text-emerald-500", freePlan: false },
];
function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}


export function ControlCenterDashboard() {
  const [showAllBranches, setShowAllBranches] = useState(false);
  // subscription navigation now handled by BusinessHealthDashboard
  const { data: roleData, isLoading: roleLoading } = useUserRole();
  const { data: profile, isLoading: profileLoading } = useProfile();
  const { data: business, isLoading: businessLoading } = useBusiness();
  const { isLoading: healthLoading } = useBusinessHealth();
  const { data: planInfo } = useBusinessPlan();
  const { data: branches } = useBranches(business?.id);
  
  const { isOwner: isBranchOwner, hasPermission: hasBranchPermission } = useBranchContext();

  const role = roleData?.role;
  const isOwner = roleData?.isOwner;
  const isFreePlan = planInfo?.currentPlan === 'free';
  const hasMultipleBranches = (branches?.length ?? 0) >= 2;
  
  const canContactBRM = isBranchOwner || hasBranchPermission('support.brm.contact' as PermissionKey);

  // Filter quick actions using branch-scoped RBAC permissions
  const availableActions = ALL_QUICK_ACTIONS.filter(action => {
    // Owner sees all actions
    if (isBranchOwner) {
      if (isFreePlan && !action.freePlan) return false;
      return true;
    }
    // Staff: check if they have ANY of the required permissions
    const hasAccess = action.permissions.some(p => hasBranchPermission(p));
    if (!hasAccess) return false;
    // On free plan, only show actions marked as freePlan
    if (isFreePlan && !action.freePlan) return false;
    return true;
  });

  const isLoading = roleLoading || profileLoading || businessLoading || healthLoading;

  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <Skeleton className="h-24 w-full" />
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
          {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-20" />)}
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <Skeleton className="h-48" />
          <Skeleton className="h-48" />
        </div>
      </div>
    );
  }

  const greeting = getGreeting();
  const firstName = profile?.full_name?.split(" ")[0] || "User";


  return (
    <div className="space-y-6">
      {/* 1. User Greeting */}
      <Card className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border-primary/20">
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold">
                {greeting}, {firstName}!
              </h1>
              <p className="text-sm text-muted-foreground flex items-center gap-2 mt-1">
                {isOwner ? (
                  <Badge className="bg-primary/10 text-primary border-primary/20">
                    Business Owner
                  </Badge>
                ) : (
                  <>
                    <span>Logged in as</span>
                    {role && (
                      <Badge className={getRoleBadgeColor(role)}>
                        {role}
                      </Badge>
                    )}
                  </>
                )}
              </p>
            </div>
            {canContactBRM && business?.id && (
              <BusinessBRMContact 
                businessId={business.id} 
                businessName={business.trading_name} 
              />
            )}
          </div>
        </CardContent>
      </Card>

      {/* 2. All Branches Toggle (owner with 2+ branches) */}
      {isOwner && hasMultipleBranches && (
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant={showAllBranches ? "default" : "outline"}
            onClick={() => setShowAllBranches(!showAllBranches)}
            className="gap-2"
          >
            <Building2 className="h-4 w-4" />
            {showAllBranches ? "Viewing All Branches" : "All Branches Overview"}
          </Button>
        </div>
      )}

      {/* 3. All Branches Overview (when toggled) */}
      {showAllBranches && isOwner ? (
        <AdminBusinessOverview />
      ) : (
        <>
          {/* Quick Actions */}
          <div className="space-y-3">
            <h2 className="text-lg font-semibold">Quick Actions</h2>
            <div className="flex flex-wrap gap-3">
              {availableActions.map((action) => (
                <Button
                  key={action.route}
                  variant="outline"
                  className="flex-1 min-w-[140px] max-w-[200px] h-14 gap-2 hover:bg-muted/50 transition-all hover:scale-[1.02]"
                  asChild
                >
                  <Link to={action.route}>
                    <action.icon className={cn("h-5 w-5", action.color)} />
                    <span className="text-sm font-medium">{action.label}</span>
                  </Link>
                </Button>
              ))}
            </div>
          </div>

          {/* Sales Sync Status */}
          {(isBranchOwner || hasBranchPermission('pos.access')) && (
            <SalesSyncStatusCard />
          )}

          {/* Business Health Engine */}
          <BusinessHealthDashboard />
        </>
      )}
    </div>
  );
}
