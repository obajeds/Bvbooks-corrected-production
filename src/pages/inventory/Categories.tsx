import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, FolderTree, Pencil, Trash2, ChevronRight, ChevronDown, Folder, FolderOpen, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useCategories, useCreateCategory, useUpdateCategory, useDeleteCategory } from "@/hooks/useCategories";
import { useProducts } from "@/hooks/useProducts";
import { useBranchStock } from "@/hooks/useBranchStock";
import { useCurrentUserPermissions } from "@/hooks/usePermissions";
import { CategoryImageUpload } from "@/components/inventory/CategoryImageUpload";

const Categories = () => {
  const { data: categories = [], isLoading } = useCategories();
  const { data: allProducts = [] } = useProducts();
  const { data: branchStockData = [] } = useBranchStock();
  const branchProductIds = useMemo(() => new Set(branchStockData.map(bs => bs.product_id)), [branchStockData]);
  const products = useMemo(() => allProducts.filter(p => branchProductIds.has(p.id)), [allProducts, branchProductIds]);
  const createCategory = useCreateCategory();
  const updateCategory = useUpdateCategory();
  const deleteCategory = useDeleteCategory();
  const { data: permissionData } = useCurrentUserPermissions();
  const permissions = permissionData?.permissions || [];
  const isOwner = permissionData?.isOwner || false;
  
  const canCreate = isOwner || permissions.includes("inventory.item.create");
  const canEdit = isOwner || permissions.includes("inventory.item.edit");
  const canDelete = isOwner || permissions.includes("inventory.item.delete");
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [newCategory, setNewCategory] = useState({ name: "", description: "", parent_id: "", image_url: "" });
  const [editCategory, setEditCategory] = useState<{ id: string; name: string; description: string; parent_id: string | null; image_url: string | null } | null>(null);

  const parentCategories = categories.filter(c => c.parent_id === null);
  const getSubcategories = (parentId: string) => categories.filter(c => c.parent_id === parentId);

  const toggleExpand = (categoryId: string) => {
    setExpandedCategories(prev => {
      const newSet = new Set(prev);
      if (newSet.has(categoryId)) {
        newSet.delete(categoryId);
      } else {
        newSet.add(categoryId);
      }
      return newSet;
    });
  };

  const handleAddCategory = async () => {
    if (!newCategory.name.trim()) {
      toast.error("Please enter a category name");
      return;
    }
    
    try {
      await createCategory.mutateAsync({
        name: newCategory.name,
        description: newCategory.description || null,
        parent_id: newCategory.parent_id || null,
        image_url: newCategory.image_url || null,
      });
      setNewCategory({ name: "", description: "", parent_id: "", image_url: "" });
      setIsDialogOpen(false);
      toast.success(newCategory.parent_id ? "Subcategory added successfully" : "Category added successfully");
    } catch (error: any) {
      const msg = error.message || "";
      if (msg.includes("row-level security") || msg.includes("permission")) {
        toast.error("Access Denied: You don't have permission to add categories");
      } else {
        toast.error(msg || "Failed to add category");
      }
    }
  };

  const handleEdit = (category: typeof categories[0]) => {
    setEditCategory({
      id: category.id,
      name: category.name,
      description: category.description || "",
      parent_id: category.parent_id,
      image_url: category.image_url || null,
    });
    setIsEditDialogOpen(true);
  };

  const handleUpdateCategory = async () => {
    if (!editCategory) return;
    
    try {
      await updateCategory.mutateAsync({
        id: editCategory.id,
        name: editCategory.name,
        description: editCategory.description || null,
        parent_id: editCategory.parent_id,
        image_url: editCategory.image_url,
      });
      setIsEditDialogOpen(false);
      setEditCategory(null);
      toast.success("Category updated successfully");
    } catch (error: any) {
      const msg = error.message || "";
      if (msg.includes("row-level security") || msg.includes("permission")) {
        toast.error("Access Denied: You don't have permission to edit categories");
      } else {
        toast.error(msg || "Failed to update category");
      }
    }
  };

  const handleDelete = async (id: string) => {
    const subcategories = getSubcategories(id);
    if (subcategories.length > 0) {
      toast.error("Please delete subcategories first");
      return;
    }
    
    try {
      await deleteCategory.mutateAsync(id);
      toast.success("Category deleted");
    } catch (error: any) {
      const msg = error.message || "";
      if (msg.includes("row-level security") || msg.includes("permission")) {
        toast.error("Access Denied: You don't have permission to delete categories");
      } else {
        toast.error(msg || "Failed to delete category");
      }
    }
  };

  const getItemCount = (categoryId: string) => {
    return products.filter(p => p.category_id === categoryId).length;
  };

  const getTotalItemCount = (categoryId: string) => {
    const directCount = getItemCount(categoryId);
    const subcategories = getSubcategories(categoryId);
    const subcategoryCount = subcategories.reduce((acc, sub) => acc + getItemCount(sub.id), 0);
    return directCount + subcategoryCount;
  };

  if (isLoading) {
    return (
      <main className="flex-1 overflow-y-auto p-6 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </main>
    );
  }

  return (
    <main className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Categories</h1>
          <p className="text-sm sm:text-base text-muted-foreground">Organize your inventory by categories and subcategories</p>
        </div>
        {canCreate && (
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="w-full sm:w-auto"><Plus className="mr-2 h-4 w-4" />Add Category</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Add New Category</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Parent Category (Optional)</Label>
                  <Select 
                    value={newCategory.parent_id} 
                    onValueChange={(value) => setNewCategory({ ...newCategory, parent_id: value === "none" ? "" : value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select parent (leave empty for main category)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None (Main Category)</SelectItem>
                      {parentCategories.map(cat => (
                        <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Name *</Label>
                  <Input 
                    value={newCategory.name} 
                    onChange={(e) => setNewCategory({ ...newCategory, name: e.target.value })} 
                    placeholder="Category name"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Input 
                    value={newCategory.description} 
                    onChange={(e) => setNewCategory({ ...newCategory, description: e.target.value })} 
                    placeholder="Brief description"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Category Image (Optional)</Label>
                  <CategoryImageUpload
                    imageUrl={newCategory.image_url || null}
                    onImageChange={(url) => setNewCategory({ ...newCategory, image_url: url || "" })}
                  />
                  <p className="text-xs text-muted-foreground">Useful for restaurant menus and visual POS</p>
                </div>
                <Button onClick={handleAddCategory} className="w-full" disabled={!newCategory.name || createCategory.isPending}>
                  {createCategory.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                  Add {newCategory.parent_id ? "Subcategory" : "Category"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}

        {/* Edit Category Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Edit {editCategory?.parent_id ? "Subcategory" : "Category"}</DialogTitle>
            </DialogHeader>
            {editCategory && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Parent Category</Label>
                  <Select 
                    value={editCategory.parent_id || "none"} 
                    onValueChange={(value) => setEditCategory({ ...editCategory, parent_id: value === "none" ? null : value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select parent" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None (Main Category)</SelectItem>
                      {parentCategories.filter(c => c.id !== editCategory.id).map(cat => (
                        <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Name *</Label>
                  <Input 
                    value={editCategory.name} 
                    onChange={(e) => setEditCategory({ ...editCategory, name: e.target.value })} 
                    placeholder="Category name"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Input 
                    value={editCategory.description} 
                    onChange={(e) => setEditCategory({ ...editCategory, description: e.target.value })} 
                    placeholder="Brief description"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Category Image (Optional)</Label>
                  <CategoryImageUpload
                    imageUrl={editCategory.image_url}
                    onImageChange={(url) => setEditCategory({ ...editCategory, image_url: url })}
                  />
                  <p className="text-xs text-muted-foreground">Useful for restaurant menus and visual POS</p>
                </div>
                <Button onClick={handleUpdateCategory} className="w-full" disabled={!editCategory.name || updateCategory.isPending}>
                  {updateCategory.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                  Update {editCategory.parent_id ? "Subcategory" : "Category"}
                </Button>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FolderTree className="h-5 w-5" />
            Product Categories
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0 sm:p-6">
          {categories.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <FolderTree className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No categories found. Add your first category to organize inventory.</p>
            </div>
          ) : (
            <>
              {/* Desktop Table View */}
              <div className="hidden sm:block overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[300px]">Name</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead className="text-center">Items</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {parentCategories.map((category) => {
                      const subcategories = getSubcategories(category.id);
                      const isExpanded = expandedCategories.has(category.id);
                      const hasSubcategories = subcategories.length > 0;
                      
                      return (
                        <>
                          <TableRow key={category.id} className="bg-muted/30">
                            <TableCell className="font-medium">
                              <div className="flex items-center gap-2">
                                {hasSubcategories ? (
                                  <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    className="h-6 w-6"
                                    onClick={() => toggleExpand(category.id)}
                                  >
                                    {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                                  </Button>
                                ) : (
                                  <div className="w-6" />
                                )}
                                {isExpanded ? <FolderOpen className="h-4 w-4 text-primary" /> : <Folder className="h-4 w-4 text-muted-foreground" />}
                                <span>{category.name}</span>
                                {hasSubcategories && (
                                  <Badge variant="secondary" className="ml-2 text-xs">
                                    {subcategories.length} sub
                                  </Badge>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="text-muted-foreground">{category.description || "-"}</TableCell>
                            <TableCell className="text-center">
                              <Badge variant="outline">{getTotalItemCount(category.id)}</Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-1">
                                {canEdit && (
                                  <Button variant="ghost" size="icon" onClick={() => handleEdit(category)}><Pencil className="h-4 w-4" /></Button>
                                )}
                                {canDelete && (
                                  <Button variant="ghost" size="icon" onClick={() => handleDelete(category.id)}>
                                    <Trash2 className="h-4 w-4 text-destructive" />
                                  </Button>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                          {isExpanded && subcategories.map((sub) => (
                            <TableRow key={sub.id} className="bg-background">
                              <TableCell className="font-medium">
                                <div className="flex items-center gap-2 pl-10">
                                  <ChevronRight className="h-3 w-3 text-muted-foreground" />
                                  <span className="text-sm">{sub.name}</span>
                                </div>
                              </TableCell>
                              <TableCell className="text-muted-foreground text-sm">{sub.description || "-"}</TableCell>
                              <TableCell className="text-center">
                                <Badge variant="outline" className="text-xs">{getItemCount(sub.id)}</Badge>
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex justify-end gap-1">
                                  {canEdit && (
                                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEdit(sub)}>
                                      <Pencil className="h-3 w-3" />
                                    </Button>
                                  )}
                                  {canDelete && (
                                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleDelete(sub.id)}>
                                      <Trash2 className="h-3 w-3 text-destructive" />
                                    </Button>
                                  )}
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile Card View */}
              <div className="sm:hidden divide-y">
                {parentCategories.map((category) => {
                  const subcategories = getSubcategories(category.id);
                  const isExpanded = expandedCategories.has(category.id);
                  const hasSubcategories = subcategories.length > 0;
                  
                  return (
                    <div key={category.id} className="p-4">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-start gap-2 flex-1 cursor-pointer" onClick={() => hasSubcategories && toggleExpand(category.id)}>
                          {hasSubcategories ? (
                            <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0 mt-0.5">
                              {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                            </Button>
                          ) : (
                            <div className="w-6 shrink-0" />
                          )}
                          <div className="space-y-1 min-w-0">
                            <div className="flex items-center gap-2">
                              {isExpanded ? <FolderOpen className="h-4 w-4 text-primary shrink-0" /> : <Folder className="h-4 w-4 text-muted-foreground shrink-0" />}
                              <span className="font-medium truncate">{category.name}</span>
                            </div>
                            <p className="text-sm text-muted-foreground line-clamp-2">{category.description || "No description"}</p>
                            <div className="flex flex-wrap gap-2 pt-1">
                              <Badge variant="outline" className="text-xs">{getTotalItemCount(category.id)} items</Badge>
                              {hasSubcategories && (
                                <Badge variant="secondary" className="text-xs">{subcategories.length} subcategories</Badge>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-1 shrink-0">
                          {canEdit && (
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEdit(category)}><Pencil className="h-4 w-4" /></Button>
                          )}
                          {canDelete && (
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleDelete(category.id)}>
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          )}
                        </div>
                      </div>
                      
                      {isExpanded && subcategories.length > 0 && (
                        <div className="mt-3 ml-8 space-y-2 border-l-2 border-muted pl-4">
                          {subcategories.map((sub) => (
                            <div key={sub.id} className="flex items-start justify-between gap-2 py-2">
                              <div className="space-y-1 min-w-0">
                                <span className="text-sm font-medium">{sub.name}</span>
                                <p className="text-xs text-muted-foreground line-clamp-2">{sub.description || "No description"}</p>
                                <Badge variant="outline" className="text-xs">{getItemCount(sub.id)} items</Badge>
                              </div>
                              <div className="flex gap-1 shrink-0">
                                {canEdit && (
                                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleEdit(sub)}>
                                    <Pencil className="h-3 w-3" />
                                  </Button>
                                )}
                                {canDelete && (
                                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleDelete(sub.id)}>
                                    <Trash2 className="h-3 w-3 text-destructive" />
                                  </Button>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </main>
  );
};

export default Categories;
