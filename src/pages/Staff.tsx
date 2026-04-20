import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, Loader2, Pencil, Mail, MoreHorizontal, Trash2, UserX, UserCheck } from "lucide-react";
import { UsageLimitBanner, UsageInline } from "@/components/subscription/UsageLimitBanner";
import { BranchCapacitySummary } from "@/components/subscription/BranchStaffCapacityCard";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useStaffMembers, useCreateStaffMember, useUpdateStaffMember, useDeleteStaffMember } from "@/hooks/useStaffMembers";
import { useBranches } from "@/hooks/useBranches";
import { useBusiness } from "@/hooks/useBusiness";
import { useDepartments } from "@/hooks/useDepartments";
import { useBranchContext } from "@/contexts/BranchContext";
import { StaffInviteDialog } from "@/components/staff/StaffInviteDialog";
import { StaffInvitationsList } from "@/components/staff/StaffInvitationsList";
import { useCurrentUserPermissions } from "@/hooks/usePermissions";
import { useStaffLimits, useBusinessPlan } from "@/hooks/useFeatureGating";
import { useAllBranchCapacities, useCanAddStaffToBranch } from "@/hooks/useBranchCapacity";

const Staff = () => {
  const { data: business } = useBusiness();
  const { currentBranch } = useBranchContext();
  const { data: allStaff = [], isLoading } = useStaffMembers();
  const { data: branches = [] } = useBranches(business?.id);
  const { data: departments = [] } = useDepartments();
  const { data: staffLimits } = useStaffLimits();
  const { data: planInfo } = useBusinessPlan();
  const { data: branchCapacities = [] } = useAllBranchCapacities();
  const { canAdd: canAddToBranch, message: branchCapacityMessage } = useCanAddStaffToBranch(currentBranch?.id || null);
  const createStaff = useCreateStaffMember();
  const updateStaff = useUpdateStaffMember();
  const deleteStaff = useDeleteStaffMember();
  const { data: permissionData } = useCurrentUserPermissions();
  
  const isOwner = permissionData?.isOwner || false;
  const permissions = permissionData?.permissions || [];
  const canManageStaff = isOwner || permissions.includes("staff.manage");
  const canSuspendStaff = isOwner || permissions.includes("staff.suspend");
  
  // Staff limits with capacity enforcement
  // For branch-scoped mode: check branch capacity
  // For business-wide mode: check business-wide capacity
  const canAddStaff = currentBranch 
    ? canAddToBranch 
    : (staffLimits?.canAddStaff ?? true);
  const currentStaffCount = staffLimits?.currentStaff ?? 0;
  const maxStaffCount = staffLimits?.maxStaff ?? 2;
  const plan = planInfo?.effectivePlan || "free";
  const addonsAllowed = staffLimits?.addonsAllowed ?? false;
  
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isSuspendDialogOpen, setIsSuspendDialogOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<any>(null);
  const [staffToDelete, setStaffToDelete] = useState<any>(null);
  const [staffToSuspend, setStaffToSuspend] = useState<any>(null);

  // For branch-specific filtering, we need to check staff_branch_assignments
  // Get all staff IDs that have assignments to the current branch
  const { data: branchAssignments = [] } = useQuery({
    queryKey: ["branch-staff-assignments", currentBranch?.id],
    queryFn: async () => {
      if (!currentBranch) return [];
      const { data, error } = await supabase
        .from("staff_branch_assignments")
        .select("staff_id")
        .eq("branch_id", currentBranch.id)
        .eq("is_active", true);
      if (error) throw error;
      return data || [];
    },
    enabled: !!currentBranch,
  });

  // Filter staff ONLY by branch assignments (the proper way)
  // Staff should appear in a branch only if they have an active assignment to that branch
  const staffIdsInBranch = new Set(branchAssignments.map(ba => ba.staff_id));
  const staff = currentBranch 
    ? allStaff.filter(s => staffIdsInBranch.has(s.id))
    : allStaff;

  const handleEditStaff = (member: any) => {
    setEditingStaff({
      id: member.id,
      full_name: member.full_name,
      email: member.email || "",
      phone: member.phone || "",
      role: member.role || "",
      branch_id: member.branch_id || "",
      department_id: member.department_id || "",
      is_active: member.is_active,
      salary: member.salary || 0,
    });
    setIsEditDialogOpen(true);
  };

  const handleUpdateStaff = async () => {
    if (!editingStaff?.full_name) {
      toast.error("Please enter a name");
      return;
    }

    // Cross-business email uniqueness check when email is changed
    if (editingStaff.email) {
      const normalizedEmail = editingStaff.email.trim().toLowerCase();
      const originalStaff = allStaff.find(s => s.id === editingStaff.id);
      const emailChanged = originalStaff?.email?.toLowerCase() !== normalizedEmail;

      if (emailChanged) {
        try {
          const { data: ownerConflict } = await supabase
            .from("businesses")
            .select("id")
            .eq("owner_email", normalizedEmail)
            .limit(1)
            .maybeSingle();

          if (ownerConflict && ownerConflict.id !== business?.id) {
            toast.error("A user account with this email already exists. Please use another email.");
            return;
          }

          const { data: staffConflict } = await supabase
            .from("staff")
            .select("id, business_id")
            .eq("email", normalizedEmail)
            .eq("is_active", true)
            .neq("id", editingStaff.id)
            .limit(1)
            .maybeSingle();

          if (staffConflict && staffConflict.business_id !== business?.id) {
            toast.error("A user account with this email already exists. Please use another email.");
            return;
          }
        } catch (err) {
          console.warn("Email uniqueness check failed, proceeding");
        }
      }
    }

    try {
      await updateStaff.mutateAsync({
        id: editingStaff.id,
        full_name: editingStaff.full_name,
        email: editingStaff.email || null,
        phone: editingStaff.phone || null,
        role: editingStaff.role || "staff",
        branch_id: editingStaff.branch_id || null,
        department_id: editingStaff.department_id || null,
        is_active: editingStaff.is_active,
        salary: editingStaff.salary || 0,
      });
      setEditingStaff(null);
      setIsEditDialogOpen(false);
      toast.success("Staff member updated successfully");
    } catch (error: any) {
      toast.error(error.message || "Failed to update staff member");
    }
  };

  const handleDeleteStaff = async () => {
    if (!staffToDelete) return;
    try {
      await deleteStaff.mutateAsync(staffToDelete.id);
      setStaffToDelete(null);
      setIsDeleteDialogOpen(false);
      toast.success("Staff member deleted successfully");
    } catch (error: any) {
      toast.error(error.message || "Failed to delete staff member");
    }
  };

  const handleSuspendToggle = async () => {
    if (!staffToSuspend) return;
    try {
      await updateStaff.mutateAsync({
        id: staffToSuspend.id,
        is_active: !staffToSuspend.is_active,
      });
      setStaffToSuspend(null);
      setIsSuspendDialogOpen(false);
      toast.success(staffToSuspend.is_active ? "Staff member suspended" : "Staff member reactivated");
    } catch (error: any) {
      toast.error(error.message || "Failed to update staff status");
    }
  };

  const openDeleteDialog = (member: any) => {
    setStaffToDelete(member);
    setIsDeleteDialogOpen(true);
  };

  const openSuspendDialog = (member: any) => {
    setStaffToSuspend(member);
    setIsSuspendDialogOpen(true);
  };

  const getBranchName = (branchId: string | null) => {
    if (!branchId) return "-";
    const branch = branches.find((b) => b.id === branchId);
    return branch?.name || "-";
  };

  const getDepartmentName = (deptId: string | null) => {
    if (!deptId) return "-";
    const dept = departments.find((d) => d.id === deptId);
    return dept?.name || "-";
  };

  if (isLoading) {
    return (
      <main className="flex-1 overflow-y-auto p-6 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </main>
    );
  }

  return (
    <main className="flex-1 overflow-y-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Staff</h1>
          <p className="text-muted-foreground">
            Manage your team members (
            <UsageInline 
              current={currentStaffCount} 
              max={maxStaffCount} 
              isUnlimited={maxStaffCount >= 999}
              addonCount={(staffLimits?.addonStaff ?? 0) + (staffLimits?.branchBonusStaff ?? 0)}
            />)
            {currentBranch && <span className="ml-1">- {currentBranch.name}</span>}
          </p>
        </div>
        {canManageStaff && (
          <Button onClick={() => setIsInviteDialogOpen(true)} disabled={!canAddStaff}>
            <Mail className="mr-2 h-4 w-4" />Invite Staff
          </Button>
        )}
      </div>

      <UsageLimitBanner
        resourceType="staff"
        current={currentStaffCount}
        max={maxStaffCount}
        isUnlimited={maxStaffCount >= 999}
        addonCount={(staffLimits?.addonStaff ?? 0) + (staffLimits?.branchBonusStaff ?? 0)}
        adminExcluded={true}
        plan={plan}
        canBuyAddon={addonsAllowed && ((staffLimits?.addonStaff ?? 0) < (plan === "enterprise" ? 4 : 2))}
      />

      {/* Per-Branch Capacity Overview */}
      {branchCapacities.length > 1 && (
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-muted-foreground">Staff per Branch</h3>
          <BranchCapacitySummary capacities={branchCapacities} />
        </div>
      )}

      <Tabs defaultValue="staff" className="w-full">
        <TabsList>
          <TabsTrigger value="staff">Staff Members</TabsTrigger>
          <TabsTrigger value="invitations">Invitations</TabsTrigger>
        </TabsList>
        
        <TabsContent value="staff">

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Staff Members {currentBranch && `(${currentBranch.name})`}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {staff.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No staff members found{currentBranch ? ` in ${currentBranch.name}` : ""}. Add your first team member to get started.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Branch</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[50px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {staff.map((member) => (
                  <TableRow key={member.id}>
                    <TableCell className="font-medium">{member.full_name}</TableCell>
                    <TableCell>{member.email || "-"}</TableCell>
                    <TableCell>{member.phone || "-"}</TableCell>
                    <TableCell>{getBranchName(member.branch_id)}</TableCell>
                    <TableCell>{getDepartmentName(member.department_id)}</TableCell>
                    <TableCell>{member.role}</TableCell>
                    <TableCell>
                      <Badge className={member.is_active ? "bg-success text-success-foreground" : "bg-destructive text-destructive-foreground"}>
                        {member.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {canManageStaff && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="bg-popover border">
                            <DropdownMenuItem onClick={() => handleEditStaff(member)}>
                              <Pencil className="h-4 w-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                            {canSuspendStaff && (
                              <DropdownMenuItem onClick={() => openSuspendDialog(member)}>
                                {member.is_active ? (
                                  <>
                                    <UserX className="h-4 w-4 mr-2" />
                                    Suspend
                                  </>
                                ) : (
                                  <>
                                    <UserCheck className="h-4 w-4 mr-2" />
                                    Reactivate
                                  </>
                                )}
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem 
                              onClick={() => openDeleteDialog(member)}
                              className="text-destructive focus:text-destructive"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
        </TabsContent>
        
        <TabsContent value="invitations">
          <StaffInvitationsList />
        </TabsContent>
      </Tabs>

      <StaffInviteDialog open={isInviteDialogOpen} onOpenChange={setIsInviteDialogOpen} />

      {/* Edit Staff Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Staff Member</DialogTitle>
          </DialogHeader>
          {editingStaff && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Full Name *</Label>
                <Input value={editingStaff.full_name} onChange={(e) => setEditingStaff({ ...editingStaff, full_name: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input type="email" value={editingStaff.email} onChange={(e) => setEditingStaff({ ...editingStaff, email: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Phone</Label>
                <Input value={editingStaff.phone} onChange={(e) => setEditingStaff({ ...editingStaff, phone: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Role/Position</Label>
                <Input value={editingStaff.role} onChange={(e) => setEditingStaff({ ...editingStaff, role: e.target.value })} placeholder="e.g., Manager, Cashier" />
              </div>
              <div className="space-y-2">
                <Label>Branch</Label>
                <Select value={editingStaff.branch_id || "none"} onValueChange={(v) => setEditingStaff({ ...editingStaff, branch_id: v === "none" ? "" : v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select branch" />
                  </SelectTrigger>
                  <SelectContent className="bg-popover border">
                    <SelectItem value="none">No Branch</SelectItem>
                    {branches.map((branch) => (
                      <SelectItem key={branch.id} value={branch.id}>{branch.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Department</Label>
                <Select value={editingStaff.department_id || "none"} onValueChange={(v) => setEditingStaff({ ...editingStaff, department_id: v === "none" ? "" : v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select department" />
                  </SelectTrigger>
                  <SelectContent className="bg-popover border">
                    <SelectItem value="none">No Department</SelectItem>
                    {departments.map((dept) => (
                      <SelectItem key={dept.id} value={dept.id}>{dept.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Salary</Label>
                <Input type="number" value={editingStaff.salary} onChange={(e) => setEditingStaff({ ...editingStaff, salary: parseFloat(e.target.value) || 0 })} />
              </div>
              <div className="flex items-center gap-2">
                <input 
                  type="checkbox" 
                  id="is_active" 
                  checked={editingStaff.is_active} 
                  onChange={(e) => setEditingStaff({ ...editingStaff, is_active: e.target.checked })}
                  className="h-4 w-4"
                />
                <Label htmlFor="is_active">Active</Label>
              </div>
              <Button onClick={handleUpdateStaff} className="w-full" disabled={updateStaff.isPending}>
                {updateStaff.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Update Staff
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Staff Member</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{staffToDelete?.full_name}</strong>? 
              This action cannot be undone and will remove all associated data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteStaff}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteStaff.isPending}
            >
              {deleteStaff.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Suspend/Reactivate Confirmation Dialog */}
      <AlertDialog open={isSuspendDialogOpen} onOpenChange={setIsSuspendDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {staffToSuspend?.is_active ? "Suspend" : "Reactivate"} Staff Member
            </AlertDialogTitle>
            <AlertDialogDescription>
              {staffToSuspend?.is_active 
                ? `Suspending ${staffToSuspend?.full_name} will revoke their access to the system. They won't be able to log in or perform any actions.`
                : `Reactivating ${staffToSuspend?.full_name} will restore their access to the system.`
              }
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleSuspendToggle}
              disabled={updateStaff.isPending}
            >
              {updateStaff.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              {staffToSuspend?.is_active ? "Suspend" : "Reactivate"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </main>
  );
};

export default Staff;
