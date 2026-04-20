import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useBusiness } from "@/hooks/useBusiness";
import { usePasswordStrengthCheck } from "@/hooks/usePasswordStrengthCheck";
import { ForcePasswordReset } from "@/components/auth/ForcePasswordReset";
import { OfflineLockScreen } from "@/components/offline/OfflineLockScreen";
import { Loader2, WifiOff } from "lucide-react";
import { useEffect, useState, useRef } from "react";
import { getOfflineAccessInfo, getCachedBusiness } from "@/lib/offlineSession";
import { toast } from "sonner";

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const MAX_SETUP_REDIRECTS = 3;
const REDIRECT_COUNTER_KEY = 'setup_redirect_count';

// Pages that should always be allowed through without redirect checks
const SETUP_PATHS = ["/setup", "/subscription"];

function getRedirectCount(): number {
  return Number(sessionStorage.getItem(REDIRECT_COUNTER_KEY) || 0);
}

function incrementRedirectCount(): number {
  const count = getRedirectCount() + 1;
  sessionStorage.setItem(REDIRECT_COUNTER_KEY, String(count));
  return count;
}

function resetRedirectCount() {
  sessionStorage.removeItem(REDIRECT_COUNTER_KEY);
}

// Check if we have valid cached business data for faster initial render
function hasCachedBusiness(): boolean {
  try {
    const cached = localStorage.getItem('cached_business');
    if (!cached) return false;
    const { data, timestamp } = JSON.parse(cached);
    if (!data) return false;
    const maxAge = navigator.onLine ? 60 * 60 * 1000 : 24 * 60 * 60 * 1000;
    if (Date.now() - timestamp > maxAge) return false;
    return true;
  } catch {
    return false;
  }
}

// Check for cached user session
function hasCachedSession(): boolean {
  try {
    const authStorage = localStorage.getItem('sb-qarkrmokbgyeeieefjbf-auth-token');
    return !!authStorage;
  } catch {
    return false;
  }
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, loading: authLoading, isOfflineMode } = useAuth();
  const { data: business, isLoading: businessLoading, isFetched, error, isPlaceholderData } = useBusiness();
  const { needsPasswordReset, isChecking: isCheckingPassword, clearPasswordResetRequired } = usePasswordStrengthCheck();
  const location = useLocation();
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [offlineAccessExpired, setOfflineAccessExpired] = useState(false);
  const [cachedBusinessData, setCachedBusinessData] = useState<unknown>(null);
  const hasRenderedContent = useRef(false);

  const isSetupPath = SETUP_PATHS.includes(location.pathname);

  // Reset redirect counter when content renders successfully on a non-setup page
  useEffect(() => {
    if (!isSetupPath && hasRenderedContent.current) {
      resetRedirectCount();
    }
  }, [location.pathname, isSetupPath]);

  // Monitor online status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Check offline access status
  useEffect(() => {
    const checkOfflineAccess = async () => {
      if (!isOnline) {
        const accessInfo = await getOfflineAccessInfo();
        const hasLocalFallback = hasCachedSession() && hasCachedBusiness();
        setOfflineAccessExpired(!accessInfo.hasAccess && !hasLocalFallback);
        const cached = await getCachedBusiness();
        if (cached) setCachedBusinessData(cached);
      } else {
        setOfflineAccessExpired(false);
      }
    };
    checkOfflineAccess();
  }, [isOnline]);

  // --- Offline handling ---

  if (!isOnline && ((hasCachedSession() && hasCachedBusiness()) || (isOfflineMode && cachedBusinessData))) {
    return <>{children}</>;
  }

  if (!isOnline && offlineAccessExpired) {
    return (
      <OfflineLockScreen 
        onRetry={() => window.location.reload()}
        expiryMessage="Your offline access period has ended. Please connect to the internet to continue using BVBooks."
      />
    );
  }

  // --- Auth loading ---
  // If we have a cached session AND cached business, skip the auth spinner entirely
  // and render children immediately while auth resolves in background
  if (authLoading && (isOnline || !hasCachedSession())) {
    // Skip spinner if we have cached data for a faster perceived load
    if (hasCachedSession() && hasCachedBusiness()) {
      // Let children render while auth catches up
    } else {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
            <p className="text-muted-foreground">Loading...</p>
          </div>
        </div>
      );
    }
  }

  // Redirect to login only when online and no user (and no cached session)
  if (!user && isOnline) {
    if (hasCachedSession()) {
      // Auth is still resolving, don't redirect yet
    } else {
      return <Navigate to="/" state={{ from: location }} replace />;
    }
  }

  // Offline without user but with cached session
  if (!user && !isOnline && hasCachedSession()) {
    if (hasCachedBusiness()) {
      return <>{children}</>;
    }
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <WifiOff className="h-12 w-12 text-amber-500 mx-auto mb-4" />
          <h2 className="text-lg font-semibold mb-2">You're Offline</h2>
          <p className="text-muted-foreground">Please connect to the internet to continue.</p>
        </div>
      </div>
    );
  }

  // Force password reset only when online
  if (needsPasswordReset && isOnline) {
    return <ForcePasswordReset onPasswordUpdated={clearPasswordResetRequired} />;
  }

  // --- Business loading state (only when online) ---
  // If we have cached business data, skip the business loading spinner
  if ((businessLoading || !isFetched) && isOnline && !isSetupPath) {
    if (hasCachedBusiness()) {
      // Render children with cached data while fresh data loads
    } else {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
            <p className="text-muted-foreground">Loading your business...</p>
          </div>
        </div>
      );
    }
  }

  // --- Setup redirect logic (only when online and query is done) ---
  // Use a grace period after fresh sign-in to avoid redirecting to /setup
  // before the business query has had time to resolve via RPC + retry.

  if (isOnline && isFetched && !isSetupPath) {
    const needsSetup = !business && !isPlaceholderData;

    if (needsSetup) {
      // If user just signed in, give business resolution time to complete
      const signinTs = sessionStorage.getItem('last_signin_timestamp');
      const isRecentLogin = signinTs && (Date.now() - Number(signinTs) < 5000);
      
      if (isRecentLogin) {
        // Still within grace period — show loader instead of redirecting
        return (
          <div className="min-h-screen flex items-center justify-center bg-background">
            <div className="text-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
              <p className="text-muted-foreground">Loading your business...</p>
            </div>
          </div>
        );
      }
      
      const count = incrementRedirectCount();
      if (count > MAX_SETUP_REDIRECTS) {
        console.error(`[ProtectedRoute] Redirect loop detected (${count} redirects). Breaking loop.`);
        toast.error("Redirect loop detected. Showing current page instead of redirecting.");
        resetRedirectCount();
      } else {
        return <Navigate to="/setup" replace />;
      }
    }
  }

  // Mark that we successfully rendered content
  hasRenderedContent.current = true;
  return <>{children}</>;
}
