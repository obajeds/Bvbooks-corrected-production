import { useMemo } from "react";
import { useDynamicSidebar, type ProcessedMenuSection } from "./useDynamicSidebar";
import { Activity } from "lucide-react";
import {
  getDeviceAwareMenu,
  getMenuMetadata,
  sortByPriority,
  toMobilePath,
} from "@/lib/adaptiveNavigation";

/**
 * Mobile navigation categories - aligned with desktop sidebar structure
 * Each category maps to one or more desktop sidebar sections
 */
export interface MobileNavCategory {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  items: MobileNavItem[];
  badge?: number;
  /** Priority for ordering */
  priority: 'critical' | 'high' | 'medium' | 'low';
}

export interface MobileNavItem {
  id: string;
  label: string;
  path: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: number;
}

/**
 * Mobile bottom nav items - quick access to most used features
 * These are filtered based on feature access and priority
 */
export interface MobileBottomNavItem {
  id: string;
  label: string;
  path: string;
  icon: React.ComponentType<{ className?: string }>;
}

/**
 * Transform a processed menu section to mobile nav category
 */
function toMobileCategory(section: ProcessedMenuSection): MobileNavCategory {
  const metadata = getMenuMetadata(section.id);
  
  // Control Center maps to mobile home
  if (section.id === 'control-center') {
    return {
      id: section.id,
      label: section.label,
      icon: section.icon,
      badge: section.badge,
      priority: metadata.priority,
      items: [{
        id: section.id,
        label: section.label,
        path: '/mobile',
        icon: section.icon,
        badge: section.badge,
      }],
    };
  }

  // For direct link sections, create a category with single item
  if (section.isDirectLink && section.path) {
    return {
      id: section.id,
      label: section.label,
      icon: section.icon,
      badge: section.badge,
      priority: metadata.priority,
      items: [{
        id: section.id,
        label: section.label,
        path: toMobilePath(section.path),
        icon: section.icon,
        badge: section.badge,
      }],
    };
  }

  // For sections with items, map them to mobile paths
  return {
    id: section.id,
    label: section.label,
    icon: section.icon,
    badge: section.badge,
    priority: metadata.priority,
    items: section.items.map(item => ({
      id: item.id,
      label: item.label,
      path: toMobilePath(item.path),
      icon: item.icon,
      badge: item.badge,
    })),
  };
}

/**
 * Transform a processed menu section to bottom nav item
 */
function toBottomNavItem(section: ProcessedMenuSection): MobileBottomNavItem {
  // Control Center maps to /mobile
  if (section.id === 'control-center') {
    return {
      id: section.id,
      label: section.label.split(' ')[0], // "Control" for brevity
      path: '/mobile',
      icon: section.icon,
    };
  }

  if (section.isDirectLink && section.path) {
    return {
      id: section.id,
      label: section.label.split(' ')[0], // Shorten for bottom nav
      path: toMobilePath(section.path),
      icon: section.icon,
    };
  }

  // For sections with items, link to first item
  return {
    id: section.id,
    label: section.label.split(' ')[0],
    path: section.items.length > 0 ? toMobilePath(section.items[0].path) : '/mobile',
    icon: section.icon,
  };
}

/**
 * Hook that provides mobile navigation based on the same
 * feature toggle, plan, and permission system as desktop.
 * 
 * Uses the adaptive navigation system for priority-based filtering.
 * This ensures mobile and desktop navigation are always in sync
 * with ONE source of truth (SIDEBAR_MENU_CONFIG).
 */
