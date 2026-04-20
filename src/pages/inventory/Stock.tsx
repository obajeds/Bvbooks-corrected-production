import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { 
  ArrowUpCircle, 
  ArrowDownCircle, 
  RefreshCw, 
  AlertTriangle, 
  Plus, 
  Pencil, 
  Loader2,
  Package,
  Search,
  ArrowLeftRight,
  ArrowRight,
  User,
  Clock,
  Lock,
  ChevronsUpDown,
  Check
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { toast as sonnerToast } from "sonner";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useProducts } from "@/hooks/useProducts";
import { useBranchStock } from "@/hooks/useBranchStock";
import { useStockMovements, StockMovementData } from "@/hooks/useStockMovements";
import { useBranchContext } from "@/contexts/BranchContext";
import { useBusiness } from "@/hooks/useBusiness";
import { useBranches } from "@/hooks/useBranches";
import { useCreateApprovalRequest } from "@/hooks/useApprovalRequests";
import { useStaff } from "@/hooks/useStaff";
import { useHasPermission } from "@/hooks/usePermissions";
import { useAuth } from "@/contexts/AuthContext";
import { PermissionGate } from "@/components/auth/PermissionGate";
import { StockTransferDialog } from "@/components/inventory/StockTransferDialog";
import { DateRangeFilter } from "@/components/inventory/DateRangeFilter";
import { UpgradePrompt } from "@/components/subscription/UpgradePrompt";
import { useBusinessPlan } from "@/hooks/useFeatureGating";

import { useProcessStockAdjustment } from "@/hooks/useProcessStockAdjustment";
import { useProcessStockTransfer } from "@/hooks/useProcessStockTransfer";
import { format } from "date-fns";
import { DateRange } from "react-day-picker";

