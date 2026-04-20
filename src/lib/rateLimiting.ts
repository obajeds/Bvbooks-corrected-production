/**
 * Client-side rate limiting utilities for protecting edge function calls
 * 
 * This provides defense-in-depth rate limiting on the client side.
 * Server-side rate limiting should also be implemented in edge functions.
 */

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

interface RateLimitConfig {
  maxRequests: number;
  windowMs: number; // Time window in milliseconds
}

// Default rate limit configurations for different endpoints
export const RATE_LIMIT_CONFIGS: Record<string, RateLimitConfig> = {
  'support-ai-chat': { maxRequests: 20, windowMs: 60_000 },     // 20 req/min
  'paystack': { maxRequests: 5, windowMs: 60_000 },             // 5 req/min
  'send-staff-invite': { maxRequests: 10, windowMs: 60_000 },   // 10 req/min
  'send-whatsapp': { maxRequests: 5, windowMs: 60_000 },        // 5 req/min
  'ai-sales-insights': { maxRequests: 10, windowMs: 60_000 },   // 10 req/min
  'sync-sales': { maxRequests: 30, windowMs: 60_000 },          // 30 req/min
  'stock-movement': { maxRequests: 5, windowMs: 30_000 },       // 5 req/30s
  'default': { maxRequests: 60, windowMs: 60_000 },             // 60 req/min default
};

// Store for tracking rate limits (in-memory, resets on page refresh)
const rateLimitStore = new Map<string, RateLimitEntry>();

/**
 * Check if a request should be rate limited
 * @param endpoint - The endpoint/function name
 * @param identifier - Optional unique identifier (e.g., user ID, IP)
 * @returns Object with allowed status and retry info
 */
export function checkRateLimit(
  endpoint: string,
  identifier?: string
): { allowed: boolean; retryAfterMs: number; remaining: number } {
  const config = RATE_LIMIT_CONFIGS[endpoint] || RATE_LIMIT_CONFIGS['default'];
  const key = `${endpoint}:${identifier || 'anonymous'}`;
  const now = Date.now();

  let entry = rateLimitStore.get(key);

  // Reset if window has passed
  if (!entry || entry.resetAt <= now) {
    entry = { count: 0, resetAt: now + config.windowMs };
    rateLimitStore.set(key, entry);
  }

  // Check if limit exceeded
  if (entry.count >= config.maxRequests) {
    return {
      allowed: false,
      retryAfterMs: entry.resetAt - now,
      remaining: 0,
    };
  }

  // Increment count
  entry.count++;

  return {
    allowed: true,
    retryAfterMs: 0,
    remaining: config.maxRequests - entry.count,
  };
}

/**
 * Higher-order function to wrap API calls with rate limiting
 * @param endpoint - The endpoint/function name
 * @param identifier - Optional unique identifier
 * @param fn - The async function to wrap
 */
export async function withRateLimit<T>(
  endpoint: string,
  identifier: string | undefined,
  fn: () => Promise<T>
): Promise<T> {
  const { allowed, retryAfterMs } = checkRateLimit(endpoint, identifier);

  if (!allowed) {
    const seconds = Math.ceil(retryAfterMs / 1000);
    throw new Error(
      `Rate limit exceeded. Please try again in ${seconds} seconds.`
    );
  }

  return fn();
}

/**
 * Clean up expired rate limit entries (call periodically to prevent memory leaks)
 */
export function cleanupRateLimits(): void {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore.entries()) {
    if (entry.resetAt <= now) {
      rateLimitStore.delete(key);
    }
  }
}

// Auto-cleanup every 5 minutes
if (typeof window !== 'undefined') {
  setInterval(cleanupRateLimits, 5 * 60 * 1000);
}

/**
 * Format rate limit error message for user display
 */
export function formatRateLimitError(retryAfterMs: number): string {
  if (retryAfterMs < 1000) {
    return 'Too many requests. Please wait a moment.';
  }
  
  const seconds = Math.ceil(retryAfterMs / 1000);
  if (seconds < 60) {
    return `Too many requests. Please try again in ${seconds} second${seconds > 1 ? 's' : ''}.`;
  }
  
  const minutes = Math.ceil(seconds / 60);
  return `Too many requests. Please try again in ${minutes} minute${minutes > 1 ? 's' : ''}.`;
}
