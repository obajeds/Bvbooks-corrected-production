import { PermissionGate } from "@/components/auth/PermissionGate";
import ApprovalRequestList from "@/components/approvals/ApprovalRequestList";
import { useFeatureEnabled } from "@/hooks/useFeatureGating";
import { UpgradePrompt } from "@/components/subscription/UpgradePrompt";
import { Loader2 } from "lucide-react";

const Approvals = () => {
  const { isEnabled, isLoading, requiresUpgrade, availableInPlan } = useFeatureEnabled("approvals.stock");

  if (isLoading) {
    return (
      <main className="flex-1 overflow-y-auto p-6 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </main>
    );
  }

  // Feature gating
  if (!isEnabled && requiresUpgrade) {
    return (
      <main className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Approvals</h1>
          <p className="text-muted-foreground text-sm sm:text-base">Review and manage pending approval requests</p>
        </div>
        <UpgradePrompt featureName="Approval Workflows" requiredPlan={availableInPlan} />
      </main>
    );
  }

  return (
    <main className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Approval Center</h1>
        <p className="text-muted-foreground text-sm sm:text-base">Manage leave requests, payroll, refunds, stock adjustments, transfers, and discounts</p>
      </div>

      <PermissionGate 
        permissions={["approval.refund", "approval.stock_adjustment", "approval.discount", "approval.stock_transfer", "approval.expense"]}
        requireAll={false}
        fallback={
          <div className="text-center py-12 text-muted-foreground">
            <p>You don't have permission to view approval requests.</p>
          </div>
        }
      >
        <ApprovalRequestList />
      </PermissionGate>
    </main>
  );
};

export default Approvals;
