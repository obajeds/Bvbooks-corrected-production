import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Loader2, Plus, X, Mail, Calendar, Building2, Shield } from "lucide-react";
import { useBranches } from "@/hooks/useBranches";
import { useBusiness } from "@/hooks/useBusiness";
import { supabase } from "@/integrations/supabase/client";
import { useRoleTemplates } from "@/hooks/usePermissions";
import { useSendStaffInvite, BranchAssignmentInput } from "@/hooks/useStaffInvitations";
import { z } from "zod";

const emailSchema = z.string().email("Invalid email address");

interface StaffInviteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function StaffInviteDialog({ open, onOpenChange }: StaffInviteDialogProps) {
  const { data: business } = useBusiness();
  const { data: branches = [] } = useBranches(business?.id);
  const { data: roleTemplates = [] } = useRoleTemplates();
  const sendInvite = useSendStaffInvite();

  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [branchAssignments, setBranchAssignments] = useState<BranchAssignmentInput[]>([]);
  const [emailError, setEmailError] = useState("");

  const addBranchAssignment = (branchId: string) => {
    if (branchAssignments.find(ba => ba.branch_id === branchId)) return;
    
    setBranchAssignments([
      ...branchAssignments,
      {
        branch_id: branchId,
        role_template_id: null,
        is_primary: branchAssignments.length === 0,
        expires_at: null
      }
    ]);
  };

  const removeBranchAssignment = (branchId: string) => {
    const filtered = branchAssignments.filter(ba => ba.branch_id !== branchId);
    // If we removed the primary, make the first one primary
    if (filtered.length > 0 && !filtered.some(ba => ba.is_primary)) {
      filtered[0].is_primary = true;
    }
    setBranchAssignments(filtered);
  };

  const updateBranchAssignment = (branchId: string, updates: Partial<BranchAssignmentInput>) => {
    setBranchAssignments(prev => prev.map(ba => {
      if (ba.branch_id === branchId) {
        return { ...ba, ...updates };
      }
      // If setting this as primary, unset others
      if (updates.is_primary && ba.branch_id !== branchId) {
        return { ...ba, is_primary: false };
      }
      return ba;
    }));
  };

  const getBranchName = (branchId: string) => {
    return branches.find(b => b.id === branchId)?.name || "Unknown";
  };

  const handleSubmit = async () => {
    // Validate email
    const emailResult = emailSchema.safeParse(email);
    if (!emailResult.success) {
      setEmailError(emailResult.error.errors[0].message);
      return;
    }
    setEmailError("");

    if (!fullName.trim()) {
      return;
    }

    if (branchAssignments.length === 0) {
      return;
    }

    // Cross-business email uniqueness check
    const normalizedEmail = email.trim().toLowerCase();
    try {
      const { data: ownerConflict } = await supabase
        .from("businesses")
        .select("id")
        .eq("owner_email", normalizedEmail)
        .limit(1)
        .maybeSingle();

      if (ownerConflict && ownerConflict.id !== business?.id) {
        setEmailError("A user account with this email already exists. Please use another email.");
        return;
      }

      const { data: staffConflict } = await supabase
        .from("staff")
        .select("id, business_id")
        .eq("email", normalizedEmail)
        .eq("is_active", true)
        .limit(1)
        .maybeSingle();

      if (staffConflict && staffConflict.business_id !== business?.id) {
        setEmailError("A user account with this email already exists. Please use another email.");
        return;
      }
    } catch (err) {
      // If client-side check fails, let the edge function handle it
      console.warn("Client-side email check failed, proceeding to server validation");
    }

    await sendInvite.mutateAsync({
      email: email.trim().toLowerCase(),
      full_name: fullName.trim(),
      phone: phone.trim() || undefined,
      branch_assignments: branchAssignments
    });

    // Reset form
    setEmail("");
    setFullName("");
    setPhone("");
    setBranchAssignments([]);
    onOpenChange(false);
  };

