import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { 
  cacheSession, 
  getCachedSession, 
  clearCachedSession,
  cachePermissions,
  cacheBusiness,
  cacheSubscription,
  type OfflineBusinessData,
  type OfflineSubscriptionData
} from '@/lib/offlineSession';
import { getEmailConfirmUrl } from '@/lib/authUrls';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  isOfflineMode: boolean;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isOfflineMode, setIsOfflineMode] = useState(false);
  const queryClient = useQueryClient();

  useEffect(() => {
    let isMounted = true;
    let hasResolved = false;
    let initialSessionChecked = false;

    const resolveLoading = () => {
      if (isMounted && !hasResolved) {
        hasResolved = true;
        setLoading(false);
      }
    };

    // Safety timeout - shorter when offline to avoid blocking UI
    const timeoutDuration = navigator.onLine ? 3000 : 2000;
    const timeoutId = setTimeout(() => {
      if (!hasResolved) {
        console.warn('Auth check timed out, resolving loading state');
        resolveLoading();
      }
    }, timeoutDuration);

    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (isMounted) {
          // Always set session state first, before any redirects
          setSession(session);
          setUser(session?.user ?? null);
          setIsOfflineMode(false);

          if (event === 'PASSWORD_RECOVERY') {
            if (window.location.pathname !== '/reset-password') {
              window.location.replace('/reset-password');
            }
            // Don't return early — let session caching proceed below
          }
          if ((event === 'SIGNED_IN' || event === 'PASSWORD_RECOVERY') && navigator.onLine) {
            localStorage.removeItem('cached_business');
            // Mark sign-in timestamp so business resolution can use a grace period
            sessionStorage.setItem('last_signin_timestamp', String(Date.now()));
            // Clear stale setup redirect state from previous sessions
            sessionStorage.removeItem('setup_redirect_count');
            // Cache session for offline use
            if (session?.user) {
              setTimeout(() => {
                cacheSession(session.user, session).catch(console.error);
              }, 0);
            }
            // Force all React Query caches to refetch with fresh user context
            setTimeout(() => {
              queryClient.invalidateQueries();
            }, 100);
          }
          // Only resolve loading from onAuthStateChange AFTER getSession has completed.
          // This prevents the INITIAL_SESSION event (which fires with session=null before
          // getSession restores the stored token) from briefly showing the login form.
          if (initialSessionChecked) {
            resolveLoading();
          }
        }
      }
    );

    // THEN check for existing session
    supabase.auth.getSession()
      .then(({ data: { session }, error }) => {
        if (isMounted) {
          if (error) {
            if (navigator.onLine) {
              console.error('Session check error:', error);
            }
            // If LockManager error, clear stale auth data and resolve
            if (error.message?.includes('LockManager') || error.message?.includes('lock')) {
              console.warn('[Auth] LockManager error detected, clearing stale auth data');
              const keys = Object.keys(localStorage).filter(k => k.startsWith('sb-') && k.includes('auth-token'));
              keys.forEach(k => localStorage.removeItem(k));
            }
          }
          if (session) {
            setSession(session);
            setUser(session.user);
            setTimeout(() => {
              cacheSession(session.user, session).catch(console.error);
            }, 0);
          }
          // Mark initial session check complete, then resolve loading
          initialSessionChecked = true;
          resolveLoading();
        }
      })
      .catch(async (error) => {
        console.error('[Auth] getSession failed:', error?.message || error);
        initialSessionChecked = true;
        
        // Handle LockManager timeout - clear stale data and resolve gracefully
        if (error?.message?.includes('LockManager') || error?.message?.includes('lock')) {
          console.warn('[Auth] LockManager timeout - clearing stale locks and resolving');
          const keys = Object.keys(localStorage).filter(k => k.startsWith('sb-') && k.includes('auth-token'));
          keys.forEach(k => localStorage.removeItem(k));
          resolveLoading();
          return;
        }

        // When offline, try to use cached session
        if (!navigator.onLine) {
          console.log('[Auth] Offline - checking for cached session');
          try {
            const cachedSession = await getCachedSession();
            if (cachedSession && isMounted) {
              console.log('[Auth] Using cached session for offline access');
              setUser(cachedSession.user);
              setIsOfflineMode(true);
              resolveLoading();
              return;
            }
          } catch (cacheError) {
            console.error('[Auth] Failed to get cached session:', cacheError);
          }
        }
        resolveLoading();
      });

    return () => {
      isMounted = false;
      clearTimeout(timeoutId);
      subscription.unsubscribe();
    };
  }, []);

  const signUp = async (email: string, password: string, fullName: string) => {
    const { error, data } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName },
        emailRedirectTo: getEmailConfirmUrl()
      }
    });
    return { error: error as Error | null, data };
  };

  const signIn = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      return { error: error as Error | null };
    } catch (err: any) {
      if (err?.message?.includes('LockManager') || err?.message?.includes('lock')) {
        console.warn('[Auth] LockManager error during sign-in, clearing locks and retrying');
        Object.keys(localStorage)
          .filter(k => k.startsWith('sb-') && k.includes('auth-token'))
          .forEach(k => localStorage.removeItem(k));
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        return { error: error as Error | null };
      }
      return { error: err as Error };
    }
  };

  const signOut = async () => {
    // Clear all cached sensitive data on logout
    localStorage.removeItem('offline_sales');
    localStorage.removeItem('offline_products');
    localStorage.removeItem('offline_barcodes');
    localStorage.removeItem('recent_users');
    localStorage.removeItem('current_branch_id');
    localStorage.removeItem('cached_business');
    localStorage.removeItem('cached_dashboard_health');
    localStorage.removeItem('last_activity_timestamp');
    sessionStorage.removeItem('user_role');
    sessionStorage.removeItem('user_permissions');
    sessionStorage.removeItem('auth_method');
    
    // Clear offline session cache
    await clearCachedSession();
    
    await supabase.auth.signOut();
    setIsOfflineMode(false);
  };

  // Helper to cache business data for offline use
  const cacheBusinessData = async (business: OfflineBusinessData) => {
    await cacheBusiness(business);
  };

  // Helper to cache subscription for offline use
  const cacheSubscriptionData = async (subscription: OfflineSubscriptionData) => {
    await cacheSubscription(subscription);
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, isOfflineMode, signUp, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
