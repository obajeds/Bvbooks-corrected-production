import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

interface UserPreference {
  id: string;
  user_id: string;
  business_id: string;
  notification_type: string;
  in_app_enabled: boolean;
  email_enabled: boolean;
  is_enabled: boolean;
  branch_ids: string[] | null;
  settings: Record<string, unknown>;
  business?: Business;
}

interface Business {
  id: string;
  trading_name: string;
  owner_email: string;
  currency: string;
  current_plan: string | null;
}

interface Sale {
  total_amount: number;
  subtotal?: number;
  discount_amount?: number;
  created_at?: string;
}

interface Product {
  id: string;
  name: string;
  stock_quantity: number;
  low_stock_threshold: number | null;
}

interface BusinessAddon {
  id: string;
  business_id: string;
  status: string;
  addon_feature: {
    feature_key: string;
  } | null;
}

const formatCurrency = (amount: number, currency: string = "NGN") => {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency,
  }).format(amount);
};

const getDayName = (day: number): string => {
  const days = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
  return days[day];
};

// Check if business has active email addon
async function hasEmailAddon(supabase: SupabaseClient, businessId: string): Promise<boolean> {
  const { data } = await supabase
    .from("business_addons")
    .select("id, status, addon_feature:addon_features(feature_key)")
    .eq("business_id", businessId)
    .eq("status", "active");

  const addons = (data || []) as unknown as BusinessAddon[];
  return addons.some(addon => addon.addon_feature?.feature_key === "email_notifications");
}

// Check if business has active paid subscription
function hasActiveSubscription(business: Business): boolean {
  const paidPlans = ["professional", "enterprise"];
  return paidPlans.includes(business.current_plan || "");
}

// Log blocked email attempt
async function logBlockedEmail(
  supabase: SupabaseClient,
  businessId: string,
  notificationType: string,
  userId: string,
  reason: string
) {
  await supabase.from("notification_audit_logs").insert({
    business_id: businessId,
    notification_type: notificationType,
    channel: "email",
    recipient_user_id: userId,
    trigger_source: "scheduled",
    status: "blocked",
    error_message: reason,
    metadata: { blocked_reason: reason },
  });
  console.log(`Blocked email for ${businessId}: ${reason}`);
}

