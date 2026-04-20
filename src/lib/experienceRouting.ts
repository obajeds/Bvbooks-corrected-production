// Experience routing constants and detection utilities
// Determines whether user should see mobile or web experience

export const BREAKPOINTS = {
  MOBILE_MAX: 767,
  TABLET_MAX: 1024,
} as const;

// Map BVBooks roles to default experiences
// Roles that work primarily in the field or on mobile devices default to mobile
// Admin/management roles default to web for full functionality
export const ROLE_DEFAULT_EXPERIENCE: Record<string, 'mobile' | 'web'> = {
  // Mobile-first roles (cashiers working POS, field staff)
  cashier: 'mobile',
  staff: 'mobile',
  field_agent: 'mobile',
  brm: 'mobile',
  
  // Web-first roles (admin/management need full dashboard)
  owner: 'web',
  manager: 'web',
  admin: 'web',
  finance: 'web',
  super_admin: 'web',
} as const;

// Roles that are LOCKED to a specific experience (cannot switch)
export const ROLE_LOCKED_EXPERIENCE: Record<string, 'mobile' | 'web'> = {
  field_agent: 'mobile', // Field agents can only use mobile
  finance: 'web',        // Finance users can only use web
} as const;

/**
 * Check if a role is locked to a specific experience
 */
export function isExperienceLocked(role?: string | null): boolean {
  return !!role && role in ROLE_LOCKED_EXPERIENCE;
}

/**
 * Get the locked experience for a role, if any
 */
export function getLockedExperience(role?: string | null): ExperienceType | null {
  if (role && role in ROLE_LOCKED_EXPERIENCE) {
    return ROLE_LOCKED_EXPERIENCE[role];
  }
  return null;
}

export type ExperienceType = 'mobile' | 'web';

const STORAGE_KEY = 'bvbooks_experience';

/**
 * Get the saved experience preference from localStorage
 */
export function getSavedExperience(): ExperienceType | null {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === 'mobile' || saved === 'web') {
      return saved;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Save experience preference to localStorage
 */
export function saveExperience(experience: ExperienceType): void {
  try {
    localStorage.setItem(STORAGE_KEY, experience);
  } catch {
    // Silently fail if localStorage is unavailable
  }
}

/**
 * Clear saved experience preference
 */
export function clearSavedExperience(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Silently fail
  }
}

/**
 * Detect if device has touch capability
 */
function isTouchDevice(): boolean {
  return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
}

/**
 * Detect if user agent indicates mobile device
 */
function isMobileUserAgent(): boolean {
  return /Android|iPhone|iPod|webOS|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  );
}

interface DetectExperienceOptions {
  role?: string | null;
  forceDetection?: boolean; // Ignore saved preference
}

/**
 * Detect the appropriate experience (mobile or web) for the user
 * Priority:
 * 1. Saved user preference (unless forceDetection is true)
 * 2. Role-based default
 * 3. Device detection (screen size + touch + user agent)
 */
export function detectExperience(options: DetectExperienceOptions = {}): ExperienceType {
  const { role, forceDetection = false } = options;

  // 0. Check for locked experience first (role restrictions)
  const locked = getLockedExperience(role);
  if (locked) {
    return locked;
  }

  // 1. Respect saved choice (unless forcing detection)
  if (!forceDetection) {
    const saved = getSavedExperience();
    if (saved) {
      return saved;
    }
  }

  // 2. Role-based override
  if (role && role in ROLE_DEFAULT_EXPERIENCE) {
    return ROLE_DEFAULT_EXPERIENCE[role];
  }

  // 3. Device intent detection
  const width = window.innerWidth;
  const isTouch = isTouchDevice();
  const isMobileUA = isMobileUserAgent();

  // Mobile if: narrow screen AND (touch device OR mobile user agent)
  if (width <= BREAKPOINTS.MOBILE_MAX && (isTouch || isMobileUA)) {
    return 'mobile';
  }

  // Default to web
  return 'web';
}

/**
 * Switch to a different experience and reload to apply
 */
export function switchExperience(type: ExperienceType): void {
  saveExperience(type);
  // Navigate to the appropriate experience root
  window.location.href = type === 'mobile' ? '/mobile' : '/dashboard';
}

/**
 * Get the current window width for responsive checks
 */
export function getWindowWidth(): number {
  return window.innerWidth;
}

/**
 * Check if current view is below mobile breakpoint
 */
export function isBelowMobileBreakpoint(): boolean {
  return window.innerWidth <= BREAKPOINTS.MOBILE_MAX;
}

/**
 * Transform a path to the correct experience prefix
 * e.g., "/sales/123" -> "/mobile/sales/123" or "/dashboard/sales/123"
 */
export function getExperiencePath(path: string, experience: ExperienceType): string {
  // Remove any existing experience prefix
  const cleanPath = path
    .replace(/^\/mobile/, '')
    .replace(/^\/dashboard/, '')
    .replace(/^\/web/, '');
  
  const normalizedPath = cleanPath.startsWith('/') ? cleanPath : `/${cleanPath}`;
  
  if (experience === 'mobile') {
    return `/mobile${normalizedPath === '/' ? '' : normalizedPath}`;
  }
  
  return `/dashboard${normalizedPath === '/' ? '' : normalizedPath}`;
}
