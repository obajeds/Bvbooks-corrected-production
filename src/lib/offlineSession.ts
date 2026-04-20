/**
 * Offline Session Management
 * Handles AES-GCM encrypted session caching for offline authentication
 */

import { User, Session } from '@supabase/supabase-js';
import { setCache, getCache, deleteCache } from './offlineStorage';
import { 
  encryptData, 
  decryptData, 
  getUserSeed, 
  isCryptoAvailable, 
  hashData,
  logSecurityEvent,
  type SessionInvalidationReason 
} from './crypto';

// Session cache keys
const SESSION_CACHE_KEY = 'offline_session_encrypted';
const USER_CACHE_KEY = 'offline_user_encrypted';
const PERMISSIONS_CACHE_KEY = 'offline_permissions_encrypted';
const BUSINESS_CACHE_KEY = 'offline_business_encrypted';
const SUBSCRIPTION_CACHE_KEY = 'offline_subscription_encrypted';
const FEATURES_CACHE_KEY = 'offline_features_encrypted';
const SESSION_VALIDATOR_KEY = 'offline_session_validator';

// Configurable offline access window (default 7 days)
const OFFLINE_ACCESS_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;
const SESSION_CACHE_EXPIRY = OFFLINE_ACCESS_WINDOW_MS;

// Extended expiry for essential data when offline
const EXTENDED_CACHE_EXPIRY = 14 * 24 * 60 * 60 * 1000;

// Current user ID for encryption key derivation
let currentUserId: string | null = null;

export function setCurrentUserId(userId: string | null): void {
  currentUserId = userId;
}

export interface OfflineSessionData {
  user: User;
  session_expires_at: string;
  cached_at: string;
  business_id?: string;
  user_role?: string;
  is_owner?: boolean;
  permissions?: string[];
}

export interface OfflineBusinessData {
  id: string;
  trading_name: string;
  owner_user_id: string;
  currency: string;
  current_plan?: string;
  subscription_expiry?: string;
  feature_gas_module?: boolean;
}

export interface OfflineSubscriptionData {
  tier: string;
  status: string;
  plan_expires_at: string | null;
  is_active: boolean;
  cached_at: string;
}

export interface OfflineFeatureData {
  feature_key: string;
  is_enabled: boolean;
  limits?: Record<string, unknown>;
}

/**
 * Encrypt session data using AES-GCM
 * Falls back to base64 if Web Crypto is unavailable
 */
async function encryptSessionData(data: unknown, userId?: string): Promise<string> {
  const seed = userId || currentUserId;
  if (!seed || !isCryptoAvailable()) {
    // Fallback to base64 encoding if crypto unavailable
    console.warn('[OfflineSession] Web Crypto unavailable, using base64 fallback');
    try {
      return btoa(encodeURIComponent(JSON.stringify(data)));
    } catch {
      return '';
    }
  }
  
  try {
    return await encryptData(data, getUserSeed(seed));
  } catch (error) {
    console.error('[OfflineSession] Encryption failed:', error);
    return '';
  }
}

/**
 * Decrypt session data using AES-GCM
 * Falls back to base64 if Web Crypto is unavailable
 */
async function decryptSessionData<T>(encrypted: string, userId?: string): Promise<T | null> {
  const seed = userId || currentUserId;
  if (!seed || !isCryptoAvailable()) {
    // Fallback to base64 decoding
    try {
      const json = decodeURIComponent(atob(encrypted));
      return JSON.parse(json);
    } catch {
      return null;
    }
  }
  
  try {
    return await decryptData<T>(encrypted, getUserSeed(seed));
  } catch (error) {
    console.error('[OfflineSession] Decryption failed:', error);
    return null;
  }
}

// =========================
// SESSION CACHING
// =========================

/**
 * Cache user session for offline access with AES-GCM encryption
 */
export async function cacheSession(user: User, session: Session, businessId?: string): Promise<void> {
  // Set current user ID for encryption
  setCurrentUserId(user.id);
  
  const sessionData: OfflineSessionData = {
    user,
    session_expires_at: new Date(session.expires_at! * 1000).toISOString(),
    cached_at: new Date().toISOString(),
    business_id: businessId,
  };

  const encrypted = await encryptSessionData(sessionData, user.id);
  if (encrypted) {
    await setCache(SESSION_CACHE_KEY, encrypted, SESSION_CACHE_EXPIRY, businessId);
    
    // Also store user separately for quick access
    const encryptedUser = await encryptSessionData(user, user.id);
    if (encryptedUser) {
      await setCache(USER_CACHE_KEY, encryptedUser, SESSION_CACHE_EXPIRY, businessId);
    }
    
    console.log('[OfflineSession] Session cached with AES-GCM encryption');
  }
}

