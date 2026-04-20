import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Lock, Sparkles, ArrowRight, Loader2 } from "lucide-react";
import { useSubscriptionNavigation } from "@/hooks/useSubscriptionNavigation";
import type { BVBooksPlan } from "@/hooks/useFeatureGating";

interface UpgradePromptProps {
  featureName: string;
  requiredPlan: BVBooksPlan | null;
  inline?: boolean;
  className?: string;
}

const PLAN_LABELS: Record<BVBooksPlan, string> = {
  free: 'Free',
  professional: 'Professional',
  enterprise: 'Enterprise',
};

const PLAN_COLORS: Record<BVBooksPlan, string> = {
  free: 'bg-muted text-muted-foreground',
  professional: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
  enterprise: 'bg-purple-500/10 text-purple-600 border-purple-500/20',
};

export function UpgradePrompt({ featureName, requiredPlan, inline = false, className = "" }: UpgradePromptProps) {
  const { navigateToUpgrade, isNavigating } = useSubscriptionNavigation();

  if (!requiredPlan) return null;

  if (inline) {
    return (
      <div className={`flex items-center gap-2 p-3 rounded-lg bg-muted/50 border border-dashed ${className}`}>
        <Lock className="h-4 w-4 text-muted-foreground shrink-0" />
        <span className="text-sm text-muted-foreground">
          {featureName} requires{" "}
          <Badge variant="outline" className={PLAN_COLORS[requiredPlan]}>
            {PLAN_LABELS[requiredPlan]}
          </Badge>
        </span>
        <Button 
          variant="link" 
          size="sm" 
          className="ml-auto p-0 h-auto"
          onClick={() => navigateToUpgrade(requiredPlan)}
          disabled={isNavigating}
        >
          {isNavigating ? (
            <Loader2 className="h-3 w-3 animate-spin mr-1" />
          ) : null}
          Upgrade
          <ArrowRight className="h-3 w-3 ml-1" />
        </Button>
      </div>
    );
  }

  return (
    <Card className={`border-dashed ${className}`}>
      <CardHeader className="text-center pb-2">
        <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-2">
          <Sparkles className="h-6 w-6 text-primary" />
        </div>
        <CardTitle className="text-lg">Upgrade to Unlock</CardTitle>
        <CardDescription>
          {featureName} is available on the{" "}
          <Badge variant="outline" className={PLAN_COLORS[requiredPlan]}>
            {PLAN_LABELS[requiredPlan]}
          </Badge>{" "}
          plan
        </CardDescription>
      </CardHeader>
      <CardContent className="text-center">
        <Button onClick={() => navigateToUpgrade(requiredPlan)} disabled={isNavigating}>
          {isNavigating ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Sparkles className="h-4 w-4 mr-2" />
          )}
          View Plans
        </Button>
      </CardContent>
    </Card>
  );
}

interface FeatureGateProps {
  featureKey: string;
  featureName: string;
  isEnabled: boolean;
  requiresUpgrade: boolean;
  availableInPlan: BVBooksPlan | null;
  children: React.ReactNode;
  showUpgradePrompt?: boolean;
}

export function FeatureGate({
  featureName,
  isEnabled,
  requiresUpgrade,
  availableInPlan,
  children,
  showUpgradePrompt = true,
}: FeatureGateProps) {
  if (isEnabled) {
    return <>{children}</>;
  }

  if (requiresUpgrade && showUpgradePrompt) {
    return <UpgradePrompt featureName={featureName} requiredPlan={availableInPlan} />;
  }

  return null;
}
