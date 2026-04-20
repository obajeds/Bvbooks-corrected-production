import { z } from "zod";
import DOMPurify from "dompurify";

// ============================================
// SANITIZATION UTILITIES
// ============================================

/**
 * Sanitize text input - removes HTML tags and trims whitespace
 * Use for plain text fields like names, titles, etc.
 */
export function sanitizeText(input: string): string {
  if (!input) return "";
  // Strip HTML tags and decode entities
  const stripped = DOMPurify.sanitize(input, { ALLOWED_TAGS: [] });
  // Trim and normalize whitespace
  return stripped.trim().replace(/\s+/g, " ");
}

/**
 * Sanitize HTML content - allows safe tags only
 * Use for rich text content that needs to preserve formatting
 */
export function sanitizeHtml(input: string): string {
  if (!input) return "";
  return DOMPurify.sanitize(input, {
    ALLOWED_TAGS: ["p", "br", "strong", "em", "h1", "h2", "h3", "ul", "ol", "li", "a", "code", "pre", "blockquote"],
    ALLOWED_ATTR: ["href", "class", "id", "target", "rel"],
    ALLOW_DATA_ATTR: false,
  });
}

/**
 * Sanitize for URL - encodes unsafe characters
 */
export function sanitizeForUrl(input: string): string {
  if (!input) return "";
  return encodeURIComponent(sanitizeText(input));
}

/**
 * Escape string for regex pattern matching
 */
export function escapeRegex(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// ============================================
// COMMON VALIDATION SCHEMAS
// ============================================

/**
 * Email validation with sanitization
 */
export const emailSchema = z
  .string()
  .trim()
  .min(1, "Email is required")
  .email("Invalid email address")
  .max(255, "Email too long")
  .transform((val) => val.toLowerCase());

/**
 * Password validation - enforces strong password rules
 * Requirements: 8+ chars, uppercase, lowercase, number, special char
 */
export const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .max(100, "Password too long")
  .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
  .regex(/[a-z]/, "Password must contain at least one lowercase letter")
  .regex(/[0-9]/, "Password must contain at least one number")
  .regex(/[^A-Za-z0-9]/, "Password must contain at least one special character");

/**
 * Name validation with sanitization
 */
export const nameSchema = z
  .string()
  .trim()
  .min(1, "Name is required")
  .max(100, "Name too long")
  .transform(sanitizeText);

/**
 * Phone number validation
 */
export const phoneSchema = z
  .string()
  .trim()
  .regex(/^[+]?[\d\s()-]{7,20}$/, "Invalid phone number")
  .or(z.literal(""))
  .optional();

/**
 * URL validation
 */
export const urlSchema = z
  .string()
  .url("Invalid URL")
  .max(2000, "URL too long")
  .optional()
  .or(z.literal(""));

/**
 * Generic text field with length limits
 */
export const textSchema = (maxLength = 500) =>
  z
    .string()
    .trim()
    .max(maxLength, `Text must be less than ${maxLength} characters`)
    .transform(sanitizeText);

/**
 * Required text field
 */
export const requiredTextSchema = (fieldName: string, maxLength = 500) =>
  z
    .string()
    .trim()
    .min(1, `${fieldName} is required`)
    .max(maxLength, `${fieldName} must be less than ${maxLength} characters`)
    .transform(sanitizeText);

/**
 * Numeric amount validation
 */
export const amountSchema = z
  .number()
  .nonnegative("Amount must be positive")
  .max(999999999, "Amount too large");

/**
 * Integer ID validation
 */
export const idSchema = z.string().uuid("Invalid ID format");

/**
 * Description/notes field with larger limit
 */
export const descriptionSchema = z
  .string()
  .trim()
  .max(2000, "Description too long")
  .transform(sanitizeText)
  .optional()
  .or(z.literal(""));

// ============================================
// FORM SCHEMAS
// ============================================

/**
 * Login form schema
 */
export const loginFormSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Password is required"),
});

/**
 * Sign up form schema
 */
export const signUpFormSchema = z.object({
  fullName: nameSchema,
  email: emailSchema,
  password: passwordSchema,
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

/**
 * Business setup form schema
 */
export const businessSetupSchema = z.object({
  trading_name: requiredTextSchema("Trading name", 100),
  legal_name: textSchema(100).optional(),
  category: z.string().min(1, "Category is required"),
  subcategory: z.string().optional(),
  phone: phoneSchema,
  address: textSchema(200).optional(),
  description: descriptionSchema,
  branch_name: textSchema(100).optional(),
  branch_address: textSchema(200).optional(),
  branch_phone: phoneSchema,
});

/**
 * Support ticket schema
 */
export const supportTicketSchema = z.object({
  subject: requiredTextSchema("Subject", 200),
  description: z.string().trim().min(1, "Description is required").max(2000, "Description too long").transform(sanitizeText),
  category: z.enum(["general", "technical", "billing", "feature"]),
});

/**
 * Branch form schema
 */
export const branchFormSchema = z.object({
  name: requiredTextSchema("Branch name", 100),
  address: textSchema(200).optional(),
  phone: phoneSchema,
});

/**
 * Staff invite schema
 */
export const staffInviteSchema = z.object({
  email: emailSchema,
  fullName: nameSchema,
  phone: phoneSchema,
});

/**
 * Custom role schema
 */
export const customRoleSchema = z.object({
  name: requiredTextSchema("Role name", 50),
  description: descriptionSchema,
});

/**
 * Measurement unit schema
 */
export const measurementUnitSchema = z.object({
  name: requiredTextSchema("Unit name", 50),
  abbreviation: requiredTextSchema("Abbreviation", 10),
});

// ============================================
// VALIDATION HELPERS
// ============================================

/**
 * Validate input against a schema, returning errors or sanitized data
 */
export function validateInput<T>(schema: z.ZodSchema<T>, data: unknown): { success: true; data: T } | { success: false; errors: Record<string, string> } {
  const result = schema.safeParse(data);
  
  if (result.success) {
    return { success: true, data: result.data };
  }
  
  const errors: Record<string, string> = {};
  result.error.errors.forEach((err) => {
    const path = err.path.join(".");
    if (!errors[path]) {
      errors[path] = err.message;
    }
  });
  
  return { success: false, errors };
}

/**
 * Quick validation check - returns true if valid
 */
export function isValid<T>(schema: z.ZodSchema<T>, data: unknown): boolean {
  return schema.safeParse(data).success;
}
