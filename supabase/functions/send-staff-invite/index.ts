import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.2";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface BranchAssignment {
  branch_id: string;
  role_template_id: string | null;
  is_primary: boolean;
  expires_at: string | null;
}

interface InviteRequest {
  email: string;
  full_name: string;
  phone?: string;
  branch_assignments: BranchAssignment[];
}

const generateToken = (): string => {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
};

serve(async (req: Request): Promise<Response> => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    
    // Get auth header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      console.error("No authorization header provided");
      throw new Error("No authorization header");
    }

    // Extract token from Bearer header
    const token = authHeader.replace("Bearer ", "");
    
    // Create admin client to verify user
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    
    // Verify the JWT and get user
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);
    if (userError || !user) {
      console.error("User verification failed:", userError?.message || "No user found");
      throw new Error("Unauthorized - Invalid token");
    }

    console.log(`Authenticated user: ${user.email} (${user.id})`);

    // Get user's business (using admin client since we've verified the user)
    const { data: business, error: businessError } = await supabaseAdmin
      .from("businesses")
      .select("id, trading_name")
      .eq("owner_user_id", user.id)
      .single();

    if (businessError || !business) {
      console.error("Business lookup failed:", businessError?.message || "No business found");
      throw new Error("Business not found or you don't have permission");
    }

    console.log(`Business found: ${business.trading_name} (${business.id})`);

    const { email, full_name, phone, branch_assignments }: InviteRequest = await req.json();

    // Validate input
    if (!email || !full_name) {
      throw new Error("Email and full name are required");
    }

    if (!branch_assignments || branch_assignments.length === 0) {
      throw new Error("At least one branch assignment is required");
    }

    // supabaseAdmin already created above for user verification

    // === CROSS-BUSINESS EMAIL UNIQUENESS CHECK ===
    // Check if email is a business owner in any other business
    const { data: ownerConflict } = await supabaseAdmin
      .from("businesses")
      .select("id")
      .eq("owner_email", email.toLowerCase())
      .neq("id", business.id)
      .limit(1)
      .maybeSingle();

    if (ownerConflict) {
      console.log(`Email ${email} is already a business owner elsewhere`);
      throw new Error("A user account with this email already exists. Please use another email.");
    }

    // Check if email is active staff in any other business
    const { data: staffConflict } = await supabaseAdmin
      .from("staff")
      .select("id")
      .eq("email", email.toLowerCase())
      .neq("business_id", business.id)
      .eq("is_active", true)
      .limit(1)
      .maybeSingle();

    if (staffConflict) {
      console.log(`Email ${email} is already staff in another business`);
      throw new Error("A user account with this email already exists. Please use another email.");
    }

    // Check if email already has a pending invitation
    const { data: existingInvite } = await supabaseAdmin
      .from("staff_invitations")
      .select("id")
      .eq("business_id", business.id)
      .eq("email", email.toLowerCase())
      .eq("status", "pending")
      .single();

    if (existingInvite) {
      throw new Error("An invitation is already pending for this email");
    }

    // Check if staff already exists with this email
    const { data: existingStaff } = await supabaseAdmin
      .from("staff")
      .select("id, full_name, is_active")
      .eq("business_id", business.id)
      .eq("email", email.toLowerCase())
      .single();

    // If staff exists, add new branch assignments instead of blocking
    if (existingStaff) {
      console.log(`Staff ${existingStaff.full_name} exists, adding branch assignments`);
      
      // Get existing branch assignments
      const { data: existingAssignments } = await supabaseAdmin
        .from("staff_branch_assignments")
        .select("branch_id")
        .eq("staff_id", existingStaff.id);
      
      const existingBranchIds = new Set(existingAssignments?.map(a => a.branch_id) || []);
      
      // Filter to only new branches
      const newAssignments = branch_assignments.filter(ba => !existingBranchIds.has(ba.branch_id));
      
      if (newAssignments.length === 0) {
        throw new Error("This staff member already has access to all selected branches");
      }
      
      // Add new branch assignments
      const staffBranchRecords = newAssignments.map(ba => ({
        staff_id: existingStaff.id,
        branch_id: ba.branch_id,
        role_template_id: ba.role_template_id || null,
        is_primary: false, // Don't change primary for existing staff
        expires_at: ba.expires_at || null,
        is_active: true
      }));

      const { error: branchError } = await supabaseAdmin
        .from("staff_branch_assignments")
        .insert(staffBranchRecords);

      if (branchError) {
        console.error("Error adding branch assignments:", branchError);
        throw new Error("Failed to add branch assignments");
      }

      // Determine the latest role template from the new assignments
      const latestRoleTemplateId = newAssignments.find(a => a.role_template_id)?.role_template_id;

      // Delete ALL existing permissions first (replace, don't merge)
      await supabaseAdmin
        .from("staff_permissions")
        .delete()
        .eq("staff_id", existingStaff.id);

      // If there's a new role template, update staff role and all active branch assignments
      if (latestRoleTemplateId) {
        const { data: roleTemplate } = await supabaseAdmin
          .from("role_templates")
          .select("name, permissions")
          .eq("id", latestRoleTemplateId)
          .single();

        if (roleTemplate) {
          // Update staff role to the latest assigned role
          await supabaseAdmin
            .from("staff")
            .update({ role: roleTemplate.name })
            .eq("id", existingStaff.id);

          // Update all existing active branch assignments to the new role template
          await supabaseAdmin
            .from("staff_branch_assignments")
            .update({ role_template_id: latestRoleTemplateId })
            .eq("staff_id", existingStaff.id)
            .eq("is_active", true);

          // Insert new permissions from the role template
          if (roleTemplate.permissions && roleTemplate.permissions.length > 0) {
            const uniquePerms = [...new Set(roleTemplate.permissions as string[])];
            const permRecords = uniquePerms.map((p: string) => ({
              staff_id: existingStaff.id,
              permission: p
            }));

            await supabaseAdmin
              .from("staff_permissions")
              .insert(permRecords);
          }
        }
      }

      // Get branch names for notification email
      const { data: newBranches } = await supabaseAdmin
        .from("branches")
        .select("id, name")
        .in("id", newAssignments.map(ba => ba.branch_id));

      const newBranchNames = newBranches?.map(b => b.name).join(", ") || "new branches";

      // Log activity
      await supabaseAdmin.from("activity_logs").insert({
        business_id: business.id,
        user_id: user.id,
        action: "staff_branches_updated",
        entity_type: "staff",
        entity_id: existingStaff.id,
        entity_name: existingStaff.full_name,
        details: {
          added_branches: newAssignments.length,
          email
        }
      });

      // Send notification email to existing staff about new branch access
      const { error: notifyEmailError } = await resend.emails.send({
        from: "BVBooks <noreply@bvbooks.net>",
        to: [email],
        subject: `New branch access granted - ${business.trading_name}`,
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background-color: #f4f4f5;">
            <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
              <div style="background: white; border-radius: 12px; padding: 40px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                <h1 style="color: #18181b; margin: 0 0 24px; font-size: 24px;">New Branch Access Granted</h1>
                
                <p style="color: #52525b; font-size: 16px; line-height: 1.6; margin: 0 0 16px;">
                  Hello ${existingStaff.full_name},
                </p>
                
                <p style="color: #52525b; font-size: 16px; line-height: 1.6; margin: 0 0 24px;">
                  You have been granted access to additional branches at <strong>${business.trading_name}</strong>.
                </p>
                
                <div style="background: #f0f9ff; border-left: 4px solid #2563eb; padding: 16px; margin: 0 0 24px; border-radius: 0 8px 8px 0;">
                  <p style="color: #1e40af; font-size: 14px; margin: 0; font-weight: 600;">New Branch Access:</p>
                  <p style="color: #1e40af; font-size: 16px; margin: 8px 0 0;">${newBranchNames}</p>
                </div>
                
                <p style="color: #52525b; font-size: 16px; line-height: 1.6; margin: 0 0 24px;">
                  You can now access these branches when you log in to BVBooks.
                </p>
                
                <hr style="border: none; border-top: 1px solid #e4e4e7; margin: 32px 0;">
                
                <p style="color: #a1a1aa; font-size: 12px; margin: 0;">
                  If you have any questions, please contact your administrator.
                </p>
              </div>
            </div>
          </body>
          </html>
        `
      });

      if (notifyEmailError) {
        console.error("Error sending notification email:", notifyEmailError);
        // Don't fail the request, just log it
      }

      console.log(`Branch update notification sent to ${email} for business ${business.id}`);

      return new Response(
        JSON.stringify({ 
          success: true, 
          message: `Added ${newAssignments.length} new branch assignment(s) to existing staff`,
          staff_id: existingStaff.id,
          existing_staff: true
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json", ...corsHeaders }
        }
      );
    }

    // Generate invitation token
    const invitationToken = generateToken();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days expiry

    // Create invitation
    const { data: invitation, error: inviteError } = await supabaseAdmin
      .from("staff_invitations")
      .insert({
        business_id: business.id,
        email: email.toLowerCase(),
        full_name,
        phone: phone || null,
        invitation_token: invitationToken,
        expires_at: expiresAt.toISOString(),
        invited_by: user.id,
        status: "pending"
      })
      .select()
      .single();

    if (inviteError) {
      console.error("Error creating invitation:", inviteError);
      throw new Error("Failed to create invitation");
    }

    // Create branch assignments for the invitation
    const branchAssignmentRecords = branch_assignments.map(ba => ({
      invitation_id: invitation.id,
      branch_id: ba.branch_id,
      role_template_id: ba.role_template_id || null,
      is_primary: ba.is_primary,
      expires_at: ba.expires_at || null
    }));

    const { error: assignmentError } = await supabaseAdmin
      .from("invitation_branch_assignments")
      .insert(branchAssignmentRecords);

    if (assignmentError) {
      console.error("Error creating branch assignments:", assignmentError);
      // Rollback invitation
      await supabaseAdmin.from("staff_invitations").delete().eq("id", invitation.id);
      throw new Error("Failed to create branch assignments");
    }

    // Get branch names for email
    const { data: branches } = await supabaseAdmin
      .from("branches")
      .select("id, name")
      .in("id", branch_assignments.map(ba => ba.branch_id));

    const branchNames = branches?.map(b => b.name).join(", ") || "your assigned branches";

    // Log activity
    await supabaseAdmin.from("activity_logs").insert({
      business_id: business.id,
      user_id: user.id,
      action: "staff_invited",
      entity_type: "staff_invitation",
      entity_id: invitation.id,
      entity_name: full_name,
      details: {
        email,
        branch_count: branch_assignments.length,
        expires_at: expiresAt.toISOString()
      }
    });

    // Build invitation URL - use production URL for Client Admin
    const requestOrigin = req.headers.get("origin") || "";
    const isProduction = requestOrigin.includes("bvbooks.net") || 
                         requestOrigin.includes("app.bvbooks.net") ||
                         (!requestOrigin.includes("localhost") && 
                          !requestOrigin.includes("lovable.app") && 
                          !requestOrigin.includes("lovable.dev") &&
                          !requestOrigin.includes("lovableproject.com"));
    
    // Production URL for Client Admin - never fallback to preview URLs
    const appUrl = isProduction ? "https://app.bvbooks.net" : requestOrigin || "https://app.bvbooks.net";
    const inviteUrl = `${appUrl}/accept-invite?token=${invitationToken}`;

    // Send email
    const { error: emailError } = await resend.emails.send({
      from: "BVBooks <noreply@bvbooks.net>",
      to: [email],
      subject: `You're invited to join ${business.trading_name}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background-color: #f4f4f5;">
          <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
            <div style="background: white; border-radius: 12px; padding: 40px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
              <h1 style="color: #18181b; margin: 0 0 24px; font-size: 24px;">Welcome to ${business.trading_name}!</h1>
              
              <p style="color: #52525b; font-size: 16px; line-height: 1.6; margin: 0 0 16px;">
                Hello ${full_name},
              </p>
              
              <p style="color: #52525b; font-size: 16px; line-height: 1.6; margin: 0 0 24px;">
                You've been invited to join <strong>${business.trading_name}</strong> as a staff member. 
                You will have access to: <strong>${branchNames}</strong>.
              </p>
              
              <a href="${inviteUrl}" style="display: inline-block; background: #2563eb; color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px;">
                Accept Invitation
              </a>
              
              <p style="color: #71717a; font-size: 14px; margin: 24px 0 0;">
                This invitation expires on ${expiresAt.toLocaleDateString("en-US", { 
                  weekday: "long", 
                  year: "numeric", 
                  month: "long", 
                  day: "numeric" 
                })}.
              </p>
              
              <hr style="border: none; border-top: 1px solid #e4e4e7; margin: 32px 0;">
              
              <p style="color: #a1a1aa; font-size: 12px; margin: 0;">
                If you didn't expect this invitation, you can safely ignore this email.
              </p>
            </div>
          </div>
        </body>
        </html>
      `
    });

    if (emailError) {
      console.error("Error sending email:", emailError);
      // Don't fail the request, just log it
    }

    console.log(`Invitation sent to ${email} for business ${business.id}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        invitation_id: invitation.id,
        invite_url: inviteUrl,
        email_sent: !emailError
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders }
      }
    );

  } catch (error: any) {
    console.error("Error in send-staff-invite:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders }
      }
    );
  }
});
