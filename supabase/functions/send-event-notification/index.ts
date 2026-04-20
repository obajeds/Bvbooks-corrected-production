import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// --- HTML escaping to prevent injection ---
function escapeHtml(unsafe: string): string {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// --- Input validation ---
const eventDataSchema = z.record(z.unknown());

const requestSchema = z.object({
  type: z.enum(["approval_request", "approval_resolved", "after_hours_alert", "low_stock"]),
  businessId: z.string().uuid(),
  data: eventDataSchema.optional().default({}),
});

interface BusinessAddon {
  id: string;
  status: string;
  addon_feature: { feature_key: string } | null;
}

async function hasEmailAddon(
  supabase: ReturnType<typeof createClient>,
  businessId: string
): Promise<boolean> {
  const { data } = await supabase
    .from("business_addons")
    .select("id, status, addon_feature:addon_features(feature_key)")
    .eq("business_id", businessId)
    .eq("status", "active");

  const addons = (data || []) as unknown as BusinessAddon[];
  return addons.some(
    (addon) => addon.addon_feature?.feature_key === "email_notifications"
  );
}

const formatCurrency = (amount: number, currency: string = "NGN") => {
  return new Intl.NumberFormat("en-NG", { style: "currency", currency }).format(
    amount
  );
};

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // --- Authentication: require valid user JWT ---
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Missing authorization" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const token = authHeader.replace("Bearer ", "");
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Invalid token" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // --- Validate input ---
    const rawBody = await req.json();
    const parseResult = requestSchema.safeParse(rawBody);

    if (!parseResult.success) {
      return new Response(
        JSON.stringify({ error: "Invalid request", details: parseResult.error.flatten().fieldErrors }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const { type, businessId, data: eventData } = parseResult.data;

    // --- BOLA prevention: verify user belongs to this business ---
    const { data: business } = await supabase
      .from("businesses")
      .select("id, trading_name, owner_email, currency, current_plan, owner_user_id")
      .eq("id", businessId)
      .single();

    if (!business) {
      return new Response(
        JSON.stringify({ error: "Business not found" }),
        { status: 404, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const isOwner = business.owner_user_id === user.id;
    if (!isOwner) {
      const { data: staffRecord } = await supabase
        .from("staff")
        .select("id")
        .eq("business_id", businessId)
        .eq("user_id", user.id)
        .eq("is_active", true)
        .maybeSingle();

      if (!staffRecord) {
        return new Response(
          JSON.stringify({ error: "Access denied" }),
          { status: 403, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }
    }

    // Check if business has active paid plan
    const paidPlans = ["professional", "enterprise"];
    if (!paidPlans.includes(business.current_plan || "")) {
      return new Response(
        JSON.stringify({ skipped: true, reason: "No active paid plan" }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Check email addon
    const emailAddonActive = await hasEmailAddon(supabase, businessId);
    if (!emailAddonActive) {
      return new Response(
        JSON.stringify({ skipped: true, reason: "Email addon not active" }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Find users with email enabled for this notification type
    const notificationTypeMap: Record<string, string> = {
      approval_request: "approval_request",
      approval_resolved: "approval_resolved",
      after_hours_alert: "after_hours_alert",
      low_stock: "low_stock_alert",
    };

    const notifType = notificationTypeMap[type] || type;

    const { data: preferences } = await supabase
      .from("user_notification_preferences")
      .select("*")
      .eq("business_id", businessId)
      .eq("notification_type", notifType)
      .eq("is_enabled", true)
      .eq("email_enabled", true);

    if (!preferences || preferences.length === 0) {
      if (!["approval_request", "after_hours_alert"].includes(type)) {
        return new Response(
          JSON.stringify({ skipped: true, reason: "No users with email enabled" }),
          { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }
    }

    const recipients: string[] = [];

    if (preferences && preferences.length > 0) {
      for (const pref of preferences) {
        const { data: userData } = await supabase.auth.admin.getUserById(
          pref.user_id
        );
        if (userData?.user?.email) {
          recipients.push(userData.user.email);
        }
      }
    }

    // Fallback to owner for critical notifications
    if (
      recipients.length === 0 &&
      ["approval_request", "after_hours_alert"].includes(type)
    ) {
      recipients.push(business.owner_email);
    }

    if (recipients.length === 0) {
      return new Response(
        JSON.stringify({ skipped: true, reason: "No valid recipients" }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // --- Build email with escaped user data ---
    let subject: string;
    let html: string;

    // Safe accessors with escaping
    const safeStr = (val: unknown): string => escapeHtml(String(val || ""));

    switch (type) {
      case "approval_request":
        subject = `Approval Required - ${escapeHtml(business.trading_name)}`;
        html = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #f59e0b; border-bottom: 2px solid #f59e0b; padding-bottom: 10px;">&#x1F514; Approval Required</h1>
            <p style="color: #666;">A new request needs your approval.</p>
            <div style="background: #fffbeb; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #f59e0b;">
              <p><strong>Type:</strong> ${safeStr(eventData.requestType).replace(/_/g, " ")}</p>
              ${eventData.amount ? `<p><strong>Amount:</strong> ${formatCurrency(Number(eventData.amount), business.currency)}</p>` : ""}
              ${eventData.requestedBy ? `<p><strong>Requested by:</strong> ${safeStr(eventData.requestedBy)}</p>` : ""}
            </div>
            <p style="color: #999; font-size: 12px;">Log in to your dashboard to approve or reject this request.</p>
          </div>
        `;
        break;

      case "approval_resolved":
        {
          const statusStr = safeStr(eventData.status);
          const isApproved = String(eventData.status) === "approved";
          subject = `Request ${statusStr.charAt(0).toUpperCase() + statusStr.slice(1)} - ${escapeHtml(business.trading_name)}`;
          html = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h1 style="color: ${isApproved ? "#22c55e" : "#ef4444"}; border-bottom: 2px solid ${isApproved ? "#22c55e" : "#ef4444"}; padding-bottom: 10px;">
                ${isApproved ? "&#x2705;" : "&#x274C;"} Request ${statusStr}
              </h1>
              <p style="color: #666;">Your ${safeStr(eventData.requestType).replace(/_/g, " ")} request has been ${statusStr}.</p>
              ${eventData.notes ? `<div style="background: #f8fafc; padding: 15px; border-radius: 8px; margin: 15px 0;"><p><strong>Note:</strong> ${safeStr(eventData.notes)}</p></div>` : ""}
            </div>
          `;
        }
        break;

      case "after_hours_alert":
        subject = `⚠️ After Hours Alert - ${escapeHtml(business.trading_name)}`;
        html = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #dc2626; border-bottom: 2px solid #dc2626; padding-bottom: 10px;">&#x26A0;&#xFE0F; After Hours Activity</h1>
            <p style="color: #666;">Suspicious activity detected outside business hours.</p>
            <div style="background: #fef2f2; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #dc2626;">
              <p><strong>Alert Type:</strong> ${safeStr(eventData.alertType) || "Unknown"}</p>
              <p><strong>Description:</strong> ${safeStr(eventData.description) || "No details"}</p>
              <p><strong>Time:</strong> ${safeStr(eventData.activityTime) || new Date().toLocaleString()}</p>
            </div>
            <p style="color: #999; font-size: 12px;">Please review this alert in your dashboard.</p>
          </div>
        `;
        break;

      default:
        return new Response(
          JSON.stringify({ error: "Unknown notification type" }),
          { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
    }

    let sent = 0;
    let failed = 0;

    for (const email of recipients) {
      try {
        await resend.emails.send({
          from: "BVBooks <notifications@bvbooks.net>",
          to: [email],
          subject,
          html,
        });

        await supabase.from("notification_audit_logs").insert({
          business_id: businessId,
          notification_type: notifType,
          channel: "email",
          recipient_email: email,
          trigger_source: "event",
          status: "sent",
          subject,
          sent_at: new Date().toISOString(),
          metadata: eventData,
        });

        sent++;
      } catch (emailError) {
        console.error(`Failed to send event email to ${email}:`, emailError);

        await supabase.from("notification_audit_logs").insert({
          business_id: businessId,
          notification_type: notifType,
          channel: "email",
          recipient_email: email,
          trigger_source: "event",
          status: "failed",
          error_message: String(emailError),
          metadata: eventData,
        });

        failed++;
      }
    }

    return new Response(
      JSON.stringify({ success: true, sent, failed }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: unknown) {
    console.error("Error in send-event-notification:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});
