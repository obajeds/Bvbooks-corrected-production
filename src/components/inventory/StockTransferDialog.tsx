import { useState, useMemo, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Loader2, ArrowRight, AlertTriangle, Package, Search, Building2, ArrowLeftRight, CheckCircle2, ChevronsUpDown, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useBranchStock } from "@/hooks/useBranchStock";
import { useBranches } from "@/hooks/useBranches";
import { useBusiness } from "@/hooks/useBusiness";
import { useProducts } from "@/hooks/useProducts";
import { useCreateApprovalRequest } from "@/hooks/useApprovalRequests";
import { useStaff } from "@/hooks/useStaff";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

interface StockTransferDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentBranchId?: string;
}

export function StockTransferDialog({ open, onOpenChange, currentBranchId }: StockTransferDialogProps) {
  const [fromBranchId, setFromBranchId] = useState(currentBranchId || "");
  const [toBranchId, setToBranchId] = useState("");
  const [selectedProduct, setSelectedProduct] = useState("");
  const [quantity, setQuantity] = useState("");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [productSearch, setProductSearch] = useState("");
  const [transferProductPopoverOpen, setTransferProductPopoverOpen] = useState(false);

  
  const { data: business } = useBusiness();
  const { data: branches = [] } = useBranches(business?.id);
  const { data: products = [] } = useProducts();
  const { data: staffList = [] } = useStaff();
  const { user } = useAuth();
  const createApprovalRequest = useCreateApprovalRequest();
  
  
  const currentStaff = staffList.find(s => s.user_id === user?.id);
  
  // Use branch-specific stock from source branch
  const { data: fromBranchStockData = [] } = useBranchStock(fromBranchId || undefined);
  const fromBranchStockMap = useMemo(() => {
    const map = new Map<string, number>();
    fromBranchStockData.forEach(item => map.set(item.product_id, item.quantity));
    return map;
  }, [fromBranchStockData]);

  const availableToBranches = branches.filter(b => b.id !== fromBranchId && b.is_active);
  const activeBranches = branches.filter(b => b.is_active);
  const selectedProductData = products.find(p => p.id === selectedProduct);
  const selectedProductBranchQty = selectedProductData ? (fromBranchStockMap.get(selectedProductData.id) ?? 0) : 0;

  // Filter products by search - only show products with stock in the source branch
  const filteredProducts = useMemo(() => {
    const withBranchStock = products.map(p => ({
      ...p,
      branchQty: fromBranchStockMap.get(p.id) ?? 0,
    }));
    if (!productSearch.trim()) return withBranchStock.filter(p => p.branchQty > 0);
    const search = productSearch.toLowerCase();
    return withBranchStock.filter(p => 
      p.branchQty > 0 && 
      (p.name.toLowerCase().includes(search) || p.sku?.toLowerCase().includes(search))
    );
  }, [products, productSearch, fromBranchStockMap]);

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      setFromBranchId(currentBranchId || "");
      setToBranchId("");
      setSelectedProduct("");
      setQuantity("");
      setNotes("");
      setProductSearch("");
    }
  }, [open, currentBranchId]);

  const resetForm = () => {
    setFromBranchId(currentBranchId || "");
    setToBranchId("");
    setSelectedProduct("");
    setQuantity("");
    setNotes("");
    setProductSearch("");
  };

  // Format quantity display
  const formatQuantity = (qty: number) => {
    if (Number.isInteger(qty)) return qty.toString();
    return parseFloat(qty.toFixed(2)).toString();
  };

  const handleSubmit = async () => {
    // Validation
    if (!fromBranchId || !toBranchId || !selectedProduct || !quantity) {
      toast.error("Please fill in all required fields");
      return;
    }

    if (fromBranchId === toBranchId) {
      toast.error("Source and destination branches must be different");
      return;
    }

    const qty = parseFloat(quantity);
    if (qty <= 0 || isNaN(qty)) {
      toast.error("Quantity must be greater than 0");
      return;
    }

    if (qty > selectedProductBranchQty) {
      toast.error("Insufficient stock in source branch for transfer");
      return;
    }

    setIsSubmitting(true);

    try {
      const fromBranch = branches.find(b => b.id === fromBranchId);
      const toBranch = branches.find(b => b.id === toBranchId);

      let requesterId = currentStaff?.id;

      // If no staff record exists, check if user is business owner and create one
      if (!requesterId && business && user) {
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
              if (createError.code === "23505") {
                const { data: existingStaff } = await supabase
                  .from("staff")
                  .select("id")
                  .eq("user_id", user.id)
                  .eq("business_id", business.id)
                  .maybeSingle();

                if (existingStaff) {
                  requesterId = existingStaff.id;
                } else {
                  throw createError;
                }
              } else {
                throw createError;
              }
            } else {
              requesterId = newStaff.id;
            }
          } catch (error) {
            console.error("Failed to create owner staff record:", error);
            toast.error("Failed to identify staff record");
            setIsSubmitting(false);
            return;
          }
        }
      }
      
      if (!requesterId) {
        toast.error("Staff record not found");
        setIsSubmitting(false);
        return;
      }

      // Always require approval for transfers
      await createApprovalRequest.mutateAsync({
        request_type: "stock_transfer",
        requested_by: requesterId,
        amount: qty,
        reference_id: selectedProduct,
        reference_type: "product",
        notes: JSON.stringify({
          fromBranchId,
          toBranchId,
          fromBranchName: fromBranch?.name,
          toBranchName: toBranch?.name,
          productId: selectedProduct,
          productName: selectedProductData?.name,
          quantity: qty,
          note: notes
        }),
      });

      toast.success("Transfer request submitted", {
        description: "Awaiting admin approval before processing."
      });
      
      onOpenChange(false);
      resetForm();
    } catch (error: any) {
      toast.error("Failed to process transfer", {
        description: error?.message || "An error occurred"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const insufficientBranches = activeBranches.length < 2;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-lg p-0 gap-0 max-h-[90vh] flex flex-col">
        <DialogHeader className="p-4 sm:p-6 pb-2 sm:pb-4 border-b">
          <DialogTitle className="flex items-center gap-2 text-lg">
            <ArrowLeftRight className="h-5 w-5 text-primary" />
            Stock Transfer
          </DialogTitle>
          <DialogDescription className="text-sm">
            Move inventory between branches
          </DialogDescription>
        </DialogHeader>
        
        {insufficientBranches ? (
          <div className="flex-1 flex flex-col items-center justify-center py-12 px-6 text-center">
            <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mb-4">
              <Building2 className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="font-semibold text-lg mb-2">Multiple Branches Required</h3>
            <p className="text-sm text-muted-foreground max-w-xs">
              Stock transfers require at least 2 active branches. Add more branches in Settings to enable transfers.
            </p>
          </div>
        ) : (
          <ScrollArea className="flex-1 overflow-y-auto">
            <div className="p-4 sm:p-6 space-y-5">
              {/* Branch Selection */}
              <div className="space-y-3">
                <Label className="text-sm font-medium flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                  Transfer Route
                </Label>
                <div className="grid grid-cols-1 gap-3">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
                    <div className="flex-1 space-y-1.5">
                      <Label className="text-xs text-muted-foreground">From</Label>
                      <Select value={fromBranchId} onValueChange={(val) => {
                        setFromBranchId(val);
                        // Reset destination if it becomes same as source
                        if (val === toBranchId) setToBranchId("");
                      }}>
                        <SelectTrigger className="w-full h-10">
                          <SelectValue placeholder="Select source branch" />
                        </SelectTrigger>
                        <SelectContent className="bg-popover border border-border z-50">
                          {activeBranches.map((branch) => (
                            <SelectItem key={branch.id} value={branch.id}>
                              <div className="flex items-center gap-2">
                                {branch.name}
                                {branch.is_main && (
                                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0">Main</Badge>
                                )}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <ArrowRight className="h-4 w-4 text-muted-foreground hidden sm:block shrink-0 mt-6" />
                    <div className="flex justify-center sm:hidden">
                      <ArrowRight className="h-4 w-4 text-muted-foreground rotate-90" />
                    </div>
                    
                    <div className="flex-1 space-y-1.5">
                      <Label className="text-xs text-muted-foreground">To</Label>
                      <Select value={toBranchId} onValueChange={setToBranchId} disabled={!fromBranchId}>
                        <SelectTrigger className="w-full h-10">
                          <SelectValue placeholder={fromBranchId ? "Select destination" : "Select source first"} />
                        </SelectTrigger>
                        <SelectContent className="bg-popover border border-border z-50">
                          {availableToBranches.map((branch) => (
                            <SelectItem key={branch.id} value={branch.id}>
                              <div className="flex items-center gap-2">
                                {branch.name}
                                {branch.is_main && (
                                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0">Main</Badge>
                                )}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              </div>

              {/* Product Selection */}
              <div className="space-y-3">
                <Label className="text-sm font-medium flex items-center gap-2">
                  <Package className="h-4 w-4 text-muted-foreground" />
                  Product
                </Label>
                
                <Popover open={transferProductPopoverOpen} onOpenChange={setTransferProductPopoverOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={transferProductPopoverOpen}
                      className="w-full justify-between font-normal h-10"
                    >
                      {selectedProduct
                        ? products.find(p => p.id === selectedProduct)?.name ?? "Select product to transfer"
                        : "Select product to transfer"}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                    <Command>
                      <CommandInput placeholder="Search products..." />
                      <CommandList>
                        <CommandEmpty>No products found.</CommandEmpty>
                        <CommandGroup>
                          {filteredProducts.map((product) => (
                            <CommandItem
                              key={product.id}
                              value={product.name}
                              onSelect={() => {
                                setSelectedProduct(product.id);
                                setTransferProductPopoverOpen(false);
                              }}
                            >
                              <Check className={cn("mr-2 h-4 w-4", selectedProduct === product.id ? "opacity-100" : "opacity-0")} />
                              <span className="flex-1 truncate">{product.name}</span>
                              <Badge variant="outline" className="ml-auto shrink-0 text-xs">
                                {formatQuantity(product.branchQty)} {product.unit}
                              </Badge>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>

              {/* Quantity */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Quantity to Transfer</Label>
                <Input 
                  type="number" 
                  value={quantity} 
                  onChange={(e) => setQuantity(e.target.value)} 
                  placeholder="Enter quantity"
                  min="0.01"
                  step="any"
                  max={selectedProductBranchQty}
                  className="h-10"
                />
                {selectedProductData && (
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">
                      Available in source branch: <span className="font-medium text-foreground">{formatQuantity(selectedProductBranchQty)} {selectedProductData.unit}</span>
                    </span>
                    {quantity && parseFloat(quantity) > 0 && parseFloat(quantity) <= selectedProductBranchQty && (
                      <span className="text-green-600 flex items-center gap-1">
                        <CheckCircle2 className="h-3 w-3" />
                        Valid
                      </span>
                    )}
                    {quantity && parseFloat(quantity) > selectedProductBranchQty && (
                      <span className="text-destructive flex items-center gap-1">
                        <AlertTriangle className="h-3 w-3" />
                        Exceeds branch stock
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Notes */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">
                  Notes <span className="text-muted-foreground font-normal">(Optional)</span>
                </Label>
                <Textarea 
                  value={notes} 
                  onChange={(e) => setNotes(e.target.value)} 
                  placeholder="Reason for transfer, special instructions..."
                  rows={2}
                  className="resize-none text-sm"
                />
              </div>

              {/* Info Banner */}
              <div className="flex items-start gap-2.5 p-3 border rounded-lg text-sm bg-amber-500/10 border-amber-500/20">
                <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                <span className="text-muted-foreground">
                  This transfer requires admin approval before processing.
                </span>
              </div>
            </div>
          </ScrollArea>
        )}

        <DialogFooter className="p-4 sm:p-6 pt-4 border-t flex-col sm:flex-row gap-2">
          <Button 
            variant="outline" 
            onClick={() => onOpenChange(false)} 
            className="w-full sm:w-auto order-2 sm:order-1"
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={isSubmitting || insufficientBranches || !fromBranchId || !toBranchId || !selectedProduct || !quantity}
            className="w-full sm:w-auto order-1 sm:order-2"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Submitting...
              </>
            ) : (
              <>
                <ArrowRight className="h-4 w-4 mr-2" />
                Submit
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}