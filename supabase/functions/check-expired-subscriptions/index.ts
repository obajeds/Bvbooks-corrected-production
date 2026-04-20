import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    // Verify this is called from Supabase scheduler or with service role key
    // This function should only be triggered by cron jobs, not public API calls
    const authHeader = req.headers.get("Authorization");
    
    if (!authHeader) {
      console.error("Missing authorization header - unauthorized cron job attempt");
      return new Response(
        JSON.stringify({ success: false, error: "Authorization required" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 401,
        }
      );
    }

    // Verify the request is using the service role key (for cron jobs)
    // or is a valid authenticated super admin
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const token = authHeader.replace("Bearer ", "");
    
    // Check if it's the anon key being used for cron
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const isAnonKeyCron = token === supabaseAnonKey;
    
    if (!isAnonKeyCron) {
      // Verify user is a super admin
      const { data: { user }, error: authError } = await supabase.auth.getUser(token);
      
      if (authError || !user) {
        console.error("Invalid authentication token:", authError?.message);
        return new Response(
          JSON.stringify({ success: false, error: "Invalid authentication" }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 401,
          }
        );
      }

      // Check if user is a super admin
      const { data: adminRole } = await supabase
        .from("admin_roles")
        .select("role, domain")
        .eq("user_id", user.id)
        .eq("domain", "super_admin")
        .single();

      if (!adminRole) {
        console.error("User is not a super admin:", user.id);
        return new Response(
          JSON.stringify({ success: false, error: "Super admin access required" }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 403,
          }
        );
      }

      console.log("Authorized super admin:", user.id);
    } else {
      console.log("Authorized cron job execution");
    }

    console.log("Checking for expired subscriptions - STRICT MODE (no grace period)...");

    const now = new Date().toISOString();

    // Find subscriptions that:
    // 1. Are cancelled, expired, or past their end_date
    // 2. Are not already on the starter/free plan
    // STRICT: No 24-hour grace period - immediate enforcement
    const { data: expiredSubscriptions, error: fetchError } = await supabase
      .from("subscriptions")
      .select("id, business_id, plan, status, end_date")
      .or(`status.in.(cancelled,expired),end_date.lt.${now}`)
      .neq("plan", "free");

    if (fetchError) {
      console.error("Error fetching expired subscriptions:", fetchError);
      throw fetchError;
    }

    console.log(`Found ${expiredSubscriptions?.length || 0} subscriptions to downgrade`);

    const results = {
      processed: 0,
      downgraded: 0,
      errors: [] as string[],
    };

    if (expiredSubscriptions && expiredSubscriptions.length > 0) {
      for (const subscription of expiredSubscriptions) {
        results.processed++;

        try {
          // Update subscription to free plan
          const { error: updateSubError } = await supabase
            .from("subscriptions")
            .update({
              plan: "free",
              status: "active",
              updated_at: new Date().toISOString(),
            })
            .eq("id", subscription.id);

          if (updateSubError) {
            console.error(`Error updating subscription ${subscription.id}:`, updateSubError);
            results.errors.push(`Subscription ${subscription.id}: ${updateSubError.message}`);
            continue;
          }

          // Also update the business current_plan to free
          const { error: updateBizError } = await supabase
            .from("businesses")
            .update({
              current_plan: "free",
              subscription_plan: "free",
              updated_at: new Date().toISOString(),
            })
            .eq("id", subscription.business_id);

          if (updateBizError) {
            console.error(`Error updating business ${subscription.business_id}:`, updateBizError);
            results.errors.push(`Business ${subscription.business_id}: ${updateBizError.message}`);
            continue;
          }

          // Create a notification for the business
          await supabase
            .from("business_notifications")
            .insert({
              business_id: subscription.business_id,
              title: "Subscription Downgraded",
              message: "Your subscription has been downgraded to the Free plan due to expiration. Upgrade anytime to restore premium features.",
              type: "warning",
            });

          console.log(`Successfully downgraded subscription ${subscription.id} to free plan`);
          results.downgraded++;
        } catch (err: unknown) {
          const errorMessage = err instanceof Error ? err.message : String(err);
          console.error(`Error processing subscription ${subscription.id}:`, err);
          results.errors.push(`Subscription ${subscription.id}: ${errorMessage}`);
        }
      }
    }

    console.log("Subscription check complete:", results);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Processed ${results.processed} subscriptions, downgraded ${results.downgraded}`,
        results,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("Error in check-expired-subscriptions:", error);
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
