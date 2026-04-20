import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { detectExperience, getExperiencePath, ExperienceType } from "@/lib/experienceRouting";
import { useUserRole } from "@/hooks/useUserRole";
import { Loader2 } from "lucide-react";

interface ExperienceRouterProps {
  children?: React.ReactNode;
}

/**
 * ExperienceRouter - Redirects users to mobile or web experience
 * based on their role and device characteristics
 * 
 * This component should wrap the main dashboard entry point
 * to ensure users land on the correct experience
 */
export function ExperienceRouter({ children }: ExperienceRouterProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const userRoleQuery = useUserRole();
  const role = userRoleQuery.data?.role;
  const roleLoading = userRoleQuery.isLoading;
  const [hasRouted, setHasRouted] = useState(false);

  useEffect(() => {
    // Wait for role to load
    if (roleLoading) return;
    
    // Only route once per mount
    if (hasRouted) return;

    const experience = detectExperience({ role });
    
    // Determine target path based on experience
    // If coming from a specific path, preserve it
    const currentPath = location.pathname;
    
    // Skip if already on the correct experience path
    if (experience === 'mobile' && currentPath.startsWith('/mobile')) {
      setHasRouted(true);
      return;
    }
    if (experience === 'web' && currentPath.startsWith('/dashboard')) {
      setHasRouted(true);
      return;
    }

    // Route to correct experience
    const targetPath = getExperiencePath(currentPath, experience);
    
    // Use replace to avoid back button issues
    navigate(targetPath, { replace: true });
    setHasRouted(true);
  }, [role, roleLoading, hasRouted, location.pathname, navigate]);

  // Show loading while determining experience
  if (roleLoading && !hasRouted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading your experience...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

/**
 * Hook to get the current detected experience
 */
export function useExperience(): { experience: ExperienceType; isLoading: boolean } {
  const userRoleQuery = useUserRole();
  const role = userRoleQuery.data?.role;
  const isLoading = userRoleQuery.isLoading;
  const [experience, setExperience] = useState<ExperienceType>('web');

  useEffect(() => {
    if (!isLoading) {
      setExperience(detectExperience({ role }));
    }
  }, [role, isLoading]);

  return { experience, isLoading };
}
