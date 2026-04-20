import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, Plus, Tags, Loader2, Pencil, Trash2, MoreHorizontal, ShieldX } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { useCustomerGroups, useCreateCustomerGroup, useUpdateCustomerGroup, useDeleteCustomerGroup } from "@/hooks/useCustomerGroups";
import { useCreditSalesEnabled } from "@/hooks/useCreditSales";
import { useBranchContext } from "@/contexts/BranchContext";

const CustomerGroups = () => {
  const { data: customerGroups = [], isLoading: groupsLoading } = useCustomerGroups();
  const { data: creditSalesEnabled } = useCreditSalesEnabled();
  const { isOwner, hasPermission, isLoading: branchLoading } = useBranchContext();

  const createGroup = useCreateCustomerGroup();
  const updateGroup = useUpdateCustomerGroup();
  const deleteGroup = useDeleteCustomerGroup();

  const hasCRMView = isOwner || hasPermission('crm.view' as any);
  const hasCRMManage = isOwner || hasPermission('crm.manage' as any);

  const [searchTerm, setSearchTerm] = useState("");
  const [isGroupDialogOpen, setIsGroupDialogOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<any>(null);
  const [groupForm, setGroupForm] = useState({ name: "", description: "", credit_limit: 0, discount_percent: 0 });

  const filteredGroups = customerGroups.filter((g) =>
    g.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", minimumFractionDigits: 0 }).format(amount);

  const handleOpenGroupDialog = (group?: any) => {
    if (group) {
      setEditingGroup(group);
      setGroupForm({
        name: group.name,
        description: group.description || "",
        credit_limit: group.credit_limit || 0,
        discount_percent: group.discount_percent || 0
      });
    } else {
      setEditingGroup(null);
      setGroupForm({ name: "", description: "", credit_limit: 0, discount_percent: 0 });
    }
    setIsGroupDialogOpen(true);
  };

  const handleSaveGroup = async () => {
    if (!groupForm.name.trim()) {
      toast.error("Please enter a group name");
      return;
    }

    try {
      const data = {
        name: groupForm.name.trim(),
        description: groupForm.description || null,
        credit_limit: groupForm.credit_limit || 0
      };

      if (editingGroup) {
        await updateGroup.mutateAsync({ id: editingGroup.id, ...data });
        toast.success("Group updated successfully");
      } else {
        await createGroup.mutateAsync(data);
        toast.success("Group created successfully");
      }
      setIsGroupDialogOpen(false);
      setEditingGroup(null);
    } catch (error: any) {
      toast.error(error.message || "Failed to save group");
    }
  };

  const handleDeleteGroup = async (id: string) => {
    if (!confirm("Are you sure you want to delete this group?")) return;
    try {
      await deleteGroup.mutateAsync(id);
      toast.success("Group deleted");
    } catch (error: any) {
      toast.error(error.message || "Failed to delete group");
    }
  };

  const isLoading = groupsLoading || branchLoading;

  if (isLoading) {
    return (
      <main className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-6 w-72" />
        <Skeleton className="h-96 w-full" />
      </main>
    );
  }

  if (!hasCRMView) {
    return (
      <main className="flex-1 overflow-y-auto p-6">
        <Card className="border-destructive/50 bg-destructive/5">
          <CardContent className="flex flex-col items-center justify-center py-12 space-y-4">
            <ShieldX className="h-12 w-12 text-destructive" />
            <h2 className="text-xl font-semibold text-destructive">Access Restricted</h2>
            <p className="text-muted-foreground text-center max-w-md">
              You don't have permission to access Customer Groups. Contact your administrator to request access.
            </p>
          </CardContent>
        </Card>
      </main>
    );
  }

  return (
    <main className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Customer Groups</h1>
          <p className="text-muted-foreground text-sm md:text-base">Organize customers for targeted engagement</p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 justify-between">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search groups..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        {hasCRMManage && (
          <Button onClick={() => handleOpenGroupDialog()}>
            <Plus className="mr-2 h-4 w-4" />
            <span className="hidden sm:inline">Add Group</span>
            <span className="sm:hidden">Add</span>
          </Button>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Tags className="h-5 w-5" />
            Customer Groups
          </CardTitle>
          <CardDescription>
            Create groups to organize customers{creditSalesEnabled && " and set credit limits"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredGroups.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Tags className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No groups found. Create your first customer group.</p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filteredGroups.map((group) => (
                <Card key={group.id} className="relative">
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <CardTitle className="text-lg">{group.name}</CardTitle>
                      {hasCRMManage && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="bg-popover border">
                            <DropdownMenuItem onClick={() => handleOpenGroupDialog(group)}>
                              <Pencil className="mr-2 h-4 w-4" /> Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem className="text-destructive" onClick={() => handleDeleteGroup(group.id)}>
                              <Trash2 className="mr-2 h-4 w-4" /> Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </div>
                    {group.description && (
                      <CardDescription className="text-sm">{group.description}</CardDescription>
                    )}
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {creditSalesEnabled && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Credit Limit</span>
                        <span className="font-medium">{formatCurrency(group.credit_limit)}</span>
                      </div>
                    )}
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Status</span>
                      <Badge variant={group.is_active ? "default" : "secondary"}>
                        {group.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Group Dialog */}
      <Dialog open={isGroupDialogOpen} onOpenChange={setIsGroupDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingGroup ? "Edit Group" : "Create Customer Group"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Group Name *</Label>
              <Input
                value={groupForm.name}
                onChange={(e) => setGroupForm({ ...groupForm, name: e.target.value })}
                placeholder="e.g., VIP Customers, Wholesale Buyers"
              />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={groupForm.description}
                onChange={(e) => setGroupForm({ ...groupForm, description: e.target.value })}
                placeholder="Describe this customer group..."
                rows={3}
              />
            </div>
            {creditSalesEnabled && (
              <div className="space-y-2">
                <Label>Credit Limit (₦)</Label>
                <Input
                  type="number"
                  min="0"
                  value={groupForm.credit_limit}
                  onChange={(e) => setGroupForm({ ...groupForm, credit_limit: parseFloat(e.target.value) || 0 })}
                  placeholder="0"
                />
                <p className="text-xs text-muted-foreground">
                  Maximum credit allowed for customers in this group (0 = no credit)
                </p>
              </div>
            )}
            <Button
              onClick={handleSaveGroup}
              className="w-full"
              disabled={createGroup.isPending || updateGroup.isPending}
            >
              {(createGroup.isPending || updateGroup.isPending) && (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              )}
              {editingGroup ? "Update Group" : "Create Group"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </main>
  );
};

export default CustomerGroups;
