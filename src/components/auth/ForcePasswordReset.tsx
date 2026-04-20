import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, Check, X, Eye, EyeOff, Lock } from "lucide-react";
import { toast } from "sonner";
import { isStrongPassword, getPasswordStrengthErrors } from "@/hooks/usePasswordStrengthCheck";

interface ForcePasswordResetProps {
  onPasswordUpdated: () => void;
}

export function ForcePasswordReset({ onPasswordUpdated }: ForcePasswordResetProps) {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const errors = getPasswordStrengthErrors(password);
  const isValid = isStrongPassword(password) && password === confirmPassword;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isStrongPassword(password)) {
      toast.error("Password does not meet security requirements");
      return;
    }

    if (password !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });

      if (error) {
        toast.error(error.message);
        return;
      }

      // Mark password reset as resolved
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { error: updateError } = await supabase
          .from("password_reset_required")
          .update({ resolved_at: new Date().toISOString() })
          .eq("user_id", user.id);
        
        if (updateError) {
          console.error("Failed to mark password reset as resolved:", updateError);
          // Still proceed - the password was updated successfully
        }
      }

      toast.success("Password updated successfully!");
      onPasswordUpdated();
    } catch (err) {
      toast.error("Failed to update password");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
            <AlertTriangle className="h-6 w-6 text-destructive" />
          </div>
          <CardTitle>Password Update Required</CardTitle>
          <CardDescription>
            Your current password does not meet our security requirements. 
            Please create a new strong password to continue.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="new-password">New Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="new-password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter new password"
                  className="pl-10 pr-10"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Password requirements */}
            <div className="rounded-lg border p-3 space-y-2">
              <p className="text-sm font-medium">Password requirements:</p>
              <ul className="text-sm space-y-1">
                {[
                  { text: "At least 8 characters", check: password.length >= 8 },
                  { text: "One uppercase letter", check: /[A-Z]/.test(password) },
                  { text: "One lowercase letter", check: /[a-z]/.test(password) },
                  { text: "One number", check: /[0-9]/.test(password) },
                  { text: "One special character", check: /[^A-Za-z0-9]/.test(password) },
                ].map(({ text, check }) => (
                  <li key={text} className="flex items-center gap-2">
                    {check ? (
                      <Check className="h-4 w-4 text-green-500" />
                    ) : (
                      <X className="h-4 w-4 text-muted-foreground" />
                    )}
                    <span className={check ? "text-green-600" : "text-muted-foreground"}>
                      {text}
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirm-password">Confirm Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="confirm-password"
                  type={showPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm new password"
                  className="pl-10"
                  required
                />
              </div>
              {confirmPassword && password !== confirmPassword && (
                <p className="text-sm text-destructive">Passwords do not match</p>
              )}
            </div>

            <Button type="submit" className="w-full" disabled={!isValid || isLoading}>
              {isLoading ? "Updating..." : "Update Password"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
