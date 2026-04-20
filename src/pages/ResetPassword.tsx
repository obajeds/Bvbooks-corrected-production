import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2, CheckCircle, Eye, EyeOff, AlertTriangle } from "lucide-react";
import bvbooksLogo from "@/assets/bvbooks-logo.jpeg";

export default function ResetPassword() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSuccess, setIsSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Session awareness
  const [sessionReady, setSessionReady] = useState(false);
  const [sessionExpired, setSessionExpired] = useState(false);

  const recoverSessionFromHash = async () => {
    const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    const type = hash.get("type");
    const accessToken = hash.get("access_token");
    const refreshToken = hash.get("refresh_token");

    if (type !== "recovery" || !accessToken || !refreshToken) {
      return false;
    }

    const { error } = await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    });

    if (error) {
      return false;
    }

    // Remove one-time tokens from URL after successful session restore
    window.history.replaceState({}, document.title, window.location.pathname);
    return true;
  };

  useEffect(() => {
    let isMounted = true;

    // First try to restore session directly from recovery hash tokens
    recoverSessionFromHash()
      .then(async (restoredFromHash) => {
        if (!isMounted) return;

        if (restoredFromHash) {
          setSessionReady(true);
          setSessionExpired(false);
          return;
        }

        // Fallback: check for existing session
        const { data: { session } } = await supabase.auth.getSession();
        if (session && isMounted) {
          setSessionReady(true);
          setSessionExpired(false);
        }
      })
      .catch(() => {
        // no-op, timeout state handles fallback UI
      });

    // Listen for recovery or sign-in events
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if ((event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN') && session) {
        setSessionReady(true);
        setSessionExpired(false);
      }
    });

    // Timeout — if no session after 6s, link is expired/used
    const timeout = setTimeout(() => {
      if (isMounted) {
        setSessionExpired(true);
      }
    }, 6000);

    return () => {
      isMounted = false;
      subscription.unsubscribe();
      clearTimeout(timeout);
    };
  }, []);

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!password || !confirmPassword) {
      toast.error("Please fill in all fields");
      return;
    }

    if (password !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    if (password.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }
    if (!/[A-Z]/.test(password)) {
      toast.error("Password must contain at least one uppercase letter");
      return;
    }
    if (!/[a-z]/.test(password)) {
      toast.error("Password must contain at least one lowercase letter");
      return;
    }
    if (!/[0-9]/.test(password)) {
      toast.error("Password must contain at least one number");
      return;
    }
    if (!/[^A-Za-z0-9]/.test(password)) {
      toast.error("Password must contain at least one special character");
      return;
    }

    // Verify session exists before updating; if missing, try recovery-hash restore once
    let { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      const restored = await recoverSessionFromHash();
      if (restored) {
        const retry = await supabase.auth.getSession();
        session = retry.data.session;
      }
    }

    if (!session) {
      setSessionExpired(true);
      setSessionReady(false);
      toast.error("Reset session expired. Please request a new reset link.");
      return;
    }

    setIsLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setIsLoading(false);

    if (error) {
      toast.error(error.message);
      return;
    }

    setIsSuccess(true);
    toast.success("Password updated successfully!");
  };

  // Loading state — waiting for session
  if (!sessionReady && !sessionExpired) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="w-full max-w-md text-center space-y-4">
          <img src={bvbooksLogo} alt="BVBooks Logo" className="w-24 h-auto mx-auto mb-4" />
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
          <p className="text-muted-foreground">Verifying your reset link...</p>
        </div>
      </div>
    );
  }

  // Expired / invalid link
  if (sessionExpired && !sessionReady) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <img src={bvbooksLogo} alt="BVBooks Logo" className="w-24 h-auto mx-auto mb-4" />
          </div>
          <Card className="border-border shadow-lg">
            <CardContent className="pt-6">
              <div className="text-center space-y-4">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-destructive/10 mx-auto">
                  <AlertTriangle className="w-8 h-8 text-destructive" />
                </div>
                <h2 className="text-xl font-semibold">Link Expired</h2>
                <p className="text-muted-foreground">
                  Your password reset link has expired or was already used. Please request a new one.
                </p>
                <Button onClick={() => navigate("/forgot-password")} className="w-full">
                  Request New Reset Link
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (isSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <img src={bvbooksLogo} alt="BVBooks Logo" className="w-24 h-auto mx-auto mb-4" />
          </div>
          <Card className="border-border shadow-lg">
            <CardContent className="pt-6">
              <div className="text-center space-y-4">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-success/10 mx-auto">
                  <CheckCircle className="w-8 h-8 text-success" />
                </div>
                <h2 className="text-xl font-semibold">Password Updated!</h2>
                <p className="text-muted-foreground">
                  Your password has been successfully updated.
                </p>
                <Button onClick={() => navigate("/")} className="w-full">
                  Continue to Dashboard
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <img src={bvbooksLogo} alt="BVBooks Logo" className="w-24 h-auto mx-auto mb-4" />
          <p className="text-muted-foreground font-body">Business Control System</p>
        </div>

        <Card className="border-border shadow-lg">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl text-center">Set New Password</CardTitle>
            <CardDescription className="text-center">
              Enter your new password below
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleResetPassword} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="password">New Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={isLoading}
                    autoComplete="new-password"
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm-password">Confirm New Password</Label>
                <div className="relative">
                  <Input
                    id="confirm-password"
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    disabled={isLoading}
                    autoComplete="new-password"
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    tabIndex={-1}
                  >
                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Updating...
                  </>
                ) : (
                  "Update Password"
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
