import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
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
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Auth client for JWT validation (uses anon key + forwarded auth header)
    const authClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace('Bearer ', '');
    const { data, error: authError } = await authClient.auth.getClaims(token);

    // Admin client for DB operations (bypasses RLS)
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    if (authError || !data?.claims) {
      console.error("Invalid authentication token:", authError?.message);
      return new Response(
        JSON.stringify({ error: "Invalid authentication token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userId = data.claims.sub;

    const { templateId, templateName, permissions } = await req.json();

    if (!templateId || !permissions) {
      return new Response(
        JSON.stringify({ error: "templateId and permissions are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // First, get the role template to find its business_id
    const { data: roleTemplate, error: roleError } = await supabase
      .from("role_templates")
      .select("id, name, business_id")
      .eq("id", templateId)
      .single();

    if (roleError || !roleTemplate) {
      console.error("Error fetching role template:", roleError);
      return new Response(
        JSON.stringify({ error: "Role template not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify user is the business owner for this role template
    if (roleTemplate.business_id) {
      const { data: business } = await supabase
        .from("businesses")
        .select("id, owner_user_id")
        .eq("id", roleTemplate.business_id)
        .single();

      if (!business || business.owner_user_id !== userId) {
        console.error("Access denied: user is not business owner", { userId, businessOwnerId: business?.owner_user_id });
        return new Response(
          JSON.stringify({ error: "Access denied: not business owner" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    } else {
      // System template - only super admins can modify
      const { data: adminRole } = await supabase
        .from("admin_roles")
        .select("role")
        .eq("user_id", userId)
        .single();

      if (!adminRole || adminRole.role !== 'super_admin') {
        console.error("Access denied: not super admin for system template");
        return new Response(
          JSON.stringify({ error: "Access denied: system templates require super admin" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Find all staff members who have this role template assigned
    // Use case-insensitive matching and filter by business_id
    let staffQuery = supabase
      .from("staff")
      .select("id, role, business_id")
      .ilike("role", templateName)
      .eq("is_active", true);

    // If role template belongs to a specific business, only sync staff from that business
    if (roleTemplate.business_id) {
      staffQuery = staffQuery.eq("business_id", roleTemplate.business_id);
    }

    const { data: staffMembers, error: staffError } = await staffQuery;

    if (staffError) {
      console.error("Error fetching staff:", staffError);
      return new Response(
        JSON.stringify({ error: "Failed to fetch staff members" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!staffMembers || staffMembers.length === 0) {
      console.log(`No staff members found with role: ${templateName}`);
      return new Response(
        JSON.stringify({ success: true, message: "No staff members with this role", synced: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Found ${staffMembers.length} staff members with role: ${templateName}, syncing by user: ${userId}`);

    let syncedCount = 0;
    const errors: string[] = [];

    // Update permissions for each staff member
    for (const staff of staffMembers) {
      try {
        // Delete existing permissions
        const { error: deleteError } = await supabase
          .from("staff_permissions")
          .delete()
          .eq("staff_id", staff.id);

        if (deleteError) {
          errors.push(`Failed to delete permissions for staff ${staff.id}: ${deleteError.message}`);
          continue;
        }

        // Upsert new permissions (deduplicated)
        const uniquePerms = [...new Set(permissions as string[])];
        if (uniquePerms.length > 0) {
          const permissionRecords = uniquePerms.map((permission: string) => ({
            staff_id: staff.id,
            permission: permission,
          }));

          const { error: insertError } = await supabase
            .from("staff_permissions")
            .upsert(permissionRecords, { onConflict: "staff_id,permission", ignoreDuplicates: true });

          if (insertError) {
            errors.push(`Failed to upsert permissions for staff ${staff.id}: ${insertError.message}`);
            continue;
          }
        }

        console.log(`Synced ${permissions.length} permissions to staff ${staff.id}`);
        syncedCount++;
      } catch (err) {
        errors.push(`Error processing staff ${staff.id}: ${err}`);
      }
    }

    console.log(`Synced permissions for ${syncedCount}/${staffMembers.length} staff members`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        synced: syncedCount, 
        total: staffMembers.length,
        errors: errors.length > 0 ? errors : undefined 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Error in sync-role-permissions:", errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});