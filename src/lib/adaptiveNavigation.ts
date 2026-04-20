/**
 * Adaptive Navigation Layer for BVBooks
 * 
 * This module provides device-aware menu filtering based on metadata,
 * without hardcoding menus or duplicating logic.
 * 
 * Principles:
 * 1. One master menu definition (SIDEBAR_MENU_CONFIG)
 * 2. Device type only affects presentation and priority, not availability
 * 3. Business logic, permissions, plans, and feature toggles remain unchanged
 */

import type { ProcessedMenuSection, ProcessedMenuItem } from "@/hooks/useDynamicSidebar";

/**
 * Menu priority levels
 * - critical: Revenue-generating actions (POS, Sales)
 * - high: Daily operations (Stock, Customers)
 * - medium: Monitoring & reports (Insights, Activity)
 * - low: Configuration & admin (Settings, Help)
 */
export type MenuPriority = 'critical' | 'high' | 'medium' | 'low';

/**
 * Menu visibility metadata - declarative, not hardcoded
 */
export interface MenuMetadata {
  /** Priority determines mobile ordering and visibility */
  priority: MenuPriority;
  /** Whether this menu should appear on mobile */
  mobileEligible: boolean;
  /** Whether this menu is desktop-only */
  desktopOnly: boolean;
  /** Whether this is a quick action on mobile dashboard */
  quickAction: boolean;
  /** Category for dynamic priority assignment */
  category: 'revenue' | 'operations' | 'monitoring' | 'admin' | 'core';
}

/**
 * Default metadata by menu ID
 * This assigns priority dynamically based on category
 */
export const MENU_METADATA: Record<string, MenuMetadata> = {
  // Core - Always visible on all devices
  'control-center': {
    priority: 'critical',
    mobileEligible: true,
    desktopOnly: false,
    quickAction: false,
    category: 'core',
  },
  
  // Revenue-generating → critical priority
  'pos': {
    priority: 'critical',
    mobileEligible: true,
    desktopOnly: false,
    quickAction: true,
    category: 'revenue',
  },
  'sales-performance': {
    priority: 'critical',
    mobileEligible: true,
    desktopOnly: false,
    quickAction: false,
    category: 'revenue',
  },
  
  // Daily operations → high priority
  'stock-control': {
    priority: 'high',
    mobileEligible: true,
    desktopOnly: false,
    quickAction: true,
    category: 'operations',
  },
  'customers': {
    priority: 'high',
    mobileEligible: true,
    desktopOnly: false,
    quickAction: true,
    category: 'operations',
  },
  'operations': {
    priority: 'high',
    mobileEligible: true,
    desktopOnly: false,
    quickAction: false,
    category: 'operations',
  },
  'approvals-alerts': {
    priority: 'high',
    mobileEligible: true,
    desktopOnly: false,
    quickAction: true,
    category: 'operations',
  },
  
  // Monitoring & reports → medium priority
  'business-insights': {
    priority: 'medium',
    mobileEligible: true,
    desktopOnly: false,
    quickAction: false,
    category: 'monitoring',
  },
  'people-access': {
    priority: 'medium',
    mobileEligible: true,
    desktopOnly: false,
    quickAction: false,
    category: 'monitoring',
  },
  
  // Configuration & admin → low priority
  'settings': {
    priority: 'low',
    mobileEligible: true,
    desktopOnly: false,
    quickAction: false,
    category: 'admin',
  },
};

/**
 * Get metadata for a menu section
 */
export function getMenuMetadata(menuId: string): MenuMetadata {
  return MENU_METADATA[menuId] || {
    priority: 'medium',
    mobileEligible: true,
    desktopOnly: false,
    quickAction: false,
    category: 'operations',
  };
}

/**
 * Priority ordering map
 */
const PRIORITY_ORDER: Record<MenuPriority, number> = {
  'critical': 0,
  'high': 1,
  'medium': 2,
  'low': 3,
};

/**
 * Sort menu sections by priority
 */
export function sortByPriority<T extends { id: string }>(items: T[]): T[] {
  return [...items].sort((a, b) => {
    const aMeta = getMenuMetadata(a.id);
    const bMeta = getMenuMetadata(b.id);
    return PRIORITY_ORDER[aMeta.priority] - PRIORITY_ORDER[bMeta.priority];
  });
}

/**
 * Filter menu sections for mobile view
 * Returns sections that are mobile-eligible and not desktop-only
 */
