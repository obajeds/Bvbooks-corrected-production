import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Building2, Trash2, Pencil, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useDepartments, useCreateDepartment, useUpdateDepartment, useDeleteDepartment } from "@/hooks/useDepartments";
import { useBusinessPlan } from "@/hooks/useFeatureGating";
import { UpgradeRequired } from "@/components/subscription/UpgradeRequired";

export default function Departments() {
  const { data: planInfo, isLoading: planLoading } = useBusinessPlan();
  const { data: departments = [], isLoading } = useDepartments();
  const createDepartment = useCreateDepartment();
  const updateDepartment = useUpdateDepartment();
  const deleteDepartment = useDeleteDepartment();

  const [showAdd, setShowAdd] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [editingDept, setEditingDept] = useState<{ id: string; name: string; description: string } | null>(null);
  const [newDept, setNewDept] = useState({ name: "", description: "" });

  const handleAdd = async () => {
    if (!newDept.name.trim()) {
      toast.error("Department name is required");
      return;
    }

    try {
      await createDepartment.mutateAsync({
        name: newDept.name,
        description: newDept.description || null,
      });
      toast.success("Department created");
      setShowAdd(false);
      setNewDept({ name: "", description: "" });
    } catch (error: any) {
      toast.error(error.message || "Failed to create department");
    }
  };

  const handleEdit = async () => {
    if (!editingDept || !editingDept.name.trim()) {
      toast.error("Department name is required");
      return;
    }

    try {
      await updateDepartment.mutateAsync({
        id: editingDept.id,
        name: editingDept.name,
        description: editingDept.description || null,
      });
      toast.success("Department updated");
      setShowEdit(false);
      setEditingDept(null);
    } catch (error: any) {
      toast.error(error.message || "Failed to update department");
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteDepartment.mutateAsync(id);
      toast.success("Department deleted");
    } catch (error: any) {
      toast.error(error.message || "Failed to delete department");
    }
  };

  const openEditDialog = (dept: any) => {
    setEditingDept({ id: dept.id, name: dept.name, description: dept.description || "" });
    setShowEdit(true);
  };

  if (isLoading || planLoading) {
    return (
      <main className="flex-1 overflow-y-auto p-6 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </main>
    );
  }

  // Gate for Free plan users
  if (planInfo?.effectivePlan === 'free') {
    return <UpgradeRequired featureKey="team.hrm" requiredPlan="professional" />;
  }

  return (
    <main className="flex-1 overflow-y-auto p-6 space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Departments</h1>
          <p className="text-muted-foreground">Manage company departments</p>
        </div>
        <Dialog open={showAdd} onOpenChange={setShowAdd}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-2 h-4 w-4" /> Add Department</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Department</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Name *</Label>
                <Input
                  value={newDept.name}
                  onChange={(e) => setNewDept({ ...newDept, name: e.target.value })}
                  placeholder="Department name"
                />
              </div>
              <div>
                <Label>Description</Label>
                <Input
                  value={newDept.description}
                  onChange={(e) => setNewDept({ ...newDept, description: e.target.value })}
                  placeholder="Description"
                />
              </div>
              <Button onClick={handleAdd} disabled={createDepartment.isPending} className="w-full">
                {createDepartment.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Create Department
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Edit Dialog */}
      <Dialog open={showEdit} onOpenChange={setShowEdit}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Department</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Name *</Label>
              <Input
                value={editingDept?.name || ""}
                onChange={(e) => setEditingDept(prev => prev ? { ...prev, name: e.target.value } : null)}
                placeholder="Department name"
              />
            </div>
            <div>
              <Label>Description</Label>
              <Input
                value={editingDept?.description || ""}
                onChange={(e) => setEditingDept(prev => prev ? { ...prev, description: e.target.value } : null)}
                placeholder="Description"
              />
            </div>
            <Button onClick={handleEdit} disabled={updateDepartment.isPending} className="w-full">
              {updateDepartment.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Update Department
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {departments.length === 0 ? (
        <div className="p-8 text-center text-muted-foreground">
          <Building2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>No departments yet. Create your first department to get started.</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {departments.map((dept) => (
            <Card key={dept.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="rounded-lg bg-primary/10 p-2">
                      <Building2 className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold">{dept.name}</h3>
                      <p className="text-sm text-muted-foreground">{dept.description || "No description"}</p>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" onClick={() => openEditDialog(dept)}>
                      <Pencil className="h-4 w-4 text-muted-foreground" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(dept.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </main>
  );
}