// deno-lint-ignore no-explicit-any
async function sendDailySalesSummary(supabase: SupabaseClient<any, "public", any>) {
  console.log("Processing daily sales summary notifications...");
  
  const now = new Date();
  const currentHour = now.getUTCHours();
  
  const { data: preferences, error: prefError } = await supabase
    .from("user_notification_preferences")
    .select(`
      *,
      business:business_id (id, trading_name, owner_email, currency, current_plan)
    `)
    .eq("notification_type", "daily_sales_summary")
    .eq("is_enabled", true);

  if (prefError) {
    console.error("Error fetching preferences:", prefError);
    return { sent: 0, failed: 0, inApp: 0, blocked: 0 };
  }

  console.log(`Found ${preferences?.length || 0} users with daily sales summary enabled`);

  let sent = 0;
  let failed = 0;
  let inApp = 0;
  let blocked = 0;

  const prefs = (preferences || []) as UserPreference[];

  for (const pref of prefs) {
    const business = pref.business as Business | undefined;
    if (!business) continue;

    const deliveryTime = (pref.settings?.delivery_time as string) || "23:59";
    const [targetHour] = deliveryTime.split(":").map(Number);
    
    if (Math.abs(currentHour - targetHour) > 0) {
      console.log(`Skipping ${business.trading_name} - not delivery time (current: ${currentHour}, target: ${targetHour})`);
      continue;
    }

    const todayStart = new Date();
    todayStart.setUTCHours(0, 0, 0, 0);
    
    let salesQuery = supabase
      .from("sales")
      .select("total_amount, subtotal, discount_amount")
      .eq("business_id", business.id)
      .gte("created_at", todayStart.toISOString());
    
    if (pref.branch_ids && pref.branch_ids.length > 0) {
      salesQuery = salesQuery.in("branch_id", pref.branch_ids);
    }

    const { data: salesData } = await salesQuery;
    const sales = (salesData || []) as Sale[];
    
    const totalSales = sales.reduce((sum, s) => sum + (s.total_amount || 0), 0);
    const totalTransactions = sales.length;
    const avgOrderValue = totalTransactions > 0 ? totalSales / totalTransactions : 0;

    if (totalTransactions === 0 && pref.settings?.skip_zero_days) {
      console.log(`Skipping ${business.trading_name} - no sales today and skip_zero_days enabled`);
      continue;
    }

    // ALWAYS send in-app notification if enabled (no addon check needed)
    if (pref.in_app_enabled) {
      await supabase.from("business_notifications").insert({
        business_id: business.id,
        type: "report",
        title: "Daily Sales Summary",
        message: `Today's sales: ${formatCurrency(totalSales, business.currency)} from ${totalTransactions} transactions.`,
        entity_type: "daily_report",
      });
      inApp++;
      console.log(`In-app notification sent for ${business.trading_name}`);
    }

    // Only proceed with email if email is enabled
    if (!pref.email_enabled) continue;

    // GATE EMAIL: Check subscription and addon
    if (!hasActiveSubscription(business)) {
      await logBlockedEmail(supabase, business.id, "daily_sales_summary", pref.user_id, "No active paid subscription");
      blocked++;
      continue;
    }

    const emailAddonActive = await hasEmailAddon(supabase, business.id);
    if (!emailAddonActive) {
      await logBlockedEmail(supabase, business.id, "daily_sales_summary", pref.user_id, "Email addon not active");
      blocked++;
      continue;
    }

    const { data: userData } = await supabase.auth.admin.getUserById(pref.user_id);
    const userEmail = userData?.user?.email;
    
    if (!userEmail) {
      console.log(`Skipping - no email for user ${pref.user_id}`);
      continue;
    }

    try {
      const emailResponse = await resend.emails.send({
        from: "BVBooks <notifications@bvbooks.net>",
        to: [userEmail],
        subject: `Daily Sales Summary - ${business.trading_name}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #333; border-bottom: 2px solid #4f46e5; padding-bottom: 10px;">📊 Daily Sales Summary</h1>
            <p style="color: #666;">Here's your sales summary for <strong>${now.toLocaleDateString()}</strong></p>
            
            <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0;">Total Sales</td>
                  <td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0; text-align: right; font-weight: bold;">${formatCurrency(totalSales, business.currency)}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0;">Transactions</td>
                  <td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0; text-align: right; font-weight: bold;">${totalTransactions}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0;">Average Order Value</td>
                  <td style="padding: 8px 0; text-align: right; font-weight: bold;">${formatCurrency(avgOrderValue, business.currency)}</td>
                </tr>
              </table>
            </div>
            
            <p style="color: #999; font-size: 12px;">This notification was sent from ${business.trading_name}.</p>
          </div>
        `,
      });

      await supabase.from("notification_audit_logs").insert({
        business_id: business.id,
        notification_type: "daily_sales_summary",
        channel: "email",
        recipient_user_id: pref.user_id,
        recipient_email: userEmail,
        trigger_source: "scheduled",
        status: "sent",
        subject: `Daily Sales Summary - ${business.trading_name}`,
        content_preview: `Total: ${formatCurrency(totalSales, business.currency)}, Transactions: ${totalTransactions}`,
        sent_at: new Date().toISOString(),
        metadata: { sales_total: totalSales, transactions: totalTransactions },
      });

      console.log(`Sent daily summary to ${userEmail} for ${business.trading_name}`);
      sent++;
    } catch (emailError) {
      console.error(`Failed to send email to ${userEmail}:`, emailError);
      
      await supabase.from("notification_audit_logs").insert({
        business_id: business.id,
        notification_type: "daily_sales_summary",
        channel: "email",
        recipient_user_id: pref.user_id,
        recipient_email: userEmail,
        trigger_source: "scheduled",
        status: "failed",
        error_message: String(emailError),
        metadata: {},
      });
      
      failed++;
    }
  }

  return { sent, failed, inApp, blocked };
}