export function filterForMobile(sections: ProcessedMenuSection[]): ProcessedMenuSection[] {
  return sections.filter(section => {
    const metadata = getMenuMetadata(section.id);
    return metadata.mobileEligible && !metadata.desktopOnly;
  });
}

/**
 * Filter menu sections for desktop view
 * Returns all sections (desktop shows everything)
 */
export function filterForDesktop(sections: ProcessedMenuSection[]): ProcessedMenuSection[] {
  return sections; // Desktop shows all accessible menus
}

/**
 * Get primary mobile navigation items
 * Returns critical + high priority items
 */
export function getMobilePrimaryNav(sections: ProcessedMenuSection[]): ProcessedMenuSection[] {
  const mobileEligible = filterForMobile(sections);
  return mobileEligible.filter(section => {
    const metadata = getMenuMetadata(section.id);
    return metadata.priority === 'critical' || metadata.priority === 'high';
  });
}

/**
 * Get secondary mobile navigation items (for "More" menu)
 * Returns medium priority items
 */
export function getMobileSecondaryNav(sections: ProcessedMenuSection[]): ProcessedMenuSection[] {
  const mobileEligible = filterForMobile(sections);
  return mobileEligible.filter(section => {
    const metadata = getMenuMetadata(section.id);
    return metadata.priority === 'medium';
  });
}

/**
 * Get hidden mobile navigation items (expandable)
 * Returns low priority items
 */
export function getMobileHiddenNav(sections: ProcessedMenuSection[]): ProcessedMenuSection[] {
  const mobileEligible = filterForMobile(sections);
  return mobileEligible.filter(section => {
    const metadata = getMenuMetadata(section.id);
    return metadata.priority === 'low';
  });
}

/**
 * Get quick action items for mobile dashboard
 */
export function getQuickActionSections(sections: ProcessedMenuSection[]): ProcessedMenuSection[] {
  return sections.filter(section => {
    const metadata = getMenuMetadata(section.id);
    return metadata.quickAction;
  });
}

/**
 * Get mobile bottom navigation items (max 5)
 * Prioritizes: Control Center + critical + high priority items
 */
export function getMobileBottomNav(
  sections: ProcessedMenuSection[],
  maxItems: number = 5
): ProcessedMenuSection[] {
  const sorted = sortByPriority(filterForMobile(sections));
  
  // Always include Control Center first
  const controlCenter = sorted.find(s => s.id === 'control-center');
  const others = sorted.filter(s => s.id !== 'control-center');
  
  const result: ProcessedMenuSection[] = [];
  if (controlCenter) {
    result.push(controlCenter);
  }
  
  // Add remaining items up to max
  for (const section of others) {
    if (result.length >= maxItems) break;
    result.push(section);
  }
  
  return result;
}

/**
 * Device-aware menu filter
 * Returns the appropriate menu based on device type
 */
export function getDeviceAwareMenu(
  sections: ProcessedMenuSection[],
  isMobile: boolean
): {
  primaryNav: ProcessedMenuSection[];
  secondaryNav: ProcessedMenuSection[];
  hiddenNav: ProcessedMenuSection[];
  bottomNav: ProcessedMenuSection[];
  quickActions: ProcessedMenuSection[];
} {
  if (isMobile) {
    return {
      primaryNav: sortByPriority(getMobilePrimaryNav(sections)),
      secondaryNav: sortByPriority(getMobileSecondaryNav(sections)),
      hiddenNav: sortByPriority(getMobileHiddenNav(sections)),
      bottomNav: getMobileBottomNav(sections, 5),
      quickActions: sortByPriority(getQuickActionSections(sections)),
    };
  }
  
  // Desktop: all menus visible, no secondary/hidden split
  return {
    primaryNav: filterForDesktop(sections),
    secondaryNav: [],
    hiddenNav: [],
    bottomNav: [],
    quickActions: [],
  };
}

/**
 * Check if a menu should be visible on current device
 */
export function isMenuVisibleOnDevice(menuId: string, isMobile: boolean): boolean {
  const metadata = getMenuMetadata(menuId);
  
  if (isMobile) {
    return metadata.mobileEligible && !metadata.desktopOnly;
  }
  
  // Desktop shows everything
  return true;
}

/**
 * Convert desktop path to mobile path
 */
export function toMobilePath(desktopPath: string): string {
  return desktopPath.replace('/dashboard', '/mobile');
}

/**
 * Convert mobile path to desktop path
 */
export function toDesktopPath(mobilePath: string): string {
  return mobilePath.replace('/mobile', '/dashboard');
}
