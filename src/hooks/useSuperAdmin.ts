import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useSuperAdmin() {
  return useQuery({
    queryKey: ["super-admin-check"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        console.log("[SuperAdmin] No user logged in");
        return { isSuperAdmin: false };
      }

      console.log("[SuperAdmin] Checking admin status for user:", user.id);

      // Check if user has super_admin role in admin_roles table
      const { data: adminRole, error } = await supabase
        .from("admin_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "super_admin")
        .maybeSingle();

      if (error) {
        console.error("[SuperAdmin] Error checking super admin status:", error);
        return { isSuperAdmin: false };
      }

      console.log("[SuperAdmin] Admin role found:", adminRole);
      return { isSuperAdmin: !!adminRole };
    },
  });
}
