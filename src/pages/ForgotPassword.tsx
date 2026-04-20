import { useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2, CheckCircle, ArrowLeft, Mail } from "lucide-react";
import bvbooksLogo from "@/assets/bvbooks-logo.jpeg";
import { getPasswordResetUrl } from "@/lib/authUrls";

export default function ForgotPassword() {
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email) {
      toast.error("Please enter your email address");
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      toast.error("Please enter a valid email address");
      return;
    }

    setIsLoading(true);
    
    try {
      // Use the production URL for password reset redirect
      const redirectUrl = getPasswordResetUrl();
      
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: redirectUrl,
      });

      if (error) {
        // Don't reveal if email exists or not for security
        console.error("Password reset error:", error);
      }

      // Always show success to prevent email enumeration
      setIsSuccess(true);
    } catch (err) {
      console.error("Password reset error:", err);
      // Still show success to prevent email enumeration
      setIsSuccess(true);
    } finally {
      setIsLoading(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <img 
              src={bvbooksLogo} 
              alt="BVBooks Logo" 
              className="w-24 h-auto mx-auto mb-4"
            />
          </div>

          <Card className="border-border shadow-lg">
            <CardContent className="pt-6">
              <div className="text-center space-y-4">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mx-auto">
                  <Mail className="w-8 h-8 text-primary" />
                </div>
                <h2 className="text-xl font-semibold">Check Your Email</h2>
                <p className="text-muted-foreground">
                  If an account exists for <strong>{email}</strong>, we've sent a password reset link. 
                  Please check your inbox and spam folder.
                </p>
                <p className="text-sm text-muted-foreground">
                  The link will expire in 1 hour.
                </p>
                <div className="pt-4 space-y-3">
                  <Button 
                    variant="outline" 
                    onClick={() => { setIsSuccess(false); setEmail(""); }} 
                    className="w-full"
                  >
                    Try a different email
                  </Button>
                  <Link to="/auth" className="block">
                    <Button variant="ghost" className="w-full">
                      <ArrowLeft className="mr-2 h-4 w-4" />
                      Back to Sign In
                    </Button>
                  </Link>
                </div>
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
          <img 
            src={bvbooksLogo} 
            alt="BVBooks Logo" 
            className="w-24 h-auto mx-auto mb-4"
          />
          <p className="text-muted-foreground font-body">Business Control System</p>
        </div>

        <Card className="border-border shadow-lg">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl text-center">Forgot Password?</CardTitle>
            <CardDescription className="text-center">
              Enter your email address and we'll send you a link to reset your password.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isLoading}
                  autoComplete="email"
                  autoFocus
                />
              </div>
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  "Send Reset Link"
                )}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <Link 
                to="/auth" 
                className="text-sm text-primary hover:underline inline-flex items-center"
              >
                <ArrowLeft className="mr-1 h-3 w-3" />
                Back to Sign In
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
