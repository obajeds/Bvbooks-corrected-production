import { useEffect, useRef, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

const INACTIVITY_TIMEOUT = 60 * 60 * 1000; // 60 minutes
const ACTIVITY_THROTTLE = 30 * 1000; // Only reset timer every 30 seconds max
const LAST_ACTIVITY_KEY = 'last_activity_timestamp';

function getStoredLastActivity(): number {
  const stored = localStorage.getItem(LAST_ACTIVITY_KEY);
  return stored ? Number(stored) : Date.now();
}

function storeLastActivity(timestamp: number) {
  localStorage.setItem(LAST_ACTIVITY_KEY, String(timestamp));
}

export function useSessionTimeout() {
  const { user, signOut } = useAuth();
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastActivityRef = useRef<number>(getStoredLastActivity());
  const signOutRef = useRef(signOut);

  // Keep signOut ref current without causing effect re-runs
  useEffect(() => {
    signOutRef.current = signOut;
  }, [signOut]);

  const clearTimer = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const recordActivity = useCallback(() => {
    const now = Date.now();
    lastActivityRef.current = now;
    storeLastActivity(now);
  }, []);

  const checkAndEnforceTimeout = useCallback(() => {
    const elapsed = Date.now() - lastActivityRef.current;
    if (elapsed >= INACTIVITY_TIMEOUT) {
      console.log('[SessionTimeout] Logging out due to inactivity (elapsed:', Math.round(elapsed / 60000), 'min)');
      signOutRef.current();
      return true;
    }
    return false;
  }, []);

  const startTimer = useCallback(() => {
    clearTimer();
    const elapsed = Date.now() - lastActivityRef.current;
    const remaining = Math.max(INACTIVITY_TIMEOUT - elapsed, 0);
    timeoutRef.current = setTimeout(() => {
      console.log('[SessionTimeout] Logging out due to inactivity');
      signOutRef.current();
    }, remaining);
  }, [clearTimer]);

  // Listen for SIGNED_IN to reset activity timestamp immediately,
  // preventing stale timestamps from triggering instant logout after login.
  // Also clear transient redirect state so the new session starts clean.
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN') {
        recordActivity();
        sessionStorage.removeItem('setup_redirect_count');
      }
    });
    return () => subscription.unsubscribe();
  }, [recordActivity]);

  useEffect(() => {
    if (!user) {
      clearTimer();
      return;
    }

    // On mount, check if already timed out (persisted across refresh)
    // But skip if activity was just recorded (within last 5 seconds) to avoid
    // race with the SIGNED_IN handler above
    const timeSinceLastActivity = Date.now() - lastActivityRef.current;
    if (timeSinceLastActivity < 5000) {
      // Fresh sign-in, just start the timer
    } else if (checkAndEnforceTimeout()) {
      return;
    }

    const activityEvents = ['mousedown', 'keydown', 'touchstart', 'scroll'];

    const handleActivity = () => {
      const now = Date.now();
      if (now - lastActivityRef.current < ACTIVITY_THROTTLE) return;
      recordActivity();
      startTimer();
    };

    // Handle tab visibility change — browser pauses setTimeout in background
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        if (checkAndEnforceTimeout()) return;
        startTimer();
      }
    };

    // Initialize
    if (!localStorage.getItem(LAST_ACTIVITY_KEY)) {
      recordActivity();
    }
    startTimer();

    activityEvents.forEach(event => {
      window.addEventListener(event, handleActivity, { passive: true });
    });
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearTimer();
      activityEvents.forEach(event => {
        window.removeEventListener(event, handleActivity);
      });
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [user, startTimer, clearTimer, checkAndEnforceTimeout, recordActivity]);

  return { resetTimeout: startTimer };
}
