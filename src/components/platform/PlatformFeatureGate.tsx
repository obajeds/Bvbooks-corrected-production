import { ReactNode, useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { usePlatformFeatureEnabled } from "@/hooks/usePlatformFeatures";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertTriangle, Lock, ShieldX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface PlatformFeatureGateProps {
  /**
   * The feature key as defined in platform_features table
   */
  featureKey: string;
  /**
   * Content to render when feature is enabled
   */
  children: ReactNode;
  /**
   * Custom fallback when feature is disabled (optional)
   */
  fallback?: ReactNode;
  /**
   * If true, shows a loading skeleton while checking feature status
   */
  showLoading?: boolean;
  /**
   * If true, renders nothing instead of disabled message (for hiding UI elements)
   */
  hideOnly?: boolean;
  /**
   * Custom title for the disabled message
   */
  disabledTitle?: string;
  /**
   * Custom description for the disabled message
   */
  disabledDescription?: string;
  /**
   * Redirect path when feature is disabled (optional)
   */
  redirectTo?: string;
}

/**
 * PlatformFeatureGate - Enforces Super Admin feature toggles
 * 
 * Renders children only if the platform feature is enabled.
 * Shows appropriate messaging when disabled by Super Admin.
 * 
 * Usage:
 * ```tsx
 * <PlatformFeatureGate featureKey="gas_module">
 *   <GasModuleContent />
 * </PlatformFeatureGate>
 * ```
 */
export function PlatformFeatureGate({
  featureKey,
  children,
  fallback,
  showLoading = true,
  hideOnly = false,
  disabledTitle,
  disabledDescription,
  redirectTo,
}: PlatformFeatureGateProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { isEnabled, isLoading, feature } = usePlatformFeatureEnabled(featureKey);
  const [wasEnabled, setWasEnabled] = useState<boolean | null>(null);
  const [showConflictAlert, setShowConflictAlert] = useState(false);

  // Track if feature was previously enabled (for conflict detection)
  useEffect(() => {
    if (!isLoading) {
      if (wasEnabled === true && !isEnabled) {
        // Feature was just disabled while user was using it
        setShowConflictAlert(true);
      }
      setWasEnabled(isEnabled);
    }
  }, [isEnabled, isLoading, wasEnabled]);

  // Handle redirect if specified
  useEffect(() => {
    if (!isLoading && !isEnabled && redirectTo) {
      navigate(redirectTo, { replace: true });
    }
  }, [isEnabled, isLoading, redirectTo, navigate]);

  if (isLoading && showLoading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  // Feature is enabled - render children
  if (isEnabled) {
    return <>{children}</>;
  }

  // Hide only mode - render nothing
  if (hideOnly) {
    return null;
  }

  // Custom fallback provided
  if (fallback) {
    return <>{fallback}</>;
  }

  // Default disabled UI
  const title = disabledTitle || feature?.feature_name || "Feature Unavailable";
  const description =
    disabledDescription ||
    "This feature has been temporarily disabled by the system administrator. Please check back later or contact support for more information.";

  return (
    <div className="flex items-center justify-center min-h-[400px] p-6">
      <Card className="max-w-md w-full border-muted">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-muted flex items-center justify-center">
            <Lock className="h-6 w-6 text-muted-foreground" />
          </div>
          <CardTitle className="text-lg">{title}</CardTitle>
          <CardDescription className="text-sm">{description}</CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center">
          <Button variant="outline" onClick={() => navigate("/dashboard")}>
            Return to Dashboard
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

/**
 * FeatureDisabledAlert - Shows when a feature is disabled while user is using it
 */
export function FeatureDisabledAlert({
  featureName,
  onDismiss,
  onNavigateHome,
}: {
  featureName: string;
  onDismiss: () => void;
  onNavigateHome: () => void;
}) {
  return (
    <Alert variant="destructive" className="mb-4">
      <AlertTriangle className="h-4 w-4" />
      <AlertTitle>Feature Disabled</AlertTitle>
      <AlertDescription className="flex flex-col gap-3">
        <p>
          <strong>{featureName}</strong> has been disabled by Super Admin. Any unsaved
          changes may be lost.
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
  );
}

/**
 * PlatformFeatureIndicator - Shows feature status for debugging/admin purposes
 */
export function PlatformFeatureIndicator({
  featureKey,
  showWhenEnabled = false,
}: {
  featureKey: string;
  showWhenEnabled?: boolean;
}) {
  const { isEnabled, isLoading, feature } = usePlatformFeatureEnabled(featureKey);

  if (isLoading) return null;
  if (isEnabled && !showWhenEnabled) return null;

  return (
    <div
      className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${
        isEnabled
          ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
          : "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"
      }`}
    >
      {isEnabled ? (
        <>
          <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
          Enabled
        </>
      ) : (
        <>
          <ShieldX className="h-3 w-3" />
          Disabled by Admin
        </>
      )}
    </div>
  );
}

/**
 * Hook to detect when a feature is disabled while in use
 */
export function useFeatureConflictDetection(featureKey: string) {
  const { isEnabled, isLoading } = usePlatformFeatureEnabled(featureKey);
  const [wasEnabled, setWasEnabled] = useState<boolean | null>(null);
  const [hasConflict, setHasConflict] = useState(false);
  const location = useLocation();

  useEffect(() => {
    if (!isLoading) {
      if (wasEnabled === true && !isEnabled) {
        setHasConflict(true);
      } else if (isEnabled) {
        setHasConflict(false);
      }
      setWasEnabled(isEnabled);
    }
  }, [isEnabled, isLoading, wasEnabled]);

  // Reset conflict when navigating away
  useEffect(() => {
    setHasConflict(false);
  }, [location.pathname]);

  const dismissConflict = () => setHasConflict(false);

  return { hasConflict, dismissConflict, isEnabled };
}