/**
 * Get cached session for offline authentication (decrypts with AES-GCM)
 */
export async function getCachedSession(userId?: string): Promise<OfflineSessionData | null> {
  try {
    const encrypted = await getCache<string>(SESSION_CACHE_KEY);
    if (!encrypted) return null;

    const sessionData = await decryptSessionData<OfflineSessionData>(encrypted, userId);
    if (!sessionData) {
      console.warn('[OfflineSession] Failed to decrypt cached session');
      return null;
    }

    // Check if within offline access window
    const cachedAt = new Date(sessionData.cached_at);
    const now = new Date();
    const ageMs = now.getTime() - cachedAt.getTime();

    if (ageMs > OFFLINE_ACCESS_WINDOW_MS) {
      console.log('[OfflineSession] Cached session expired (offline window exceeded)');
      await clearCachedSession();
      return null;
    }

    // Set current user ID for future operations
    setCurrentUserId(sessionData.user.id);
    
    return sessionData;
  } catch (error) {
    console.error('[OfflineSession] Error getting cached session:', error);
    return null;
  }
}

/**
 * Clear cached session
 */
export async function clearCachedSession(): Promise<void> {
  await Promise.all([
    deleteCache(SESSION_CACHE_KEY),
    deleteCache(USER_CACHE_KEY),
    deleteCache(PERMISSIONS_CACHE_KEY),
    deleteCache(BUSINESS_CACHE_KEY),
    deleteCache(SUBSCRIPTION_CACHE_KEY),
    deleteCache(FEATURES_CACHE_KEY),
  ]);
  console.log('[OfflineSession] Cached session cleared');
}

// =========================
// PERMISSIONS CACHING
// =========================

/**
 * Cache user role and permissions with encryption
 */
export async function cachePermissions(
  role: string,
  isOwner: boolean,
  permissions: string[],
  businessId?: string
): Promise<void> {
  const data = {
    role,
    is_owner: isOwner,
    permissions,
    cached_at: new Date().toISOString(),
  };
  
  const encrypted = await encryptSessionData(data);
  if (encrypted) {
    await setCache(PERMISSIONS_CACHE_KEY, encrypted, SESSION_CACHE_EXPIRY, businessId);
  }
}

/**
 * Get cached permissions (decrypted)
 */
export async function getCachedPermissions(): Promise<{ role: string; is_owner: boolean; permissions: string[] } | null> {
  const encrypted = await getCache<string>(PERMISSIONS_CACHE_KEY);
  if (!encrypted) return null;
  return decryptSessionData(encrypted);
}

// =========================
// BUSINESS DATA CACHING
// =========================

/**
 * Cache business data for offline access with encryption
 */
export async function cacheBusiness(business: OfflineBusinessData): Promise<void> {
  const encrypted = await encryptSessionData(business);
  if (encrypted) {
    await setCache(BUSINESS_CACHE_KEY, encrypted, EXTENDED_CACHE_EXPIRY, business.id);
  }
}

/**
 * Get cached business data (decrypted)
 */
export async function getCachedBusiness(): Promise<OfflineBusinessData | null> {
  const encrypted = await getCache<string>(BUSINESS_CACHE_KEY);
  if (!encrypted) return null;
  return decryptSessionData(encrypted);
}

// =========================
// SUBSCRIPTION CACHING
// =========================

/**
 * Cache subscription status for offline enforcement with encryption
 */
export async function cacheSubscription(subscription: OfflineSubscriptionData, businessId?: string): Promise<void> {
  const encrypted = await encryptSessionData(subscription);
  if (encrypted) {
    await setCache(SUBSCRIPTION_CACHE_KEY, encrypted, EXTENDED_CACHE_EXPIRY, businessId);
  }
}

/**
 * Get cached subscription status (decrypted)
 */
export async function getCachedSubscription(): Promise<OfflineSubscriptionData | null> {
  const encrypted = await getCache<string>(SUBSCRIPTION_CACHE_KEY);
  if (!encrypted) return null;
  return decryptSessionData(encrypted);
}

// =========================
// FEATURES CACHING
// =========================

/**
 * Cache feature toggles for offline enforcement with encryption
 */
export async function cacheFeatures(features: OfflineFeatureData[], businessId?: string): Promise<void> {
  const encrypted = await encryptSessionData(features);
  if (encrypted) {
    await setCache(FEATURES_CACHE_KEY, encrypted, EXTENDED_CACHE_EXPIRY, businessId);
  }
}

/**
 * Get cached features (decrypted)
 */
export async function getCachedFeatures(): Promise<OfflineFeatureData[] | null> {
  const encrypted = await getCache<string>(FEATURES_CACHE_KEY);
  if (!encrypted) return null;
  return decryptSessionData(encrypted);
}

