import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Package, History, Loader2, ArrowUp, ArrowDown, RefreshCw, ArrowLeftRight, ShoppingCart, Undo2, PackagePlus, AlertTriangle } from "lucide-react";
import { format } from "date-fns";
import { useCurrency } from "@/hooks/useCurrency";
import { useCategories } from "@/hooks/useCategories";
import { useBranchStock } from "@/hooks/useBranchStock";
import { useProductLog } from "@/hooks/useProductLog";
import { useMemo } from "react";

interface Product {
  id: string;
  name: string;
  sku: string | null;
  category_id: string | null;
  cost_price: number;
  selling_price: number;
  low_stock_threshold?: number | null;
}

interface ProductDetailDialogProps {
  product: Product | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  canViewCostPrice?: boolean;
}

const movementTypeConfig: Record<string, { label: string; icon: typeof ArrowUp; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  in: { label: "Stock In", icon: ArrowUp, variant: "default" },
  out: { label: "Stock Out", icon: ArrowDown, variant: "destructive" },
  sale: { label: "Sale", icon: ShoppingCart, variant: "destructive" },
  adjustment: { label: "Adjustment", icon: RefreshCw, variant: "secondary" },
  transfer: { label: "Transfer", icon: ArrowLeftRight, variant: "outline" },
  transfer_in: { label: "Transfer In", icon: ArrowUp, variant: "default" },
  transfer_out: { label: "Transfer Out", icon: ArrowDown, variant: "outline" },
  return: { label: "Return", icon: Undo2, variant: "secondary" },
  purchase: { label: "Purchase", icon: PackagePlus, variant: "default" },
  damage: { label: "Damage", icon: AlertTriangle, variant: "destructive" },
};

export function ProductDetailDialog({ product, open, onOpenChange, canViewCostPrice = true }: ProductDetailDialogProps) {
  const { formatCurrency } = useCurrency();
  const { data: categories = [] } = useCategories();
  const { data: branchStockData = [] } = useBranchStock();
  const { data: logEntries = [], isLoading: logLoading } = useProductLog(product?.id ?? null);

  const stockInfo = useMemo(() => {
    if (!product) return { quantity: 0, threshold: 5 };
    const bs = branchStockData.find((s) => s.product_id === product.id);
    return {
      quantity: bs?.quantity ?? 0,
      threshold: bs?.low_stock_threshold ?? product.low_stock_threshold ?? 0,
    };
  }, [product, branchStockData]);

  const status = stockInfo.quantity === 0
    ? "Out of Stock"
    : stockInfo.quantity <= stockInfo.threshold
      ? "Low Stock"
      : "In Stock";

  const statusVariant = status === "Out of Stock" ? "destructive" : status === "Low Stock" ? "secondary" : "default";

  const getCategoryName = (categoryId: string | null) => {
    if (!categoryId) return "-";
    const cat = categories.find((c) => c.id === categoryId);
    if (!cat) return "-";
    if (cat.parent_id) {
      const parent = categories.find((c) => c.id === cat.parent_id);
      return parent ? `${parent.name} > ${cat.name}` : cat.name;
    }
    return cat.name;
  };

  if (!product) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            {product.name}
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="details" className="flex-1 min-h-0 flex flex-col">
          <TabsList className="w-full">
            <TabsTrigger value="details" className="flex-1">Details</TabsTrigger>
            <TabsTrigger value="log" className="flex-1">
              <History className="h-4 w-4 mr-1" />
              Product Log
            </TabsTrigger>
          </TabsList>

          <TabsContent value="details" className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <InfoField label="Product Name" value={product.name} />
              <InfoField label="Product Number (SKU)" value={product.sku || "-"} />
              <InfoField label="Category" value={getCategoryName(product.category_id)} />
              <div>
                <p className="text-xs text-muted-foreground mb-1">Status</p>
                <Badge variant={statusVariant}>{status}</Badge>
              </div>
              {canViewCostPrice && <InfoField label="Cost Price" value={formatCurrency(product.cost_price)} />}
              <InfoField label="Selling Price" value={formatCurrency(product.selling_price)} />
              <InfoField label="Stock Level" value={stockInfo.quantity.toString()} />
              <InfoField label="Low Stock Threshold" value={stockInfo.threshold.toString()} />
            </div>
          </TabsContent>

          <TabsContent value="log" className="flex-1 min-h-0 mt-2">
            {logLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : logEntries.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <History className="h-10 w-10 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No stock movements recorded yet.</p>
              </div>
            ) : (
              <ScrollArea className="h-[400px] pr-2">
                <div className="space-y-3">
                  {logEntries.map((entry) => {
                    const config = movementTypeConfig[entry.movement_type] || movementTypeConfig.adjustment;
                    const Icon = config.icon;
                    return (
                      <div key={entry.id} className="border rounded-lg p-3 space-y-1.5">
                        <div className="flex items-center justify-between gap-2">
                          <Badge variant={config.variant} className="text-xs flex items-center gap-1">
                            <Icon className="h-3 w-3" />
                            {config.label}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(entry.created_at), "MMM dd, yyyy · h:mm a")}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span>
                            Qty: <span className="font-medium">{entry.previous_quantity}</span>
                            {" → "}
                            <span className="font-medium">{entry.new_quantity}</span>
                            <span className="text-muted-foreground ml-1">
                              ({["out", "sale", "transfer_out", "damage"].includes(entry.movement_type) ? "-" : "+"}{entry.quantity})
                            </span>
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-muted-foreground">
                            By: <span className="font-medium text-foreground">{entry.performer}</span>
                          </span>
                        </div>
                        {entry.notes && (
                          <>
                            <Separator />
                            <p className="text-xs text-muted-foreground">{entry.notes}</p>
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

function InfoField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground mb-1">{label}</p>
      <p className="text-sm font-medium">{value}</p>
    </div>
  );
}
