import { ReactNode, useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { useBranchContext } from "@/contexts/BranchContext";
import { ROUTE_PERMISSIONS, type PermissionKey } from "@/lib/permissions";
import { Loader2, ShieldX, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface PermissionProtectedRouteProps {
  children: ReactNode;
  /** Override route-based permissions with custom permissions */
  permissions?: PermissionKey | PermissionKey[];
  /** If true, requires ALL permissions. Default: any permission matches */
  requireAll?: boolean;
}

/**
 * PermissionProtectedRoute - Wraps a route with branch-scoped permission checking
 * 
 * Uses the ROUTE_PERMISSIONS mapping by default, or custom permissions if provided.
 * Owners always have access. Staff only see routes they have permissions for in the current branch.
 */
export function PermissionProtectedRoute({
  children,
  permissions: customPermissions,
  requireAll = false,
}: PermissionProtectedRouteProps) {
  const location = useLocation();
  const { isLoading, isOwner, currentBranchPermissions, hasPermission, currentBranch, accessibleBranches, hasNoAccessibleBranches } = useBranchContext();
  const [loadingTimeout, setLoadingTimeout] = useState(false);

  // Set a timeout for loading state to detect stuck loads
  useEffect(() => {
    if (isLoading) {
      const timer = setTimeout(() => {
        setLoadingTimeout(true);
        console.error("[PermissionProtectedRoute] Loading timeout - possible data loading issue", {
          path: location.pathname,
          isOwner,
          currentBranch: currentBranch?.name,
          isLoading,
        });
      }, 10000); // 10 second timeout
      
      return () => clearTimeout(timer);
    } else {
      setLoadingTimeout(false);
    }
  }, [isLoading, location.pathname, isOwner, currentBranch]);

  if (isLoading && !loadingTimeout) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Show error if loading took too long
  if (loadingTimeout) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center gap-4">
        <AlertCircle className="h-16 w-16 text-amber-500 mb-2" />
        <h2 className="text-2xl font-bold text-foreground mb-2">Loading Error</h2>
        <Alert className="max-w-md">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Unable to load permissions data. Please try refreshing the page.
            If the problem persists, contact support.
          </AlertDescription>
        </Alert>
        <p className="text-sm text-muted-foreground">
          Path: {location.pathname}
        </p>
      </div>
    );
  }

  // Staff without active branch access - show explicit recovery message (never blank)
  if (!isOwner && hasNoAccessibleBranches) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center gap-4">
        <AlertCircle className="h-16 w-16 text-amber-500 mb-2" />
        <h2 className="text-2xl font-bold text-foreground mb-2">No Branch Access Assigned</h2>
        <Alert className="max-w-md text-left">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Your account has no active branch assignment yet. Please contact your administrator to assign branch access.
          </AlertDescription>
        </Alert>
        <p className="text-sm text-muted-foreground">
          Path: {location.pathname}
        </p>
      </div>
    );
  }

  // Staff without a branch selected yet - still resolving permissions
  // This should only happen briefly during initial load
  if (!isOwner && !currentBranch) {
    console.warn("[PermissionProtectedRoute] Staff user has no current branch", {
      path: location.pathname,
      accessibleBranches: accessibleBranches.length,
    });
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary mb-2" />
        <p className="text-muted-foreground">Setting up your workspace...</p>
      </div>
    );
  }

  // Business owners have all permissions
  if (isOwner) {
    return <>{children}</>;
  }

  // Determine required permissions
  let requiredPermissions: PermissionKey[];
  
  if (customPermissions) {
    requiredPermissions = Array.isArray(customPermissions) 
      ? customPermissions 
      : [customPermissions];
  } else {
    // Find matching route in ROUTE_PERMISSIONS
    const pathname = location.pathname;
    
    // Try exact match first
    if (ROUTE_PERMISSIONS[pathname]) {
      requiredPermissions = ROUTE_PERMISSIONS[pathname];
    } else {
      // Try prefix matching for nested routes
      const matchingRoute = Object.keys(ROUTE_PERMISSIONS)
        .filter(route => route !== '/')
        .sort((a, b) => b.length - a.length) // Longest first
        .find(route => pathname.startsWith(route));
      
      requiredPermissions = matchingRoute 
        ? ROUTE_PERMISSIONS[matchingRoute] 
        : [];
    }
  }

  // Empty permissions means accessible to all authenticated users
  if (requiredPermissions.length === 0) {
    return <>{children}</>;
  }

  // Check if user has required permissions in the current branch
  let hasAccess: boolean;
  if (requireAll) {
    hasAccess = requiredPermissions.every((p) => hasPermission(p));
  } else {
    hasAccess = requiredPermissions.some((p) => hasPermission(p));
  }

  // Debug logging for permission checks
  if (!hasAccess) {
    console.warn("[PermissionProtectedRoute] Access denied", {
      path: location.pathname,
      requiredPermissions,
      currentBranchPermissions: currentBranchPermissions.slice(0, 10),
      requireAll,
    });
  }

  if (hasAccess) {
    return <>{children}</>;
  }

  // Access denied
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
      <ShieldX className="h-16 w-16 text-muted-foreground mb-6" />
      <h2 className="text-2xl font-bold text-foreground mb-2">Access Denied</h2>
      <p className="text-muted-foreground max-w-md">
        You don't have permission to access this page
        {currentBranch ? ` in ${currentBranch.name}` : ""}. 
        Please contact your administrator if you believe this is an error.
      </p>
      <p className="text-xs text-muted-foreground mt-4">
        Required: {requiredPermissions.join(" or ")}
      </p>
    </div>
  );
}
