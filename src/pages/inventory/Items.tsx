import React, { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Search, Plus, Package, Loader2, AlertTriangle, Crown, FolderTree, Ruler, MoreHorizontal, Pencil, Trash2, Barcode, Printer, Building2, ImagePlus, Eye, X, ArrowRight } from "lucide-react";
import { ProductDetailDialog } from "@/components/inventory/ProductDetailDialog";
import { ProductImageUpload } from "@/components/inventory/ProductImageUpload";
import { BranchPricingDialog } from "@/components/inventory/BranchPricingDialog";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { useProducts, useCreateProduct, useUpdateProduct, useDeleteProduct } from "@/hooks/useProducts";
import { useQueryClient } from "@tanstack/react-query";
import { useProductLimits } from "@/hooks/useProductLimits";
import { useCategories } from "@/hooks/useCategories";
import { useMeasurementUnits, groupUnitsByCategory } from "@/hooks/useMeasurementUnits";
import { useCurrentUserPermissions } from "@/hooks/usePermissions";
import { useBarcodeSettings } from "@/hooks/useBarcodeSettings";
import { useBarcodes, useCreateBarcode, generateBarcodeValue } from "@/hooks/useBarcodes";
import { BarcodeLabelPrint } from "@/components/inventory/BarcodeLabelPrint";
import { useCurrency } from "@/hooks/useCurrency";
import { useBranchContext } from "@/contexts/BranchContext";
import { useBusiness } from "@/hooks/useBusiness";
import { useBranchStock } from "@/hooks/useBranchStock";
// Units that support decimal quantities
const DECIMAL_UNITS = ["kg", "g", "L", "mL", "m", "cm"];

// Parse unit string to get base unit and type
const parseUnit = (unit: string) => {
  if (unit?.includes(":decimal")) {
    return { baseUnit: unit.replace(":decimal", ""), quantityType: "decimal" };
  }
  return { baseUnit: unit || "pcs", quantityType: "standard" };
};

