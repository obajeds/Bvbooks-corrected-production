import { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Package, TrendingUp, TrendingDown, AlertTriangle, CheckCircle, ArrowLeft, ArrowRight, MapPin, Calendar, ShieldX, ChevronsUpDown, Check } from "lucide-react";
import { useProducts } from "@/hooks/useProducts";
import { useBusiness } from "@/hooks/useBusiness";
import { useBranches } from "@/hooks/useBranches";
import { useStaff } from "@/hooks/useStaff";
import { useAuth } from "@/contexts/AuthContext";
import { useBranchStock } from "@/hooks/useBranchStock";
import { useBranchContext } from "@/contexts/BranchContext";
import { useCreateApprovalRequest } from "@/hooks/useApprovalRequests";
import { useHasPermission } from "@/hooks/usePermissions";
import { useBusinessPlan } from "@/hooks/useFeatureGating";
import { useProcessStockAdjustment } from "@/hooks/useProcessStockAdjustment";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

const ADJUSTMENT_REASONS = [
  { value: "purchase_new_stock", label: "Purchase of new stocks" },
  { value: "physical_count", label: "Physical count correction" },
  { value: "damage_spoilage", label: "Damage or spoilage" },
  { value: "theft_loss", label: "Theft or loss" },
  { value: "data_entry_error", label: "Data entry error" },
  { value: "opening_balance", label: "Opening balance correction" },
  { value: "system_migration", label: "System migration fix" },
];

// Helper to format unit for display (strips :decimal suffix)
const formatUnit = (unit: string | undefined) => {
  if (!unit) return "";
  return unit.replace(/:decimal$/, "");
};

const LARGE_DECREASE_THRESHOLD = 50; // Units

interface StockAdjustmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function StockAdjustmentDialog({ open, onOpenChange }: StockAdjustmentDialogProps) {
  const [step, setStep] = useState(1);
  const [productId, setProductId] = useState("");
  const [branchId, setBranchId] = useState("");
  const [adjustmentType, setAdjustmentType] = useState<"increase" | "decrease">("increase");
  const [quantity, setQuantity] = useState("");
  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState("");
  const [productPopoverOpen, setProductPopoverOpen] = useState(false);

  const { user } = useAuth();
  const { data: business } = useBusiness();
  const { data: products = [], isLoading: productsLoading } = useProducts();
  const { data: branches = [] } = useBranches(business?.id);
  const { data: staffList = [] } = useStaff();
  const { currentBranch } = useBranchContext();
  const createApprovalRequest = useCreateApprovalRequest();
  const processStockAdjustment = useProcessStockAdjustment();
  const { data: planInfo } = useBusinessPlan();
  
  // Auto-set branch to current branch
  const effectiveBranchId = branchId || currentBranch?.id || "";
  const { data: branchStockData = [] } = useBranchStock(effectiveBranchId);
  
  // Build a map of productId -> branch-specific quantity
  const branchStockMap = useMemo(() => {
    const map = new Map<string, number>();
    branchStockData.forEach(item => {
      map.set(item.product_id, item.quantity);
    });
    return map;
  }, [branchStockData]);

  // Free and Professional plans process immediately; only Enterprise requires approval
  const shouldAutoProcess = planInfo?.effectivePlan !== "enterprise";
  
  // Check if user has permission to create adjustments
  const canCreateAdjustment = useHasPermission("inventory.adjust.create");

  // Find current staff - must match the authenticated user for RLS to pass
  const currentStaff = staffList.find(s => s.user_id === user?.id);
  const selectedProduct = products.find(p => p.id === productId);
  const selectedBranch = effectiveBranchId ? branches.find(b => b.id === effectiveBranchId) : null;

  // Use branch-specific stock quantity
  const branchQuantity = productId ? (branchStockMap.get(productId) ?? 0) : 0;
  const quantityNum = parseFloat(quantity) || 0;
  const resultingQuantity = adjustmentType === "increase" 
    ? branchQuantity + quantityNum
    : branchQuantity - quantityNum;

  const isLargeDecrease = adjustmentType === "decrease" && quantityNum >= LARGE_DECREASE_THRESHOLD;
  const wouldBeNegative = resultingQuantity < 0;

  const isOwner = business?.owner_user_id === user?.id;
  const canSubmit = !!(productId && effectiveBranchId && quantity && parseFloat(quantity) > 0 && reason && !wouldBeNegative && (currentStaff || isOwner));

