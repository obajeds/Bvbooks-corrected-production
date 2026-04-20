import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.2";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Input validation schema
const acceptRequestSchema = z.object({
  token: z.string().min(20).max(200), // Invitation tokens are typically long
  password: z.string()
    .min(8, "Password must be at least 8 characters")
    .max(100, "Password too long")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[a-z]/, "Password must contain at least one lowercase letter")
    .regex(/[0-9]/, "Password must contain at least one number")
    .regex(/[^A-Za-z0-9]/, "Password must contain at least one special character"),
});

// Simple in-memory rate limiting
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 5; // 5 attempts per window
const RATE_WINDOW_MS = 60_000; // 1 minute

function checkRateLimit(identifier: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(identifier);
  
  if (!entry || entry.resetAt <= now) {
    rateLimitMap.set(identifier, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return true;
  }
  
  if (entry.count >= RATE_LIMIT) {
    return false;
  }
  
  entry.count++;
  return true;
}

serve(async (req: Request): Promise<Response> => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Rate limit by IP
    const clientIP = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    if (!checkRateLimit(clientIP)) {
      return new Response(
        JSON.stringify({ error: "Too many attempts. Please try again later." }),
        { status: 429, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Parse and validate input
    const rawBody = await req.json();
    const parseResult = acceptRequestSchema.safeParse(rawBody);
    
    if (!parseResult.success) {
      const errors = parseResult.error.errors.map(e => e.message).join(", ");
      return new Response(
        JSON.stringify({ error: errors }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const { token, password } = parseResult.data;

    // Strong password validation
    if (password.length < 8) {
      throw new Error("Password must be at least 8 characters");
    }
    if (!/[A-Z]/.test(password)) {
      throw new Error("Password must contain at least one uppercase letter");
    }
    if (!/[a-z]/.test(password)) {
      throw new Error("Password must contain at least one lowercase letter");
    }
    if (!/[0-9]/.test(password)) {
      throw new Error("Password must contain at least one number");
    }
    if (!/[^A-Za-z0-9]/.test(password)) {
      throw new Error("Password must contain at least one special character");
    }

    // Get invitation by token
    const { data: invitation, error: inviteError } = await supabaseAdmin
      .from("staff_invitations")
      .select(`
        *,
        businesses:business_id (id, trading_name)
      `)
      .eq("invitation_token", token)
      .eq("status", "pending")
      .single();

    if (inviteError || !invitation) {
      throw new Error("Invalid or expired invitation");
    }

    // Check if expired
    if (new Date(invitation.expires_at) < new Date()) {
      // Mark as expired
      await supabaseAdmin
        .from("staff_invitations")
        .update({ status: "expired" })
        .eq("id", invitation.id);
      throw new Error("This invitation has expired");
    }

    // Get branch assignments for this invitation
    const { data: branchAssignments, error: assignmentsError } = await supabaseAdmin
      .from("invitation_branch_assignments")
      .select(`
        *,
        branches:branch_id (id, name),
        role_templates:role_template_id (id, name, permissions)
      `)
      .eq("invitation_id", invitation.id);

    if (assignmentsError) {
      console.error("Error fetching branch assignments:", assignmentsError);
      throw new Error("Failed to fetch branch assignments");
    }

    let userId: string;
    let isExistingUser = false;

    // Try to create auth user first
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: invitation.email,
      password: password,
      email_confirm: true,
      user_metadata: {
        full_name: invitation.full_name
      }
    });

    if (authError) {
      // If user already exists, try to get their ID and update their password
      if (authError.message.includes("already been registered") || authError.code === "email_exists") {
        console.log("User already exists, looking up existing user...");
        
        // Get existing user by email
        const { data: existingUsers, error: listError } = await supabaseAdmin.auth.admin.listUsers();
        if (listError) {
          console.error("Error listing users:", listError);
          throw new Error("Failed to look up existing user");
        }
        
        const existingUser = existingUsers.users.find(u => u.email === invitation.email);
        if (!existingUser) {
          throw new Error("Could not find existing user account");
        }
        
        // Update the user's password to the new one they provided
        const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
          existingUser.id,
          { password: password }
        );
        
        if (updateError) {
          console.error("Error updating user password:", updateError);
          throw new Error("Failed to update user credentials");
        }
        
        userId = existingUser.id;
        isExistingUser = true;
        console.log("Found existing user:", userId);
      } else {
        console.error("Error creating auth user:", authError);
        throw new Error("Failed to create user account");
      }
    } else {
      userId = authData.user.id;
    }

    // Get primary branch assignment
    const primaryAssignment = branchAssignments?.find(ba => ba.is_primary) || branchAssignments?.[0];

    // Check if staff record already exists for this user in this business
    const { data: existingStaff } = await supabaseAdmin
      .from("staff")
      .select("id")
      .eq("user_id", userId)
      .eq("business_id", invitation.business_id)
      .single();

    let staff;

    if (existingStaff) {
      // Update existing staff record
      const { data: updatedStaff, error: updateStaffError } = await supabaseAdmin
        .from("staff")
        .update({
          full_name: invitation.full_name,
          phone: invitation.phone,
          role: primaryAssignment?.role_templates?.name || "staff",
          branch_id: primaryAssignment?.branch_id || null,
          is_active: true
        })
        .eq("id", existingStaff.id)
        .select()
        .single();

      if (updateStaffError) {
        console.error("Error updating staff:", updateStaffError);
        throw new Error("Failed to update staff record");
      }
      staff = updatedStaff;
      console.log("Updated existing staff record:", staff.id);
    } else {
      // Create new staff record
      const { data: newStaff, error: staffError } = await supabaseAdmin
        .from("staff")
        .insert({
          business_id: invitation.business_id,
          user_id: userId,
          full_name: invitation.full_name,
          email: invitation.email,
          phone: invitation.phone,
          role: primaryAssignment?.role_templates?.name || "staff",
          branch_id: primaryAssignment?.branch_id || null,
          hire_date: new Date().toISOString().split("T")[0],
          is_active: true
        })
        .select()
        .single();

      if (staffError) {
        console.error("Error creating staff:", staffError);
        // Rollback auth user only if we created a new one
        if (!isExistingUser) {
          await supabaseAdmin.auth.admin.deleteUser(userId);
        }
        throw new Error("Failed to create staff record");
      }
      staff = newStaff;
      console.log("Created new staff record:", staff.id);
    }

    // Create staff branch assignments
    if (branchAssignments && branchAssignments.length > 0) {
      const staffBranchRecords = branchAssignments.map(ba => ({
        staff_id: staff.id,
        branch_id: ba.branch_id,
        role_template_id: ba.role_template_id,
        is_primary: ba.is_primary,
        expires_at: ba.expires_at,
        is_active: true
      }));

      const { error: branchError } = await supabaseAdmin
        .from("staff_branch_assignments")
        .insert(staffBranchRecords);

      if (branchError) {
        console.error("Error creating staff branch assignments:", branchError);
      }

      // Delete ALL existing permissions first (replace, don't merge)
      await supabaseAdmin
        .from("staff_permissions")
        .delete()
        .eq("staff_id", staff.id);

      // Create staff permissions based on role templates
      const allPermissions: { staff_id: string; permission: string }[] = [];
      
      for (const assignment of branchAssignments) {
        if (assignment.role_templates?.permissions) {
          for (const permission of assignment.role_templates.permissions) {
            if (!allPermissions.find(p => p.permission === permission)) {
              allPermissions.push({
                staff_id: staff.id,
                permission: permission
              });
            }
          }
        }
      }

      if (allPermissions.length > 0) {
        const { error: permError } = await supabaseAdmin
          .from("staff_permissions")
          .insert(allPermissions);

        if (permError) {
          console.error("Error creating staff permissions:", permError);
        }
      }
    }

    // Update invitation status
    await supabaseAdmin
      .from("staff_invitations")
      .update({
        status: "accepted",
        accepted_at: new Date().toISOString()
      })
      .eq("id", invitation.id);

    // Log activity
    await supabaseAdmin.from("activity_logs").insert({
      business_id: invitation.business_id,
      user_id: userId,
      staff_id: staff.id,
      action: isExistingUser ? "staff_reactivated" : "staff_activated",
      entity_type: "staff",
      entity_id: staff.id,
      entity_name: staff.full_name,
      details: {
        email: invitation.email,
        branch_count: branchAssignments?.length || 0,
        invitation_id: invitation.id,
        is_existing_user: isExistingUser
      }
    });

    console.log(`Staff ${staff.full_name} activated for business ${invitation.business_id}`);

    return new Response(
      JSON.stringify({
        success: true,
        staff_id: staff.id,
        business_name: invitation.businesses?.trading_name,
        branches: branchAssignments?.map(ba => ({
          name: ba.branches?.name,
          role: ba.role_templates?.name || "staff"
        }))
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders }
      }
    );

  } catch (error: unknown) {
    // Sanitize error - don't leak internal details
    const errorMessage = error instanceof Error ? error.message : "An error occurred";
    console.error("Error in accept-staff-invite:", errorMessage);
    
    // Return safe error message
    const safeMessage = 
      errorMessage.includes("expired") ? "This invitation has expired" :
      errorMessage.includes("Invalid") ? "Invalid invitation" :
      errorMessage.includes("Password") ? errorMessage : // Password validation messages are safe
      "Failed to process invitation. Please try again.";
    
    return new Response(
      JSON.stringify({ error: safeMessage }),
      {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders }
      }
    );
  }
});