/**
 * Check if a specific feature is enabled (using cache)
 */
export async function isFeatureEnabledOffline(featureKey: string): Promise<boolean> {
  const features = await getCachedFeatures();
  if (!features) return true; // Default to enabled if no cache
  
  const feature = features.find(f => f.feature_key === featureKey);
  return feature?.is_enabled ?? true;
}

// =========================
// OFFLINE STATUS HELPERS
// =========================

/**
 * Check if we have valid cached data for offline operation
 */
export async function hasValidOfflineData(): Promise<boolean> {
  const [session, business] = await Promise.all([
    getCachedSession(),
    getCachedBusiness(),
  ]);
  
  return !!(session && business);
}

/**
 * Get offline access expiry info
 */
export async function getOfflineAccessInfo(): Promise<{
  hasAccess: boolean;
  expiresAt: Date | null;
  remainingDays: number;
}> {
  const session = await getCachedSession();
  
  if (!session) {
    return { hasAccess: false, expiresAt: null, remainingDays: 0 };
  }
  
  const cachedAt = new Date(session.cached_at);
  const expiresAt = new Date(cachedAt.getTime() + OFFLINE_ACCESS_WINDOW_MS);
  const now = new Date();
  const remainingMs = expiresAt.getTime() - now.getTime();
  const remainingDays = Math.max(0, Math.floor(remainingMs / (24 * 60 * 60 * 1000)));
  
  return {
    hasAccess: remainingMs > 0,
    expiresAt,
    remainingDays,
  };
}

// =========================
// SESSION INVALIDATION
// =========================

/**
 * Store a session validator hash for detecting password changes
 */
export async function storeSessionValidator(userId: string, passwordHash: string): Promise<void> {
  try {
    const validator = await hashData(`${userId}:${passwordHash}`);
    const encrypted = await encryptSessionData({ validator, created_at: new Date().toISOString() }, userId);
    if (encrypted) {
      await setCache(SESSION_VALIDATOR_KEY, encrypted, SESSION_CACHE_EXPIRY);
    }
  } catch (error) {
    logSecurityEvent('encryption_failure', { reason: 'validator_store_failed', error: String(error) });
  }
}

/**
 * Check if session is still valid (password hasn't changed)
 */
export async function validateSessionIntegrity(userId: string, currentPasswordHash: string): Promise<boolean> {
  try {
    const encrypted = await getCache<string>(SESSION_VALIDATOR_KEY);
    if (!encrypted) return true; // No validator stored, assume valid
    
    const data = await decryptSessionData<{ validator: string; created_at: string }>(encrypted, userId);
    if (!data) return false; // Decryption failed, invalidate
    
    const expectedValidator = await hashData(`${userId}:${currentPasswordHash}`);
    return data.validator === expectedValidator;
  } catch (error) {
    logSecurityEvent('decryption_failure', { reason: 'validator_check_failed', error: String(error) });
    return false;
  }
}

/**
 * Invalidate cached session for a specific reason
 */
export async function invalidateSession(reason: SessionInvalidationReason): Promise<void> {
  logSecurityEvent('session_invalidation', { reason });
  await clearCachedSession();
}

/**
 * Check if subscription is still valid for offline access
 */
export async function checkSubscriptionValidity(): Promise<{ valid: boolean; reason?: string }> {
  const subscription = await getCachedSubscription();
  
  if (!subscription) {
    return { valid: true }; // No subscription data, allow access
  }
  
  // Check if plan has expired
  if (subscription.plan_expires_at) {
    const expiresAt = new Date(subscription.plan_expires_at);
    if (expiresAt < new Date()) {
      return { valid: false, reason: 'plan_expired' };
    }
  }
  
  // Check subscription status
  if (!subscription.is_active) {
    return { valid: false, reason: 'subscription_inactive' };
  }
  
  return { valid: true };
}

/**
 * Full session validation check
 */
export async function performFullSessionValidation(): Promise<{
  valid: boolean;
  reason?: string;
  shouldInvalidate: boolean;
}> {
  const session = await getCachedSession();
  
  if (!session) {
    return { valid: false, reason: 'no_session', shouldInvalidate: false };
  }
  
  // Check offline window
  const accessInfo = await getOfflineAccessInfo();
  if (!accessInfo.hasAccess) {
    return { valid: false, reason: 'offline_window_expired', shouldInvalidate: true };
  }
  
  // Check subscription validity
  const subscriptionCheck = await checkSubscriptionValidity();
  if (!subscriptionCheck.valid) {
    return { 
      valid: false, 
      reason: subscriptionCheck.reason, 
      shouldInvalidate: subscriptionCheck.reason === 'plan_expired' 
    };
  }
  
  return { valid: true, shouldInvalidate: false };
}