// deno-lint-ignore no-explicit-any
async function sendWeeklySalesReport(supabase: SupabaseClient<any, "public", any>) {
  console.log("Processing weekly sales report notifications...");
  
  const now = new Date();
  const currentDay = getDayName(now.getUTCDay());
  const currentHour = now.getUTCHours();
  
  const { data: preferences, error: prefError } = await supabase
    .from("user_notification_preferences")
    .select(`
      *,
      business:business_id (id, trading_name, owner_email, currency, current_plan)
    `)
    .eq("notification_type", "weekly_sales_report")
    .eq("is_enabled", true);

  if (prefError) {
    console.error("Error fetching weekly preferences:", prefError);
    return { sent: 0, failed: 0, inApp: 0, blocked: 0 };
  }

  let sent = 0;
  let failed = 0;
  let inApp = 0;
  let blocked = 0;
  const prefs = (preferences || []) as UserPreference[];

  for (const pref of prefs) {
    const business = pref.business as Business | undefined;
    if (!business) continue;

    const deliveryDay = (pref.settings?.delivery_day as string) || "monday";
    const deliveryTime = (pref.settings?.delivery_time as string) || "08:00";
    const [targetHour] = deliveryTime.split(":").map(Number);
    
    if (currentDay !== deliveryDay || Math.abs(currentHour - targetHour) > 0) {
      continue;
    }

    const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    
    let salesQuery = supabase
      .from("sales")
      .select("total_amount, created_at")
      .eq("business_id", business.id)
      .gte("created_at", weekStart.toISOString());
    
    if (pref.branch_ids && pref.branch_ids.length > 0) {
      salesQuery = salesQuery.in("branch_id", pref.branch_ids);
    }

    const { data: salesData } = await salesQuery;
    const sales = (salesData || []) as Sale[];
    
    const totalRevenue = sales.reduce((sum, s) => sum + (s.total_amount || 0), 0);
    const totalTransactions = sales.length;

    // ALWAYS send in-app notification if enabled
    if (pref.in_app_enabled) {
      await supabase.from("business_notifications").insert({
        business_id: business.id,
        type: "report",
        title: "Weekly Sales Report",
        message: `This week: ${formatCurrency(totalRevenue, business.currency)} from ${totalTransactions} transactions.`,
        entity_type: "weekly_report",
      });
      inApp++;
    }

    if (!pref.email_enabled) continue;

    // GATE EMAIL
    if (!hasActiveSubscription(business)) {
      await logBlockedEmail(supabase, business.id, "weekly_sales_report", pref.user_id, "No active paid subscription");
      blocked++;
      continue;
    }

    const emailAddonActive = await hasEmailAddon(supabase, business.id);
    if (!emailAddonActive) {
      await logBlockedEmail(supabase, business.id, "weekly_sales_report", pref.user_id, "Email addon not active");
      blocked++;
      continue;
    }

    const { data: userData } = await supabase.auth.admin.getUserById(pref.user_id);
    const userEmail = userData?.user?.email;
    
    if (!userEmail) continue;

    try {
      await resend.emails.send({
        from: "BVBooks <notifications@bvbooks.net>",
        to: [userEmail],
        subject: `Weekly Sales Report - ${business.trading_name}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #333; border-bottom: 2px solid #4f46e5; padding-bottom: 10px;">📈 Weekly Sales Report</h1>
            <p style="color: #666;">Your sales summary for the past 7 days</p>
            
            <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0;">Total Revenue</td>
                  <td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0; text-align: right; font-weight: bold;">${formatCurrency(totalRevenue, business.currency)}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0;">Total Transactions</td>
                  <td style="padding: 8px 0; text-align: right; font-weight: bold;">${totalTransactions}</td>
                </tr>
              </table>
            </div>
            
            <p style="color: #999; font-size: 12px;">This notification was sent from ${business.trading_name}.</p>
          </div>
        `,
      });

      await supabase.from("notification_audit_logs").insert({
        business_id: business.id,
        notification_type: "weekly_sales_report",
        channel: "email",
        recipient_user_id: pref.user_id,
        recipient_email: userEmail,
        trigger_source: "scheduled",
        status: "sent",
        subject: `Weekly Sales Report - ${business.trading_name}`,
        sent_at: new Date().toISOString(),
        metadata: { revenue: totalRevenue, transactions: totalTransactions },
      });

      sent++;
    } catch (emailError) {
      console.error(`Failed to send weekly report to ${userEmail}:`, emailError);
      failed++;
    }
  }

  return { sent, failed, inApp, blocked };
}

