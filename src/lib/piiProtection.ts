/**
 * PII (Personally Identifiable Information) Protection Utilities
 * 
 * These utilities help protect sensitive user data by:
 * 1. Masking data for display (hiding portions of emails, phones, etc.)
 * 2. Providing secure comparison functions
 * 3. Sanitizing data before storage
 * 
 * Note: Passwords are handled by Supabase Auth with bcrypt hashing.
 * Database encryption at rest is handled by Supabase infrastructure.
 */

/**
 * Masks an email address for display
 * Example: "john.doe@example.com" → "j***e@e***e.com"
 */
export function maskEmail(email: string | null | undefined): string {
  if (!email) return "***@***.***";
  
  const [local, domain] = email.split("@");
  if (!domain) return "***@***.***";
  
  const [domainName, ...tld] = domain.split(".");
  
  const maskPart = (str: string): string => {
    if (str.length <= 2) return str[0] + "*";
    return str[0] + "*".repeat(Math.min(3, str.length - 2)) + str[str.length - 1];
  };
  
  return `${maskPart(local)}@${maskPart(domainName)}.${tld.join(".")}`;
}

/**
 * Masks a phone number for display
 * Example: "+2348012345678" → "+234****5678"
 */
export function maskPhone(phone: string | null | undefined): string {
  if (!phone) return "****";
  
  // Remove all non-digit characters except +
  const cleaned = phone.replace(/[^\\d+]/g, "");
  
  if (cleaned.length < 4) return "****";
  
  // Keep first 4 and last 4 characters, mask the middle
  const visible = 4;
  if (cleaned.length <= visible * 2) {
    return cleaned.slice(0, 2) + "*".repeat(cleaned.length - 4) + cleaned.slice(-2);
  }
  
  return cleaned.slice(0, visible) + "*".repeat(4) + cleaned.slice(-visible);
}

/**
 * Masks an address for display
 * Example: "123 Main Street, Lagos" → "123 **** ****, Lagos"
 */
export function maskAddress(address: string | null | undefined): string {
  if (!address) return "****";
  
  const parts = address.split(",").map(p => p.trim());
  
  if (parts.length === 1) {
    // Single part address - mask middle
    const words = address.split(" ");
    if (words.length <= 2) return address;
    return words[0] + " ****" + (words.length > 2 ? " " + words[words.length - 1] : "");
  }
  
  // Multi-part address - show first and last parts, mask middle
  if (parts.length === 2) {
    return parts[0].split(" ")[0] + " ****, " + parts[1];
  }
  
  return parts[0].split(" ")[0] + " ****, " + parts[parts.length - 1];
}

/**
 * Masks a name for display (useful for privacy in logs/reports)
 * Example: "John Doe" → "J*** D**"
 */
export function maskName(name: string | null | undefined): string {
  if (!name) return "****";
  
  return name
    .split(" ")
    .map(part => {
      if (part.length <= 1) return part;
      return part[0] + "*".repeat(Math.min(3, part.length - 1));
    })
    .join(" ");
}

/**
 * Configuration for which fields should be masked in different contexts
 */
export interface PIIMaskingConfig {
  maskEmails?: boolean;
  maskPhones?: boolean;
  maskAddresses?: boolean;
  maskNames?: boolean;
}

/**
 * Default masking configuration for different contexts
 */
export const PIIMaskingProfiles = {
  // Full masking for public/shared displays
  public: {
    maskEmails: true,
    maskPhones: true,
    maskAddresses: true,
    maskNames: true,
  },
  // Partial masking for logged-in users viewing others' data
  internal: {
    maskEmails: false,
    maskPhones: true,
    maskAddresses: true,
    maskNames: false,
  },
  // No masking for owners viewing their own data
  owner: {
    maskEmails: false,
    maskPhones: false,
    maskAddresses: false,
    maskNames: false,
  },
} as const;

/**
 * Applies masking to a user/staff/customer object based on config
 */
export function applyPIIMasking<T extends Record<string, unknown>>(
  data: T,
  config: PIIMaskingConfig
): T {
  const result = { ...data } as Record<string, unknown>;
  
  if (config.maskEmails && "email" in result && typeof result.email === "string") {
    result.email = maskEmail(result.email);
  }
  
  if (config.maskPhones && "phone" in result && typeof result.phone === "string") {
    result.phone = maskPhone(result.phone);
  }
  
  if (config.maskAddresses && "address" in result && typeof result.address === "string") {
    result.address = maskAddress(result.address);
  }
  
  if (config.maskNames) {
    if ("full_name" in result && typeof result.full_name === "string") {
      result.full_name = maskName(result.full_name);
    }
    if ("name" in result && typeof result.name === "string") {
      result.name = maskName(result.name);
    }
  }
  
  return result as T;
}

/**
 * Validates that a string doesn't contain obvious PII patterns
 * Useful for validating search queries, logs, etc.
 */
export function containsPII(text: string): boolean {
  // Email pattern
  const emailPattern = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
  
  // Phone pattern (various formats)
  const phonePattern = /(\+?\d{1,4}[-.\s]?)?\(?\d{1,4}\)?[-.\s]?\d{1,4}[-.\s]?\d{1,9}/;
  
  // Credit card pattern (basic)
  const ccPattern = /\b\d{4}[-.\s]?\d{4}[-.\s]?\d{4}[-.\s]?\d{4}\b/;
  
  return emailPattern.test(text) || phonePattern.test(text) || ccPattern.test(text);
}

/**
 * Redacts PII from a string (for logging purposes)
 */
export function redactPII(text: string): string {
  return text
    // Redact emails
    .replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, "[EMAIL_REDACTED]")
    // Redact phone numbers (simple pattern)
    .replace(/(\+?\d{1,4}[-.\s]?)?\(?\d{3,4}\)?[-.\s]?\d{3,4}[-.\s]?\d{3,9}/g, "[PHONE_REDACTED]")
    // Redact potential credit card numbers
    .replace(/\b\d{4}[-.\s]?\d{4}[-.\s]?\d{4}[-.\s]?\d{4}\b/g, "[CC_REDACTED]");
}

/**
 * Generates a secure hash for comparing sensitive data
 * Uses Web Crypto API for consistent, secure hashing
 * NOTE: This is for comparison purposes, not for storing passwords
 */
export async function hashForComparison(value: string, salt: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(salt + value);
  
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  
  return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Generates a cryptographically secure random salt
 */
export function generateSalt(length: number = 32): string {
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  return Array.from(array, b => b.toString(16).padStart(2, "0")).join("");
}
