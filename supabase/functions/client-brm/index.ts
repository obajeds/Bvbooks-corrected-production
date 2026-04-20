import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const action = url.searchParams.get('action');
    const businessId = url.searchParams.get('businessId');

    console.log('Client BRM request:', { action, businessId });

    if (!action || !businessId) {
      return new Response(
        JSON.stringify({ error: 'Missing required parameters: action and businessId' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get auth header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    // Create client with user's token to verify auth
    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey);
    
    // Verify the user's JWT
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);
    
    if (authError || !user) {
      console.error('Auth error:', authError);
      return new Response(
        JSON.stringify({ ok: false, error: 'Invalid or expired token' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Authenticated user:', user.id);

    if (action === 'get-brm') {
      // Get the business and verify user has access
      const { data: business, error: businessError } = await supabaseClient
        .from('businesses')
        .select('id, brm_id, owner_user_id')
        .eq('id', businessId)
        .single();

      if (businessError || !business) {
        console.error('Business error:', businessError);
        return new Response(
          JSON.stringify({ error: 'Business not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Check if user is the owner or a staff member
      const isOwner = business.owner_user_id === user.id;
      
      let isStaff = false;
      if (!isOwner) {
        const { data: staffRecord } = await supabaseClient
          .from('staff')
          .select('id')
          .eq('business_id', businessId)
          .eq('user_id', user.id)
          .eq('is_active', true)
          .maybeSingle();
        
        isStaff = !!staffRecord;
      }

      if (!isOwner && !isStaff) {
        return new Response(
          JSON.stringify({ error: 'Access denied' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (!business.brm_id) {
        return new Response(
          JSON.stringify({ brm: null, message: 'No BRM assigned' }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Fetch BRM details
      const { data: brm, error: brmError } = await supabaseClient
        .from('brms')
        .select('id, first_name, last_name, staff_id, whatsapp_number, email, phone, status')
        .eq('id', business.brm_id)
        .single();

      if (brmError) {
        console.error('BRM error:', brmError);
        return new Response(
          JSON.stringify({ error: 'Failed to fetch BRM data' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log('BRM fetched successfully:', brm?.staff_id);

      return new Response(
        JSON.stringify({ brm }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Unknown action' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in client-brm function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Detailed error:', errorMessage);
    return new Response(
      JSON.stringify({ error: 'An error occurred. Please try again.' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
