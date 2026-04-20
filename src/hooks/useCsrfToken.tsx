import { useState, useEffect, useCallback, useRef } from "react";

// CSRF token configuration
const CSRF_TOKEN_KEY = "csrf_token";
const CSRF_TOKEN_EXPIRY_KEY = "csrf_token_expiry";
const TOKEN_VALIDITY_MS = 30 * 60 * 1000; // 30 minutes

/**
 * Generate a cryptographically secure random token
 */
function generateToken(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

/**
 * Get stored CSRF token if valid, otherwise generate new one
 */
function getOrCreateToken(): string {
  try {
    const storedToken = sessionStorage.getItem(CSRF_TOKEN_KEY);
    const storedExpiry = sessionStorage.getItem(CSRF_TOKEN_EXPIRY_KEY);
    
    if (storedToken && storedExpiry) {
      const expiryTime = parseInt(storedExpiry, 10);
      if (Date.now() < expiryTime) {
        return storedToken;
      }
    }
    
    // Generate new token
    const newToken = generateToken();
    const newExpiry = Date.now() + TOKEN_VALIDITY_MS;
    
    sessionStorage.setItem(CSRF_TOKEN_KEY, newToken);
    sessionStorage.setItem(CSRF_TOKEN_EXPIRY_KEY, newExpiry.toString());
    
    return newToken;
  } catch {
    // Fallback for private browsing mode
    return generateToken();
  }
}

/**
 * Validate a CSRF token against the stored token
 */
function validateToken(tokenToValidate: string): boolean {
  try {
    const storedToken = sessionStorage.getItem(CSRF_TOKEN_KEY);
    const storedExpiry = sessionStorage.getItem(CSRF_TOKEN_EXPIRY_KEY);
    
    if (!storedToken || !storedExpiry) {
      return false;
    }
    
    const expiryTime = parseInt(storedExpiry, 10);
    if (Date.now() >= expiryTime) {
      // Token expired
      sessionStorage.removeItem(CSRF_TOKEN_KEY);
      sessionStorage.removeItem(CSRF_TOKEN_EXPIRY_KEY);
      return false;
    }
    
    // Constant-time comparison to prevent timing attacks
    if (storedToken.length !== tokenToValidate.length) {
      return false;
    }
    
    let result = 0;
    for (let i = 0; i < storedToken.length; i++) {
      result |= storedToken.charCodeAt(i) ^ tokenToValidate.charCodeAt(i);
    }
    
    return result === 0;
  } catch {
    return false;
  }
}

/**
 * Regenerate the CSRF token (call after successful form submission)
 */
function regenerateToken(): string {
  try {
    const newToken = generateToken();
    const newExpiry = Date.now() + TOKEN_VALIDITY_MS;
    
    sessionStorage.setItem(CSRF_TOKEN_KEY, newToken);
    sessionStorage.setItem(CSRF_TOKEN_EXPIRY_KEY, newExpiry.toString());
    
    return newToken;
  } catch {
    return generateToken();
  }
}

/**
 * Hook for managing CSRF tokens in forms
 * 
 * @example
 * ```tsx
 * const { csrfToken, validateAndRegenerate, CsrfInput } = useCsrfToken();
 * 
 * const handleSubmit = (e) => {
 *   e.preventDefault();
 *   const formData = new FormData(e.target);
 *   
 *   if (!validateAndRegenerate(formData.get('csrf_token'))) {
 *     toast.error('Invalid form submission. Please try again.');
 *     return;
 *   }
 *   
 *   // Process form...
 * };
 * 
 * return (
 *   <form onSubmit={handleSubmit}>
 *     <CsrfInput />
 *     ...
 *   </form>
 * );
 * ```
 */
export function useCsrfToken() {
  // Initialize with token immediately to prevent race conditions on fast submits
  const [csrfToken, setCsrfToken] = useState<string>(() => getOrCreateToken());
  const tokenRef = useRef<string>(csrfToken);
  
  // Keep ref in sync
  useEffect(() => {
    tokenRef.current = csrfToken;
  }, [csrfToken]);
  
/**
 * Validate the token and regenerate a new one
 * Returns true if valid, false if invalid
 */
const validateAndRegenerate = useCallback((tokenToValidate: string | null | undefined): boolean => {
  if (!tokenToValidate) return false;
  
  // Also compare against the current React state token (tokenRef) 
  // in case sessionStorage got out of sync
  const currentToken = tokenRef.current;
  if (tokenToValidate === currentToken) {
    // Token matches our current state - it's valid
    const newToken = regenerateToken();
    setCsrfToken(newToken);
    tokenRef.current = newToken;
    return true;
  }
  
  // Fallback to sessionStorage validation
  const isValid = validateToken(tokenToValidate);
  
  if (isValid) {
    // Regenerate token after successful validation
    const newToken = regenerateToken();
    setCsrfToken(newToken);
    tokenRef.current = newToken;
  }
  
  return isValid;
}, []);
  
  /**
   * Just validate without regenerating (for checking)
   */
  const validate = useCallback((tokenToValidate: string | null | undefined): boolean => {
    if (!tokenToValidate) return false;
    return validateToken(tokenToValidate);
  }, []);
  
  /**
   * Force regenerate the token
   */
  const regenerate = useCallback((): void => {
    const newToken = regenerateToken();
    setCsrfToken(newToken);
    tokenRef.current = newToken;
  }, []);
  
  /**
   * Hidden input component for forms
   */
  const CsrfInput = useCallback(() => (
    <input type="hidden" name="csrf_token" value={csrfToken} />
  ), [csrfToken]);
  
  return {
    csrfToken,
    validate,
    validateAndRegenerate,
    regenerate,
    CsrfInput,
  };
}

/**
 * Higher-order function to wrap form handlers with CSRF validation
 */
export function withCsrfValidation(
  handler: (...args: unknown[]) => unknown,
  getCsrfToken: () => string | null | undefined,
  validateFn: (token: string | null | undefined) => boolean,
  onInvalid?: () => void
): (...args: unknown[]) => unknown {
  return (...args: unknown[]) => {
    const token = getCsrfToken();
    
    if (!validateFn(token)) {
      onInvalid?.();
      return;
    }
    
    return handler(...args);
  };
}
