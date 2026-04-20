import { useMemo } from "react";
import { usePlatformFeatures } from "./usePlatformFeatures";
import { usePlanFeatures, useBusinessOverrides, useBusinessPlan } from "./useFeatureGating";
import { useBranchContext } from "@/contexts/BranchContext";
import { useGasModuleEnabled } from "./useGasModuleEnabled";
import { usePendingApprovalCount } from "./useApprovalRequests";
import { isPlatformFeatureEnabled } from "@/lib/featureKeyMapping";
import { 
  SIDEBAR_MENU_CONFIG, 
  GAS_OPERATIONS_ITEMS, 
  type MenuSectionConfig, 
  type MenuItemConfig 
} from "@/lib/sidebarMenuConfig";
import type { PermissionKey } from "@/lib/permissions";

export interface ProcessedMenuItem {
  id: string;
  path: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: number;
  isVisible: boolean;
}

export interface ProcessedMenuSection {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  isDirectLink: boolean;
  path?: string;
  items: ProcessedMenuItem[];
  badge?: number;
  isVisible: boolean;
  dividerBefore?: boolean;
}

interface BadgeValues {
  pendingApprovals: number;
  [key: string]: number;
}

/**
 * Hook that processes the sidebar menu configuration and returns
 * only the menu items that should be visible based on:
 * 1. Platform toggles (Super Admin) - Uses centralized key mapping
 * 2. Plan features (subscription)
 * 3. User permissions (role-based)
 * 4. Business flags (e.g., gas module)
 */
export function useDynamicSidebar() {
  // Data sources
  const { data: platformFeatures = [], isLoading: platformLoading } = usePlatformFeatures();
  const { data: planFeatures = [], isLoading: planLoading } = usePlanFeatures();
  const { data: overrides = [], isLoading: overridesLoading } = useBusinessOverrides();
  const { data: planInfo, isLoading: planInfoLoading } = useBusinessPlan();
  const { isOwner, hasPermission, isLoading: permissionsLoading } = useBranchContext();
  const { data: gasModuleEnabled = false, isLoading: gasLoading } = useGasModuleEnabled();
  const { data: pendingApprovalCount = 0 } = usePendingApprovalCount();

  const isLoading = platformLoading || planLoading || overridesLoading || planInfoLoading || permissionsLoading || gasLoading;

  // Badge values
  const badgeValues: BadgeValues = useMemo(() => ({
    pendingApprovals: pendingApprovalCount,
  }), [pendingApprovalCount]);

  /**
   * Check if a platform feature is enabled using centralized key mapping
   * Handles both new granular keys (sales.pos) and legacy keys (sales_reports)
   */
  const isPlatformEnabled = (key?: string): boolean => {
    if (!key) return true;
    return isPlatformFeatureEnabled(key, platformFeatures);
  };

  // Check if a plan feature is enabled (including overrides)
  const isPlanEnabled = (key?: string): boolean => {
    if (!key) return true;
    
    // Check override first
    const override = overrides.find(o => o.feature_key === key);
    if (override) return override.is_enabled;
    
    // Check plan feature
    const feature = planFeatures.find(f => f.feature_key === key);
    return feature?.is_enabled ?? true;
  };

  // Check if user has any of the required permissions
  const hasRequiredPermission = (permissions?: PermissionKey[], requireAll?: boolean): boolean => {
    if (!permissions || permissions.length === 0) return true;
    if (isOwner) return true;
    
    if (requireAll) {
      return permissions.every(p => hasPermission(p));
    }
    return permissions.some(p => hasPermission(p));
  };

  // Check if item is accessible
  const isItemAccessible = (item: MenuItemConfig): boolean => {
    // Owner-only check
    if (item.ownerOnly && !isOwner) return false;
    
    // Enterprise-only check
    if (item.enterpriseOnly && planInfo?.effectivePlan !== 'enterprise') return false;
    
    // Platform feature check
    if (!isPlatformEnabled(item.platformFeatureKey)) return false;
    
    // Plan feature check
    if (!isPlanEnabled(item.planFeatureKey)) return false;
    
    // Permission check
    if (!hasRequiredPermission(item.permissions, item.requireAllPermissions)) return false;
    
    return true;
  };

  // Check if section is accessible
  const isSectionAccessible = (section: MenuSectionConfig): boolean => {
    // Platform feature check for section
    if (!isPlatformEnabled(section.platformFeatureKey)) return false;
    
    // For direct links, also check plan and permissions
    if (section.isDirectLink) {
      if (!isPlanEnabled(section.planFeatureKey)) return false;
      if (!hasRequiredPermission(section.permissions)) return false;
    }
    
    return true;
  };

  // Process menu configuration into visible items
  const processedMenu = useMemo((): ProcessedMenuSection[] => {
    if (isLoading) return [];

    const result: ProcessedMenuSection[] = [];

    for (const section of SIDEBAR_MENU_CONFIG) {
      // Skip section if not accessible at section level
      if (!isSectionAccessible(section)) continue;

      let visibleItems: ProcessedMenuItem[] = [];

      if (section.isDirectLink) {
        // Direct link section - only show badge if count > 0
        const badgeValue = section.badgeKey ? badgeValues[section.badgeKey] : undefined;
        result.push({
          id: section.id,
          label: section.label,
          icon: section.icon,
          isDirectLink: true,
          path: section.path,
          items: [],
          badge: badgeValue && badgeValue > 0 ? badgeValue : undefined,
          isVisible: true,
          dividerBefore: section.dividerBefore,
        });
        continue;
      }

      // Process child items
      if (section.items) {
        for (const item of section.items) {
          if (isItemAccessible(item)) {
            visibleItems.push({
              id: item.id,
              path: item.path,
              label: item.label,
              icon: item.icon,
              badge: item.badgeKey ? badgeValues[item.badgeKey] : undefined,
              isVisible: true,
            });
          }
        }
      }

      // Special handling for Operations section - add gas items if enabled
      if (section.id === 'operations' && gasModuleEnabled) {
        for (const gasItem of GAS_OPERATIONS_ITEMS) {
          if (isItemAccessible(gasItem)) {
            visibleItems.push({
              id: gasItem.id,
              path: gasItem.path,
              label: gasItem.label,
              icon: gasItem.icon,
              isVisible: true,
            });
          }
        }
      }

      // Only add section if it has visible items
      if (visibleItems.length > 0) {
        // Only show badge if count > 0
        const badgeValue = section.badgeKey ? badgeValues[section.badgeKey] : undefined;
        result.push({
          id: section.id,
          label: section.label,
          icon: section.icon,
          isDirectLink: false,
          items: visibleItems,
          badge: badgeValue && badgeValue > 0 ? badgeValue : undefined,
          isVisible: true,
          dividerBefore: section.dividerBefore,
        });
      }
    }

    return result;
  }, [
    isLoading,
    platformFeatures,
    planFeatures,
    overrides,
    planInfo,
    isOwner,
    hasPermission,
    gasModuleEnabled,
    badgeValues,
  ]);

  return {
    menu: processedMenu,
    isLoading,
    // Expose utility functions for external use
    isPlatformEnabled,
    isPlanEnabled,
    hasRequiredPermission,
  };
}

