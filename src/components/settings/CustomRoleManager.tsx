import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, Plus, Edit2, Trash2, Shield } from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  useCustomRoles,
  useCreateCustomRole,
  useUpdateCustomRole,
  useDeleteCustomRole,
  type CustomRole,
} from "@/hooks/useCustomRoles";
import { PERMISSION_CATEGORIES, type PermissionKey } from "@/lib/permissions";
import { useGasModuleEnabled } from "@/hooks/useGasModuleEnabled";

export function CustomRoleManager() {
  const { data: customRoles = [], isLoading } = useCustomRoles();
  const { data: gasModuleEnabled } = useGasModuleEnabled();
  const createRole = useCreateCustomRole();
  const updateRole = useUpdateCustomRole();
  const deleteRole = useDeleteCustomRole();

  const visibleCategories = Object.entries(PERMISSION_CATEGORIES).filter(
    ([key]) => key !== 'gas_station' || gasModuleEnabled
  );

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<CustomRole | null>(null);
  const [deleteConfirmRole, setDeleteConfirmRole] = useState<CustomRole | null>(null);

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    permissions: [] as string[],
  });

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      permissions: [],
    });
    setEditingRole(null);
  };

  const handleOpenDialog = (role?: CustomRole) => {
    if (role) {
      setEditingRole(role);
      setFormData({
        name: role.name,
        description: role.description || "",
        permissions: role.permissions || [],
      });
    } else {
      resetForm();
    }
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    resetForm();
  };

  const handlePermissionToggle = (permissionId: string) => {
    setFormData((prev) => ({
      ...prev,
      permissions: prev.permissions.includes(permissionId)
        ? prev.permissions.filter((p) => p !== permissionId)
        : [...prev.permissions, permissionId],
    }));
  };

  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      toast.error("Please enter a role name");
      return;
    }

    try {
      if (editingRole) {
        await updateRole.mutateAsync({
          id: editingRole.id,
          ...formData,
        });
        toast.success("Role updated successfully");
      } else {
        await createRole.mutateAsync(formData);
        toast.success("Role created successfully");
      }
      handleCloseDialog();
    } catch (error: any) {
      toast.error(error.message || "Failed to save role");
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirmRole) return;
    try {
      await deleteRole.mutateAsync(deleteConfirmRole.id);
      toast.success("Role deleted successfully");
      setDeleteConfirmRole(null);
    } catch (error: any) {
      toast.error(error.message || "Failed to delete role");
    }
  };

  const isSaving = createRole.isPending || updateRole.isPending;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold">Custom Roles</h2>
          <p className="text-sm text-muted-foreground">
            Create and manage custom roles for your business
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => handleOpenDialog()}>
              <Plus className="mr-2 h-4 w-4" />
              Create Role
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
            <DialogHeader>
              <DialogTitle>{editingRole ? "Edit Role" : "Create New Role"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Role Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, description: e.target.value }))
                  }
                  rows={2}
                />
              </div>

              <div className="space-y-3">
                <Label>Permissions</Label>
                <ScrollArea className="h-[300px] rounded-md border p-4">
                  <Accordion type="multiple" className="w-full">
                    {visibleCategories.map(([categoryKey, category]) => (
                      <AccordionItem key={categoryKey} value={categoryKey}>
                        <AccordionTrigger className="text-sm font-medium">
                          {category.label}
                        </AccordionTrigger>
                        <AccordionContent>
                          <div className="space-y-2 pl-2">
                            {category.permissions.map((permission) => (
                              <div key={permission.key} className="flex items-start space-x-2">
                                <Checkbox
                                  id={permission.key}
                                  checked={formData.permissions.includes(permission.key)}
                                  onCheckedChange={() => handlePermissionToggle(permission.key)}
                                />
                                <div className="grid gap-0.5 leading-none">
                                  <Label
                                    htmlFor={permission.key}
                                    className="cursor-pointer text-sm font-normal"
                                  >
                                    {permission.label}
                                  </Label>
                                  <p className="text-xs text-muted-foreground">
                                    {permission.description}
                                  </p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                </ScrollArea>
              </div>

              <div className="flex flex-col-reverse gap-2 pt-4 sm:flex-row sm:justify-end">
                <Button variant="outline" onClick={handleCloseDialog}>
                  Cancel
                </Button>
                <Button onClick={handleSubmit} disabled={isSaving}>
                  {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {editingRole ? "Update Role" : "Create Role"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {customRoles.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center">
            <Shield className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
            <p className="text-muted-foreground">
              No custom roles created yet. Create your first custom role to get started.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {customRoles.map((role) => (
            <Card key={role.id} className="relative">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-base">{role.name}</CardTitle>
                  <Badge variant={role.is_active ? "default" : "secondary"}>
                    {role.is_active ? "Active" : "Inactive"}
                  </Badge>
                </div>
                {role.description && (
                  <p className="text-sm text-muted-foreground">{role.description}</p>
                )}
              </CardHeader>
              <CardContent className="space-y-3">
                {role.permissions && role.permissions.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {role.permissions.slice(0, 4).map((perm) => (
                      <Badge key={perm} variant="outline" className="text-xs">
                        {perm}
                      </Badge>
                    ))}
                    {role.permissions.length > 4 && (
                      <Badge variant="outline" className="text-xs">
                        +{role.permissions.length - 4} more
                      </Badge>
                    )}
                  </div>
                )}
                <div className="flex gap-2 pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => handleOpenDialog(role)}
                  >
                    <Edit2 className="mr-1 h-4 w-4" />
                    Edit
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-destructive hover:text-destructive"
                    onClick={() => setDeleteConfirmRole(role)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <AlertDialog open={!!deleteConfirmRole} onOpenChange={() => setDeleteConfirmRole(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Role</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deleteConfirmRole?.name}"? This action cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
