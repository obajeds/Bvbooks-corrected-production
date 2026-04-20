/**
 * Security utilities for the application
 * Centralized security functions for BOLA prevention, error handling, and input validation
 */

import { z } from 'zod';
import { sanitizeText } from './validation';

// ============================================
// BOLA (Broken Object Level Authorization) Prevention
// ============================================

/**
 * Validates that a business ID belongs to the current user
 * Use this before any operation that modifies business data
 */
export interface AuthorizationContext {
  userId: string;
  businessId: string;
  isOwner: boolean;
  isStaff: boolean;
  staffId?: string;
}

/**
 * Validate UUID format to prevent injection attacks
 */
export const uuidSchema = z.string().uuid('Invalid ID format');

/**
 * Validate that an ID is a valid UUID before using it in queries
 */
export function validateUUID(id: string | null | undefined): boolean {
  if (!id) return false;
  return uuidSchema.safeParse(id).success;
}

/**
 * Safely extract and validate IDs from request params
 */
export function extractValidId(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return validateUUID(trimmed) ? trimmed : null;
}

// ============================================
// Error Handling & Leakage Prevention
// ============================================

/**
 * Safe error messages for different error types
 * These prevent leaking internal implementation details
 */
export const SAFE_ERROR_MESSAGES = {
  // Auth errors
  AUTH_REQUIRED: 'Authentication required. Please sign in.',
  AUTH_INVALID: 'Your session has expired. Please sign in again.',
  AUTH_FORBIDDEN: 'You do not have permission to perform this action.',
  
  // Data errors
  NOT_FOUND: 'The requested resource was not found.',
  VALIDATION_ERROR: 'Please check your input and try again.',
  CONFLICT: 'This operation conflicts with existing data.',
  
  // Rate limiting
  RATE_LIMITED: 'Too many requests. Please try again later.',
  
  // Server errors
  SERVER_ERROR: 'Something went wrong. Please try again later.',
  MAINTENANCE: 'Service temporarily unavailable. Please try again later.',
  
  // Business logic
  INSUFFICIENT_STOCK: 'Insufficient stock for this operation.',
  PAYMENT_FAILED: 'Payment could not be processed. Please try again.',
  SUBSCRIPTION_REQUIRED: 'This feature requires an active subscription.',
} as const;

/**
 * Sanitize error messages to prevent information leakage
 * Logs the full error for debugging but returns a safe message to the user
 */
export function sanitizeError(error: unknown, context?: string): {
  userMessage: string;
  logMessage: string;
} {
  const logMessage = error instanceof Error 
    ? `${context || 'Error'}: ${error.message}` 
    : `${context || 'Error'}: ${String(error)}`;

  // Check for known error patterns
  if (error instanceof Error) {
    const msg = error.message.toLowerCase();
    
    // Auth errors
    if (msg.includes('unauthorized') || msg.includes('authentication')) {
      return { userMessage: SAFE_ERROR_MESSAGES.AUTH_REQUIRED, logMessage };
    }
    if (msg.includes('forbidden') || msg.includes('permission')) {
      return { userMessage: SAFE_ERROR_MESSAGES.AUTH_FORBIDDEN, logMessage };
    }
    if (msg.includes('expired') || msg.includes('token')) {
      return { userMessage: SAFE_ERROR_MESSAGES.AUTH_INVALID, logMessage };
    }
    
    // Rate limiting
    if (msg.includes('rate limit') || msg.includes('too many')) {
      return { userMessage: SAFE_ERROR_MESSAGES.RATE_LIMITED, logMessage };
    }
    
    // Not found
    if (msg.includes('not found') || msg.includes('does not exist')) {
      return { userMessage: SAFE_ERROR_MESSAGES.NOT_FOUND, logMessage };
    }
    
    // Validation
    if (msg.includes('validation') || msg.includes('invalid')) {
      return { userMessage: SAFE_ERROR_MESSAGES.VALIDATION_ERROR, logMessage };
    }
    
    // Conflict
    if (msg.includes('duplicate') || msg.includes('already exists') || msg.includes('conflict')) {
      return { userMessage: SAFE_ERROR_MESSAGES.CONFLICT, logMessage };
    }
    
    // Business logic
    if (msg.includes('insufficient') || msg.includes('stock')) {
      return { userMessage: SAFE_ERROR_MESSAGES.INSUFFICIENT_STOCK, logMessage };
    }
    if (msg.includes('payment')) {
      return { userMessage: SAFE_ERROR_MESSAGES.PAYMENT_FAILED, logMessage };
    }
    if (msg.includes('subscription')) {
      return { userMessage: SAFE_ERROR_MESSAGES.SUBSCRIPTION_REQUIRED, logMessage };
    }
  }

  // Default to generic server error
  return { userMessage: SAFE_ERROR_MESSAGES.SERVER_ERROR, logMessage };
}