// deno-lint-ignore no-explicit-any
async function sendLowStockAlerts(supabase: SupabaseClient<any, "public", any>) {
  console.log("Processing low stock alerts...");
  
  const { data: preferences } = await supabase
    .from("user_notification_preferences")
    .select(`
      *,
      business:business_id (id, trading_name, owner_email, currency, current_plan)
    `)
    .eq("notification_type", "low_stock_alert")
    .eq("is_enabled", true);

  let sent = 0;
  let failed = 0;
  let inApp = 0;
  let blocked = 0;
  const prefs = (preferences || []) as UserPreference[];

  for (const pref of prefs) {
    const business = pref.business as Business | undefined;
    if (!business) continue;

    const { data: productsData } = await supabase
      .from("products")
      .select("id, name, stock_quantity, low_stock_threshold")
      .eq("business_id", business.id)
      .eq("is_active", true)
      .not("low_stock_threshold", "is", null);

    const products = (productsData || []) as Product[];
    const alertProducts = products.filter(
      p => p.stock_quantity <= (p.low_stock_threshold || 0)
    );

    if (alertProducts.length === 0) continue;

    // ALWAYS send in-app notification if enabled
    if (pref.in_app_enabled) {
      await supabase.from("business_notifications").insert({
        business_id: business.id,
        type: "warning",
        title: "Low Stock Alert",
        message: `${alertProducts.length} product(s) are below their stock threshold.`,
        entity_type: "low_stock",
      });
      inApp++;
    }

    if (!pref.email_enabled) continue;

    // GATE EMAIL
    if (!hasActiveSubscription(business)) {
      await logBlockedEmail(supabase, business.id, "low_stock_alert", pref.user_id, "No active paid subscription");
      blocked++;
      continue;
    }

    const emailAddonActive = await hasEmailAddon(supabase, business.id);
    if (!emailAddonActive) {
      await logBlockedEmail(supabase, business.id, "low_stock_alert", pref.user_id, "Email addon not active");
      blocked++;
      continue;
    }

    const { data: userData } = await supabase.auth.admin.getUserById(pref.user_id);
    const userEmail = userData?.user?.email;
    
    if (!userEmail) continue;

    try {
      const productRows = alertProducts.slice(0, 10).map(p => `
        <tr>
          <td style="padding: 10px; border-bottom: 1px solid #fecaca;">${p.name}</td>
          <td style="padding: 10px; text-align: center; border-bottom: 1px solid #fecaca; color: #dc2626; font-weight: bold;">${p.stock_quantity}</td>
          <td style="padding: 10px; text-align: center; border-bottom: 1px solid #fecaca;">${p.low_stock_threshold}</td>
        </tr>
      `).join("");

      await resend.emails.send({
        from: "BVBooks <notifications@bvbooks.net>",
        to: [userEmail],
        subject: `⚠️ Low Stock Alert - ${business.trading_name}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #dc2626; border-bottom: 2px solid #dc2626; padding-bottom: 10px;">⚠️ Low Stock Alert</h1>
            <p style="color: #666;">${alertProducts.length} product(s) are below their reorder threshold.</p>
            
            <div style="background: #fef2f2; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #dc2626;">
              <table style="width: 100%; border-collapse: collapse;">
                <tr style="background: #fee2e2;">
                  <th style="padding: 10px; text-align: left; border-bottom: 1px solid #fca5a5;">Product</th>
                  <th style="padding: 10px; text-align: center; border-bottom: 1px solid #fca5a5;">Current</th>
                  <th style="padding: 10px; text-align: center; border-bottom: 1px solid #fca5a5;">Threshold</th>
                </tr>
                ${productRows}
              </table>
            </div>
            
            <p style="color: #999; font-size: 12px;">This notification was sent from ${business.trading_name}.</p>
          </div>
        `,
      });

      await supabase.from("notification_audit_logs").insert({
        business_id: business.id,
        notification_type: "low_stock_alert",
        channel: "email",
        recipient_user_id: pref.user_id,
        recipient_email: userEmail,
        trigger_source: "scheduled",
        status: "sent",
        subject: `Low Stock Alert - ${business.trading_name}`,
        sent_at: new Date().toISOString(),
        metadata: { products_count: alertProducts.length },
      });

      sent++;
    } catch (emailError) {
      console.error(`Failed to send low stock alert to ${userEmail}:`, emailError);
      failed++;
    }
  }

  return { sent, failed, inApp, blocked };
}

