import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface NotificationTestRequest {
  type: "daily_sales" | "weekly_report" | "low_stock";
  email: string;
  businessName?: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Authentication required" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Invalid authentication token" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Verify user is a business owner
    const { data: business } = await supabase
      .from('businesses')
      .select('id, trading_name')
      .eq('owner_user_id', user.id)
      .single();

    if (!business) {
      return new Response(
        JSON.stringify({ error: "Access denied: business owner only" }),
        { status: 403, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const { type, email, businessName = business.trading_name || "Your Business" }: NotificationTestRequest = await req.json();

    if (!email) {
      return new Response(
        JSON.stringify({ error: "Email address is required" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log(`Sending ${type} test notification to ${email} for business ${business.id}`);

    let subject: string;
    let html: string;

    switch (type) {
      case "daily_sales":
        subject = `[TEST] Daily Sales Summary - ${businessName}`;
        html = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #333; border-bottom: 2px solid #4f46e5; padding-bottom: 10px;">📊 Daily Sales Summary</h1>
            <p style="color: #666;">This is a <strong>test email</strong> for your daily sales summary notification.</p>
            
            <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="margin-top: 0; color: #333;">Sample Report for ${new Date().toLocaleDateString()}</h3>
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0;">Total Sales</td>
                  <td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0; text-align: right; font-weight: bold;">₦125,000.00</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0;">Transactions</td>
                  <td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0; text-align: right; font-weight: bold;">24</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0;">Average Order Value</td>
                  <td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0; text-align: right; font-weight: bold;">₦5,208.33</td>
                </tr>
              </table>
            </div>
            
            <p style="color: #999; font-size: 12px;">This is a test notification from ${businessName}. When enabled, you'll receive actual sales data daily.</p>
          </div>
        `;
        break;

      case "weekly_report":
        subject = `[TEST] Weekly Sales Report - ${businessName}`;
        html = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #333; border-bottom: 2px solid #4f46e5; padding-bottom: 10px;">📈 Weekly Sales Report</h1>
            <p style="color: #666;">This is a <strong>test email</strong> for your weekly sales report notification.</p>
            
            <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="margin-top: 0; color: #333;">Week Summary</h3>
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0;">Total Revenue</td>
                  <td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0; text-align: right; font-weight: bold;">₦875,000.00</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0;">Total Transactions</td>
                  <td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0; text-align: right; font-weight: bold;">168</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0;">Best Selling Product</td>
                  <td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0; text-align: right; font-weight: bold;">12.5kg LPG Cylinder</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0;">Growth vs Last Week</td>
                  <td style="padding: 8px 0; text-align: right; font-weight: bold; color: #22c55e;">+12.5%</td>
                </tr>
              </table>
            </div>
            
            <p style="color: #999; font-size: 12px;">This is a test notification from ${businessName}. When enabled, you'll receive weekly reports every Monday morning.</p>
          </div>
        `;
        break;

      case "low_stock":
        subject = `[TEST] ⚠️ Low Stock Alert - ${businessName}`;
        html = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #dc2626; border-bottom: 2px solid #dc2626; padding-bottom: 10px;">⚠️ Low Stock Alert</h1>
            <p style="color: #666;">This is a <strong>test email</strong> for your low stock alert notification.</p>
            
            <div style="background: #fef2f2; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #dc2626;">
              <h3 style="margin-top: 0; color: #991b1b;">Items Below Threshold</h3>
              <table style="width: 100%; border-collapse: collapse;">
                <tr style="background: #fee2e2;">
                  <th style="padding: 10px; text-align: left; border-bottom: 1px solid #fca5a5;">Product</th>
                  <th style="padding: 10px; text-align: center; border-bottom: 1px solid #fca5a5;">Current Stock</th>
                  <th style="padding: 10px; text-align: center; border-bottom: 1px solid #fca5a5;">Threshold</th>
                </tr>
                <tr>
                  <td style="padding: 10px; border-bottom: 1px solid #fecaca;">12.5kg LPG Cylinder</td>
                  <td style="padding: 10px; text-align: center; border-bottom: 1px solid #fecaca; color: #dc2626; font-weight: bold;">3</td>
                  <td style="padding: 10px; text-align: center; border-bottom: 1px solid #fecaca;">10</td>
                </tr>
                <tr>
                  <td style="padding: 10px; border-bottom: 1px solid #fecaca;">Gas Regulator</td>
                  <td style="padding: 10px; text-align: center; border-bottom: 1px solid #fecaca; color: #dc2626; font-weight: bold;">5</td>
                  <td style="padding: 10px; text-align: center; border-bottom: 1px solid #fecaca;">15</td>
                </tr>
              </table>
            </div>
            
            <p style="color: #999; font-size: 12px;">This is a test notification from ${businessName}. When enabled, you'll receive alerts when inventory items fall below their set thresholds.</p>
          </div>
        `;
        break;

      default:
        return new Response(
          JSON.stringify({ error: "Invalid notification type" }),
          { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
    }

    const emailResponse = await resend.emails.send({
      from: "Notifications <notifications@bvbooks.net>",
      to: [email],
      subject,
      html,
    });

    console.log("Email sent successfully:", emailResponse);

    return new Response(
      JSON.stringify({ success: true, data: emailResponse }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("Error sending notification test email:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);