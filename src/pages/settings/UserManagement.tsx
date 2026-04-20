import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Users, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useStaff, useCreateStaff } from "@/hooks/useStaff";
import { useBranches, useUserBusiness } from "@/hooks/useBranches";
import { supabase } from "@/integrations/supabase/client";

const UserManagement = () => {
  const { data: business } = useUserBusiness();
  const { data: staff = [], isLoading } = useStaff();
  const { data: branches = [] } = useBranches(business?.id);
  const createStaff = useCreateStaff();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newStaff, setNewStaff] = useState({
    full_name: "",
    email: "",
    phone: "",
    role: "staff",
    branch_id: "",
  });

  const defaultBranchId = branches.find((branch) => branch.is_main)?.id || branches[0]?.id || "";

  useEffect(() => {
    if (!newStaff.branch_id && defaultBranchId) {
      setNewStaff((prev) => ({ ...prev, branch_id: defaultBranchId }));
    }
  }, [defaultBranchId, newStaff.branch_id]);

  const handleAddStaff = async () => {
    if (!newStaff.full_name) {
      toast.error("Please enter a name");
      return;
    }

    // Cross-business email uniqueness check
    if (newStaff.email) {
      const normalizedEmail = newStaff.email.trim().toLowerCase();
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

    const selectedBranchId = newStaff.branch_id || defaultBranchId;
    if (!selectedBranchId) {
      toast.error("Please select a branch before adding staff");
      return;
    }

    try {
      await createStaff.mutateAsync({
        full_name: newStaff.full_name,
        email: newStaff.email || null,
        phone: newStaff.phone || null,
        role: newStaff.role,
        branch_id: selectedBranchId,
        is_active: true,
        salary: 0,
        address: null,
        department_id: null,
        employee_id: null,
        hire_date: null,
        last_login: null,
        user_id: null,
      });
      setNewStaff({ full_name: "", email: "", phone: "", role: "staff", branch_id: defaultBranchId || "" });
      setIsDialogOpen(false);
      toast.success("Staff member added successfully");
    } catch (error: any) {
      toast.error(error.message || "Failed to add staff member");
    }
  };

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center p-6">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-4 p-4 md:p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">User Management</h2>
          <p className="text-muted-foreground">Manage staff members and permissions</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="w-full sm:w-auto"><Plus className="mr-2 h-4 w-4" />Add Staff</Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Add New Staff Member</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Full Name *</Label>
                <Input 
                  value={newStaff.full_name} 
                  onChange={(e) => setNewStaff({ ...newStaff, full_name: e.target.value })} 
                  placeholder="John Doe" 
                />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input 
                  type="email"
                  value={newStaff.email} 
                  onChange={(e) => setNewStaff({ ...newStaff, email: e.target.value })} 
                  placeholder="john@example.com" 
                />
              </div>
              <div className="space-y-2">
                <Label>Phone</Label>
                <Input 
                  value={newStaff.phone} 
                  onChange={(e) => setNewStaff({ ...newStaff, phone: e.target.value })} 
                  placeholder="+234 801 234 5678" 
                />
              </div>
              <div className="space-y-2">
                <Label>Role</Label>
                <Select value={newStaff.role} onValueChange={(value) => setNewStaff({ ...newStaff, role: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="manager">Manager</SelectItem>
                    <SelectItem value="cashier">Cashier</SelectItem>
                    <SelectItem value="staff">Staff</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Branch</Label>
                <Select value={newStaff.branch_id} onValueChange={(value) => setNewStaff({ ...newStaff, branch_id: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select branch" />
                  </SelectTrigger>
                  <SelectContent>
                    {branches.map((branch) => (
                      <SelectItem key={branch.id} value={branch.id}>{branch.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={handleAddStaff} className="w-full" disabled={createStaff.isPending}>
                {createStaff.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Add Staff Member
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Staff Members
          </CardTitle>
        </CardHeader>
        <CardContent>
          {staff.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No staff members found. Add your first staff member to get started.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead className="hidden sm:table-cell">Email</TableHead>
                    <TableHead className="hidden md:table-cell">Phone</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead className="hidden sm:table-cell">Branch</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {staff.map((member) => (
                    <TableRow key={member.id}>
                      <TableCell className="font-medium">{member.full_name}</TableCell>
                      <TableCell className="hidden sm:table-cell">{member.email || "-"}</TableCell>
                      <TableCell className="hidden md:table-cell">{member.phone || "-"}</TableCell>
                      <TableCell className="capitalize">{member.role}</TableCell>
                      <TableCell className="hidden sm:table-cell">{member.branch?.name || "-"}</TableCell>
                      <TableCell>
                        <Badge className={member.is_active ? "bg-green-500" : "bg-red-500"}>
                          {member.is_active ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default UserManagement;
