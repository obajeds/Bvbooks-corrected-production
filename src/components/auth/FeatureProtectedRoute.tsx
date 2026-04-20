import { ReactNode, useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useUnifiedFeatureAccess } from "@/hooks/useUnifiedFeatureAccess";
import { getRouteFeatureRequirements } from "@/lib/sidebarMenuConfig";
import { usePlatformFeatures } from "@/hooks/usePlatformFeatures";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertTriangle, Lock, ShieldX, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { cn } from "@/lib/utils";
import { useSubscriptionNavigation } from "@/hooks/useSubscriptionNavigation";
import { useSubscriptionStatus } from "@/hooks/useSubscriptionStatus";

interface FeatureProtectedRouteProps {
  children: ReactNode;
  /** Custom fallback when blocked */
  fallback?: ReactNode;
  /** Redirect to dashboard instead of showing blocked message */
  redirectOnBlock?: boolean;
}

/**
 * FeatureProtectedRoute - Wraps routes with unified feature access checking
 * 
 * Checks:
 * 1. Platform toggles (Super Admin)
 * 2. Plan features (subscription)
 * 3. User permissions
 * 4. Subscription status
 * 
 * Shows appropriate messaging or redirects when access is blocked.
 */
export function FeatureProtectedRoute({
  children,
  fallback,
  redirectOnBlock = false,
}: FeatureProtectedRouteProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const [showDisabledAlert, setShowDisabledAlert] = useState(false);
  const [wasAccessible, setWasAccessible] = useState<boolean | null>(null);

  // Get feature requirements for current route
  const requirements = getRouteFeatureRequirements(location.pathname);

  // Use unified access check
  // Use unified access check - skip subscription check since GlobalSubscriptionEnforcement handles it
  const access = useUnifiedFeatureAccess({
    featureKey: requirements?.platformKey || requirements?.planKey,
    permissions: requirements?.permissions,
    skipPlatformCheck: !requirements?.platformKey,
    skipPlanCheck: !requirements?.planKey,
    skipPermissionCheck: !requirements?.permissions?.length,
    skipSubscriptionCheck: true, // GlobalSubscriptionEnforcement handles subscription status
  });

  // Subscribe to real-time platform feature changes
  const { data: platformFeatures = [] } = usePlatformFeatures();

  // Detect when feature is disabled while user is on the page
  useEffect(() => {
    if (!access.isLoading) {
      if (wasAccessible === true && !access.isAccessible && access.isPlatformDisabled) {
        setShowDisabledAlert(true);
      } else if (access.isAccessible) {
        setShowDisabledAlert(false);
      }
      setWasAccessible(access.isAccessible);
    }
  }, [access.isAccessible, access.isLoading, access.isPlatformDisabled, wasAccessible]);

  // Handle redirect when blocked
  useEffect(() => {
    if (!access.isLoading && !access.isAccessible && redirectOnBlock) {
      navigate('/dashboard', { replace: true });
    }
  }, [access.isAccessible, access.isLoading, redirectOnBlock, navigate]);

  // Loading state
  if (access.isLoading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  // Dashboard is always accessible
  if (location.pathname === '/dashboard' || location.pathname === '/dashboard/') {
    return <>{children}</>;
  }

  // No requirements = accessible
  if (!requirements) {
    return <>{children}</>;
  }

  // Show real-time disabled alert overlay
  if (showDisabledAlert) {
    return (
      <div className="relative">
        <FeatureDisabledOverlay 
          onDismiss={() => setShowDisabledAlert(false)}
          onNavigateHome={() => navigate('/dashboard')}
        />
        <div className="opacity-50 pointer-events-none">
          {children}
        </div>
      </div>
    );
  }

  // Access granted
  if (access.isAccessible) {
    return <>{children}</>;
  }

  // Custom fallback
  if (fallback) {
    return <>{fallback}</>;
  }

  // Show appropriate blocked message
  return (
    <FeatureBlockedMessage
      blockReason={access.blockReason}
      requiredPlan={access.requiredPlan}
      onNavigateHome={() => navigate('/dashboard')}
    />
  );
}

/**
 * Overlay shown when a feature is disabled in real-time while user is viewing it
 */
function FeatureDisabledOverlay({
  onDismiss,
  onNavigateHome,
}: {
  onDismiss: () => void;
  onNavigateHome: () => void;
}) {
  return (
    <div className="absolute inset-0 z-50 bg-background/95 backdrop-blur-sm flex items-center justify-center">
      <Alert variant="destructive" className="max-w-md mx-4">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Feature Disabled</AlertTitle>
        <AlertDescription className="flex flex-col gap-3">
          <p>
            This feature has been disabled by the system administrator. 
            Any unsaved changes may be lost.
          </p>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={onDismiss}>
              Dismiss
            </Button>
            <Button size="sm" onClick={onNavigateHome}>
              Go to Dashboard
            </Button>
          </div>
        </AlertDescription>
      </Alert>
    </div>
  );
}

/**
 * Message shown when access to a feature is blocked
 */
function FeatureBlockedMessage({
  blockReason,
  requiredPlan,
  onNavigateHome,
}: {
  blockReason: 'platform_disabled' | 'plan_restricted' | 'permission_denied' | 'subscription_blocked' | null;
  requiredPlan: string | null;
  onNavigateHome: () => void;
}) {
  const navigate = useNavigate();
  const { navigateToRenew, navigateToUpgrade, isNavigating } = useSubscriptionNavigation();
  const { tier } = useSubscriptionStatus();

  const handleSubscriptionAction = () => {
    if (blockReason === 'subscription_blocked') {
      navigateToRenew();
    } else {
      navigateToUpgrade();
    }
  };

  // Dynamic CTA label based on tier and block reason
  const getCTALabel = () => {
    if (blockReason === 'subscription_blocked') {
      return 'Renew Subscription';
    }
    if (blockReason === 'plan_restricted') {
      if (tier === 'free') return 'Upgrade Now';
      if (requiredPlan === 'enterprise') return 'Upgrade to Enterprise';
      return 'Upgrade';
    }
    return 'View Plans';
  };

  const config = {
    platform_disabled: {
      icon: ShieldX,
      title: 'Feature Unavailable',
      description: 'This feature has been temporarily disabled by the system administrator. Please check back later or contact support for more information.',
      showUpgrade: false,
    },
    plan_restricted: {
      icon: Lock,
      title: 'Upgrade Required',
      description: requiredPlan 
        ? `Upgrade to ${requiredPlan.charAt(0).toUpperCase() + requiredPlan.slice(1)} to unlock this feature.`
        : 'Upgrade your plan to unlock this feature.',
      showUpgrade: true,
    },
    permission_denied: {
      icon: ShieldX,
      title: 'Access Denied',
      description: 'You don\'t have permission to access this feature. Contact your administrator if you believe this is an error.',
      showUpgrade: false,
    },
    subscription_blocked: {
      icon: Lock,
      title: 'Subscription Expired',
      description: 'Your subscription has expired. Please renew to regain access to this feature.',
      showUpgrade: true,
    },
  };

  const currentConfig = blockReason ? config[blockReason] : config.permission_denied;
  const Icon = currentConfig.icon;

  return (
    <div className="flex items-center justify-center min-h-[400px] p-6">
      <div className="max-w-md w-full text-center">
        <div className="mx-auto mb-6 h-16 w-16 rounded-full bg-muted flex items-center justify-center">
          <Icon className="h-8 w-8 text-muted-foreground" />
        </div>
        <h2 className="text-xl font-semibold mb-2">{currentConfig.title}</h2>
        <p className="text-muted-foreground mb-6">{currentConfig.description}</p>
        <div className="flex justify-center gap-3">
          <Button variant="outline" onClick={onNavigateHome}>
            Return to Dashboard
          </Button>
          {currentConfig.showUpgrade && (
            <Button onClick={handleSubscriptionAction} disabled={isNavigating}>
              {isNavigating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {getCTALabel()}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Simple wrapper for inline feature checks
 */
export function FeatureVisible({
  featureKey,
  permissions,
  children,
  fallback = null,
}: {
  featureKey?: string;
  permissions?: string[];
  children: ReactNode;
  fallback?: ReactNode;
}) {
  const access = useUnifiedFeatureAccess({
    featureKey,
    permissions: permissions as any,
    skipPlatformCheck: !featureKey,
    skipPermissionCheck: !permissions?.length,
  });

  if (access.isLoading) return null;
  if (!access.isAccessible) return <>{fallback}</>;
  return <>{children}</>;
}
