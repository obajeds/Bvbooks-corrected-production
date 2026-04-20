import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, Building2, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useBranches } from "@/hooks/useBranches";
import { useBusiness } from "@/hooks/useBusiness";
import { useProductBranchPrices, useSetBranchProductPrice, useDeleteBranchProductPrice } from "@/hooks/useBranchProductPrices";
import { useCurrency } from "@/hooks/useCurrency";

interface BranchPricingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product: {
    id: string;
    name: string;
    selling_price: number;
    cost_price: number;
  } | null;
  canViewCostPrice?: boolean;
}

export function BranchPricingDialog({ open, onOpenChange, product, canViewCostPrice = true }: BranchPricingDialogProps) {
  const { data: business } = useBusiness();
  const { data: branches = [], isLoading: branchesLoading } = useBranches(business?.id);
  const { data: branchPrices = [], isLoading: pricesLoading } = useProductBranchPrices(product?.id);
  const setBranchPrice = useSetBranchProductPrice();
  const deleteBranchPrice = useDeleteBranchProductPrice();
  const { formatCurrency } = useCurrency();

  const [priceOverrides, setPriceOverrides] = useState<Record<string, { selling_price: string; cost_price: string }>>({});

  useEffect(() => {
    if (branchPrices.length > 0) {
      const overrides: Record<string, { selling_price: string; cost_price: string }> = {};
      branchPrices.forEach((bp) => {
        overrides[bp.branch_id] = {
          selling_price: bp.selling_price.toString(),
          cost_price: bp.cost_price?.toString() || "",
        };
      });
      setPriceOverrides(overrides);
    }
  }, [branchPrices]);

  const handleSavePrice = async (branchId: string) => {
    if (!product) return;

    const override = priceOverrides[branchId];
    if (!override?.selling_price) {
      toast.error("Please enter a selling price");
      return;
    }

    try {
      await setBranchPrice.mutateAsync({
        branch_id: branchId,
        product_id: product.id,
        selling_price: parseFloat(override.selling_price),
        cost_price: override.cost_price ? parseFloat(override.cost_price) : null,
      });
      toast.success("Branch price saved");
    } catch (error: any) {
      toast.error(error.message || "Failed to save branch price");
    }
  };

  const handleRemovePrice = async (branchId: string) => {
    const existingPrice = branchPrices.find((bp) => bp.branch_id === branchId);
    if (existingPrice) {
      try {
        await deleteBranchPrice.mutateAsync(existingPrice.id);
        setPriceOverrides((prev) => {
          const updated = { ...prev };
          delete updated[branchId];
          return updated;
        });
        toast.success("Branch price removed");
      } catch (error: any) {
        toast.error(error.message || "Failed to remove branch price");
      }
    }
  };

  const hasBranchPrice = (branchId: string) => branchPrices.some((bp) => bp.branch_id === branchId);

  if (!product) return null;

  const isLoading = branchesLoading || pricesLoading;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Branch Pricing - {product.name}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-center gap-4 p-3 bg-muted rounded-lg">
            <div>
              <p className="text-sm text-muted-foreground">Default Price</p>
              <p className="text-lg font-semibold">{formatCurrency(product.selling_price)}</p>
            </div>
            {canViewCostPrice && (
              <div>
                <p className="text-sm text-muted-foreground">Default Cost</p>
                <p className="text-lg font-semibold">{formatCurrency(product.cost_price)}</p>
              </div>
            )}
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : branches.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No branches found</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Branch</TableHead>
                  <TableHead>Selling Price</TableHead>
                  {canViewCostPrice && <TableHead>Cost Price</TableHead>}
                  <TableHead className="w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {branches.map((branch) => (
                  <TableRow key={branch.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{branch.name}</span>
                        {branch.is_main && (
                          <Badge variant="secondary" className="text-xs">Main</Badge>
                        )}
                        {hasBranchPrice(branch.id) && (
                          <Badge variant="outline" className="text-xs bg-primary/10">Custom</Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        placeholder={product.selling_price.toString()}
                        value={priceOverrides[branch.id]?.selling_price || ""}
                        onChange={(e) =>
                          setPriceOverrides((prev) => ({
                            ...prev,
                            [branch.id]: {
                              ...prev[branch.id],
                              selling_price: e.target.value,
                              cost_price: prev[branch.id]?.cost_price || "",
                            },
                          }))
                        }
                        className="w-32"
                      />
                    </TableCell>
                    {canViewCostPrice && (
                      <TableCell>
                        <Input
                          type="number"
                          placeholder={product.cost_price.toString()}
                          value={priceOverrides[branch.id]?.cost_price || ""}
                          onChange={(e) =>
                            setPriceOverrides((prev) => ({
                              ...prev,
                              [branch.id]: {
                                ...prev[branch.id],
                                selling_price: prev[branch.id]?.selling_price || "",
                                cost_price: e.target.value,
                              },
                            }))
                          }
                          className="w-32"
                        />
                      </TableCell>
                    )}
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => handleSavePrice(branch.id)}
                          disabled={setBranchPrice.isPending}
                        >
                          <Save className="h-4 w-4" />
                        </Button>
                        {hasBranchPrice(branch.id) && (
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => handleRemovePrice(branch.id)}
                            disabled={deleteBranchPrice.isPending}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

          <p className="text-xs text-muted-foreground">
            Custom branch prices override the default product price for specific branches. Leave empty to use the default price.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