const Items = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { currentBranch } = useBranchContext();
  const { data: business } = useBusiness();
  const { data: products = [], isLoading } = useProducts();
  const { data: branchStockData = [] } = useBranchStock();
  const { data: categories = [] } = useCategories();
  const { data: measurementUnits = [] } = useMeasurementUnits();
  const createProduct = useCreateProduct();
  const updateProduct = useUpdateProduct();
  const deleteProduct = useDeleteProduct();
  const { productCount, limit, canAddProducts, remainingProducts, isNearLimit, isAtLimit } = useProductLimits();
  const { data: permissionData } = useCurrentUserPermissions();
  const permissions = permissionData?.permissions || [];
  const isOwner = permissionData?.isOwner || false;
  
  // Barcode hooks
  const { data: barcodeSettings } = useBarcodeSettings();
  const { data: barcodes = [] } = useBarcodes();
  const createBarcode = useCreateBarcode();
  
  const isBarcodeEnabled = barcodeSettings?.is_enabled ?? false;
  const canPrintBarcodes = isBarcodeEnabled && (barcodeSettings?.allow_barcode_printing ?? true);
  
  const canCreate = isOwner || permissions.includes("inventory.item.create");
  const canEdit = isOwner || permissions.includes("inventory.item.edit");
  const canDelete = isOwner || permissions.includes("inventory.item.delete");
  const canViewCostPrice = isOwner || permissions.includes("inventory.price.view_cost");
  
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [bulkCategoryDialogOpen, setBulkCategoryDialogOpen] = useState(false);
  const [bulkCategoryTarget, setBulkCategoryTarget] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState<string | null>(null);
  
  // Barcode print state
  const [printDialogOpen, setPrintDialogOpen] = useState(false);
  const [productToPrint, setProductToPrint] = useState<typeof products[0] | null>(null);
  const [branchPricingOpen, setBranchPricingOpen] = useState(false);
  const [productForPricing, setProductForPricing] = useState<typeof products[0] | null>(null);
  const [barcodeValueToPrint, setBarcodeValueToPrint] = useState("");
  const [viewProduct, setViewProduct] = useState<typeof products[0] | null>(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  
  const [newProduct, setNewProduct] = useState({ 
    name: "", 
    sku: "", 
    category_id: "", 
    unit: "pcs",
    quantity_type: "standard",
    selling_mode: "quantity", // "quantity" | "price" | "both"
    cost_price: "", 
    selling_price: "", 
    stock_quantity: "",
    low_stock_threshold: "",
    image_url: ""
  });

  const [editProduct, setEditProduct] = useState<{
    id: string;
    name: string;
    sku: string;
    category_id: string;
    unit: string;
    quantity_type: string;
    selling_mode: string;
    cost_price: string;
    selling_price: string;
    low_stock_threshold: string;
    image_url: string;
  } | null>(null);

  // Get parent categories and subcategories
  const parentCategories = categories.filter(c => c.parent_id === null);
  const getSubcategories = (parentId: string) => categories.filter(c => c.parent_id === parentId);

  // Get category name by ID
  const getCategoryName = (categoryId: string | null) => {
    if (!categoryId) return "-";
    const category = categories.find(c => c.id === categoryId);
    if (!category) return "-";
    
    if (category.parent_id) {
      const parent = categories.find(c => c.id === category.parent_id);
      return parent ? `${parent.name} > ${category.name}` : category.name;
    }
    return category.name;
  };

  // Build branch stock map for branch-specific quantities
  const branchStockMap = useMemo(() => {
    const map = new Map<string, number>();
    branchStockData.forEach(item => map.set(item.product_id, item.quantity));
    return map;
  }, [branchStockData]);

  // Only show products that have branch_stock in the current branch
  const branchVisibleProducts = useMemo(() => {
    return products.filter(p => branchStockMap.has(p.id));
  }, [products, branchStockMap]);

  const filteredProducts = branchVisibleProducts.filter((p) => {
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.sku?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false);
    if (!matchesSearch) return false;
    if (categoryFilter === "all") return true;
    if (categoryFilter === "uncategorized") return !p.category_id;
    return p.category_id === categoryFilter;
  });

  // Selection helpers
  const toggleSelectItem = (id: string) => {
    setSelectedItems(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };
  const toggleSelectAll = () => {
    if (selectedItems.size === filteredProducts.length) {
      setSelectedItems(new Set());
    } else {
      setSelectedItems(new Set(filteredProducts.map(p => p.id)));
    }
  };
  const clearSelection = () => setSelectedItems(new Set());

  const handleBulkCategoryMove = async () => {
    if (!bulkCategoryTarget || selectedItems.size === 0) return;
    const targetCategoryId = bulkCategoryTarget === "none" ? null : bulkCategoryTarget;
    try {
      await Promise.all(
        Array.from(selectedItems).map(id =>
          updateProduct.mutateAsync({ id, category_id: targetCategoryId })
        )
      );
      toast.success(`${selectedItems.size} item(s) moved successfully`);
      clearSelection();
      setBulkCategoryDialogOpen(false);
      setBulkCategoryTarget("");
    } catch (error: any) {
      toast.error(error.message || "Failed to move items");
    }
  };

  // Check if selected unit supports decimal quantities
  const selectedUnitSupportsDecimal = DECIMAL_UNITS.includes(newProduct.unit);
  const editUnitSupportsDecimal = editProduct ? DECIMAL_UNITS.includes(editProduct.unit) : false;

  const handleAddProduct = async () => {
    if (!newProduct.name) {
      toast.error("Please enter a product name");
      return;
    }

    if (!canAddProducts) {
      toast.error(`You have reached your product limit (${limit} products). Please upgrade your plan.`);
      return;
    }

    try {
      const unitValue = newProduct.quantity_type === "decimal" ? `${newProduct.unit}:decimal` : newProduct.unit;
      const allowsDecimal = newProduct.quantity_type === "decimal";
      const allowsPriceSale = newProduct.selling_mode === "price" || newProduct.selling_mode === "both";
      
      const product = await createProduct.mutateAsync({
        name: newProduct.name,
        sku: newProduct.sku || null,
        category_id: newProduct.category_id || null,
        unit: unitValue,
        cost_price: parseFloat(newProduct.cost_price) || 0,
        selling_price: parseFloat(newProduct.selling_price) || 0,
        stock_quantity: parseFloat(newProduct.stock_quantity) || 0,
        low_stock_threshold: parseFloat(newProduct.low_stock_threshold) || 0,
        allows_decimal_quantity: allowsDecimal,
        allows_price_based_sale: allowsPriceSale,
        quantity_type: allowsDecimal ? "decimal" : "whole",
        image_url: newProduct.image_url || null,
      });
      
      // Auto-generate barcode if barcode system is enabled
      if (isBarcodeEnabled && product) {
        try {
          const barcodeValue = generateBarcodeValue(newProduct.sku || "", product.id);
          await createBarcode.mutateAsync({
            product_id: product.id,
            barcode_value: barcodeValue,
            source: "system_generated",
          });
        } catch (barcodeError) {
          console.error("Failed to generate barcode:", barcodeError);
        }
      }

      // Create branch_stock row for the current branch
      if (product && currentBranch?.id && business?.id) {
        try {
          const stockQty = parseFloat(newProduct.stock_quantity) || 0;
          await supabase.from("branch_stock").upsert(
            {
              business_id: business.id,
              branch_id: currentBranch.id,
              product_id: product.id,
              quantity: stockQty,
              low_stock_threshold: parseFloat(newProduct.low_stock_threshold) || 0,
            },
            { onConflict: "branch_id,product_id" }
          );

          // Record initial stock-in movement if quantity > 0
          if (stockQty > 0) {
            const { error: mvError } = await (supabase.rpc as any)("record_stock_movement", {
              p_business_id: business.id,
              p_branch_id: currentBranch.id,
              p_product_id: product.id,
              p_movement_type: "in",
              p_quantity: stockQty,
              p_previous_quantity: 0,
              p_new_quantity: stockQty,
              p_notes: "Initial stock on product creation",
            });
            if (mvError) console.error("Failed to record stock movement:", mvError);
          }
        } catch (bsErr) {
          console.error("Failed to create branch stock:", bsErr);
        }
      }
      
      setNewProduct({ name: "", sku: "", category_id: "", unit: "pcs", quantity_type: "standard", selling_mode: "quantity", cost_price: "", selling_price: "", stock_quantity: "", low_stock_threshold: "", image_url: "" });
      setIsDialogOpen(false);
      toast.success("Product added successfully");
    } catch (error: any) {
      const msg = error.message || "";
      if (msg.includes("row-level security") || msg.includes("permission")) {
        toast.error("Access Denied: You don't have permission to add products");
      } else {
        toast.error(msg || "Failed to add product");
      }
    }
  };
  
  // Get barcode for a product
  const getProductBarcode = (productId: string) => {
    return barcodes.find(b => b.product_id === productId);
  };
  
  // Handle print barcode click
  const handlePrintBarcode = (product: typeof products[0]) => {
    const barcode = getProductBarcode(product.id);
    if (barcode) {
      setProductToPrint(product);
      setBarcodeValueToPrint(barcode.barcode_value);
      setPrintDialogOpen(true);
    } else {
      // Generate barcode first if not exists
      const barcodeValue = generateBarcodeValue(product.sku || "", product.id);
      createBarcode.mutateAsync({
        product_id: product.id,
        barcode_value: barcodeValue,
        source: "system_generated",
      }).then(() => {
        setProductToPrint(product);
        setBarcodeValueToPrint(barcodeValue);
        setPrintDialogOpen(true);
      }).catch((err) => {
        toast.error("Failed to generate barcode");
        console.error(err);
      });
    }
  };

  const handleEditClick = (product: typeof products[0]) => {
    const { baseUnit, quantityType } = parseUnit(product.unit);
    // Determine selling mode from database fields
    let sellingMode = "quantity";
    if ((product as any).allows_price_based_sale) {
      sellingMode = "both";
    }
    setEditProduct({
      id: product.id,
      name: product.name,
      sku: product.sku || "",
      category_id: product.category_id || "",
      unit: baseUnit,
      quantity_type: quantityType,
      selling_mode: sellingMode,
      cost_price: product.cost_price.toString(),
      selling_price: product.selling_price.toString(),
      low_stock_threshold: (product.low_stock_threshold ?? 0).toString(),
      image_url: product.image_url || "",
    });
    setIsEditDialogOpen(true);
  };

  const handleUpdateProduct = async () => {
    if (!editProduct) return;
    
    if (!editProduct.name) {
      toast.error("Please enter a product name");
      return;
    }

    try {
      const unitValue = editProduct.quantity_type === "decimal" ? `${editProduct.unit}:decimal` : editProduct.unit;
      const allowsDecimal = editProduct.quantity_type === "decimal";
      const allowsPriceSale = editProduct.selling_mode === "price" || editProduct.selling_mode === "both";
      
      // Update catalog fields only (product metadata, prices, thresholds)
      await updateProduct.mutateAsync({
        id: editProduct.id,
        name: editProduct.name,
        sku: editProduct.sku || null,
        category_id: editProduct.category_id || null,
        unit: unitValue,
        cost_price: parseFloat(editProduct.cost_price) || 0,
        selling_price: parseFloat(editProduct.selling_price) || 0,
        low_stock_threshold: parseFloat(editProduct.low_stock_threshold) || 0,
        allows_decimal_quantity: allowsDecimal,
        allows_price_based_sale: allowsPriceSale,
        quantity_type: allowsDecimal ? "decimal" : "whole",
        image_url: editProduct.image_url || null,
      });

      setEditProduct(null);
      setIsEditDialogOpen(false);
      toast.success("Product updated successfully");
    } catch (error: any) {
      const msg = error.message || "";
      if (msg.includes("row-level security") || msg.includes("permission")) {
        toast.error("Access Denied: You don't have permission to edit products");
      } else {
        toast.error(msg || "Failed to update product");
      }
    }
  };

  const handleDeleteClick = (productId: string) => {
    setProductToDelete(productId);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!productToDelete) return;
    
    try {
      if (!currentBranch?.id || !business?.id) throw new Error("No branch selected");

      // Remove branch_stock for current branch only (not the product itself)
      const { error: bsError } = await supabase
        .from("branch_stock")
        .delete()
        .eq("product_id", productToDelete)
        .eq("branch_id", currentBranch.id)
        .eq("business_id", business.id);

      if (bsError) throw bsError;

      // Recalculate global stock as sum of remaining branches
      const { data: remainingStock } = await supabase
        .from("branch_stock")
        .select("quantity")
        .eq("product_id", productToDelete)
        .eq("business_id", business.id);

      const globalTotal = (remainingStock || []).reduce((sum, row) => sum + (row.quantity || 0), 0);
      await supabase
        .from("products")
        .update({ stock_quantity: globalTotal })
        .eq("id", productToDelete);

      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: ["branch-stock"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      toast.success("Product removed from this branch");
    } catch (error: any) {
      const msg = error.message || "";
      if (msg.includes("row-level security") || msg.includes("permission")) {
        toast.error("Access Denied: You don't have permission to delete products");
      } else {
        toast.error(msg || "Failed to remove product from branch");
      }
    } finally {
      setProductToDelete(null);
      setDeleteDialogOpen(false);
    }
  };

  // Format quantity - only show decimals if actually present
  const { formatCurrency } = useCurrency();

  // Format quantity - only show decimals if actually present
  const formatQuantity = (qty: number) => {
    if (Number.isInteger(qty)) return qty.toString();
    return parseFloat(qty.toFixed(2)).toString();
  };

  const getStockBadge = (qty: number) => {
    const displayQty = formatQuantity(qty);
    if (qty <= 5) return <Badge className="bg-destructive text-destructive-foreground">{displayQty}</Badge>;
    if (qty <= 20) return <Badge className="bg-warning text-warning-foreground">{displayQty}</Badge>;
    return <Badge className="bg-success text-success-foreground">{displayQty}</Badge>;
  };

  // Render category select options
  const renderCategoryOptions = () => (
    <>
      <SelectItem value="none">No Category</SelectItem>
      {parentCategories.map(parent => {
        const subs = getSubcategories(parent.id);
        return (
          <>
            <SelectItem key={parent.id} value={parent.id} className="font-medium">
              {parent.name}
            </SelectItem>
            {subs.map(sub => (
              <SelectItem key={sub.id} value={sub.id} className="pl-6 text-sm">
                └ {sub.name}
              </SelectItem>
            ))}
          </>
        );
      })}
    </>
  );

  if (isLoading) {
    return (
      <main className="flex-1 overflow-y-auto p-4 sm:p-6 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </main>
    );
  }

  return (
    <main className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 sm:space-y-6">
      {/* Product Limit Warning */}
      {isAtLimit && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <span>You've reached your product limit ({limit} products). Upgrade to add more.</span>
            <Button size="sm" variant="outline" onClick={() => navigate("/settings")} className="w-full sm:w-auto">
              <Crown className="h-4 w-4 mr-1" /> Upgrade
            </Button>
          </AlertDescription>
        </Alert>
      )}
      {isNearLimit && !isAtLimit && (
        <Alert className="border-warning bg-warning/10">
          <AlertTriangle className="h-4 w-4 text-warning" />
          <AlertDescription className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <span>You're approaching your product limit ({productCount}/{limit}). {remainingProducts} remaining.</span>
            <Button size="sm" variant="outline" onClick={() => navigate("/settings")} className="w-full sm:w-auto">
              <Crown className="h-4 w-4 mr-1" /> Upgrade
            </Button>
          </AlertDescription>
        </Alert>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">All Items</h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            Manage your inventory items
            {limit !== Infinity && (
              <span className="ml-2 text-sm">
                ({productCount}/{limit} products)
              </span>
            )}
          </p>
        </div>
        
        {canCreate && (
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button disabled={isAtLimit} className="w-full sm:w-auto">
                <Plus className="mr-2 h-4 w-4" />
                Add Item
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Add New Item</DialogTitle>
            </DialogHeader>
            <form onSubmit={(e) => { e.preventDefault(); handleAddProduct(); }} className="space-y-4">
              <ProductImageUpload 
                value={newProduct.image_url} 
                onChange={(url) => setNewProduct({ ...newProduct, image_url: url })}
              />
              <div className="space-y-2">
                <Label>Name *</Label>
                <Input value={newProduct.name} onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })} placeholder="Product name" />
              </div>
              <div className="space-y-2">
                <Label>SKU</Label>
                <Input value={newProduct.sku} onChange={(e) => setNewProduct({ ...newProduct, sku: e.target.value })} placeholder="Stock keeping unit" />
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <FolderTree className="h-4 w-4" />
                  Category
                </Label>
                <Select 
                  value={newProduct.category_id} 
                  onValueChange={(value) => setNewProduct({ ...newProduct, category_id: value === "none" ? "" : value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a category" />
                  </SelectTrigger>
                  <SelectContent>
                    {renderCategoryOptions()}
                  </SelectContent>
                </Select>
                {categories.length === 0 && (
                  <p className="text-xs text-muted-foreground">
                    No categories yet.{" "}
                    <Button variant="link" className="h-auto p-0 text-xs" onClick={() => navigate("/inventory/categories")}>
                      Create categories
                    </Button>
                  </p>
                )}
              </div>
              
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Ruler className="h-4 w-4" />
                  Unit of Measurement
                </Label>
                <Select 
                  value={newProduct.unit} 
                  onValueChange={(value) => {
                    const supportsDecimal = DECIMAL_UNITS.includes(value);
                    setNewProduct({ 
                      ...newProduct, 
                      unit: value,
                      quantity_type: supportsDecimal ? newProduct.quantity_type : "standard"
                    });
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select unit" />
                  </SelectTrigger>
                  <SelectContent>
                    {groupUnitsByCategory(measurementUnits).map((group) => (
                      <SelectGroup key={group.category}>
                        <SelectLabel>{group.category}</SelectLabel>
                        {group.units.map((unit) => (
                          <SelectItem key={unit.id} value={unit.abbreviation}>
                            {unit.name} ({unit.abbreviation})
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Quantity Increment</Label>
                <RadioGroup
                  value={newProduct.quantity_type}
                  onValueChange={(value) => setNewProduct({ ...newProduct, quantity_type: value })}
                  className="flex flex-col sm:flex-row gap-4"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="standard" id="standard" />
                    <Label htmlFor="standard" className="font-normal cursor-pointer">Standard (1, 2, 3...)</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="decimal" id="decimal" />
                    <Label htmlFor="decimal" className="font-normal cursor-pointer">Decimal (0.5, 1.5...)</Label>
                  </div>
                </RadioGroup>
              </div>

              <div className="space-y-2">
                <Label>Selling Mode</Label>
                <p className="text-xs text-muted-foreground">How should this item be sold at POS?</p>
                <RadioGroup
                  value={newProduct.selling_mode}
                  onValueChange={(value) => setNewProduct({ ...newProduct, selling_mode: value })}
                  className="grid grid-cols-1 sm:grid-cols-3 gap-2"
                >
                  <div className="flex items-center space-x-2 border rounded-lg p-3">
                    <RadioGroupItem value="quantity" id="sell-qty" />
                    <Label htmlFor="sell-qty" className="font-normal cursor-pointer text-sm">By Quantity</Label>
                  </div>
                  <div className="flex items-center space-x-2 border rounded-lg p-3">
                    <RadioGroupItem value="price" id="sell-price" />
                    <Label htmlFor="sell-price" className="font-normal cursor-pointer text-sm">By Price</Label>
                  </div>
                  <div className="flex items-center space-x-2 border rounded-lg p-3">
                    <RadioGroupItem value="both" id="sell-both" />
                    <Label htmlFor="sell-both" className="font-normal cursor-pointer text-sm">Allow Both</Label>
                  </div>
                </RadioGroup>
              </div>

              <div className={`grid ${canViewCostPrice ? 'grid-cols-2' : 'grid-cols-1'} gap-4`}>
                {canViewCostPrice && (
                  <div className="space-y-2">
                    <Label>Cost Price</Label>
                    <Input type="number" value={newProduct.cost_price} onChange={(e) => setNewProduct({ ...newProduct, cost_price: e.target.value })} placeholder="0" />
                  </div>
                )}
                <div className="space-y-2">
                  <Label>Selling Price</Label>
                  <Input type="number" value={newProduct.selling_price} onChange={(e) => setNewProduct({ ...newProduct, selling_price: e.target.value })} placeholder="0" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Initial Stock</Label>
                  <Input 
                    type="number" 
                    step="any"
                    value={newProduct.stock_quantity} 
                    onChange={(e) => setNewProduct({ ...newProduct, stock_quantity: e.target.value })} 
                    placeholder="0" 
                  />
                </div>
                <div className="space-y-2">
                  <Label>Low Stock Alert</Label>
                  <Input 
                    type="number" 
                    step="any"
                    min="0"
                    value={newProduct.low_stock_threshold} 
                    onChange={(e) => setNewProduct({ ...newProduct, low_stock_threshold: e.target.value })} 
                    placeholder="5" 
                  />
                </div>
              </div>
              <Button type="submit" className="w-full" disabled={createProduct.isPending}>
                {createProduct.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Add Item
              </Button>
            </form>
          </DialogContent>
        </Dialog>
        )}
      </div>

      {/* Edit Item Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Item</DialogTitle>
          </DialogHeader>
          {editProduct && (
            <div className="space-y-4">
              <ProductImageUpload 
                value={editProduct.image_url} 
                onChange={(url) => setEditProduct({ ...editProduct, image_url: url })}
              />
              <div className="space-y-2">
                <Label>Name *</Label>
                <Input value={editProduct.name} onChange={(e) => setEditProduct({ ...editProduct, name: e.target.value })} placeholder="Product name" />
              </div>
              <div className="space-y-2">
                <Label>SKU</Label>
                <Input value={editProduct.sku} onChange={(e) => setEditProduct({ ...editProduct, sku: e.target.value })} placeholder="Stock keeping unit" />
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <FolderTree className="h-4 w-4" />
                  Category
                </Label>
                <Select 
                  value={editProduct.category_id || "none"} 
                  onValueChange={(value) => setEditProduct({ ...editProduct, category_id: value === "none" ? "" : value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a category" />
                  </SelectTrigger>
                  <SelectContent>
                    {renderCategoryOptions()}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Ruler className="h-4 w-4" />
                  Unit of Measurement
                </Label>
                <Select 
                  value={editProduct.unit} 
                  onValueChange={(value) => {
                    const supportsDecimal = DECIMAL_UNITS.includes(value);
                    setEditProduct({ 
                      ...editProduct, 
                      unit: value,
                      quantity_type: supportsDecimal ? editProduct.quantity_type : "standard"
                    });
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select unit" />
                  </SelectTrigger>
                  <SelectContent>
                    {groupUnitsByCategory(measurementUnits).map((group) => (
                      <SelectGroup key={group.category}>
                        <SelectLabel>{group.category}</SelectLabel>
                        {group.units.map((unit) => (
                          <SelectItem key={unit.id} value={unit.abbreviation}>
                            {unit.name} ({unit.abbreviation})
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Quantity Increment</Label>
                <RadioGroup
                  value={editProduct.quantity_type}
                  onValueChange={(value) => setEditProduct({ ...editProduct, quantity_type: value })}
                  className="flex flex-col sm:flex-row gap-4"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="standard" id="edit-standard" />
                    <Label htmlFor="edit-standard" className="font-normal cursor-pointer">Standard (1, 2, 3...)</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="decimal" id="edit-decimal" />
                    <Label htmlFor="edit-decimal" className="font-normal cursor-pointer">Decimal (0.5, 1.5...)</Label>
                  </div>
                </RadioGroup>
              </div>

              <div className="space-y-2">
                <Label>Selling Mode</Label>
                <p className="text-xs text-muted-foreground">How should this item be sold at POS?</p>
                <RadioGroup
                  value={editProduct.selling_mode}
                  onValueChange={(value) => setEditProduct({ ...editProduct, selling_mode: value })}
                  className="grid grid-cols-1 sm:grid-cols-3 gap-2"
                >
                  <div className="flex items-center space-x-2 border rounded-lg p-3">
                    <RadioGroupItem value="quantity" id="edit-sell-qty" />
                    <Label htmlFor="edit-sell-qty" className="font-normal cursor-pointer text-sm">By Quantity</Label>
                  </div>
                  <div className="flex items-center space-x-2 border rounded-lg p-3">
                    <RadioGroupItem value="price" id="edit-sell-price" />
                    <Label htmlFor="edit-sell-price" className="font-normal cursor-pointer text-sm">By Price</Label>
                  </div>
                  <div className="flex items-center space-x-2 border rounded-lg p-3">
                    <RadioGroupItem value="both" id="edit-sell-both" />
                    <Label htmlFor="edit-sell-both" className="font-normal cursor-pointer text-sm">Allow Both</Label>
                  </div>
                </RadioGroup>
              </div>

              <div className={`grid ${canViewCostPrice ? 'grid-cols-2' : 'grid-cols-1'} gap-4`}>
                {canViewCostPrice && (
                  <div className="space-y-2">
                    <Label>Cost Price</Label>
                    <Input type="number" value={editProduct.cost_price} onChange={(e) => setEditProduct({ ...editProduct, cost_price: e.target.value })} placeholder="0" />
                  </div>
                )}
                <div className="space-y-2">
                  <Label>Selling Price</Label>
                  <Input type="number" value={editProduct.selling_price} onChange={(e) => setEditProduct({ ...editProduct, selling_price: e.target.value })} placeholder="0" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Low Stock Alert</Label>
                <Input 
                  type="number" 
                  step="any"
                  min="0"
                  value={editProduct.low_stock_threshold} 
                  onChange={(e) => setEditProduct({ ...editProduct, low_stock_threshold: e.target.value })} 
                  placeholder="5" 
                />
                <p className="text-xs text-muted-foreground">
                  To adjust stock quantities, use the <Button 
                    variant="link" 
                    className="h-auto p-0 text-xs underline" 
                    onClick={() => navigate("/inventory/stock-adjustments")}
                  >
                    Stock Adjustments
                  </Button> page for proper tracking and approvals.
                </p>
              </div>
              <Button onClick={handleUpdateProduct} className="w-full" disabled={updateProduct.isPending}>
                {updateProduct.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Update Item
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Product</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this product? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {deleteProduct.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk Move Category Dialog */}
      <Dialog open={bulkCategoryDialogOpen} onOpenChange={setBulkCategoryDialogOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Move {selectedItems.size} item(s) to category</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Select value={bulkCategoryTarget} onValueChange={setBulkCategoryTarget}>
              <SelectTrigger>
                <SelectValue placeholder="Select target category" />
              </SelectTrigger>
              <SelectContent>
                {renderCategoryOptions()}
              </SelectContent>
            </Select>
            <Button
              onClick={handleBulkCategoryMove}
              className="w-full"
              disabled={!bulkCategoryTarget || updateProduct.isPending}
            >
              {updateProduct.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              <ArrowRight className="h-4 w-4 mr-2" />
              Move Items
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Card>
        <CardHeader className="space-y-4">
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Inventory Items
          </CardTitle>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative w-full sm:max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search items..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={categoryFilter} onValueChange={(v) => { setCategoryFilter(v); clearSelection(); }}>
              <SelectTrigger className="w-full sm:w-[200px]">
                <FolderTree className="h-4 w-4 mr-2 text-muted-foreground" />
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="uncategorized">Uncategorized</SelectItem>
                {parentCategories.map(parent => {
                  const subs = getSubcategories(parent.id);
                  return (
                    <React.Fragment key={parent.id}>
                      <SelectItem value={parent.id} className="font-medium">
                        {parent.name}
                      </SelectItem>
                      {subs.map(sub => (
                        <SelectItem key={sub.id} value={sub.id} className="pl-6 text-sm">
                          └ {sub.name}
                        </SelectItem>
                      ))}
                    </React.Fragment>
                  );
                })}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="p-0 sm:p-6">
          {filteredProducts.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No products found. Add your first item to get started.</p>
            </div>
          ) : (
            <>
              {/* Desktop Table View */}
              <div className="hidden sm:block overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      {canEdit && (
                        <TableHead className="w-[40px]">
                          <Checkbox
                            checked={selectedItems.size === filteredProducts.length && filteredProducts.length > 0}
                            onCheckedChange={toggleSelectAll}
                          />
                        </TableHead>
                      )}
                      <TableHead>Name</TableHead>
                      <TableHead>SKU</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead className="text-center">Stock</TableHead>
                      {canViewCostPrice && <TableHead className="text-right">Cost Price</TableHead>}
                      <TableHead className="text-right">Selling Price</TableHead>
                      <TableHead className="w-[50px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredProducts.map((product) => (
                      <TableRow key={product.id} data-state={selectedItems.has(product.id) ? "selected" : undefined}>
                        {canEdit && (
                          <TableCell>
                            <Checkbox
                              checked={selectedItems.has(product.id)}
                              onCheckedChange={() => toggleSelectItem(product.id)}
                            />
                          </TableCell>
                        )}
                        <TableCell className="font-medium">{product.name}</TableCell>
                        <TableCell>{product.sku || "-"}</TableCell>
                        <TableCell className="text-muted-foreground text-sm">{getCategoryName(product.category_id)}</TableCell>
                        <TableCell className="text-center">{getStockBadge(branchStockMap.get(product.id) ?? 0)}</TableCell>
                        {canViewCostPrice && <TableCell className="text-right">{formatCurrency(product.cost_price)}</TableCell>}
                        <TableCell className="text-right">{formatCurrency(product.selling_price)}</TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => { setViewProduct(product); setViewDialogOpen(true); }}>
                                <Eye className="h-4 w-4 mr-2" />
                                View
                              </DropdownMenuItem>
                              {canEdit && (
                                <DropdownMenuItem onClick={() => handleEditClick(product)}>
                                  <Pencil className="h-4 w-4 mr-2" />
                                  Edit
                                </DropdownMenuItem>
                              )}
                              {canEdit && (
                                <DropdownMenuItem onClick={() => {
                                  setProductForPricing(product);
                                  setBranchPricingOpen(true);
                                }}>
                                  <Building2 className="h-4 w-4 mr-2" />
                                  Branch Pricing
                                </DropdownMenuItem>
                              )}
                              {canPrintBarcodes && (
                                <DropdownMenuItem onClick={() => handlePrintBarcode(product)}>
                                  <Printer className="h-4 w-4 mr-2" />
                                  Print Barcode
                                </DropdownMenuItem>
                              )}
                              {canDelete && (
                                <>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem onClick={() => handleDeleteClick(product.id)} className="text-destructive">
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    Delete
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

              {/* Mobile Card View */}
              <div className="sm:hidden divide-y">
                {filteredProducts.map((product) => (
                  <div key={product.id} className={`p-4 space-y-2 ${selectedItems.has(product.id) ? "bg-muted" : ""}`}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-start gap-3 min-w-0 flex-1">
                        {canEdit && (
                          <Checkbox
                            className="mt-1"
                            checked={selectedItems.has(product.id)}
                            onCheckedChange={() => toggleSelectItem(product.id)}
                          />
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="font-medium truncate">{product.name}</p>
                          <p className="text-xs text-muted-foreground">{product.sku || "No SKU"}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {getStockBadge(branchStockMap.get(product.id) ?? 0)}
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => { setViewProduct(product); setViewDialogOpen(true); }}>
                              <Eye className="h-4 w-4 mr-2" />
                              View
                            </DropdownMenuItem>
                            {canEdit && (
                              <DropdownMenuItem onClick={() => handleEditClick(product)}>
                                <Pencil className="h-4 w-4 mr-2" />
                                Edit
                              </DropdownMenuItem>
                            )}
                            {canEdit && (
                              <DropdownMenuItem onClick={() => {
                                setProductForPricing(product);
                                setBranchPricingOpen(true);
                              }}>
                                <Building2 className="h-4 w-4 mr-2" />
                                Branch Pricing
                              </DropdownMenuItem>
                            )}
                            {canPrintBarcodes && (
                              <DropdownMenuItem onClick={() => handlePrintBarcode(product)}>
                                <Printer className="h-4 w-4 mr-2" />
                                Print Barcode
                              </DropdownMenuItem>
                            )}
                            {canDelete && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => handleDeleteClick(product.id)} className="text-destructive">
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Delete
                                </DropdownMenuItem>
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <FolderTree className="h-3 w-3" />
                      <span className="truncate">{getCategoryName(product.category_id)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      {canViewCostPrice && <span className="text-muted-foreground">Cost: {formatCurrency(product.cost_price)}</span>}
                      <span className="font-medium">Sell: {formatCurrency(product.selling_price)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Floating Bulk Action Bar */}
      {selectedItems.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 flex items-center gap-3 rounded-lg border bg-background px-4 py-3 shadow-lg">
          <span className="text-sm font-medium">{selectedItems.size} item(s) selected</span>
          <Button size="sm" onClick={() => { setBulkCategoryTarget(""); setBulkCategoryDialogOpen(true); }}>
            <FolderTree className="h-4 w-4 mr-2" />
            Move to Category
          </Button>
          <Button size="sm" variant="ghost" onClick={clearSelection}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}
      
      {/* Barcode Print Dialog */}
      {productToPrint && (
        <BarcodeLabelPrint
          open={printDialogOpen}
          onClose={() => {
            setPrintDialogOpen(false);
            setProductToPrint(null);
            setBarcodeValueToPrint("");
          }}
          product={{
            id: productToPrint.id,
            name: productToPrint.name,
            sku: productToPrint.sku,
            unit: productToPrint.unit,
          }}
          barcodeValue={barcodeValueToPrint}
        />
      )}
      
      {/* Branch Pricing Dialog */}
      <BranchPricingDialog
        open={branchPricingOpen}
        onOpenChange={setBranchPricingOpen}
        product={productForPricing}
        canViewCostPrice={canViewCostPrice}
      />

      {/* Product Detail Dialog */}
      <ProductDetailDialog
        product={viewProduct}
        open={viewDialogOpen}
        onOpenChange={(open) => { setViewDialogOpen(open); if (!open) setViewProduct(null); }}
        canViewCostPrice={canViewCostPrice}
      />
    </main>
  );
};

export default Items;
