import { useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Loader2, CheckCircle2, XCircle, Eye, EyeOff, Building2, Shield } from "lucide-react";
import { useInvitationByToken, useAcceptInvitation } from "@/hooks/useStaffInvitations";
import { toast } from "sonner";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";

const passwordSchema = z.string()
  .min(8, "Password must be at least 8 characters")
  .max(100, "Password too long")
  .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
  .regex(/[a-z]/, "Password must contain at least one lowercase letter")
  .regex(/[0-9]/, "Password must contain at least one number")
  .regex(/[^A-Za-z0-9]/, "Password must contain at least one special character");

export default function AcceptInvite() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get("token");
  
  const { data: invitation, isLoading, error } = useInvitationByToken(token);
  const acceptInvitation = useAcceptInvitation();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [passwordError, setPasswordError] = useState("");
  const [isAccepted, setIsAccepted] = useState(false);
  const [acceptedData, setAcceptedData] = useState<any>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate password
    const result = passwordSchema.safeParse(password);
    if (!result.success) {
      setPasswordError(result.error.errors[0].message);
      return;
    }

    if (password !== confirmPassword) {
      setPasswordError("Passwords do not match");
      return;
    }

    setPasswordError("");

    try {
      const data = await acceptInvitation.mutateAsync({ token: token!, password });
      setIsAccepted(true);
      setAcceptedData(data);
      toast.success("Account created successfully! Signing you in...");
      
      // Auto-login the user with their new credentials
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: invitation!.email,
        password: password,
      });
      
      if (signInError) {
        console.error("Auto sign-in failed:", signInError);
        toast.error("Account created but auto-login failed. Please login manually.");
      } else {
        // Redirect to dashboard after successful login
        setTimeout(() => {
          navigate("/");
        }, 1500);
      }
    } catch (error) {
      // Error is handled by the mutation
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
            <p className="text-muted-foreground">Loading invitation...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!token || !invitation) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <XCircle className="h-12 w-12 text-destructive mb-4" />
            <h2 className="text-xl font-semibold mb-2">Invalid Invitation</h2>
            <p className="text-muted-foreground text-center mb-6">
              This invitation link is invalid, has expired, or has already been used.
            </p>
            <Button onClick={() => navigate("/auth")}>Go to Login</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isAccepted) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <CheckCircle2 className="h-12 w-12 text-green-500 mb-4" />
            <h2 className="text-xl font-semibold mb-2">Welcome Aboard!</h2>
            <p className="text-muted-foreground text-center mb-4">
              Your account has been created successfully.
            </p>
            {acceptedData?.business_name && (
              <p className="text-center mb-2">
                You're now part of <strong>{acceptedData.business_name}</strong>
              </p>
            )}
            {acceptedData?.branches && acceptedData.branches.length > 0 && (
              <div className="w-full mt-4 p-4 bg-muted rounded-lg">
                <p className="text-sm font-medium mb-2">Your Branch Assignments:</p>
                <div className="space-y-2">
                  {acceptedData.branches.map((b: any, i: number) => (
                    <div key={i} className="flex items-center justify-between text-sm">
                      <span>{b.name}</span>
                      <Badge variant="secondary">{b.role}</Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div className="mt-6 flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Redirecting to your dashboard...</span>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const branchAssignments = invitation.invitation_branch_assignments || [];

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle>Welcome, {invitation.full_name}!</CardTitle>
          <CardDescription>
            Complete your account setup to join the team
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Branch Assignments Preview */}
            {branchAssignments.length > 0 && (
              <div className="p-4 bg-muted rounded-lg space-y-3">
                <p className="text-sm font-medium flex items-center gap-2">
                  <Building2 className="h-4 w-4" />
                  You'll have access to:
                </p>
                <div className="space-y-2">
                  {branchAssignments.map((ba: any) => (
                    <div key={ba.id} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <span>{ba.branches?.name}</span>
                        {ba.is_primary && <Badge variant="outline" className="text-xs">Primary</Badge>}
                      </div>
                      {ba.role_templates?.name && (
                        <Badge variant="secondary" className="text-xs">
                          <Shield className="h-3 w-3 mr-1" />
                          {ba.role_templates.name}
                        </Badge>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Password Fields */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={invitation.email}
                  disabled
                  className="bg-muted"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Create Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      setPasswordError("");
                    }}
                    placeholder="Enter a secure password"
                    className={passwordError ? "border-destructive pr-10" : "pr-10"}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-full px-3"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    setPasswordError("");
                  }}
                  placeholder="Confirm your password"
                  className={passwordError ? "border-destructive" : ""}
                />
                {passwordError && (
                  <p className="text-sm text-destructive">{passwordError}</p>
                )}
              </div>
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={acceptInvitation.isPending || !password || !confirmPassword}
            >
              {acceptInvitation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating Account...
                </>
              ) : (
                "Accept Invitation & Create Account"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
