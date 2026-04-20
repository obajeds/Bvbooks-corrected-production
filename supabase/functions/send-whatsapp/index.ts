import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface WhatsAppMessageRequest {
  to: string;
  message: string;
  templateName?: string;
  templateParams?: string[];
}

serve(async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error("Missing authorization header");
      return new Response(
        JSON.stringify({ error: "Authentication required" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      console.error("Invalid authentication token:", authError?.message);
      return new Response(
        JSON.stringify({ error: "Invalid authentication token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify user belongs to an active business (owner or staff)
    let businessId: string | null = null;
    
    const { data: business } = await supabase
      .from('businesses')
      .select('id, current_plan')
      .eq('owner_user_id', user.id)
      .single();

    if (business) {
      businessId = business.id;
    } else {
      const { data: staff } = await supabase
        .from('staff')
        .select('id, business_id')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .single();

      if (staff) {
        businessId = staff.business_id;
      }
    }

    if (!businessId) {
      console.error("User not associated with any business:", user.id);
      return new Response(
        JSON.stringify({ error: "Access denied: not associated with any business" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch business plan to enforce Enterprise-only access
    const { data: businessData, error: businessError } = await supabase
      .from('businesses')
      .select('current_plan, trial_ends_at')
      .eq('id', businessId)
      .single();

    if (businessError || !businessData) {
      console.error("Failed to fetch business plan:", businessError?.message);
      return new Response(
        JSON.stringify({ error: "Failed to verify subscription status" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Determine effective plan (handle expired trials)
    const effectivePlan = businessData.current_plan === 'trial' && 
      businessData.trial_ends_at && 
      new Date(businessData.trial_ends_at) < new Date() 
        ? 'free' 
        : businessData.current_plan;

    // Enforce Enterprise-only access for WhatsApp support
    if (effectivePlan !== 'enterprise') {
      console.log(`WhatsApp access denied for plan: ${effectivePlan}, user: ${user.id}`);
      return new Response(
        JSON.stringify({ 
          error: "WhatsApp support is available on the Enterprise plan only",
          code: "PLAN_UPGRADE_REQUIRED",
          currentPlan: effectivePlan,
          requiredPlan: "enterprise",
          upgradeMessage: "Upgrade to Enterprise to unlock priority WhatsApp support."
        }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`WhatsApp access granted for Enterprise user: ${user.id}`);

    const PHONE_NUMBER_ID = Deno.env.get("WHATSAPP_PHONE_NUMBER_ID");
    const ACCESS_TOKEN = Deno.env.get("WHATSAPP_ACCESS_TOKEN");

    if (!PHONE_NUMBER_ID || !ACCESS_TOKEN) {
      throw new Error("WhatsApp API credentials not configured");
    }

    const { to, message, templateName, templateParams }: WhatsAppMessageRequest = await req.json();

    if (!to) {
      throw new Error("Recipient phone number is required");
    }

    // Format phone number (remove + and spaces)
    const formattedPhone = to.replace(/[\s+\-()]/g, "");

    let requestBody: any;

    if (templateName) {
      // Send template message
      requestBody = {
        messaging_product: "whatsapp",
        to: formattedPhone,
        type: "template",
        template: {
          name: templateName,
          language: { code: "en" },
          components: templateParams?.length ? [{
            type: "body",
            parameters: templateParams.map(param => ({ type: "text", text: param }))
          }] : undefined
        }
      };
    } else {
      // Send text message
      if (!message) {
        throw new Error("Message content is required");
      }
      requestBody = {
        messaging_product: "whatsapp",
        to: formattedPhone,
        type: "text",
        text: { body: message }
      };
    }

    console.log("Sending WhatsApp message to:", formattedPhone, "by user:", user.id);

    const response = await fetch(
      `https://graph.facebook.com/v18.0/${PHONE_NUMBER_ID}/messages`,
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${ACCESS_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error("WhatsApp API error:", data);
      throw new Error(data.error?.message || "Failed to send WhatsApp message");
    }

    console.log("WhatsApp message sent successfully:", data);

    return new Response(JSON.stringify({ success: true, data }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("Error in send-whatsapp function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});