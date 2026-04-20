/**
 * Centralized Subscription CTA Navigation Handler
 * 
 * ALL subscription-related CTAs (Renew, Subscribe, Upgrade) MUST use this handler.
 * No component should handle subscription navigation independently.
 */

import type { SubscriptionTier } from "@/hooks/useSubscription";

export type SubscriptionNavigationReason =
  | "expired"
  | "upgrade"
  | "subscribe"
  | "renew"
  | "payment_failed"
  | "plan_limit"
  | "feature_locked";

export interface SubscriptionNavigationContext {
  /** Current subscription status */
  status?: "active" | "expired" | "cancelled" | "none";
  /** Current tier */
  currentTier?: SubscriptionTier | null;
  /** Target tier (for upgrades) */
  targetTier?: SubscriptionTier;
  /** Why navigation is happening */
  reason: SubscriptionNavigationReason;
  /** Feature that triggered the navigation (optional) */
  featureKey?: string;
}

/**
 * The canonical subscription page path.
 * ALL subscription CTAs redirect here.
 * NOTE: The route is /subscription (outside dashboard), not /dashboard/subscription
 */
export const SUBSCRIPTION_PAGE_PATH = "/subscription";

/**
 * Resolves the correct navigation path based on subscription context.
 * Currently all paths lead to the subscription page, but this centralizes
 * the logic for future enhancements (e.g., direct checkout links).
 */
export function resolveSubscriptionPath(context: SubscriptionNavigationContext): string {
  const params = new URLSearchParams();
  
  // Add context as query params for the subscription page to handle
  if (context.reason) {
    params.set("reason", context.reason);
  }
  
  if (context.targetTier) {
    params.set("plan", context.targetTier);
  }
  
  if (context.featureKey) {
    params.set("feature", context.featureKey);
  }
  
  const queryString = params.toString();
  return queryString ? `${SUBSCRIPTION_PAGE_PATH}?${queryString}` : SUBSCRIPTION_PAGE_PATH;
}

/**
 * Get the appropriate CTA label based on context
 */
export function getSubscriptionCTALabel(context: SubscriptionNavigationContext): string {
  switch (context.reason) {
    case "expired":
      return "Renew Subscription";
    case "renew":
      return "Renew Now";
    case "payment_failed":
      return "Retry Payment";
    case "upgrade":
    case "feature_locked":
    case "plan_limit":
      return "Upgrade Plan";
    case "subscribe":
    default:
      return "View Plans";
  }
}

/**
 * Creates a navigation handler that can be used with onClick
 */
export function createSubscriptionNavigator(
  navigate: (path: string) => void,
  context: SubscriptionNavigationContext
): () => void {
  return () => {
    const path = resolveSubscriptionPath(context);
    navigate(path);
  };
}

/**
 * Hook-friendly navigation helper
 * Returns the path and label for subscription CTAs
 */
export function getSubscriptionCTAConfig(context: SubscriptionNavigationContext) {
  return {
    path: resolveSubscriptionPath(context),
    label: getSubscriptionCTALabel(context),
  };
}