// deno-lint-ignore no-explicit-any
async function sendMonthlySalesReport(supabase: SupabaseClient<any, "public", any>) {
  console.log("Processing monthly sales report notifications...");
  
  const now = new Date();
  const currentDay = now.getUTCDate();
  const currentHour = now.getUTCHours();
  
  // Monthly reports run on the 1st of each month
  if (currentDay !== 1) {
    console.log("Not the 1st of the month, skipping monthly report");
    return { sent: 0, failed: 0, inApp: 0, blocked: 0 };
  }
  
  const { data: preferences, error: prefError } = await supabase
    .from("user_notification_preferences")
    .select(`
      *,
      business:business_id (id, trading_name, owner_email, currency, current_plan)
    `)
    .eq("notification_type", "monthly_sales_report")
    .eq("is_enabled", true);

  if (prefError) {
    console.error("Error fetching monthly preferences:", prefError);
    return { sent: 0, failed: 0, inApp: 0, blocked: 0 };
  }

  let sent = 0;
  let failed = 0;
  let inApp = 0;
  let blocked = 0;
  const prefs = (preferences || []) as UserPreference[];

  for (const pref of prefs) {
    const business = pref.business as Business | undefined;
    if (!business) continue;

    const deliveryTime = (pref.settings?.delivery_time as string) || "08:00";
    const [targetHour] = deliveryTime.split(":").map(Number);
    
    if (Math.abs(currentHour - targetHour) > 0) continue;

    // Get last month's data
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
    
    let salesQuery = supabase
      .from("sales")
      .select("total_amount, created_at")
      .eq("business_id", business.id)
      .gte("created_at", lastMonth.toISOString())
      .lte("created_at", lastMonthEnd.toISOString());
    
    if (pref.branch_ids && pref.branch_ids.length > 0) {
      salesQuery = salesQuery.in("branch_id", pref.branch_ids);
    }

    const { data: salesData } = await salesQuery;
    const sales = (salesData || []) as Sale[];
    
    const totalRevenue = sales.reduce((sum, s) => sum + (s.total_amount || 0), 0);
    const totalTransactions = sales.length;
    const avgOrderValue = totalTransactions > 0 ? totalRevenue / totalTransactions : 0;

    const monthName = lastMonth.toLocaleString("en", { month: "long", year: "numeric" });

    // In-app notification
    if (pref.in_app_enabled) {
      await supabase.from("business_notifications").insert({
        business_id: business.id,
        type: "report",
        title: "Monthly Sales Report",
        message: `${monthName}: ${formatCurrency(totalRevenue, business.currency)} from ${totalTransactions} transactions.`,
        entity_type: "monthly_report",
      });
      inApp++;
    }

    if (!pref.email_enabled) continue;

    if (!hasActiveSubscription(business)) {
      await logBlockedEmail(supabase, business.id, "monthly_sales_report", pref.user_id, "No active paid subscription");
      blocked++;
      continue;
    }

    const emailAddonActive = await hasEmailAddon(supabase, business.id);
    if (!emailAddonActive) {
      await logBlockedEmail(supabase, business.id, "monthly_sales_report", pref.user_id, "Email addon not active");
      blocked++;
      continue;
    }

    const { data: userData } = await supabase.auth.admin.getUserById(pref.user_id);
    const userEmail = userData?.user?.email;
    if (!userEmail) continue;

    try {
      await resend.emails.send({
        from: "BVBooks <notifications@bvbooks.net>",
        to: [userEmail],
        subject: `Monthly Sales Report (${monthName}) - ${business.trading_name}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #333; border-bottom: 2px solid #4f46e5; padding-bottom: 10px;">📅 Monthly Sales Report</h1>
            <p style="color: #666;">Your sales summary for <strong>${monthName}</strong></p>
            
            <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0;">Total Revenue</td>
                  <td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0; text-align: right; font-weight: bold;">${formatCurrency(totalRevenue, business.currency)}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0;">Total Transactions</td>
                  <td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0; text-align: right; font-weight: bold;">${totalTransactions}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0;">Average Order Value</td>
                  <td style="padding: 8px 0; text-align: right; font-weight: bold;">${formatCurrency(avgOrderValue, business.currency)}</td>
                </tr>
              </table>
            </div>
            
            <p style="color: #999; font-size: 12px;">This notification was sent from ${business.trading_name}.</p>
          </div>
        `,
      });

      await supabase.from("notification_audit_logs").insert({
        business_id: business.id,
        notification_type: "monthly_sales_report",
        channel: "email",
        recipient_user_id: pref.user_id,
        recipient_email: userEmail,
        trigger_source: "scheduled",
        status: "sent",
        subject: `Monthly Sales Report - ${business.trading_name}`,
        sent_at: new Date().toISOString(),
        metadata: { revenue: totalRevenue, transactions: totalTransactions, month: monthName },
      });

      sent++;
    } catch (emailError) {
      console.error(`Failed to send monthly report to ${userEmail}:`, emailError);
      failed++;
    }
  }

  return { sent, failed, inApp, blocked };
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    let notificationType = "all";
    try {
      const body = await req.json();
      notificationType = body.type || "all";
    } catch {
      // No body, process all
    }

    console.log(`Processing scheduled notifications: ${notificationType}`);
    
    const results: Record<string, { sent: number; failed: number; inApp: number; blocked: number }> = {};

    if (notificationType === "all" || notificationType === "daily_sales_summary") {
      results.daily = await sendDailySalesSummary(supabase);
    }
    
    if (notificationType === "all" || notificationType === "weekly_sales_report") {
      results.weekly = await sendWeeklySalesReport(supabase);
    }
    
    if (notificationType === "all" || notificationType === "low_stock_alert") {
      results.lowStock = await sendLowStockAlerts(supabase);
    }

    if (notificationType === "all" || notificationType === "monthly_sales_report") {
      results.monthly = await sendMonthlySalesReport(supabase);
    }

    console.log("Notification processing complete:", results);

    return new Response(
      JSON.stringify({ success: true, results }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("Error processing notifications:", errorMessage);
    
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);