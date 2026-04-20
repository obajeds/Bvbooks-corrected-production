import { ReactNode } from "react";
import { useCurrentUserPermissions } from "@/hooks/usePermissions";
import { useBranchContext } from "@/contexts/BranchContext";
import type { PermissionKey } from "@/lib/permissions";
import { Loader2, ShieldX } from "lucide-react";

interface PermissionGateProps {
  /** Required permission(s) to render children */
  permissions: PermissionKey | PermissionKey[];
  /** If true, requires ALL permissions. Default: any permission matches */
  requireAll?: boolean;
  /** Content to render when user has permission */
  children: ReactNode;
  /** Optional fallback when permission denied */
  fallback?: ReactNode;
  /** If true, shows loading state while checking permissions */
  showLoading?: boolean;
  /** If true, renders nothing instead of fallback when denied (useful for hiding UI elements) */
  hideOnly?: boolean;
}

/**
 * PermissionGate - Controls visibility of UI elements based on user permissions
 * 
 * Usage:
 * ```tsx
 * // Single permission
 * <PermissionGate permissions="pos.access">
 *   <POSContent />
 * </PermissionGate>
 * 
 * // Any of multiple permissions
 * <PermissionGate permissions={["sales.view", "sales.view.all"]}>
 *   <SalesContent />
 * </PermissionGate>
 * 
 * // All permissions required
 * <PermissionGate permissions={["inventory.view", "inventory.item.edit"]} requireAll>
 *   <InventoryEditContent />
 * </PermissionGate>
 * 
 * // Hide element completely when no permission
 * <PermissionGate permissions="settings.manage" hideOnly>
 *   <SettingsButton />
 * </PermissionGate>
 * ```
 */
export function PermissionGate({
  permissions,
  requireAll = false,
  children,
  fallback,
  showLoading = false,
  hideOnly = false,
}: PermissionGateProps) {
  const { data, isLoading } = useCurrentUserPermissions();
  const { isOwner: branchIsOwner, isLoading: branchLoading } = useBranchContext();

  // Owner always has access, even before useCurrentUserPermissions resolves
  if (branchIsOwner) {
    return <>{children}</>;
  }

  if ((isLoading || branchLoading) && showLoading) {
    return (
      <div className="flex items-center justify-center p-4">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!data) {
    if (hideOnly) return null;
    return fallback ? <>{fallback}</> : null;
  }

  // Business owners have all permissions (secondary check)
  if (data.isOwner) {
    return <>{children}</>;
  }

  const requiredPermissions = Array.isArray(permissions) ? permissions : [permissions];
  
  let hasAccess: boolean;
  if (requireAll) {
    hasAccess = requiredPermissions.every((p) => data.permissions.includes(p));
  } else {
    hasAccess = requiredPermissions.some((p) => data.permissions.includes(p));
  }

  if (hasAccess) {
    return <>{children}</>;
  }

  if (hideOnly) {
    return null;
  }

  if (fallback) {
    return <>{fallback}</>;
  }

  return null;
}

/**
 * AccessDenied - Standard access denied message component
 */
export function AccessDenied({ message = "You don't have permission to access this feature." }) {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center">
      <ShieldX className="h-12 w-12 text-muted-foreground mb-4" />
      <h3 className="text-lg font-medium">Access Denied</h3>
      <p className="text-sm text-muted-foreground mt-1">{message}</p>
    </div>
  );
}

/**
 * RequirePermission - HOC wrapper for permission-protected components
 */
export function withPermission<P extends object>(
  Component: React.ComponentType<P>,
  permissions: PermissionKey | PermissionKey[],
  options?: { requireAll?: boolean }
) {
  return function PermissionWrappedComponent(props: P) {
    return (
      <PermissionGate
        permissions={permissions}
        requireAll={options?.requireAll}
        fallback={<AccessDenied />}
      >
        <Component {...props} />
      </PermissionGate>
    );
  };
}
