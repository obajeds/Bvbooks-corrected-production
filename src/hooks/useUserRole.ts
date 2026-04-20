import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useBusiness } from "./useBusiness";
import { ALL_PERMISSIONS, type PermissionKey } from "@/lib/permissions";

export type AppRole = "owner" | "manager" | "supervisor" | "cashier" | "sales_rep" | "accountant" | "staff" | "pending" | null;

interface RoleData {
  role: AppRole;
  isOwner: boolean;
  permissions: PermissionKey[];
  staffId: string | null;
}

// STRICT RBAC: No legacy fallback permissions.
// Staff get ZERO permissions until explicitly assigned via role templates or staff_permissions.
// Only the owner role gets all permissions implicitly.

export function hasPermission(role: AppRole, feature: string): boolean {
  // Owner always has access
  if (role === "owner") return true;
  // Pending staff have NO access at all
  if (!role || role === "pending") return false;
  // All other roles: deny by default. Permissions are checked via BranchContext.
  const alwaysAccessible = ["home", "notifications"];
  return alwaysAccessible.includes(feature);
}

export function getRoleBadgeColor(role: AppRole): string {
  switch (role) {
    case "owner":
      return "bg-purple-100 text-purple-800";
    case "manager":
      return "bg-blue-100 text-blue-800";
    case "supervisor":
      return "bg-indigo-100 text-indigo-800";
    case "cashier":
      return "bg-green-100 text-green-800";
    case "sales_rep":
      return "bg-amber-100 text-amber-800";
    case "accountant":
      return "bg-teal-100 text-teal-800";
    case "pending":
      return "bg-red-100 text-red-800";
    case "staff":
      return "bg-gray-100 text-gray-800";
    default:
      return "bg-gray-100 text-gray-800";
  }
}

// Cache is used ONLY for display optimization (reducing flicker).
// NEVER use cached role data for authorization decisions.
const ROLE_CACHE_KEY = 'user_role_display';

function setCachedRole(data: RoleData, userId?: string) {
  try {
    sessionStorage.setItem(ROLE_CACHE_KEY, JSON.stringify({ ...data, userId }));
  } catch {
    // sessionStorage might be unavailable
  }
}

function clearRoleCache() {
  try {
    sessionStorage.removeItem(ROLE_CACHE_KEY);
  } catch {
    // ignore
  }
}

export function useUserRole() {
  const { user } = useAuth();
  const { data: business, isLoading: businessLoading } = useBusiness();

  return useQuery({
    queryKey: ["user-role", business?.id, user?.id],
    queryFn: async (): Promise<RoleData> => {
      if (!user) {
        clearRoleCache();
        return { role: null, isOwner: false, permissions: [], staffId: null };
      }

      // Business must be loaded for owner check to work correctly
      if (!business) {
        return { role: null, isOwner: false, permissions: [], staffId: null };
      }

      // Check if user is the business owner
      if (business.owner_user_id === user.id) {
        const result: RoleData = { 
          role: "owner", 
          isOwner: true, 
          permissions: ALL_PERMISSIONS,
          staffId: null 
        };
        setCachedRole(result, user.id);
        return result;
      }

      // Check if user is a staff member
      const { data: staff } = await supabase
        .from("staff")
        .select("id, role, is_active")
        .eq("user_id", user.id)
        .eq("is_active", true)
        .maybeSingle();

      if (!staff) {
        return { role: null, isOwner: false, permissions: [], staffId: null };
      }

      // Get granular permissions from staff_permissions table
      const { data: permissionRecords } = await supabase
        .from("staff_permissions")
        .select("permission")
        .eq("staff_id", staff.id);

      let permissions: PermissionKey[] = [];
      
      if (permissionRecords && permissionRecords.length > 0) {
        permissions = permissionRecords.map(p => p.permission as PermissionKey);
      }

      // STRICT: Staff can never have "owner" role
      const rawRole = staff.role?.toLowerCase();
      const role = (rawRole === "owner" ? "staff" : staff.role) as AppRole;
      const result: RoleData = { 
        role, 
        isOwner: false, 
        permissions,
        staffId: staff.id 
      };
      setCachedRole(result, user.id);
      return result;
    },
    enabled: !businessLoading && !!business && !!user,
    staleTime: 60 * 1000,
  });
}
