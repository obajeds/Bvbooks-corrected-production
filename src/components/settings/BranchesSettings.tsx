import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Edit, Trash2, Loader2, MapPin, Phone, Building2, Sparkles, Star } from "lucide-react";
import { UsageLimitBanner, UsageInline } from "@/components/subscription/UsageLimitBanner";
import { toast } from "sonner";
import { format } from "date-fns";
import { useBranches, useCreateBranch, useUpdateBranch, useDeleteBranch, useSetMainBranch, Branch } from "@/hooks/useBranches";
import { useBusiness } from "@/hooks/useBusiness";
import { useBranchLimits, useBusinessPlan } from "@/hooks/useFeatureGating";
import { Skeleton } from "@/components/ui/skeleton";
import { ADDONS_ALLOWED, MAX_BRANCH_ADDONS } from "@/lib/subscriptionCapacity";

export function BranchesSettings() {
  const { data: business, isLoading: businessLoading } = useBusiness();
  const { data: branches = [], isLoading: branchesLoading } = useBranches(business?.id);
  const { data: branchLimits } = useBranchLimits();
  const { data: planInfo } = useBusinessPlan();
  const createBranch = useCreateBranch();
  const updateBranch = useUpdateBranch();
  const deleteBranch = useDeleteBranch();
  const setMainBranch = useSetMainBranch();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingBranch, setEditingBranch] = useState<Branch | null>(null);
  const [formData, setFormData] = useState({ name: "", address: "", phone: "" });

  const isLoading = businessLoading || branchesLoading;
  const isSaving = createBranch.isPending || updateBranch.isPending;
  
  // Use enhanced branch limits with capacity info
  const plan = planInfo?.effectivePlan || "free";
  const currentBranches = branchLimits?.currentBranches ?? 0;
  const maxBranches = branchLimits?.maxBranches ?? 1;
  const baseBranches = branchLimits?.baseBranches ?? 1;
  const addonBranches = branchLimits?.addonBranches ?? 0;
  const canAddBranch = branchLimits?.canAddBranch ?? false;
  const canBuyAddon = branchLimits?.canBuyAddon ?? false;
  const addonsAllowed = ADDONS_ALLOWED[plan];

  // Helper to determine if a branch is from addon (beyond base plan limit)
  const isAddonBranchIndex = (index: number) => {
    // Branches are ordered by is_main desc, then name asc
    // Main branch is always index 0, so addon branches are those beyond baseBranches
    return index >= baseBranches;
  };

  const handleOpenDialog = (branch?: Branch) => {
    if (branch) {
      setEditingBranch(branch);
      setFormData({ name: branch.name, address: branch.address || "", phone: branch.phone || "" });
    } else {
      setEditingBranch(null);
      setFormData({ name: "", address: "", phone: "" });
    }
    setIsDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast.error("Branch name is required");
      return;
    }

    if (!business?.id) {
      toast.error("Business not found");
      return;
    }

    try {
      if (editingBranch) {
        await updateBranch.mutateAsync({
          id: editingBranch.id,
          name: formData.name,
          address: formData.address || null,
          phone: formData.phone || null,
        });
        toast.success("Branch updated successfully");
      } else {
        await createBranch.mutateAsync({
          business_id: business.id,
          name: formData.name,
          address: formData.address || undefined,
          phone: formData.phone || undefined,
          is_main: branches.length === 0,
        });
        toast.success("Branch created successfully");
      }
      setIsDialogOpen(false);
      setFormData({ name: "", address: "", phone: "" });
      setEditingBranch(null);
    } catch (error) {
      toast.error(editingBranch ? "Failed to update branch" : "Failed to create branch");
    }
  };

  const handleDelete = async (branch: Branch) => {
    if (branch.is_main) {
      toast.error("Cannot delete the main branch");
      return;
    }
    if (!confirm(`Are you sure you want to delete "${branch.name}"?`)) return;

    try {
      await deleteBranch.mutateAsync(branch.id);
      toast.success("Branch deleted successfully");
    } catch (error) {
      toast.error("Failed to delete branch");
    }
  };

  const handleSetMain = async (branch: Branch) => {
    if (branch.is_main || !business?.id) return;
    if (!confirm(`Set "${branch.name}" as the main branch?`)) return;

    try {
      await setMainBranch.mutateAsync({ branchId: branch.id, businessId: business.id });
      toast.success(`"${branch.name}" is now the main branch`);
    } catch (error) {
      toast.error("Failed to update main branch");
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <Skeleton className="h-6 w-24" />
            <Skeleton className="mt-1 h-4 w-48" />
          </div>
          <Skeleton className="h-9 w-28" />
        </div>
        <div className="space-y-2">
          {[1, 2].map((i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-semibold">Branches</h2>
          <p className="text-sm text-muted-foreground">
            Manage your business locations and branches
            <span className="ml-2">
              (<UsageInline 
                current={currentBranches} 
                max={maxBranches} 
                addonCount={addonBranches}
              />)
            </span>
          </p>
        </div>
        <Button onClick={() => handleOpenDialog()} size="sm" disabled={!canAddBranch}>
          <Plus className="mr-2 h-4 w-4" />
          <span className="hidden sm:inline">Add Branch</span>
          <span className="sm:hidden">Add</span>
        </Button>
      </div>

      <UsageLimitBanner
        resourceType="branch"
        current={currentBranches}
        max={maxBranches}
        addonCount={addonBranches}
        plan={plan}
        canBuyAddon={canBuyAddon}
      />

      {branches.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-12">
            <Building2 className="h-12 w-12 text-muted-foreground" />
            <p className="mt-4 text-lg font-medium">No branches found</p>
            <Button className="mt-4" onClick={() => handleOpenDialog()} disabled={!canAddBranch}>
              <Plus className="mr-2 h-4 w-4" />
              Add Your First Branch
            </Button>
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="hidden md:block rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Branch Name</TableHead>
                    <TableHead>Address</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="hidden lg:table-cell">Created</TableHead>
                    <TableHead className="w-[100px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {branches.map((branch, index) => (
                    <TableRow key={branch.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {branch.name}
                          {branch.is_main && (
                            <Badge variant="secondary" className="text-xs">Main</Badge>
                          )}
                          {isAddonBranchIndex(index) && (
                            <Badge variant="outline" className="text-xs border-primary/50 text-primary">
                              <Sparkles className="mr-1 h-3 w-3" />
                              Add-on
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{branch.address || "-"}</TableCell>
                      <TableCell>{branch.phone || "-"}</TableCell>
                      <TableCell>
                        <Badge variant={branch.is_active ? "outline" : "destructive"}>
                          {branch.is_active ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        {format(new Date(branch.created_at), "MMM dd, yyyy")}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="icon" onClick={() => handleOpenDialog(branch)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          {!branch.is_main && (
                            <>
                              <Button
                                variant="ghost"
                                size="icon"
                                title="Set as main branch"
                                onClick={() => handleSetMain(branch)}
                                disabled={setMainBranch.isPending}
                              >
                                <Star className="h-4 w-4" />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="text-destructive" 
                                onClick={() => handleDelete(branch)}
                                disabled={deleteBranch.isPending}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Mobile Card View */}
            <div className="md:hidden space-y-3">
              {branches.map((branch, index) => (
                <Card key={branch.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="space-y-2 flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium truncate">{branch.name}</span>
                          {branch.is_main && (
                            <Badge variant="secondary" className="text-xs shrink-0">Main</Badge>
                          )}
                          {isAddonBranchIndex(index) && (
                            <Badge variant="outline" className="text-xs shrink-0 border-primary/50 text-primary">
                              <Sparkles className="mr-1 h-3 w-3" />
                              Add-on
                            </Badge>
                          )}
                          <Badge variant={branch.is_active ? "outline" : "destructive"} className="text-xs shrink-0">
                            {branch.is_active ? "Active" : "Inactive"}
                          </Badge>
                        </div>
                        {branch.address && (
                          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                            <MapPin className="h-3.5 w-3.5 shrink-0" />
                            <span className="truncate">{branch.address}</span>
                          </div>
                        )}
                        {branch.phone && (
                          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                            <Phone className="h-3.5 w-3.5 shrink-0" />
                            <span>{branch.phone}</span>
                          </div>
                        )}
                        <div className="text-xs text-muted-foreground">
                          Created: {format(new Date(branch.created_at), "MMM dd, yyyy")}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0 ml-2">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleOpenDialog(branch)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        {!branch.is_main && (
                          <>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              title="Set as main branch"
                              onClick={() => handleSetMain(branch)}
                              disabled={setMainBranch.isPending}
                            >
                              <Star className="h-4 w-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-8 w-8 text-destructive" 
                              onClick={() => handleDelete(branch)}
                              disabled={deleteBranch.isPending}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </>
        )}
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingBranch ? "Edit Branch" : "Add New Branch"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Branch Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Main Store, Ikeja Branch"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="address">Address</Label>
                <Input
                  id="address"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="Enter branch address"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="+234 xxx xxx xxxx"
                />
              </div>
            </div>
            <DialogFooter className="flex-col gap-2 sm:flex-row">
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)} className="w-full sm:w-auto">
                Cancel
              </Button>
              <Button type="submit" disabled={isSaving} className="w-full sm:w-auto">
                {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {editingBranch ? "Update" : "Add Branch"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