  // Get last adjustment date for selected product
  const lastAdjustmentDate = useMemo(() => {
    // This would typically come from the database - for now we show N/A
    return null;
  }, [productId]);

  const resetForm = () => {
    setStep(1);
    setProductId("");
    setBranchId("");
    setAdjustmentType("increase");
    setQuantity("");
    setReason("");
    setNotes("");
  };

  const handleClose = () => {
    resetForm();
    onOpenChange(false);
  };

  const handleSubmit = async () => {
    if (!productId || !quantity || parseFloat(quantity) <= 0 || !reason || wouldBeNegative) return;

    let staffId = currentStaff?.id;

    // If no staff record exists, check if user is business owner and create one
    if (!staffId && business && user) {
      // Check if this user is the business owner
      if (business.owner_user_id === user.id) {
        try {
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

          if (createError) {
            // If duplicate, try to fetch existing
            if (createError.code === "23505") {
              const { data: existingStaff } = await supabase
                .from("staff")
                .select("id")
                .eq("user_id", user.id)
                .eq("business_id", business.id)
                .maybeSingle();

              if (existingStaff) {
                staffId = existingStaff.id;
              } else {
                throw createError;
              }
            } else {
              throw createError;
            }
          } else {
            staffId = newStaff.id;
          }
        } catch (error) {
          console.error("Failed to create owner staff record:", error);
          return;
        }
      }
    }

    if (!staffId) {
      console.error("No staff ID available for submission");
      return;
    }

    try {
      // For Free plan: process immediately without approval
      if (shouldAutoProcess) {
        await processStockAdjustment.mutateAsync({
          requestId: crypto.randomUUID(),
          productId,
          adjustmentType,
          quantity: quantityNum,
          previousQuantity: branchQuantity,
          branchId: effectiveBranchId,
          staffId,
          notes: notes || `Stock ${adjustmentType === "increase" ? "In" : "Out"}: ${ADJUSTMENT_REASONS.find(r => r.value === reason)?.label || reason}`,
        });
      } else {
        // For paid plans: require approval
        const adjustmentNotes = JSON.stringify({
          productId,
          branchId: effectiveBranchId,
          adjustmentType,
          reason,
          note: notes,
          previousQuantity: branchQuantity,
          newQuantity: resultingQuantity,
        });

        await createApprovalRequest.mutateAsync({
          request_type: "stock_adjustment",
          requested_by: staffId,
          amount: quantityNum,
          reference_id: productId,
          reference_type: "product",
          notes: adjustmentNotes,
        });
      }

      handleClose();
    } catch (error) {
      // Error toast already shown by mutation's onError
      console.error("Stock adjustment failed:", error);
    }
  };