// ============================================
// Input Sanitization for Edge Functions
// ============================================

/**
 * Prepare data for sending to edge functions
 * Sanitizes string fields to prevent injection attacks
 */
export function sanitizeEdgeFunctionInput<T extends Record<string, unknown>>(
  data: T,
  stringFields: (keyof T)[]
): T {
  const result = { ...data };
  
  for (const field of stringFields) {
    if (typeof result[field] === 'string') {
      (result as Record<string, unknown>)[field as string] = sanitizeText(result[field] as string);
    }
  }
  
  return result;
}

// ============================================
// Security Headers for Fetch Requests
// ============================================

/**
 * Get security headers for API requests
 */
export function getSecureHeaders(authToken?: string): HeadersInit {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    'X-Requested-With': 'XMLHttpRequest', // CSRF protection
  };

  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`;
  }

  return headers;
}

// ============================================
// Content Security
// ============================================

/**
 * Check if a URL is from an allowed domain
 */
export function isAllowedDomain(url: string, allowedDomains: string[]): boolean {
  try {
    const parsedUrl = new URL(url);
    return allowedDomains.some(domain => 
      parsedUrl.hostname === domain || 
      parsedUrl.hostname.endsWith(`.${domain}`)
    );
  } catch {
    return false;
  }
}

/**
 * Allowed domains for external resources
 */
export const ALLOWED_EXTERNAL_DOMAINS = [
  'supabase.co',
  'supabase.in',
  'bvbooks.net',
  'lovable.app',
  'lovableproject.com',
];

/**
 * Validate that an external URL is safe to use
 */
export function validateExternalUrl(url: string): boolean {
  if (!url) return false;
  
  try {
    const parsedUrl = new URL(url);
    
    // Must be HTTPS
    if (parsedUrl.protocol !== 'https:') return false;
    
    // Must be from allowed domain
    return isAllowedDomain(url, ALLOWED_EXTERNAL_DOMAINS);
  } catch {
    return false;
  }
}

// ============================================
// Audit Trail Helper
// ============================================

/**
 * Create a standardized audit log entry
 */
export interface AuditLogEntry {
  action: string;
  entityType: string;
  entityId?: string;
  entityName?: string;
  details?: Record<string, unknown>;
}

/**
 * Sanitize audit log details to prevent sensitive data leakage
 */
export function sanitizeAuditDetails(
  details: Record<string, unknown>
): Record<string, unknown> {
  const sensitiveKeys = [
    'password', 'secret', 'token', 'key', 'credit_card', 'ssn', 
    'bank_account', 'pin', 'cvv', 'otp'
  ];
  
  const result: Record<string, unknown> = {};
  
  for (const [key, value] of Object.entries(details)) {
    const lowerKey = key.toLowerCase();
    
    if (sensitiveKeys.some(sk => lowerKey.includes(sk))) {
      result[key] = '[REDACTED]';
    } else if (typeof value === 'string' && value.length > 500) {
      result[key] = value.substring(0, 500) + '... [TRUNCATED]';
    } else {
      result[key] = value;
    }
  }
  
  return result;
}
