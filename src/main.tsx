import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// Initialize Sentry lazily (gracefully skipped if no DSN configured)
const sentryDsn = import.meta.env.VITE_SENTRY_DSN;
if (sentryDsn) {
  import("@sentry/react").then((Sentry) => {
    Sentry.init({
      dsn: sentryDsn,
      tracesSampleRate: 0.1,
      environment: import.meta.env.MODE,
      beforeSend(event) {
        if (event.request?.cookies) delete event.request.cookies;
        return event;
      },
    });
    console.log('[Sentry] Initialized');
  }).catch(() => {
    console.warn('[Sentry] Failed to load, continuing without error tracking');
  });
}

// === LAYER 1: Global LockManager error recovery ===
window.addEventListener('unhandledrejection', (event) => {
  const msg = event?.reason?.message || String(event?.reason || '');
  if (msg.includes('LockManager') || msg.includes('lock')) {
    event.preventDefault();
    console.warn('[Recovery] LockManager error caught globally, recovering...');
    Object.keys(localStorage)
      .filter(k => k.startsWith('sb-') && k.includes('auth-token'))
      .forEach(k => localStorage.removeItem(k));
    if (!sessionStorage.getItem('lockmanager_recovery')) {
      sessionStorage.setItem('lockmanager_recovery', '1');
      window.location.reload();
    }
  }
});

// === LAYER 3: Version-based cache bust ===
const APP_VERSION = '2026.02.24.1';
const storedVersion = localStorage.getItem('app_version');
if (storedVersion && storedVersion !== APP_VERSION) {
  localStorage.removeItem('app_version');
  Object.keys(localStorage)
    .filter(k => k.startsWith('sb-') && k.includes('auth-token'))
    .forEach(k => localStorage.removeItem(k));
}
localStorage.setItem('app_version', APP_VERSION);

// Register PWA service worker for offline support
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js', { scope: '/' })
      .then(reg => {
        console.log('[SW] Service worker registered, scope:', reg.scope);
        reg.addEventListener('updatefound', () => {
          const newWorker = reg.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'activated') {
                console.log('[SW] New service worker activated');
              }
            });
          }
        });
      })
      .catch(err => console.warn('[SW] Registration failed:', err));
  });
}

// Clear any stale Web Locks that may block auth
if ('locks' in navigator) {
  (navigator.locks as any).query?.().then?.((state: any) => {
    const staleLocks = (state?.held || []).filter((l: any) => l.name?.includes('sb-') && l.name?.includes('auth-token'));
    if (staleLocks.length > 0) {
      console.warn('[Auth] Found stale auth locks, clearing storage to recover');
      // Force clear the stale Supabase auth storage to break the deadlock
      const keys = Object.keys(localStorage).filter(k => k.startsWith('sb-') && k.includes('auth-token'));
      keys.forEach(k => localStorage.removeItem(k));
    }
  }).catch(() => {});
}

// Initialize React application
const rootElement = document.getElementById("root");
if (!rootElement) throw new Error("Root element not found");

const root = createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
