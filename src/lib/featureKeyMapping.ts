/**
 * Feature Key Mapping - Single Source of Truth
 * 
 * Maps sidebar menu keys (granular) to actual platform_features table keys (legacy).
 * This allows the sidebar config to use clear, hierarchical keys while the database
 * uses the existing legacy keys.
 * 
 * IMPORTANT: When Super Admin toggles a feature in platform_features, this mapping
 * ensures Client Admin responds correctly.
 */

/**
 * Maps a sidebar feature key to the actual platform_features key(s) in the database.
 * If ANY of the mapped legacy keys is disabled, the feature is considered disabled.
 * 
 * Format: { sidebarKey: [legacyDatabaseKey, ...fallbacks] }
 */
export const PLATFORM_KEY_MAP: Record<string, string[]> = {
  // ===== SALES =====
  // Primary key first - this is the authoritative toggle
  'sales.pos': ['pos_transactions'],
  'sales.transactions': ['pos_transactions'],
  'reports.sales': ['sales_reports'],
  
  // ===== STOCK CONTROL =====
  'inventory.products': ['inventory_management'],
  'inventory.stock': ['inventory_management'],
  'inventory.adjustments': ['stock_adjustments'],
  
  // ===== CUSTOMERS =====
  'customers.core': ['customer_directory'],
  'customers.rewards': ['customer_loyalty'],
  
  // ===== OPERATIONS =====
  'finance.expenses': ['expense_tracking'],
  
  // ===== APPROVALS & ALERTS =====
  'approvals.workflows': ['approvals_module'],
  
  // ===== BUSINESS INSIGHTS =====
  // Primary key is sales_reports (enabled), fallbacks are secondary
  'reports.analytics': ['sales_reports'],
  'finance.reports': ['profit_loss_reports'],
  
  // ===== PEOPLE & ACCESS =====
  // Primary key is staff_management (enabled in DB)
  'staff.management': ['staff_management'],
  'staff.attendance': ['shift_management'],
  'staff.payroll': ['commissions'],
  
  // ===== SETTINGS =====
  'settings.business': ['business_profile'],
  'activity.logs': ['activity_logs'],
  
  // ===== HELP & SUPPORT =====
  'help.center': ['help_center'],
  
  // ===== GAS MODULE (controlled by business type, not toggles) =====
  'gas_module': ['gas_module'],
};

/**
 * Checks if a feature is enabled based on platform_features data.
 * Handles both new keys (like 'sales.pos') and legacy keys (like 'sales_reports').
 * 
 * @param featureKey - The key to check (can be new or legacy format)
 * @param platformFeatures - Array of platform features from the database
 * @returns true if the feature is enabled, false otherwise
 */
export function isPlatformFeatureEnabled(
  featureKey: string,
  platformFeatures: Array<{ feature_key: string; is_enabled: boolean }>
): boolean {
  if (!featureKey) return true;
  
  // Direct lookup first (for legacy keys that exist in DB)
  const directFeature = platformFeatures.find(p => p.feature_key === featureKey);
  if (directFeature) {
    return directFeature.is_enabled;
  }
  
  // Map new key to legacy keys
  const legacyKeys = PLATFORM_KEY_MAP[featureKey];
  if (legacyKeys && legacyKeys.length > 0) {
    // Find all matching features in the database
    const matchingFeatures = legacyKeys
      .map(legacyKey => platformFeatures.find(p => p.feature_key === legacyKey))
      .filter((f): f is { feature_key: string; is_enabled: boolean } => f !== undefined);
    
    // If we found at least one matching key in the database
    if (matchingFeatures.length > 0) {
      // Feature is enabled if the PRIMARY key (first in array) is enabled
      // This allows for granular control: the first key is the authoritative toggle
      const primaryKey = legacyKeys[0];
      const primaryFeature = platformFeatures.find(p => p.feature_key === primaryKey);
      if (primaryFeature) {
        return primaryFeature.is_enabled;
      }
      // Fallback: if primary not found, check if ANY key is enabled
      return matchingFeatures.some(f => f.is_enabled);
    }
    
    // No matching keys found in DB - default to enabled (backward compat)
    return true;
  }
  
  // Not found in platform_features and no mapping - default to enabled
  return true;
}

/**
 * Get all related platform keys for a sidebar key
 * Useful for debugging and ensuring all related toggles are checked
 */
export function getRelatedPlatformKeys(sidebarKey: string): string[] {
  return PLATFORM_KEY_MAP[sidebarKey] || [sidebarKey];
}

/**
 * Check if a specific legacy key is disabled
 */
export function isLegacyKeyDisabled(
  legacyKey: string,
  platformFeatures: Array<{ feature_key: string; is_enabled: boolean }>
): boolean {
  const feature = platformFeatures.find(p => p.feature_key === legacyKey);
  return feature ? !feature.is_enabled : false;
}