  const renderStep1 = () => (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="product">Select Product *</Label>
        <Popover open={productPopoverOpen} onOpenChange={setProductPopoverOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={productPopoverOpen}
              className="w-full justify-between font-normal"
            >
              {productId
                ? products.find(p => p.id === productId)?.name ?? "Choose a product"
                : "Choose a product"}
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
            <Command>
              <CommandInput placeholder="Search product..." />
              <CommandList>
                {productsLoading ? (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 className="w-4 h-4 animate-spin" />
                  </div>
                ) : (
                  <>
                    <CommandEmpty>No product found.</CommandEmpty>
                    <CommandGroup>
                      {products.filter(product => branchStockMap.has(product.id)).map(product => {
                        const bsQty = branchStockMap.get(product.id) ?? 0;
                        return (
                          <CommandItem
                            key={product.id}
                            value={product.name}
                            onSelect={() => {
                              setProductId(product.id);
                              setProductPopoverOpen(false);
                            }}
                          >
                            <Check className={cn("mr-2 h-4 w-4", productId === product.id ? "opacity-100" : "opacity-0")} />
                            <Package className="mr-2 h-4 w-4 text-muted-foreground" />
                            <span className="flex-1">{product.name}</span>
                            <Badge variant="outline" className="ml-auto text-xs">
                              {bsQty} {formatUnit(product.unit)}
                            </Badge>
                          </CommandItem>
                        );
                      })}
                    </CommandGroup>
                  </>
                )}
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      </div>

      {branches.length > 1 && (
        <div className="space-y-2">
          <Label htmlFor="branch">Store / Location *</Label>
          <Select value={effectiveBranchId} onValueChange={setBranchId}>
            <SelectTrigger>
              <SelectValue placeholder="Select a branch" />
            </SelectTrigger>
            <SelectContent>
              {branches.map(branch => (
                <SelectItem key={branch.id} value={branch.id}>
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-muted-foreground" />
                    {branch.name}
                    {branch.is_main && (
                      <Badge variant="secondary" className="ml-1 text-xs">Main</Badge>
                    )}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {selectedProduct && (
        <Card className="bg-muted/50">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Package className="w-5 h-5 text-primary" />
              <span className="font-medium">{selectedProduct.name}</span>
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Current System Quantity</span>
                <p className="font-mono text-lg font-bold">{branchQuantity} {formatUnit(selectedProduct.unit)}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Last Adjustment</span>
                <div className="flex items-center gap-1 mt-1">
                  <Calendar className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm">{lastAdjustmentDate ? format(new Date(lastAdjustmentDate), "MMM d, yyyy") : "N/A"}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );

  const renderStep2 = () => (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Adjustment Type *</Label>
        <div className="grid grid-cols-2 gap-3">
          <Button
            type="button"
            variant={adjustmentType === "increase" ? "default" : "outline"}
            className={cn(
              "h-20 flex-col gap-2",
              adjustmentType === "increase" && "bg-emerald-600 hover:bg-emerald-700"
            )}
            onClick={() => setAdjustmentType("increase")}
          >
            <TrendingUp className="w-6 h-6" />
            <span>Increase Stock</span>
          </Button>
          <Button
            type="button"
            variant={adjustmentType === "decrease" ? "default" : "outline"}
            className={cn(
              "h-20 flex-col gap-2",
              adjustmentType === "decrease" && "bg-rose-600 hover:bg-rose-700"
            )}
            onClick={() => setAdjustmentType("decrease")}
          >
            <TrendingDown className="w-6 h-6" />
            <span>Decrease Stock</span>
          </Button>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="quantity">Quantity *</Label>
        <Input
          id="quantity"
          type="number"
          step="any"
          min="0.01"
          value={quantity}
          onChange={(e) => setQuantity(e.target.value)}
          placeholder="Enter quantity"
          className="font-mono text-lg"
        />
      </div>

      {selectedProduct && quantity && (
        <Card className={cn(
          "border-2",
          wouldBeNegative ? "border-red-500 bg-red-50 dark:bg-red-950/20" : "bg-muted/50"
        )}>
          <CardContent className="p-4">
            <div className="grid grid-cols-3 gap-2 text-center">
              <div>
                <span className="text-xs text-muted-foreground">Current</span>
                <p className="font-mono font-bold">{branchQuantity}</p>
              </div>
              <div>
                <span className="text-xs text-muted-foreground">Change</span>
                <p className={cn(
                  "font-mono font-bold",
                  adjustmentType === "increase" ? "text-emerald-600" : "text-rose-600"
                )}>
                  {adjustmentType === "increase" ? "+" : "-"}{quantityNum}
                </p>
              </div>
              <div>
                <span className="text-xs text-muted-foreground">Result</span>
                <p className={cn(
                  "font-mono font-bold",
                  wouldBeNegative && "text-red-600"
                )}>
                  {resultingQuantity}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {wouldBeNegative && (
        <Alert variant="destructive">
          <AlertTriangle className="w-4 h-4" />
          <AlertDescription>
            This adjustment would result in negative stock. Please verify the quantity.
          </AlertDescription>
        </Alert>
      )}

      {isLargeDecrease && !wouldBeNegative && (
        <Alert>
          <AlertTriangle className="w-4 h-4 text-amber-500" />
          <AlertDescription className="text-amber-700 dark:text-amber-400">
            Large decrease detected ({quantityNum} units). This will require owner/admin approval.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );

  const renderStep3 = () => (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="reason">Reason for Adjustment *</Label>
        <Select value={reason} onValueChange={setReason}>
          <SelectTrigger>
            <SelectValue placeholder="Select a reason" />
          </SelectTrigger>
          <SelectContent>
            {ADJUSTMENT_REASONS.map(r => (
              <SelectItem key={r.value} value={r.value}>
                {r.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="notes">Additional Notes (optional)</Label>
        <Textarea
          id="notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Provide any additional details about this adjustment..."
          rows={3}
        />
      </div>

      {/* Summary */}
      <Card className="bg-primary/5 border-primary/20">
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center gap-2 text-primary">
            <CheckCircle className="w-5 h-5" />
            <span className="font-medium">Adjustment Summary</span>
          </div>
          
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Product:</span>
              <span className="font-medium">{selectedProduct?.name}</span>
            </div>
            {selectedBranch && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Location:</span>
                <span className="font-medium">{selectedBranch.name}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-muted-foreground">Type:</span>
              <Badge className={adjustmentType === "increase" ? "bg-emerald-500" : "bg-rose-500"}>
                {adjustmentType === "increase" ? "Increase" : "Decrease"}
              </Badge>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Quantity:</span>
              <span className="font-mono font-medium">{quantityNum} {formatUnit(selectedProduct?.unit)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Reason:</span>
              <span className="font-medium">{ADJUSTMENT_REASONS.find(r => r.value === reason)?.label}</span>
            </div>
            <div className="flex justify-between pt-2 border-t">
              <span className="text-muted-foreground">Result:</span>
              <span className="font-mono font-bold">
                {branchQuantity} → {resultingQuantity} {formatUnit(selectedProduct?.unit)}
              </span>
            </div>
          </div>

          {!currentStaff && staffList.length === 0 && (
            <Alert variant="destructive">
              <AlertTriangle className="w-4 h-4" />
              <AlertDescription className="text-xs">
                No staff members found. Please add staff in the Staff section before creating adjustments.
              </AlertDescription>
            </Alert>
          )}

          {currentStaff && (
          <Alert className={shouldAutoProcess ? "border-green-500/20 bg-green-500/10" : undefined}>
              <AlertTriangle className={`w-4 h-4 ${shouldAutoProcess ? "text-green-600" : ""}`} />
              <AlertDescription className="text-xs">
                {shouldAutoProcess 
                  ? "Stock will be updated immediately after submission."
                  : "This adjustment requires approval from an owner or admin before stock is updated."
                }
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  );

  // If user doesn't have permission, show access denied
  if (!canCreateAdjustment) {
    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="max-w-md mx-4 sm:mx-auto">
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <ShieldX className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Access Denied</h3>
            <p className="text-sm text-muted-foreground mb-4">
              You don't have permission to create stock adjustments.
            </p>
            <Button variant="outline" onClick={handleClose}>Close</Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md mx-4 sm:mx-auto max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="w-5 h-5" />
            New Stock Adjustment
          </DialogTitle>
          <DialogDescription>
            {step === 1 && "Step 1: Select the product and location"}
            {step === 2 && "Step 2: Choose adjustment type and quantity"}
            {step === 3 && "Step 3: Provide reason and submit"}
          </DialogDescription>
        </DialogHeader>

        {/* Progress indicator */}
        <div className="flex items-center gap-2 py-2">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex items-center flex-1">
              <div className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors",
                s === step ? "bg-primary text-primary-foreground" :
                s < step ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"
              )}>
                {s < step ? <CheckCircle className="w-4 h-4" /> : s}
              </div>
              {s < 3 && (
                <div className={cn(
                  "h-1 flex-1 mx-2 rounded",
                  s < step ? "bg-primary" : "bg-muted"
                )} />
              )}
            </div>
          ))}
        </div>

        <div className="py-4">
          {step === 1 && renderStep1()}
          {step === 2 && renderStep2()}
          {step === 3 && renderStep3()}
        </div>

        <div className="flex flex-col-reverse sm:flex-row gap-2 pt-4 border-t">
          {step > 1 && (
            <Button
              type="button"
              variant="outline"
              onClick={() => setStep(step - 1)}
              className="w-full sm:w-auto sm:flex-1 h-12 sm:h-11"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
          )}
          
          {step < 3 ? (
            <Button
              type="button"
              onClick={() => setStep(step + 1)}
              disabled={step === 1 ? !productId : (!quantity || parseFloat(quantity) <= 0 || wouldBeNegative)}
              className="w-full sm:w-auto sm:flex-1 h-12 sm:h-11"
            >
              Next
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          ) : (
            <Button
              type="button"
              onClick={handleSubmit}
              disabled={!canSubmit || createApprovalRequest.isPending || processStockAdjustment.isPending}
              className="w-full sm:w-auto sm:flex-1 h-12 sm:h-11 min-w-0"
            >
              {(createApprovalRequest.isPending || processStockAdjustment.isPending) ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin flex-shrink-0" />
                  <span className="truncate">Submitting...</span>
                </span>
              ) : (
              <span className="flex items-center justify-center gap-2">
                  <CheckCircle className="w-4 h-4 flex-shrink-0" />
                  <span className="truncate">Submit</span>
                </span>
              )}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