/**
 * Hook to check if a specific route is accessible
 */
export function useRouteAccessible(pathname: string): {
  isAccessible: boolean;
  isLoading: boolean;
  blockReason: 'platform_disabled' | 'plan_restricted' | 'permission_denied' | null;
} {
  const { isPlatformEnabled, isPlanEnabled, hasRequiredPermission, isLoading } = useDynamicSidebar();
  
  const result = useMemo(() => {
    if (isLoading) {
      return { isAccessible: false, isLoading: true, blockReason: null };
    }

    // Dashboard is always accessible
    if (pathname === '/dashboard' || pathname === '/dashboard/') {
      return { isAccessible: true, isLoading: false, blockReason: null };
    }

    // Find the matching route config
    const { getRouteFeatureRequirements } = require('@/lib/sidebarMenuConfig');
    const requirements = getRouteFeatureRequirements(pathname);

    if (!requirements) {
      // No specific requirements, accessible
      return { isAccessible: true, isLoading: false, blockReason: null };
    }

    // Check platform toggle
    if (requirements.platformKey && !isPlatformEnabled(requirements.platformKey)) {
      return { 
        isAccessible: false, 
        isLoading: false, 
        blockReason: 'platform_disabled' as const 
      };
    }

    // Check plan feature
    if (requirements.planKey && !isPlanEnabled(requirements.planKey)) {
      return { 
        isAccessible: false, 
        isLoading: false, 
        blockReason: 'plan_restricted' as const 
      };
    }

    // Check permissions
    if (requirements.permissions && !hasRequiredPermission(requirements.permissions)) {
      return { 
        isAccessible: false, 
        isLoading: false, 
        blockReason: 'permission_denied' as const 
      };
    }

    return { isAccessible: true, isLoading: false, blockReason: null };
  }, [pathname, isLoading, isPlatformEnabled, isPlanEnabled, hasRequiredPermission]);

  return result;
}
