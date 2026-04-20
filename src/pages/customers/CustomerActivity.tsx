import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, Plus, Users, Loader2, Pencil, Trash2, MoreHorizontal, ShieldX, Eye } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { useCustomers, useCreateCustomer, useUpdateCustomer, useDeleteCustomer } from "@/hooks/useCustomers";
import { useCustomerGroups } from "@/hooks/useCustomerGroups";
import { CustomerProfileDialog } from "@/components/crm/CustomerProfileDialog";
import { useBranchContext } from "@/contexts/BranchContext";

const CustomerActivity = () => {
  const [searchParams] = useSearchParams();
  const { data: customers = [], isLoading: customersLoading } = useCustomers();
  const { data: customerGroups = [], isLoading: groupsLoading } = useCustomerGroups();
  const { isOwner, hasPermission, isLoading: branchLoading } = useBranchContext();
  
  const createCustomer = useCreateCustomer();
  const updateCustomer = useUpdateCustomer();
  const deleteCustomer = useDeleteCustomer();

  const hasCRMView = isOwner || hasPermission('crm.view' as any);
  const hasCRMManage = isOwner || hasPermission('crm.manage' as any);

  const [searchTerm, setSearchTerm] = useState("");
  const [isCustomerDialogOpen, setIsCustomerDialogOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<any>(null);
  const [viewingCustomer, setViewingCustomer] = useState<any>(null);
  const [isProfileDialogOpen, setIsProfileDialogOpen] = useState(false);
  const [customerForm, setCustomerForm] = useState({ name: "", phone: "", email: "", group_id: "", notes: "" });

  useEffect(() => {
    if (searchParams.get("action") === "add") {
      setIsCustomerDialogOpen(true);
    }
  }, [searchParams]);

  const filteredCustomers = customers.filter((c) =>
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (c.phone?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false)
  );

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", minimumFractionDigits: 0 }).format(amount);

  const handleOpenCustomerDialog = (customer?: any) => {
    if (customer) {
      setEditingCustomer(customer);
      setCustomerForm({
        name: customer.name,
        phone: customer.phone || "",
        email: customer.email || "",
        group_id: customer.group_id || "",
        notes: customer.notes || ""
      });
    } else {
      setEditingCustomer(null);
      setCustomerForm({ name: "", phone: "", email: "", group_id: "", notes: "" });
    }
    setIsCustomerDialogOpen(true);
  };

  const handleSaveCustomer = async () => {
    if (!customerForm.name.trim()) {
      toast.error("Please enter a customer name");
      return;
    }

    try {
      const data = {
        name: customerForm.name.trim(),
        phone: customerForm.phone || null,
        email: customerForm.email || null,
        group_id: customerForm.group_id || null,
        notes: customerForm.notes || null
      };

      if (editingCustomer) {
        await updateCustomer.mutateAsync({ id: editingCustomer.id, ...data });
        toast.success("Customer updated successfully");
      } else {
        await createCustomer.mutateAsync(data);
        toast.success("Customer added successfully");
      }
      setIsCustomerDialogOpen(false);
      setEditingCustomer(null);
    } catch (error: any) {
      toast.error(error.message || "Failed to save customer");
    }
  };

  const handleDeleteCustomer = async (id: string) => {
    if (!confirm("Are you sure you want to delete this customer?")) return;
    try {
      await deleteCustomer.mutateAsync(id);
      toast.success("Customer deleted");
    } catch (error: any) {
      toast.error(error.message || "Failed to delete customer");
    }
  };

  const getGroupName = (groupId: string | null) => {
    if (!groupId) return null;
    return customerGroups.find(g => g.id === groupId)?.name || null;
  };

  const isLoading = customersLoading || groupsLoading || branchLoading;

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
              You don't have permission to access Customer Activity. Contact your administrator to request access.
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
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Customer Activity</h1>
          <p className="text-muted-foreground text-sm md:text-base">View and manage customer purchase history</p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 justify-between">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search customers..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        {hasCRMManage && (
          <Button onClick={() => handleOpenCustomerDialog()}>
            <Plus className="mr-2 h-4 w-4" />
            <span className="hidden sm:inline">Add Customer</span>
            <span className="sm:hidden">Add</span>
          </Button>
        )}
      </div>

      <Card>
        <CardContent className="p-0">
          {filteredCustomers.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No customers found. Add your first customer to get started.</p>
            </div>
          ) : (
            <>
              {/* Desktop Table */}
              <div className="hidden md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>Group</TableHead>
                      <TableHead>Loyalty Points</TableHead>
                      <TableHead>Loyalty Value</TableHead>
                      <TableHead>Total Spend</TableHead>
                      <TableHead className="w-[50px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredCustomers.map((customer) => (
                      <TableRow key={customer.id}>
                        <TableCell className="font-medium">{customer.name}</TableCell>
                        <TableCell>{customer.phone || "-"}</TableCell>
                        <TableCell>
                          {getGroupName(customer.group_id) ? (
                            <Badge variant="outline">{getGroupName(customer.group_id)}</Badge>
                          ) : "-"}
                        </TableCell>
                        <TableCell>{customer.reward_points || 0}</TableCell>
                        <TableCell>{formatCurrency(customer.reward_points_value || 0)}</TableCell>
                        <TableCell>{formatCurrency(customer.total_purchases)}</TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="bg-popover border">
                              <DropdownMenuItem onClick={() => {
                                setViewingCustomer(customer);
                                setIsProfileDialogOpen(true);
                              }}>
                                <Eye className="mr-2 h-4 w-4" /> View Profile
                              </DropdownMenuItem>
                              {hasCRMManage && (
                                <>
                                  <DropdownMenuItem onClick={() => handleOpenCustomerDialog(customer)}>
                                    <Pencil className="mr-2 h-4 w-4" /> Edit
                                  </DropdownMenuItem>
                                  <DropdownMenuItem className="text-destructive" onClick={() => handleDeleteCustomer(customer.id)}>
                                    <Trash2 className="mr-2 h-4 w-4" /> Delete
                                  </DropdownMenuItem>
                                </>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile Cards */}
              <div className="md:hidden divide-y">
                {filteredCustomers.map((customer) => (
                  <div key={customer.id} className="p-4 flex items-center justify-between">
                    <div className="space-y-1">
                      <p className="font-medium">{customer.name}</p>
                      <p className="text-sm text-muted-foreground">{customer.phone || "No phone"}</p>
                      <div className="flex items-center gap-2 flex-wrap">
                        {getGroupName(customer.group_id) && (
                          <Badge variant="outline" className="text-xs">{getGroupName(customer.group_id)}</Badge>
                        )}
                        <span className="text-xs text-muted-foreground">{customer.reward_points || 0} pts</span>
                        <span className="text-xs text-primary font-medium">{formatCurrency(customer.reward_points_value || 0)}</span>
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="bg-popover border">
                        <DropdownMenuItem onClick={() => {
                          setViewingCustomer(customer);
                          setIsProfileDialogOpen(true);
                        }}>
                          <Eye className="mr-2 h-4 w-4" /> View Profile
                        </DropdownMenuItem>
                        {hasCRMManage && (
                          <>
                            <DropdownMenuItem onClick={() => handleOpenCustomerDialog(customer)}>
                              <Pencil className="mr-2 h-4 w-4" /> Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem className="text-destructive" onClick={() => handleDeleteCustomer(customer.id)}>
                              <Trash2 className="mr-2 h-4 w-4" /> Delete
                            </DropdownMenuItem>
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Customer Dialog */}
      <Dialog open={isCustomerDialogOpen} onOpenChange={setIsCustomerDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingCustomer ? "Edit Customer" : "Add New Customer"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Name *</Label>
              <Input
                value={customerForm.name}
                onChange={(e) => setCustomerForm({ ...customerForm, name: e.target.value })}
                placeholder="Customer name"
              />
            </div>
            <div className="space-y-2">
              <Label>Phone</Label>
              <Input
                value={customerForm.phone}
                onChange={(e) => setCustomerForm({ ...customerForm, phone: e.target.value })}
                placeholder="Phone number"
              />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input
                type="email"
                value={customerForm.email}
                onChange={(e) => setCustomerForm({ ...customerForm, email: e.target.value })}
                placeholder="Email address"
              />
            </div>
            <div className="space-y-2">
              <Label>Customer Group</Label>
              <Select
                value={customerForm.group_id || "none"}
                onValueChange={(value) => setCustomerForm({ ...customerForm, group_id: value === "none" ? "" : value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a group (optional)" />
                </SelectTrigger>
                <SelectContent className="bg-popover border">
                  <SelectItem value="none">No Group</SelectItem>
                  {customerGroups.map((group) => (
                    <SelectItem key={group.id} value={group.id}>{group.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea
                value={customerForm.notes}
                onChange={(e) => setCustomerForm({ ...customerForm, notes: e.target.value })}
                placeholder="Additional notes..."
                rows={3}
              />
            </div>
            <Button
              onClick={handleSaveCustomer}
              className="w-full"
              disabled={createCustomer.isPending || updateCustomer.isPending}
            >
              {(createCustomer.isPending || updateCustomer.isPending) && (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              )}
              {editingCustomer ? "Update Customer" : "Add Customer"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Customer Profile Dialog */}
      <CustomerProfileDialog
        customer={viewingCustomer}
        groupName={getGroupName(viewingCustomer?.group_id)}
        open={isProfileDialogOpen}
        onOpenChange={setIsProfileDialogOpen}
      />
    </main>
  );
};

export default CustomerActivity;
