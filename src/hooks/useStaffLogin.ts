import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface RecentUser {
  email: string;
  fullName: string;
  lastLogin: string;
  avatarUrl?: string;
  role?: string;
}

const RECENT_USERS_KEY = "bvbooks_recent_users";
const MAX_RECENT_USERS = 5;

// Map database roles to display-friendly labels
// This ensures staff roles are never confused with admin roles
function normalizeRoleDisplay(role: string | null | undefined, isOwner: boolean): string | undefined {
  if (isOwner) return "Owner";
  if (!role) return "Staff";
  
  // Normalize role to lowercase for comparison
  const normalizedRole = role.toLowerCase().trim();
  
  // Map roles to display labels - explicitly prevent "admin" from showing for non-owners
  const roleDisplayMap: Record<string, string> = {
    'owner': 'Owner', // Should never reach here for non-owners
    'manager': 'Manager',
    'cashier': 'Cashier',
    'staff': 'Staff',
    'field agent': 'Field Agent',
    'brm': 'BRM',
    'finance': 'Finance',
    // Any role containing "admin" for staff should be displayed as their actual role
    'admin': 'Staff', // Fallback - staff should never have admin role
    'super admin': 'Staff', // Fallback - staff should never have super admin role
  };
  
  // Return mapped role or the original role (capitalized) if not in map
  // Never return "admin" for non-owners
  if (normalizedRole.includes('admin') && !isOwner) {
    return 'Staff';
  }
  
  return roleDisplayMap[normalizedRole] || 
    role.charAt(0).toUpperCase() + role.slice(1).toLowerCase();
}

export function useStaffLoginTracking() {
  useEffect(() => {
    const trackLogin = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        let isOwner = false;
        let staffRole: string | undefined;
        
        // Check if user is business owner
        const { data: business } = await supabase
          .from("businesses")
          .select("id")
          .eq("owner_user_id", user.id)
          .maybeSingle();
        
        if (business) {
          isOwner = true;
        } else {
          // Get staff role from staff table only
          const { data: staff } = await supabase
            .from("staff")
            .select("role")
            .eq("user_id", user.id)
            .eq("is_active", true)
            .maybeSingle();
          
          staffRole = staff?.role;
        }

        // Use normalized role display to prevent staff showing as admin
        const displayRole = normalizeRoleDisplay(staffRole, isOwner);

        addRecentUser({
          email: user.email || "",
          fullName: user.user_metadata?.full_name || user.email?.split("@")[0] || "User",
          lastLogin: new Date().toISOString(),
          avatarUrl: user.user_metadata?.avatar_url,
          role: displayRole,
        });
      }
    };

    trackLogin();

    return () => {
      console.log("Staff session ended");
    };
  }, []);
}

export function addRecentUser(user: RecentUser): void {
  const recentUsers = getRecentUsers();
  const existingIndex = recentUsers.findIndex(u => u.email === user.email);
  
  if (existingIndex >= 0) {
    recentUsers[existingIndex] = user;
  } else {
    recentUsers.unshift(user);
  }

  // Sort by last login (most recent first)
  recentUsers.sort((a, b) => new Date(b.lastLogin).getTime() - new Date(a.lastLogin).getTime());
  
  localStorage.setItem(RECENT_USERS_KEY, JSON.stringify(recentUsers.slice(0, MAX_RECENT_USERS)));
}

export function getRecentUsers(): RecentUser[] {
  try {
    const stored = localStorage.getItem(RECENT_USERS_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

export function removeRecentUser(email: string): void {
  const recentUsers = getRecentUsers();
  const filtered = recentUsers.filter(u => u.email !== email);
  localStorage.setItem(RECENT_USERS_KEY, JSON.stringify(filtered));
}

export function clearRecentUsers(): void {
  localStorage.removeItem(RECENT_USERS_KEY);
}
