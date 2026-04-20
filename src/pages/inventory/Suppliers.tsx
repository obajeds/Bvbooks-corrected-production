import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Truck, Loader2, Pencil } from "lucide-react";
import { toast } from "sonner";
import { useSuppliers, useCreateSupplier, useUpdateSupplier } from "@/hooks/useSuppliers";
import { useBranches } from "@/hooks/useBranches";
import { useBusiness } from "@/hooks/useBusiness";
import { useBranchContext } from "@/contexts/BranchContext";
import { useCurrentUserPermissions } from "@/hooks/usePermissions";

const Suppliers = () => {
  const { data: business } = useBusiness();
  const { currentBranch } = useBranchContext();
  const { data: allSuppliers = [], isLoading } = useSuppliers();
  const { data: branches = [] } = useBranches(business?.id);
  const createSupplier = useCreateSupplier();
  const updateSupplier = useUpdateSupplier();
  const { data: permissionData } = useCurrentUserPermissions();
  
  const isOwner = permissionData?.isOwner || false;
  const permissions = permissionData?.permissions || [];
  const canCreate = isOwner || permissions.includes("inventory.item.create");
  const canEdit = isOwner || permissions.includes("inventory.item.edit");
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<any>(null);
  const [newSupplier, setNewSupplier] = useState({ 
    name: "", 
    contact_person: "", 
    phone: "", 
    email: "", 
    address: "",
    branch_id: "",
  });

  // Filter suppliers by current branch if branch_id exists on supplier
  const suppliers = allSuppliers;

  const handleAddSupplier = async () => {
    if (!newSupplier.name) {
      toast.error("Please enter a supplier name");
      return;
    }

    try {
      await createSupplier.mutateAsync({
        name: newSupplier.name,
        contact_person: newSupplier.contact_person || null,
        phone: newSupplier.phone || null,
        email: newSupplier.email || null,
        address: newSupplier.address || null,
      });
      setNewSupplier({ name: "", contact_person: "", phone: "", email: "", address: "", branch_id: "" });
      setIsDialogOpen(false);
      toast.success("Supplier added successfully");
    } catch (error: any) {
      toast.error(error.message || "Failed to add supplier");
    }
  };

  const handleEditSupplier = (supplier: any) => {
    setEditingSupplier({
      id: supplier.id,
      name: supplier.name,
      contact_person: supplier.contact_person || "",
      phone: supplier.phone || "",
      email: supplier.email || "",
      address: supplier.address || "",
      is_active: supplier.is_active,
    });
    setIsEditDialogOpen(true);
  };

  const handleUpdateSupplier = async () => {
    if (!editingSupplier?.name) {
      toast.error("Please enter a supplier name");
      return;
    }

    try {
      await updateSupplier.mutateAsync({
        id: editingSupplier.id,
        name: editingSupplier.name,
        contact_person: editingSupplier.contact_person || null,
        phone: editingSupplier.phone || null,
        email: editingSupplier.email || null,
        address: editingSupplier.address || null,
        is_active: editingSupplier.is_active,
      });
      setEditingSupplier(null);
      setIsEditDialogOpen(false);
      toast.success("Supplier updated successfully");
    } catch (error: any) {
      toast.error(error.message || "Failed to update supplier");
    }
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
          <h1 className="text-3xl font-bold tracking-tight">Suppliers</h1>
          <p className="text-muted-foreground">Manage your supplier contacts</p>
        </div>
        {canCreate && (
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="mr-2 h-4 w-4" />Add Supplier</Button>
            </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Supplier</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Company Name *</Label>
                <Input value={newSupplier.name} onChange={(e) => setNewSupplier({ ...newSupplier, name: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Contact Person</Label>
                <Input value={newSupplier.contact_person} onChange={(e) => setNewSupplier({ ...newSupplier, contact_person: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Phone</Label>
                <Input value={newSupplier.phone} onChange={(e) => setNewSupplier({ ...newSupplier, phone: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input type="email" value={newSupplier.email} onChange={(e) => setNewSupplier({ ...newSupplier, email: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Address</Label>
                <Input value={newSupplier.address} onChange={(e) => setNewSupplier({ ...newSupplier, address: e.target.value })} />
              </div>
              <Button onClick={handleAddSupplier} className="w-full" disabled={createSupplier.isPending}>
                {createSupplier.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Add Supplier
              </Button>
            </div>
          </DialogContent>
        </Dialog>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Truck className="h-5 w-5" />
            Supplier List
          </CardTitle>
        </CardHeader>
        <CardContent>
          {suppliers.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Truck className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No suppliers found. Add your first supplier to get started.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Company</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Address</TableHead>
                  <TableHead className="w-[50px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {suppliers.map((supplier) => (
                  <TableRow key={supplier.id}>
                    <TableCell className="font-medium">{supplier.name}</TableCell>
                    <TableCell>{supplier.contact_person || "-"}</TableCell>
                    <TableCell>{supplier.phone || "-"}</TableCell>
                    <TableCell>{supplier.email || "-"}</TableCell>
                    <TableCell>{supplier.address || "-"}</TableCell>
                    <TableCell>
                      {canEdit && (
                        <Button variant="ghost" size="icon" onClick={() => handleEditSupplier(supplier)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Edit Supplier Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Supplier</DialogTitle>
          </DialogHeader>
          {editingSupplier && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Company Name *</Label>
                <Input value={editingSupplier.name} onChange={(e) => setEditingSupplier({ ...editingSupplier, name: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Contact Person</Label>
                <Input value={editingSupplier.contact_person} onChange={(e) => setEditingSupplier({ ...editingSupplier, contact_person: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Phone</Label>
                <Input value={editingSupplier.phone} onChange={(e) => setEditingSupplier({ ...editingSupplier, phone: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input type="email" value={editingSupplier.email} onChange={(e) => setEditingSupplier({ ...editingSupplier, email: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Address</Label>
                <Input value={editingSupplier.address} onChange={(e) => setEditingSupplier({ ...editingSupplier, address: e.target.value })} />
              </div>
              <div className="flex items-center gap-2">
                <input 
                  type="checkbox" 
                  id="is_active" 
                  checked={editingSupplier.is_active} 
                  onChange={(e) => setEditingSupplier({ ...editingSupplier, is_active: e.target.checked })}
                  className="h-4 w-4"
                />
                <Label htmlFor="is_active">Active</Label>
              </div>
              <Button onClick={handleUpdateSupplier} className="w-full" disabled={updateSupplier.isPending}>
                {updateSupplier.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Update Supplier
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </main>
  );
};

export default Suppliers;