  const availableBranches = branches.filter(
    b => !branchAssignments.find(ba => ba.branch_id === b.id)
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Invite Staff Member
          </DialogTitle>
          <DialogDescription>
            Send an invitation email with branch and role assignments
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Basic Info */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="fullName">Full Name *</Label>
              <Input
                id="fullName"
                placeholder="John Doe"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email Address *</Label>
              <Input
                id="email"
                type="email"
                placeholder="john@example.com"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setEmailError("");
                }}
                className={emailError ? "border-destructive" : ""}
              />
              {emailError && (
                <p className="text-sm text-destructive">{emailError}</p>
              )}
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="phone">Phone Number</Label>
              <Input
                id="phone"
                placeholder="+234 800 000 0000"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>
          </div>

          {/* Branch Assignments */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                Branch Assignments *
              </Label>
              {availableBranches.length > 0 && (
                <Select onValueChange={addBranchAssignment}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Add branch" />
                  </SelectTrigger>
                  <SelectContent className="bg-popover border">
                    {availableBranches.map((branch) => (
                      <SelectItem key={branch.id} value={branch.id}>
                        {branch.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            {branchAssignments.length === 0 ? (
              <Card className="p-6 text-center text-muted-foreground border-dashed">
                <Building2 className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No branches assigned yet</p>
                <p className="text-sm">Add at least one branch to continue</p>
              </Card>
            ) : (
              <div className="space-y-3">
                {branchAssignments.map((assignment) => (
                  <Card key={assignment.branch_id} className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 space-y-3">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{getBranchName(assignment.branch_id)}</span>
                          {assignment.is_primary && (
                            <Badge variant="secondary" className="text-xs">Primary</Badge>
                          )}
                        </div>

                        <div className="grid gap-3 sm:grid-cols-2">
                          <div className="space-y-1">
                            <Label className="text-xs text-muted-foreground flex items-center gap-1">
                              <Shield className="h-3 w-3" />
                              Role
                            </Label>
                            <Select
                              value={assignment.role_template_id || "none"}
                              onValueChange={(v) => updateBranchAssignment(
                                assignment.branch_id,
                                { role_template_id: v === "none" ? null : v }
                              )}
                            >
                              <SelectTrigger className="h-9">
                                <SelectValue placeholder="Select role" />
                              </SelectTrigger>
                              <SelectContent className="bg-popover border">
                                <SelectItem value="none">No specific role</SelectItem>
                                {roleTemplates.map((role) => (
                                  <SelectItem key={role.id} value={role.id}>
                                    {role.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="space-y-1">
                            <Label className="text-xs text-muted-foreground flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              Access Expires
                            </Label>
                            <Input
                              type="date"
                              className="h-9"
                              value={assignment.expires_at?.split("T")[0] || ""}
                              onChange={(e) => updateBranchAssignment(
                                assignment.branch_id,
                                { expires_at: e.target.value ? new Date(e.target.value).toISOString() : null }
                              )}
                            />
                          </div>
                        </div>

                        {branchAssignments.length > 1 && (
                          <div className="flex items-center gap-2">
                            <Checkbox
                              id={`primary-${assignment.branch_id}`}
                              checked={assignment.is_primary}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  updateBranchAssignment(assignment.branch_id, { is_primary: true });
                                }
                              }}
                            />
                            <Label
                              htmlFor={`primary-${assignment.branch_id}`}
                              className="text-sm text-muted-foreground cursor-pointer"
                            >
                              Set as primary branch
                            </Label>
                          </div>
                        )}
                      </div>

                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 shrink-0"
                        onClick={() => removeBranchAssignment(assignment.branch_id)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={sendInvite.isPending || !fullName.trim() || !email.trim() || branchAssignments.length === 0}
            >
              {sendInvite.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Mail className="mr-2 h-4 w-4" />
                  Send Invitation
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
