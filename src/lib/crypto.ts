/**
 * Web Crypto API utilities for AES-GCM encryption
 * Used for encrypting sensitive offline data (sessions, permissions, business info)
 */

const ALGORITHM = 'AES-GCM';
const KEY_LENGTH = 256;
const IV_LENGTH = 12; // 96 bits recommended for GCM

// Derive a stable encryption key from a seed (user ID or device fingerprint)
async function deriveKey(seed: string): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(seed),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );

  // Use a fixed salt for deterministic key derivation
  // In production, consider using a user-specific salt stored securely
  const salt = encoder.encode('bvbooks-offline-v1');

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt,
      iterations: 100000,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: ALGORITHM, length: KEY_LENGTH },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Encrypt data using AES-GCM
 * @param data - Data to encrypt (will be JSON stringified)
 * @param seed - Seed for key derivation (e.g., user ID)
 * @returns Base64 encoded encrypted data with IV prefix
 */
export async function encryptData(data: unknown, seed: string): Promise<string> {
  try {
    const key = await deriveKey(seed);
    const encoder = new TextEncoder();
    const plaintext = encoder.encode(JSON.stringify(data));

    // Generate random IV for each encryption
    const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));

    const ciphertext = await crypto.subtle.encrypt(
      { name: ALGORITHM, iv },
      key,
      plaintext
    );

    // Combine IV + ciphertext for storage
    const combined = new Uint8Array(iv.length + ciphertext.byteLength);
    combined.set(iv);
    combined.set(new Uint8Array(ciphertext), iv.length);

    // Convert to base64 for storage
    return btoa(String.fromCharCode(...combined));
  } catch (error) {
    console.error('[Crypto] Encryption failed:', error);
    throw new Error('Encryption failed');
  }
}

/**
 * Decrypt data using AES-GCM
 * @param encryptedData - Base64 encoded encrypted data with IV prefix
 * @param seed - Seed for key derivation (must match encryption seed)
 * @returns Decrypted and parsed data
 */
export async function decryptData<T>(encryptedData: string, seed: string): Promise<T | null> {
  try {
    const key = await deriveKey(seed);

    // Decode from base64
    const combined = Uint8Array.from(atob(encryptedData), c => c.charCodeAt(0));

    // Extract IV and ciphertext
    const iv = combined.slice(0, IV_LENGTH);
    const ciphertext = combined.slice(IV_LENGTH);

    const plaintext = await crypto.subtle.decrypt(
      { name: ALGORITHM, iv },
      key,
      ciphertext
    );

    const decoder = new TextDecoder();
    return JSON.parse(decoder.decode(plaintext));
  } catch (error) {
    console.error('[Crypto] Decryption failed:', error);
    return null;
  }
}

/**
 * Generate a secure random string for use as encryption seed
 */
export function generateSecureSeed(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Hash data using SHA-256 (for non-reversible storage like session tokens)
 */
export async function hashData(data: string): Promise<string> {
  const encoder = new TextEncoder();
  const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(data));
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Check if Web Crypto API is available
 */
export function isCryptoAvailable(): boolean {
  return typeof crypto !== 'undefined' && 
         typeof crypto.subtle !== 'undefined' &&
         typeof crypto.subtle.encrypt === 'function';
}

// Storage key for the encryption seed
const SEED_STORAGE_KEY = 'bvbooks_encryption_seed';

/**
 * Get or create the device encryption seed
 * This seed is unique per device/browser and persists across sessions
 */
export function getDeviceSeed(): string {
  let seed = localStorage.getItem(SEED_STORAGE_KEY);
  if (!seed) {
    seed = generateSecureSeed();
    localStorage.setItem(SEED_STORAGE_KEY, seed);
  }
  return seed;
}

/**
 * Get encryption seed for a specific user (combines device seed with user ID)
 */
export function getUserSeed(userId: string): string {
  const deviceSeed = getDeviceSeed();
  // Combine device seed with user ID for user-specific encryption
  return `${deviceSeed}:${userId}`;
}

// =========================
// HMAC SIGNING FOR TRANSACTIONS
// =========================

/**
 * Generate HMAC-SHA256 signature for transaction integrity
 * Used to detect tampering of offline transactions
 */
export async function signTransaction(
  payload: unknown,
  deviceId: string,
  businessId: string,
  timestamp: string
): Promise<string> {
  if (!isCryptoAvailable()) {
    console.warn('[Crypto] HMAC not available, using fallback');
    // Fallback: simple hash-based signature
    const data = JSON.stringify({ payload, deviceId, businessId, timestamp });
    return btoa(data).slice(0, 64);
  }

  try {
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(getUserSeed(deviceId)),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );

    // Create canonical representation for signing
    const canonicalData = JSON.stringify({
      p: payload,
      d: deviceId,
      b: businessId,
      t: timestamp,
    });

    const signature = await crypto.subtle.sign(
      'HMAC',
      key,
      encoder.encode(canonicalData)
    );

    return Array.from(new Uint8Array(signature), b => 
      b.toString(16).padStart(2, '0')
    ).join('');
  } catch (error) {
    console.error('[Crypto] HMAC signing failed:', error);
    throw new Error('Transaction signing failed');
  }
}

/**
 * Verify HMAC-SHA256 signature for transaction integrity
 */
export async function verifyTransactionSignature(
  payload: unknown,
  deviceId: string,
  businessId: string,
  timestamp: string,
  signature: string
): Promise<boolean> {
  if (!isCryptoAvailable()) {
    // Fallback verification
    const data = JSON.stringify({ payload, deviceId, businessId, timestamp });
    return btoa(data).slice(0, 64) === signature;
  }

  try {
    const expectedSignature = await signTransaction(payload, deviceId, businessId, timestamp);
    return expectedSignature === signature;
  } catch (error) {
    console.error('[Crypto] HMAC verification failed:', error);
    return false;
  }
}

// =========================
// SESSION SECURITY HELPERS
// =========================

/**
 * Generate a session validation hash for detecting password changes
 */
export async function generateSessionValidator(userId: string, passwordHash: string): Promise<string> {
  return hashData(`${userId}:${passwordHash}:${getDeviceSeed()}`);
}

/**
 * Security event types that should invalidate sessions
 */
export type SessionInvalidationReason = 
  | 'password_change'
  | 'device_revoke'
  | 'plan_expiry'
  | 'manual_logout'
  | 'session_expired';

/**
 * Log encryption/decryption failures for monitoring
 */
export function logSecurityEvent(
  eventType: 'encryption_failure' | 'decryption_failure' | 'signature_failure' | 'session_invalidation',
  details: Record<string, unknown>
): void {
  const event = {
    type: eventType,
    timestamp: new Date().toISOString(),
    deviceId: getDeviceSeed().slice(0, 8), // Only log partial ID
    ...details,
  };
  
  // Log to console in development
  console.warn('[Security Event]', event);
  
  // Store for potential sync to server
  try {
    const events = JSON.parse(localStorage.getItem('security_events') || '[]');
    events.push(event);
    // Keep only last 100 events
    if (events.length > 100) events.shift();
    localStorage.setItem('security_events', JSON.stringify(events));
  } catch {
    // Fail silently - don't block operations
  }
}
