import * as Sentry from "@sentry/react";
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";

type ErrorSeverity = "info" | "warning" | "error" | "critical";
type ErrorSource = "client" | "edge_function" | "database";

interface ErrorEventPayload {
  source: ErrorSource;
  severity: ErrorSeverity;
  error_type: string;
  error_message: string;
  stack_trace?: string;
  metadata?: Record<string, unknown>;
  business_id?: string;
}

/**
 * Log an error event to both Sentry and the database.
 * Fails silently to avoid cascading errors.
 */
export async function logErrorEvent(payload: ErrorEventPayload): Promise<void> {
  try {
    // Report to Sentry if initialized
    if (payload.severity === "error" || payload.severity === "critical") {
      Sentry.captureMessage(payload.error_message, {
        level: payload.severity === "critical" ? "fatal" : "error",
        tags: { source: payload.source, error_type: payload.error_type },
        extra: payload.metadata,
      });
    }

    // Insert into database
    await supabase.from("error_events").insert([{
      source: payload.source,
      severity: payload.severity,
      error_type: payload.error_type,
      error_message: payload.error_message,
      stack_trace: payload.stack_trace || null,
      metadata: (payload.metadata || {}) as Json,
      business_id: payload.business_id || null,
    }]);
  } catch {
    console.error("[errorTracking] Failed to log error event");
  }
}

/**
 * Wraps an async function call with timing and error tracking.
 * Logs slow responses (>3s) and failures automatically.
 */
export async function trackApiCall<T>(
  name: string,
  fn: () => Promise<T>,
  options?: { businessId?: string }
): Promise<T> {
  const start = performance.now();
  try {
    const result = await fn();
    const duration = performance.now() - start;

    if (duration > 3000) {
      await logErrorEvent({
        source: "client",
        severity: "warning",
        error_type: "slow_api_call",
        error_message: `Slow API call: ${name} took ${Math.round(duration)}ms`,
        metadata: { endpoint: name, duration_ms: Math.round(duration) },
        business_id: options?.businessId,
      });
    }

    return result;
  } catch (error) {
    const duration = performance.now() - start;
    const errMsg = error instanceof Error ? error.message : String(error);
    const stack = error instanceof Error ? error.stack : undefined;

    await logErrorEvent({
      source: "client",
      severity: "error",
      error_type: "api_call_failed",
      error_message: `API call failed: ${name} — ${errMsg}`,
      stack_trace: stack,
      metadata: { endpoint: name, duration_ms: Math.round(duration) },
      business_id: options?.businessId,
    });

    throw error;
  }
}
