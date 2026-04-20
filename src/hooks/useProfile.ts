import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface Profile {
  id: string;
  full_name: string | null;
  email: string | null;
  avatar_url: string | null;
}

export function useProfile() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["profile", user?.id],
    queryFn: async (): Promise<Profile | null> => {
      if (!user) return null;

      // For now, return basic profile from auth user
      return {
        id: user.id,
        full_name: user.user_metadata?.full_name || user.email?.split("@")[0] || "User",
        email: user.email || null,
        avatar_url: user.user_metadata?.avatar_url || null,
      };
    },
    enabled: !!user,
  });
}
