/**
 * Production URLs for BVBooks Client Admin Application
 * These URLs are used for password reset, email verification, and other auth flows.
 * 
 * IMPORTANT: These override any preview/localhost URLs for production builds.
 */

// Production domain for Client Admin
const PRODUCTION_DOMAIN = "https://app.bvbooks.net";

// Check if we're in production (custom domain or published)
function isProductionEnvironment(): boolean {
  if (typeof window === "undefined") return false;
  
  const hostname = window.location.hostname;
  
  // Production indicators
  if (hostname === "app.bvbooks.net") return true;
  if (hostname.endsWith(".bvbooks.net")) return true;
  
  // NOT production - preview/development environments
  if (hostname === "localhost") return false;
  if (hostname.includes("lovable.app")) return false;
  if (hostname.includes("lovable.dev")) return false;
  if (hostname.includes("lovableproject.com")) return false;
  
  // Default to production for any other custom domain
  return true;
}

/**
 * Get the correct base URL for auth redirects
 * ALWAYS returns the production domain to ensure email links
 * point to the correct app regardless of where the request originated.
 */
export function getAuthBaseUrl(): string {
  return PRODUCTION_DOMAIN;
}

/**
 * Get the password reset redirect URL
 * Always points to the correct domain's reset-password page
 */
export function getPasswordResetUrl(): string {
  return `${getAuthBaseUrl()}/reset-password`;
}

/**
 * Get the email confirmation redirect URL
 * Used after email verification
 */
export function getEmailConfirmUrl(): string {
  return `${getAuthBaseUrl()}/auth/callback`;
}

/**
 * Get the staff invitation accept URL
 */
export function getStaffInviteUrl(token: string): string {
  return `${getAuthBaseUrl()}/accept-invite?token=${token}`;
}

/**
 * Check if the current URL is a Lovable preview URL
 * Used to show appropriate warnings or handle edge cases
 */
export function isPreviewEnvironment(): boolean {
  if (typeof window === "undefined") return false;
  
  const hostname = window.location.hostname;
  return (
    hostname.includes("lovable.app") ||
    hostname.includes("lovable.dev") ||
    hostname.includes("lovableproject.com") ||
    hostname === "localhost"
  );
}
