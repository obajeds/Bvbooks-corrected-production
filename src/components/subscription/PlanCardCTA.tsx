/**
 * Plan Card CTA Component
 * 
 * Renders the correct CTA button for each plan based on:
 * - Current plan vs target plan
 * - Subscription rules (upgrade/downgrade/renew)
 * - Owner permissions
 */

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { 
  Loader2, 
  Check, 
  TrendingUp, 
  TrendingDown, 
  Sparkles, 
  Clock, 
  ShieldAlert,
  AlertTriangle,
} from "lucide-react";
import type { BVBooksPlan } from "@/hooks/useFeatureGating";
import type { PlanRules, PlanAction } from "@/hooks/useSubscriptionPlanRules";
import type { BillingPeriod } from "@/hooks/useSubscriptionPlans";

interface PlanCardCTAProps {
  planId: BVBooksPlan;
  planRules: PlanRules;
  planAction: PlanAction;
  isCurrentPlan: boolean;
  isExpiredPaid: boolean;
  canManageSubscription: boolean;
  isProcessing: boolean;
  isSelected: boolean;
  billingPeriod: BillingPeriod;
  monthlyPrice: number;
  onSelectPlan: () => void;
  onChangeBillingPeriod: (period: BillingPeriod) => void;
}

export function PlanCardCTA({
  planId,
  planRules,
  planAction,
  isCurrentPlan,
  isExpiredPaid,
  canManageSubscription,
  isProcessing,
  isSelected,
  billingPeriod,
  monthlyPrice,
  onSelectPlan,
  onChangeBillingPeriod,
}: PlanCardCTAProps) {
  const [showDowngradeWarning, setShowDowngradeWarning] = useState(false);

  const handleClick = () => {
    if (planRules.showWarning && planRules.warningMessage) {
      setShowDowngradeWarning(true);
      return;
    }
    onSelectPlan();
  };

  const handleConfirmDowngrade = () => {
    setShowDowngradeWarning(false);
    onSelectPlan();
  };

  // Loading state
  if (isProcessing && isSelected) {
    return (
      <Button className="w-full" size="lg" disabled>
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        Processing...
      </Button>
    );
  }

  // Staff restriction
  if (!canManageSubscription) {
    return (
      <div className="w-full space-y-2">
        <Button className="w-full" variant="outline" size="lg" disabled>
          <ShieldAlert className="mr-2 h-4 w-4" />
          Owner Access Required
        </Button>
        <p className="text-xs text-muted-foreground text-center">
          Contact your business owner to manage plans
        </p>
      </div>
    );
  }

  // Free plan - current (no renew, show expiry countdown)
  if (planId === "free" && isCurrentPlan) {
    return (
      <div className="w-full space-y-2">
        <Button className="w-full" variant="outline" size="lg" disabled>
          <Clock className="mr-2 h-4 w-4" />
          {planRules.ctaLabel}
        </Button>
        <p className="text-xs text-muted-foreground text-center">
          Upgrade anytime to unlock more features
        </p>
      </div>
    );
  }

  // Current paid plan - expired (prominent renew)
  if (isCurrentPlan && isExpiredPaid) {
    return (
      <Button
        className="w-full gap-2 bg-destructive hover:bg-destructive/90"
        variant="destructive"
        size="lg"
        onClick={handleClick}
        disabled={isProcessing}
      >
        <Sparkles className="h-4 w-4" />
        Renew Now
      </Button>
    );
  }

  // Current paid plan - active (renew/extend)
  if (isCurrentPlan && planRules.canRenew) {
    return (
      <Button
        className="w-full gap-2"
        variant="default"
        size="lg"
        onClick={handleClick}
        disabled={isProcessing}
      >
        <Sparkles className="h-4 w-4" />
        Renew / Extend
      </Button>
    );
  }

  // Upgrade path
  if (planRules.canUpgradeTo) {
    return (
      <div className="w-full space-y-2">
        <Button
          className="w-full gap-2"
          variant="default"
          size="lg"
          onClick={handleClick}
          disabled={isProcessing}
        >
          <TrendingUp className="h-4 w-4" />
          Upgrade Now
        </Button>
        {billingPeriod === "monthly" && monthlyPrice > 0 && (
          <Button
            variant="ghost"
            size="sm"
            className="w-full text-xs text-green-600 hover:text-green-700 hover:bg-green-50"
            onClick={() => onChangeBillingPeriod("yearly")}
          >
            <TrendingUp className="h-3 w-3 mr-1" />
            Switch to Yearly & Save 17%
          </Button>
        )}
      </div>
    );
  }

  // Downgrade path (Enterprise → Professional only)
  if (planRules.canDowngradeTo) {
    return (
      <>
        <Button
          className="w-full gap-2"
          variant="outline"
          size="lg"
          onClick={handleClick}
          disabled={isProcessing}
        >
          <TrendingDown className="h-4 w-4" />
          Downgrade
        </Button>

        {/* Downgrade Warning Dialog */}
        <AlertDialog open={showDowngradeWarning} onOpenChange={setShowDowngradeWarning}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-amber-500" />
                Confirm Downgrade
              </AlertDialogTitle>
              <AlertDialogDescription className="text-left">
                {planRules.warningMessage}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleConfirmDowngrade}>
                Yes, Downgrade
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </>
    );
  }

  // Disabled/not available (e.g., downgrade to free)
  if (planRules.ctaDisabled) {
    return (
      <div className="w-full space-y-2">
        <Button className="w-full" variant="outline" size="lg" disabled>
          <Check className="mr-2 h-4 w-4" />
          {planId === "free" ? "Free Tier" : planRules.ctaLabel}
        </Button>
        {planRules.disabledReason && (
          <p className="text-xs text-muted-foreground text-center">
            {planRules.disabledReason}
          </p>
        )}
      </div>
    );
  }

  // Fallback
  return (
    <Button className="w-full" variant="secondary" size="lg" disabled>
      Unavailable
    </Button>
  );
}