const Stock = () => {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isTransferDialogOpen, setIsTransferDialogOpen] = useState(false);
  const [selectedMovement, setSelectedMovement] = useState<StockMovementData | null>(null);
  const [movementType, setMovementType] = useState("");
  const [selectedProduct, setSelectedProduct] = useState("");
  const [quantity, setQuantity] = useState("");
  const [reason, setReason] = useState("");
  const [stockProductPopoverOpen, setStockProductPopoverOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  
  // Transfer-specific state
  const [fromBranchId, setFromBranchId] = useState("");
  const [toBranchId, setToBranchId] = useState("");
  const [isProcessingTransfer, setIsProcessingTransfer] = useState(false);
  
  const { toast } = useToast();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // Handle quick add action from URL params (e.g., ?action=in)
  useEffect(() => {
    const action = searchParams.get("action");
    if (action === "in" || action === "out") {
      setMovementType(action);
      setIsCreateDialogOpen(true);
      // Clean up the URL param
      searchParams.delete("action");
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams, setSearchParams]);
  const { data: business } = useBusiness();
  const { currentBranch, isOwner } = useBranchContext();
  const { data: branches = [] } = useBranches(business?.id);
  const { data: products = [] } = useProducts();
  const { data: branchStockData = [] } = useBranchStock();
  const branchStockMap = new Map(branchStockData.map(bs => [bs.product_id, Number(bs.quantity)]));
  const getBranchQty = (productId: string, fallback: number) => branchStockMap.get(productId) ?? fallback;
  const { 
    data: stockMovements = [], 
    isLoading,
    createStockMovement, 
    updateStockMovement
  } = useStockMovements({
    startDate: dateRange?.from,
    endDate: dateRange?.to,
  });
  const createApprovalRequest = useCreateApprovalRequest();
  const { data: staffList = [] } = useStaff();
  const { user } = useAuth();
  
  const canApproveAdjustments = useHasPermission("approval.stock_adjustment");
  const canEditStock = useHasPermission("inventory.adjust.create");
  const currentStaff = staffList.find(s => s.user_id === user?.id);
  const { data: planInfo } = useBusinessPlan();
  const processStockAdjustment = useProcessStockAdjustment();
  const processStockTransfer = useProcessStockTransfer();
  
  // Free and Professional plans process immediately; only Enterprise requires approval
  const shouldAutoProcess = planInfo?.effectivePlan !== "enterprise";

  const hasMultipleBranches = branches.length > 1;
  const isEnterprisePlan = planInfo?.effectivePlan === 'enterprise';
  const canAccessStockTransfer = hasMultipleBranches && isEnterprisePlan;
  const availableToBranches = branches.filter(b => b.id !== fromBranchId);

  // Calculate summary stats
  const stockInCount = stockMovements.filter(m => m.movement_type === "in").length;
  const stockOutCount = stockMovements.filter(m => m.movement_type === "out").length;
  const transferCount = stockMovements.filter(m => m.movement_type === "transfer").length;

  // Filter movements
  const filteredMovements = stockMovements.filter(movement => {
    const productName = movement.products?.name?.toLowerCase() || "";
    const matchesSearch = productName.includes(searchTerm.toLowerCase()) ||
      movement.notes?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = typeFilter === "all" || movement.movement_type === typeFilter;
    return matchesSearch && matchesType;
  });

  // Format quantity - only show decimals if actually present
  const formatQuantity = (qty: number) => {
    if (Number.isInteger(qty)) return qty.toString();
    return parseFloat(qty.toFixed(2)).toString();
  };

  // Get staff name from user_id (created_by stores auth.users.id)
  const getStaffName = (userId: string | null) => {
    if (!userId) return "System";
    // First check if it matches business owner
    if (userId === business?.owner_user_id) {
      return business?.owner_name || "Owner";
    }
    // Then check staff by user_id
    const staff = staffList.find(s => s.user_id === userId);
    return staff?.full_name || "Unknown User";
  };

  const resetForm = () => {
    setMovementType("");
    setSelectedProduct("");
    setQuantity("");
    setReason("");
    setFromBranchId("");
    setToBranchId("");
  };

  const handleCreateMovement = async () => {
    if (!selectedProduct || !movementType || !quantity) {
      toast({ title: "Please fill in all required fields", variant: "destructive" });
      return;
    }

    // Validate transfer-specific fields
    if (movementType === "transfer") {
      if (!fromBranchId || !toBranchId) {
        toast({ title: "Please select source and destination branches", variant: "destructive" });
        return;
      }
      if (fromBranchId === toBranchId) {
        toast({ title: "Source and destination branches must be different", variant: "destructive" });
        return;
      }
    }

    const product = products.find(p => p.id === selectedProduct);
    if (!product || !business?.id) return;

    const qty = parseFloat(quantity);
    
    if (qty <= 0) {
      toast({ title: "Quantity must be greater than 0", variant: "destructive" });
      return;
    }

    // For transfers and stock out, validate sufficient stock (branch-aware)
    const branchQty = getBranchQty(selectedProduct, product.stock_quantity);
    if ((movementType === "out" || movementType === "transfer") && qty > branchQty) {
      toast({ title: "Insufficient stock available", variant: "destructive" });
      return;
    }

    // Handle transfer differently
    if (movementType === "transfer") {
      await handleTransferMovement(product, qty);
      return;
    }

    const adjustedQty = movementType === "out" ? -Math.abs(qty) : Math.abs(qty);
    const adjustmentType = movementType === "in" ? "increase" : "decrease";
    const newQuantity = product.stock_quantity + adjustedQty;
    
    try {
      // Get or create staff ID for the current user
      let staffId = currentStaff?.id;
      
      if (!staffId && business && user) {
        // Check if this user is the business owner
        if (business.owner_user_id === user.id) {
          const { data: existingStaff } = await supabase
            .from("staff")
            .select("id")
            .eq("user_id", user.id)
            .eq("business_id", business.id)
            .maybeSingle();
          
          if (existingStaff) {
            staffId = existingStaff.id;
          } else {
            const { data: newStaff, error: createError } = await supabase
              .from("staff")
              .insert({
                business_id: business.id,
                user_id: user.id,
                full_name: business.owner_name,
                email: business.owner_email,
                role: "owner",
                is_active: true,
              })
              .select("id")
              .single();
            
            if (!createError && newStaff) {
              staffId = newStaff.id;
            }
          }
        }
      }
      
      if (!staffId) {
        toast({ title: "Staff record not found. Please contact your administrator.", variant: "destructive" });
        return;
      }

      // For Free plan: process immediately without approval
      if (shouldAutoProcess) {
        const idempotencyKey = `adj_${business.id}_${selectedProduct}_${currentBranch?.id || 'none'}_${Date.now()}`;
        await processStockAdjustment.mutateAsync({
          requestId: crypto.randomUUID(),
          productId: selectedProduct,
          adjustmentType,
          quantity: qty,
          previousQuantity: branchQty,
          branchId: currentBranch?.id || null,
          staffId,
          notes: reason || `Stock ${movementType}`,
          idempotencyKey,
        });
        
        toast({ 
          title: "Stock movement recorded",
          description: `Stock ${movementType === "in" ? "increased" : "decreased"} successfully.`
        });
      } else {
        // For paid plans: require approval
        const movementNotes = JSON.stringify({
          productId: selectedProduct,
          productName: product.name,
          branchId: currentBranch?.id || null,
          branchName: currentBranch?.name || "All Locations",
          adjustmentType,
          reason: "stock_movement",
          note: reason || `Stock ${movementType}`,
          previousQuantity: product.stock_quantity,
          newQuantity,
        });

        await createApprovalRequest.mutateAsync({
          request_type: "stock_adjustment",
          requested_by: staffId,
          amount: qty,
          reference_id: selectedProduct,
          reference_type: "product",
          notes: movementNotes,
        });

        toast({ 
          title: "Stock movement submitted for approval",
          description: "An admin must approve this request before stock is updated."
        });
      }
      
      setIsCreateDialogOpen(false);
      resetForm();
    } catch (error) {
      toast({ title: "Failed to submit stock movement", variant: "destructive" });
    }
  };

  const handleTransferMovement = async (product: typeof products[0], qty: number) => {
    if (!business?.id) return;
    
    const fromBranch = branches.find(b => b.id === fromBranchId);
    const toBranch = branches.find(b => b.id === toBranchId);
    
    setIsProcessingTransfer(true);
    
    try {
      // Get or create staff ID for the current user
      let staffId = currentStaff?.id;
      
      if (!staffId && business && user) {
        // Check if this user is the business owner
        if (business.owner_user_id === user.id) {
          const { data: existingStaff } = await supabase
            .from("staff")
            .select("id")
            .eq("user_id", user.id)
            .eq("business_id", business.id)
            .maybeSingle();
          
          if (existingStaff) {
            staffId = existingStaff.id;
          } else {
            const { data: newStaff, error: createError } = await supabase
              .from("staff")
              .insert({
                business_id: business.id,
                user_id: user.id,
                full_name: business.owner_name,
                email: business.owner_email,
                role: "owner",
                is_active: true,
              })
              .select("id")
              .single();
            
            if (!createError && newStaff) {
              staffId = newStaff.id;
            }
          }
        }
      }
      
      if (!staffId) {
        toast({ title: "Staff record not found. Please contact your administrator.", variant: "destructive" });
        setIsProcessingTransfer(false);
        return;
      }

      // Always require approval for transfers
      await createApprovalRequest.mutateAsync({
        request_type: "stock_transfer",
        requested_by: staffId,
        amount: qty,
        reference_id: selectedProduct,
        reference_type: "product",
        notes: JSON.stringify({
          fromBranchId,
          toBranchId,
          fromBranchName: fromBranch?.name,
          toBranchName: toBranch?.name,
          productId: selectedProduct,
          productName: product.name,
          quantity: qty,
          note: reason
        }),
      });

      toast({ 
        title: "Transfer request submitted for approval",
        description: "An admin must approve this request before stock is transferred." 
      });
      
      setIsCreateDialogOpen(false);
      resetForm();
    } catch (error: any) {
      toast({ 
        title: "Failed to process transfer", 
        description: error?.message || "An error occurred",
        variant: "destructive" 
      });
    } finally {
      setIsProcessingTransfer(false);
    }
  };

  const handleEditMovement = async () => {
    if (!selectedMovement) return;

    try {
      await updateStockMovement.mutateAsync({
        id: selectedMovement.id,
        notes: reason,
        product_id: selectedMovement.product_id,
        old_quantity: selectedMovement.quantity,
      });

      toast({ title: "Stock movement updated" });
      setIsEditDialogOpen(false);
      setSelectedMovement(null);
      resetForm();
    } catch (error) {
      toast({ title: "Failed to update stock movement", variant: "destructive" });
    }
  };

  const openEditDialog = (movement: StockMovementData) => {
    setSelectedMovement(movement);
    setReason(movement.notes || "");
    setIsEditDialogOpen(true);
  };

  const getTypeBadge = (type: string) => {
    switch (type) {
      case "in": return <Badge className="bg-green-500 text-white">Stock In</Badge>;
      case "out": return <Badge className="bg-red-500 text-white">Stock Out</Badge>;
      case "transfer": return <Badge className="bg-blue-500 text-white">Transfer</Badge>;
      case "transfer_in": return <Badge className="bg-blue-500 text-white">Transfer In</Badge>;
      case "transfer_out": return <Badge className="bg-blue-500 text-white">Transfer Out</Badge>;
      default: return <Badge className="bg-amber-500 text-white">Adjustment</Badge>;
    }
  };

  // Get selected product for validation display
  const selectedProductData = products.find(p => p.id === selectedProduct);

  if (isLoading) {
    return (
      <main className="flex-1 overflow-y-auto p-4 sm:p-6 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </main>
    );
  }

  return (
    <main className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Stock Management</h1>
          <p className="text-sm text-muted-foreground">Track stock movements and adjustments</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          {canAccessStockTransfer ? (
            <PermissionGate permissions="inventory.adjust.create" hideOnly>
              <Button 
                variant="outline" 
                className="w-full sm:w-auto"
                onClick={() => setIsTransferDialogOpen(true)}
              >
                <ArrowLeftRight className="h-4 w-4 mr-2" />
                Transfer Stock
              </Button>
            </PermissionGate>
          ) : (
            <Button 
              variant="outline" 
              className="w-full sm:w-auto"
              onClick={() => {
                sonnerToast.error("Enterprise Plan Required", {
                  description: "Stock transfer between branches requires the Enterprise plan.",
                  action: {
                    label: "Upgrade",
                    onClick: () => navigate("/subscription?reason=feature_locked&plan=enterprise&feature=stock_transfer"),
                  },
                  duration: 6000,
                });
              }}
            >
              <Lock className="h-4 w-4 mr-2" />
              Transfer Stock
            </Button>
          )}
          <PermissionGate permissions="inventory.adjust.create" hideOnly>
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button className="w-full sm:w-auto">
                  <Plus className="h-4 w-4 mr-2" />
                  Record Movement
                </Button>
              </DialogTrigger>
              <DialogContent className="w-[95vw] max-w-md max-h-[90vh] flex flex-col overflow-hidden">
                <DialogHeader>
                  <DialogTitle>Record Stock Movement</DialogTitle>
                </DialogHeader>
                <ScrollArea className="flex-1 overflow-y-auto">
                <div className="space-y-4 pr-2">
                  <div className="space-y-2">
                    <Label>Movement Type</Label>
                    <Select value={movementType} onValueChange={setMovementType}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent className="bg-popover border border-border z-50">
                        <SelectItem value="in">
                          <div className="flex items-center gap-2">
                            <ArrowUpCircle className="h-4 w-4 text-green-500" />
                            Stock In
                          </div>
                        </SelectItem>
                        <SelectItem value="out">
                          <div className="flex items-center gap-2">
                            <ArrowDownCircle className="h-4 w-4 text-red-500" />
                            Stock Out
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Product</Label>
                    <Popover open={stockProductPopoverOpen} onOpenChange={setStockProductPopoverOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          role="combobox"
                          aria-expanded={stockProductPopoverOpen}
                          className="w-full justify-between font-normal"
                        >
                          {selectedProduct
                            ? products.find(p => p.id === selectedProduct)?.name ?? "Select product"
                            : "Select product"}
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                        <Command>
                          <CommandInput placeholder="Search product..." />
                          <CommandList>
                            <CommandEmpty>No product found.</CommandEmpty>
                            <CommandGroup>
                              {products.filter(p => branchStockMap.has(p.id)).map((product) => {
                                const bsQty = getBranchQty(product.id, 0);
                                return (
                                  <CommandItem
                                    key={product.id}
                                    value={product.name}
                                    onSelect={() => {
                                      setSelectedProduct(product.id);
                                      setStockProductPopoverOpen(false);
                                    }}
                                  >
                                    <Check className={cn("mr-2 h-4 w-4", selectedProduct === product.id ? "opacity-100" : "opacity-0")} />
                                    <span className="flex-1 truncate">{product.name}</span>
                                    <Badge variant="outline" className="ml-auto shrink-0 text-xs">
                                      {formatQuantity(bsQty)} {product.unit}
                                    </Badge>
                                  </CommandItem>
                                );
                              })}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div className="space-y-2">
                    <Label>Quantity</Label>
                    <Input 
                      type="number" 
                      value={quantity} 
                      onChange={(e) => setQuantity(e.target.value)} 
                      placeholder="Enter quantity"
                      min="1"
                      max={selectedProductData ? getBranchQty(selectedProductData.id, 0) : undefined}
                    />
                    {selectedProductData && movementType === "out" && (
                      <p className="text-xs text-muted-foreground">
                        Available: <span className="font-medium text-foreground">{formatQuantity(getBranchQty(selectedProductData.id, 0))} {selectedProductData.unit}</span>
                      </p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label>Reason / Notes</Label>
                    <Textarea 
                      value={reason} 
                      onChange={(e) => setReason(e.target.value)} 
                      placeholder="Enter reason for stock movement"
                      rows={2}
                    />
                  </div>

                  <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg">
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
                      <p className="text-xs text-amber-700 dark:text-amber-300">
                        All stock movements require admin approval before stock levels are updated.
                      </p>
                    </div>
                  </div>

                </div>
                </ScrollArea>
                <DialogFooter className="pt-4 border-t flex-col sm:flex-row gap-2">
                  <Button 
                    variant="outline"
                    onClick={() => setIsCreateDialogOpen(false)}
                    className="w-full sm:w-auto order-2 sm:order-1"
                    disabled={createApprovalRequest.isPending}
                  >
                    Cancel
                  </Button>
                  <Button 
                    onClick={handleCreateMovement} 
                    className="w-full sm:w-auto order-1 sm:order-2" 
                    disabled={createApprovalRequest.isPending}
                  >
                    {createApprovalRequest.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Submitting...
                      </>
                    ) : (
                      "Submit"
                    )}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </PermissionGate>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-3 sm:gap-4 grid-cols-3">
        <Card 
          className={`cursor-pointer transition-colors ${typeFilter === 'in' ? 'border-green-500 bg-green-500/5' : 'hover:border-green-500/50'}`}
          onClick={() => setTypeFilter(typeFilter === 'in' ? 'all' : 'in')}
        >
          <CardContent className="flex items-center gap-2 sm:gap-4 p-3 sm:p-6">
            <ArrowUpCircle className="h-6 w-6 sm:h-10 sm:w-10 text-green-500 shrink-0" />
            <div className="min-w-0">
              <p className="text-lg sm:text-2xl font-bold">{stockInCount}</p>
              <p className="text-xs sm:text-sm text-muted-foreground truncate">Stock In</p>
            </div>
          </CardContent>
        </Card>
        <Card 
          className={`cursor-pointer transition-colors ${typeFilter === 'out' ? 'border-red-500 bg-red-500/5' : 'hover:border-red-500/50'}`}
          onClick={() => setTypeFilter(typeFilter === 'out' ? 'all' : 'out')}
        >
          <CardContent className="flex items-center gap-2 sm:gap-4 p-3 sm:p-6">
            <ArrowDownCircle className="h-6 w-6 sm:h-10 sm:w-10 text-red-500 shrink-0" />
            <div className="min-w-0">
              <p className="text-lg sm:text-2xl font-bold">{stockOutCount}</p>
              <p className="text-xs sm:text-sm text-muted-foreground truncate">Stock Out</p>
            </div>
          </CardContent>
        </Card>
        <Card 
          className={`cursor-pointer transition-colors ${typeFilter === 'transfer' ? 'border-blue-500 bg-blue-500/5' : 'hover:border-blue-500/50'}`}
          onClick={() => setTypeFilter(typeFilter === 'transfer' ? 'all' : 'transfer')}
        >
          <CardContent className="flex items-center gap-2 sm:gap-4 p-3 sm:p-6">
            <ArrowLeftRight className="h-6 w-6 sm:h-10 sm:w-10 text-blue-500 shrink-0" />
            <div className="min-w-0">
              <p className="text-lg sm:text-2xl font-bold">{transferCount}</p>
              <p className="text-xs sm:text-sm text-muted-foreground truncate">Transfers</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Movements Table */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col gap-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <CardTitle className="text-lg">Stock Movements</CardTitle>
              <div className="flex flex-col sm:flex-row gap-2">
                <DateRangeFilter dateRange={dateRange} onDateRangeChange={setDateRange} />
                <div className="relative w-full sm:w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search movements..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
            </div>
            {dateRange?.from && (
              <p className="text-sm text-muted-foreground">
                Showing movements from {format(dateRange.from, "MMM d, yyyy")} 
                {dateRange.to ? ` to ${format(dateRange.to, "MMM d, yyyy")}` : ""}
              </p>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-0 sm:p-6 sm:pt-0">
          {filteredMovements.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No stock movements found</p>
              {dateRange && <p className="text-sm mt-2">Try adjusting your date filter</p>}
            </div>
          ) : (
            <>
              {/* Desktop Table */}
              <div className="hidden md:block overflow-x-auto">
                <TooltipProvider>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Product</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Qty Change</TableHead>
                        <TableHead>Before → After</TableHead>
                        <TableHead>Date & User</TableHead>
                        <TableHead>Notes</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredMovements.map((movement) => (
                        <TableRow key={movement.id}>
                          <TableCell className="font-medium">
                            {movement.products?.name || "Unknown Product"}
                          </TableCell>
                          <TableCell>{getTypeBadge(movement.movement_type)}</TableCell>
                          <TableCell className={movement.movement_type === "out" ? "text-red-600 font-medium" : "text-green-600 font-medium"}>
                            {movement.movement_type === "out" ? `-${formatQuantity(Math.abs(movement.quantity))}` : `+${formatQuantity(Math.abs(movement.quantity))}`}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1 text-sm">
                              <span className="text-muted-foreground">{formatQuantity(movement.previous_quantity)}</span>
                              <ArrowRight className="h-3 w-3 text-muted-foreground" />
                              <span className="font-medium">{formatQuantity(movement.new_quantity)}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div className="flex flex-col gap-0.5">
                                  <span className="text-sm flex items-center gap-1">
                                    <Clock className="h-3 w-3" />
                                    {format(new Date(movement.created_at), "MMM d, HH:mm")}
                                  </span>
                                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                                    <User className="h-3 w-3" />
                                    {getStaffName(movement.created_by || null)}
                                  </span>
                                </div>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>{format(new Date(movement.created_at), "EEEE, MMMM d, yyyy 'at' h:mm a")}</p>
                                <p className="text-muted-foreground">By: {getStaffName(movement.created_by || null)}</p>
                              </TooltipContent>
                            </Tooltip>
                          </TableCell>
                          <TableCell className="max-w-[150px] truncate">
                            {movement.notes || "-"}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                            <PermissionGate permissions="inventory.adjust.create" hideOnly>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => openEditDialog(movement)}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                            </PermissionGate>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TooltipProvider>
            </div>

              {/* Mobile Cards */}
              <div className="md:hidden">
                <ScrollArea className="h-[400px]">
                  <div className="space-y-3 p-4">
                    {filteredMovements.map((movement) => (
                      <Card key={movement.id} className="p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0 space-y-2">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-medium truncate">
                                {movement.products?.name || "Unknown"}
                              </span>
                              {getTypeBadge(movement.movement_type)}
                            </div>
                            <div className="flex items-center gap-2 text-sm flex-wrap">
                              <span className={`font-semibold ${movement.movement_type === "out" ? "text-red-600" : "text-green-600"}`}>
                                {movement.movement_type === "out" ? `-${formatQuantity(Math.abs(movement.quantity))}` : `+${formatQuantity(Math.abs(movement.quantity))}`}
                              </span>
                              <span className="text-muted-foreground">
                                ({formatQuantity(movement.previous_quantity)} → {formatQuantity(movement.new_quantity)})
                              </span>
                            </div>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <Clock className="h-3 w-3" />
                              {format(new Date(movement.created_at), "MMM d, HH:mm")}
                              <User className="h-3 w-3 ml-2" />
                              {getStaffName(movement.created_by || null)}
                            </div>
                            {movement.notes && (
                              <p className="text-xs text-muted-foreground line-clamp-2">
                                {movement.notes}
                              </p>
                            )}
                          </div>
                          <div className="flex gap-1 shrink-0">
                            <PermissionGate permissions="inventory.adjust.create" hideOnly>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => openEditDialog(movement)}
                              >
                                <Pencil className="h-3 w-3" />
                              </Button>
                            </PermissionGate>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="w-[95vw] max-w-md max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>Edit Stock Movement</DialogTitle>
          </DialogHeader>
          {selectedMovement && (
            <div className="space-y-4">
              <div className="p-4 bg-muted rounded-lg space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Product:</span>
                  <span className="font-medium">{selectedMovement.products?.name}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Type:</span>
                  {getTypeBadge(selectedMovement.movement_type)}
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Quantity:</span>
                  <span className={selectedMovement.movement_type === "out" ? "text-red-600 font-medium" : "text-green-600 font-medium"}>
                    {selectedMovement.movement_type === "out" ? `-${Math.abs(selectedMovement.quantity)}` : `+${Math.abs(selectedMovement.quantity)}`}
                  </span>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Notes</Label>
                <Textarea 
                  value={reason} 
                  onChange={(e) => setReason(e.target.value)} 
                  placeholder="Update notes for this movement" 
                />
              </div>
            </div>
          )}
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)} className="w-full sm:w-auto order-2 sm:order-1">
              Cancel
            </Button>
            <Button 
              onClick={handleEditMovement}
              disabled={updateStockMovement.isPending}
              className="w-full sm:w-auto order-1 sm:order-2"
            >
              {updateStockMovement.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>


      {/* Stock Transfer Dialog */}
      <StockTransferDialog
        open={isTransferDialogOpen}
        onOpenChange={setIsTransferDialogOpen}
        currentBranchId={currentBranch?.id}
      />
    </main>
  );
};

export default Stock;