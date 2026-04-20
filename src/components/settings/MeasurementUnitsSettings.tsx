import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
import { Plus, Edit, Trash2, Loader2, Ruler, Search, Lock } from "lucide-react";
import {
  useMeasurementUnits,
  useCreateMeasurementUnit,
  useUpdateMeasurementUnit,
  useDeleteMeasurementUnit,
  useToggleUnitActive,
  groupUnitsByCategory,
  UNIT_CATEGORIES,
  type MeasurementUnit,
} from "@/hooks/useMeasurementUnits";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { useBusiness } from "@/hooks/useBusiness";
import { toast } from "sonner";

export function MeasurementUnitsSettings() {
  const [search, setSearch] = useState("");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingUnit, setEditingUnit] = useState<MeasurementUnit | null>(null);
  const [deleteUnit, setDeleteUnit] = useState<MeasurementUnit | null>(null);

  const [addFormData, setAddFormData] = useState({ name: "", abbreviation: "", category: "" });
  const [editFormData, setEditFormData] = useState({ name: "", abbreviation: "", category: "" });

  const { data: units = [], isLoading } = useMeasurementUnits();
  const { data: business } = useBusiness();
  const createUnit = useCreateMeasurementUnit();
  const updateUnit = useUpdateMeasurementUnit();
  const deleteUnitMutation = useDeleteMeasurementUnit();
  const toggleActive = useToggleUnitActive();

  const [checkingRef, setCheckingRef] = useState(false);

  const filteredUnits = units.filter(
    (unit) =>
      unit.name.toLowerCase().includes(search.toLowerCase()) ||
      unit.abbreviation.toLowerCase().includes(search.toLowerCase())
  );

  const customUnits = filteredUnits.filter((u) => !u.is_system);
  const systemUnits = filteredUnits.filter((u) => u.is_system);

  const groupedSystem = useMemo(() => groupUnitsByCategory(systemUnits), [systemUnits]);
  const groupedCustom = useMemo(() => groupUnitsByCategory(customUnits), [customUnits]);

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!addFormData.name.trim() || !addFormData.abbreviation.trim()) return;
    createUnit.mutate(
      {
        name: addFormData.name.trim(),
        abbreviation: addFormData.abbreviation.trim(),
        category: addFormData.category || undefined,
      },
      {
        onSuccess: () => {
          setAddFormData({ name: "", abbreviation: "", category: "" });
          setIsAddDialogOpen(false);
        },
      }
    );
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUnit || !editFormData.name.trim() || !editFormData.abbreviation.trim()) return;
    updateUnit.mutate(
      {
        id: editingUnit.id,
        name: editFormData.name.trim(),
        abbreviation: editFormData.abbreviation.trim(),
        category: editFormData.category || undefined,
      },
      {
        onSuccess: () => {
          setEditingUnit(null);
          setEditFormData({ name: "", abbreviation: "", category: "" });
        },
      }
    );
  };

  const handleDeleteRequest = async (unit: MeasurementUnit) => {
    if (!business?.id) {
      setDeleteUnit(unit);
      return;
    }

    // Check if unit is referenced by products
    setCheckingRef(true);
    try {
      const { count, error } = await supabase
        .from("products")
        .select("id", { count: "exact", head: true })
        .eq("business_id", business.id)
        .or(`unit.eq.${unit.abbreviation},unit.eq.${unit.abbreviation}:decimal`);

      if (error) {
        console.error("Error checking product references:", error);
        setDeleteUnit(unit);
        return;
      }

      if (count && count > 0) {
        toast.error(`Cannot delete "${unit.name}" — it is used by ${count} product${count > 1 ? "s" : ""}`);
        return;
      }
      setDeleteUnit(unit);
    } finally {
      setCheckingRef(false);
    }
  };

  const handleDelete = () => {
    if (!deleteUnit) return;
    deleteUnitMutation.mutate(deleteUnit.id, {
      onSuccess: () => setDeleteUnit(null),
    });
  };

  const openEditDialog = (unit: MeasurementUnit) => {
    setEditingUnit(unit);
    setEditFormData({ name: unit.name, abbreviation: unit.abbreviation, category: unit.category || "" });
  };

  const isSaving = createUnit.isPending || updateUnit.isPending;

  const categorySelect = (value: string, onChange: (val: string) => void) => (
    <div className="space-y-2">
      <Label>Category</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger>
          <SelectValue placeholder="Select category (optional)" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="none">No Category</SelectItem>
          {UNIT_CATEGORIES.map((cat) => (
            <SelectItem key={cat} value={cat}>
              {cat}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Ruler className="h-5 w-5" />
            Measurement Units
          </h3>
          <p className="text-sm text-muted-foreground">
            Manage units of measurement for your products
          </p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={(open) => { setIsAddDialogOpen(open); if (!open) setAddFormData({ name: "", abbreviation: "", category: "" }); }}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Add Unit
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Custom Unit</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleAddSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="add-unit-name">Unit Name *</Label>
                <Input id="add-unit-name" placeholder="e.g., Cartons" value={addFormData.name} onChange={(e) => setAddFormData((p) => ({ ...p, name: e.target.value }))} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="add-unit-abbr">Abbreviation *</Label>
                <Input id="add-unit-abbr" placeholder="e.g., ctn" value={addFormData.abbreviation} onChange={(e) => setAddFormData((p) => ({ ...p, abbreviation: e.target.value }))} required />
                <p className="text-xs text-muted-foreground">Short form displayed in POS and inventory</p>
              </div>
              {categorySelect(addFormData.category, (val) => setAddFormData((p) => ({ ...p, category: val === "none" ? "" : val })))}
              <Button type="submit" className="w-full" disabled={isSaving}>
                {isSaving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Add Unit
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Edit Dialog */}
      <Dialog open={!!editingUnit} onOpenChange={(open) => { if (!open) { setEditingUnit(null); setEditFormData({ name: "", abbreviation: "", category: "" }); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Unit</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEditSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-unit-name">Unit Name *</Label>
              <Input id="edit-unit-name" placeholder="e.g., Cartons" value={editFormData.name} onChange={(e) => setEditFormData((p) => ({ ...p, name: e.target.value }))} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-unit-abbr">Abbreviation *</Label>
              <Input id="edit-unit-abbr" placeholder="e.g., ctn" value={editFormData.abbreviation} onChange={(e) => setEditFormData((p) => ({ ...p, abbreviation: e.target.value }))} required />
              <p className="text-xs text-muted-foreground">Short form displayed in POS and inventory</p>
            </div>
            {categorySelect(editFormData.category, (val) => setEditFormData((p) => ({ ...p, category: val === "none" ? "" : val })))}
            <Button type="submit" className="w-full" disabled={isSaving}>
              {isSaving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Update Unit
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteUnit} onOpenChange={(open) => !open && setDeleteUnit(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Unit</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deleteUnit?.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search units..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
      </div>

      {isLoading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="space-y-6">
          {/* Custom Units */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium">Custom Units</h4>
            {customUnits.length > 0 ? (
              groupedCustom.map((group) => (
                <div key={group.category} className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{group.category}</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {group.units.map((unit) => (
                      <div key={unit.id} className="flex items-center justify-between p-3 rounded-lg border bg-card">
                        <div className="flex items-center gap-3">
                          <Badge variant="secondary" className="font-mono">{unit.abbreviation}</Badge>
                          <span className="text-sm">{unit.name}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEditDialog(unit)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={() => handleDeleteRequest(unit)}
                            disabled={checkingRef}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            ) : (
              <div className="flex flex-col items-center justify-center py-6 border border-dashed rounded-lg bg-muted/30">
                <p className="text-sm text-muted-foreground mb-2">No custom units yet.</p>
                <p className="text-xs text-muted-foreground">Click "Add Unit" above to create one.</p>
              </div>
            )}
          </div>

          {/* Standard Units grouped by category */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Lock className="h-4 w-4" />
              Standard Units ({systemUnits.length})
            </h4>
            {groupedSystem.map((group) => (
              <div key={group.category} className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{group.category}</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                  {group.units.map((unit) => (
                    <div key={unit.id} className="flex items-center justify-between gap-2 p-2 rounded-md bg-muted/50 text-sm">
                      <div className="flex items-center gap-2 min-w-0">
                        <Badge variant="outline" className="font-mono text-xs shrink-0">{unit.abbreviation}</Badge>
                        <span className="text-muted-foreground truncate">{unit.name}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {filteredUnits.length === 0 && (
            <p className="text-center text-muted-foreground py-8">No units found matching your search</p>
          )}
        </div>
      )}
    </div>
  );
}
