import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

/**
 * Check if a password meets strong password requirements
 */
export function isStrongPassword(password: string): boolean {
  if (password.length < 8) return false;
  if (!/[A-Z]/.test(password)) return false;
  if (!/[a-z]/.test(password)) return false;
  if (!/[0-9]/.test(password)) return false;
  if (!/[^A-Za-z0-9]/.test(password)) return false;
  return true;
}

/**
 * Hook to check if current user needs to reset their password
 */
export function usePasswordStrengthCheck() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: needsPasswordReset = false, isLoading: isChecking } = useQuery({
    queryKey: ["password-reset-required", user?.id],
    queryFn: async () => {
      if (!user) return false;

      const { data, error } = await supabase
        .from("password_reset_required")
        .select("id, resolved_at")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) {
        console.error("Error checking password reset requirement:", error);
        return false;
      }

      return !!(data && !data.resolved_at);
    },
    enabled: !!user,
    staleTime: 10 * 60 * 1000,
  });

  const clearPasswordResetRequired = () => {
    queryClient.setQueryData(["password-reset-required", user?.id], false);
  };

  const refetch = () => {
    queryClient.invalidateQueries({ queryKey: ["password-reset-required", user?.id] });
  };

  return { needsPasswordReset, isChecking, refetch, clearPasswordResetRequired };
}

/**
 * Get password strength validation errors
 */
export function getPasswordStrengthErrors(password: string): string[] {
  const errors: string[] = [];
  
  if (password.length < 8) {
    errors.push("At least 8 characters");
  }
  if (!/[A-Z]/.test(password)) {
    errors.push("One uppercase letter");
  }
  if (!/[a-z]/.test(password)) {
    errors.push("One lowercase letter");
  }
  if (!/[0-9]/.test(password)) {
    errors.push("One number");
  }
  if (!/[^A-Za-z0-9]/.test(password)) {
    errors.push("One special character");
  }
  
  return errors;
}