export function useMobileNavigation() {
  const { menu, isLoading, isPlatformEnabled, isPlanEnabled, hasRequiredPermission } = useDynamicSidebar();

  // Get device-aware menu structure
  const adaptiveMenu = useMemo(() => {
    if (isLoading || !menu.length) {
      return {
        primaryNav: [] as ProcessedMenuSection[],
        secondaryNav: [] as ProcessedMenuSection[],
        hiddenNav: [] as ProcessedMenuSection[],
        bottomNav: [] as ProcessedMenuSection[],
        quickActions: [] as ProcessedMenuSection[],
      };
    }
    return getDeviceAwareMenu(menu, true);
  }, [menu, isLoading]);

  // Primary categories (critical + high priority)
  const primaryCategories = useMemo((): MobileNavCategory[] => {
    return adaptiveMenu.primaryNav.map(toMobileCategory);
  }, [adaptiveMenu.primaryNav]);

  // Secondary categories (medium priority - for "More" menu)
  const secondaryCategories = useMemo((): MobileNavCategory[] => {
    return adaptiveMenu.secondaryNav.map(toMobileCategory);
  }, [adaptiveMenu.secondaryNav]);

  // Hidden categories (low priority - expandable)
  const hiddenCategories = useMemo((): MobileNavCategory[] => {
    return adaptiveMenu.hiddenNav.map(toMobileCategory);
  }, [adaptiveMenu.hiddenNav]);

  // All categories combined for full sidebar (preserves order)
  const categories = useMemo((): MobileNavCategory[] => {
    if (isLoading || !menu.length) return [];
    return sortByPriority(menu).map(toMobileCategory);
  }, [menu, isLoading]);

  // Bottom nav items (max 5, priority-ordered)
  const bottomNavItems = useMemo((): MobileBottomNavItem[] => {
    if (isLoading) return [];
    
    const items = adaptiveMenu.bottomNav.map(toBottomNavItem);
    
    // Fallback if control-center not found
    if (items.length === 0 || !items.find(i => i.id === 'control-center')) {
      return [{
        id: 'control-center',
        label: 'Control',
        path: '/mobile',
        icon: Activity,
      }, ...items.slice(0, 4)];
    }
    
    return items;
  }, [adaptiveMenu.bottomNav, isLoading]);

  // Quick actions for mobile dashboard - from quickAction metadata
  const quickActions = useMemo(() => {
    if (isLoading) return [];

    const actions: { id: string; label: string; path: string; icon: React.ComponentType<{ className?: string }>; variant: 'default' | 'outline' }[] = [];

    for (const section of adaptiveMenu.quickActions) {
      const metadata = getMenuMetadata(section.id);
      
      // Skip non-quick-action items
      if (!metadata.quickAction) continue;

      // POS gets default variant (primary button)
      const variant = section.id === 'pos' ? 'default' : 'outline';
      
      if (section.isDirectLink && section.path) {
        actions.push({
          id: section.id,
          label: getQuickActionLabel(section.id, section.label),
          path: toMobilePath(section.path),
          icon: section.icon,
          variant,
        });
      } else if (section.items.length > 0) {
        // For sections, find the best item or use first
        const targetItem = getBestQuickActionItem(section);
        actions.push({
          id: section.id,
          label: getQuickActionLabel(section.id, section.label),
          path: toMobilePath(targetItem.path),
          icon: section.icon,
          variant,
        });
      }
    }

    return actions;
  }, [adaptiveMenu.quickActions, isLoading]);

  return {
    // All categories (for full sidebar)
    categories,
    // Prioritized categories
    primaryCategories,
    secondaryCategories,
    hiddenCategories,
    // Bottom navigation
    bottomNavItems,
    // Quick actions for dashboard
    quickActions,
    // Loading state
    isLoading,
    // Expose for route checking
    isPlatformEnabled,
    isPlanEnabled,
    hasRequiredPermission,
  };
}

/**
 * Get user-friendly quick action label
 */
function getQuickActionLabel(sectionId: string, fallback: string): string {
  const labels: Record<string, string> = {
    'pos': 'POS',
    'stock-control': 'Check Stock',
    'customers': 'Customers',
    'approvals-alerts': 'Approvals',
    'operations': 'Expenses',
  };
  return labels[sectionId] || fallback.split(' ')[0];
}

/**
 * Get the best item from a section for quick action
 */
function getBestQuickActionItem(section: ProcessedMenuSection): { path: string } {
  // Prefer specific items for each section
  const preferredItems: Record<string, string> = {
    'stock-control': 'stock-levels',
    'customers': 'customers-overview',
    'operations': 'expenses',
  };
  
  const preferredId = preferredItems[section.id];
  if (preferredId) {
    const item = section.items.find(i => i.id === preferredId);
    if (item) return item;
  }
  
  // Fallback to first item
  return section.items[0] || { path: '/mobile' };
}
