import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Receipt, User, CreditCard, Calendar, Package, UserCheck, Printer } from "lucide-react";
import { useCurrency } from "@/hooks/useCurrency";
import { useBusiness } from "@/hooks/useBusiness";
import { printInvoice } from "./InvoicePrint";
import { format } from "date-fns";

interface SaleItem {
  id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  discount?: number;
}

interface SaleDetails {
  id: string;
  invoice_number: string;
  customer?: { name: string } | null;
  subtotal?: number;
  discount_amount?: number;
  discount_type?: string | null;
  discount_reason?: string | null;
  tax_amount?: number;
  total_amount: number;
  payment_method: string;
  payment_status?: string;
  created_at: string;
  created_by?: string | null;
  sale_items?: SaleItem[];
  sold_by_name?: string;
}

interface SaleDetailsDialogProps {
  sale: SaleDetails | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SaleDetailsDialog({ sale, open, onOpenChange }: SaleDetailsDialogProps) {
  const { formatCurrency } = useCurrency();
  const { data: business } = useBusiness();

  const handleReprintReceipt = () => {
    if (!sale) return;
    
    const saleForPrint = {
      ...sale,
      subtotal: Number(sale.subtotal) || Number(sale.total_amount),
      discount_amount: Number(sale.discount_amount) || 0,
      tax_amount: Number(sale.tax_amount) || 0,
    };
    
    printInvoice(saleForPrint as any, {
      businessName: business?.trading_name || business?.legal_name,
      businessAddress: business?.address || undefined,
      businessPhone: business?.phone || undefined,
      businessLogo: business?.logo_url,
      cashierName: sale.sold_by_name,
    });
  };

  if (!sale) return null;

  const items = sale.sale_items || [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5" />
            Sale Details
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Sale Summary */}
          <div className="grid grid-cols-2 gap-4 p-4 bg-muted rounded-lg">
            <div className="flex items-center gap-2">
              <Receipt className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Invoice</p>
                <p className="font-medium">{sale.invoice_number}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Customer</p>
                <p className="font-medium">{sale.customer?.name || "Walk-in"}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Payment</p>
                <Badge variant="secondary" className="capitalize">{sale.payment_method}</Badge>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Date</p>
                <p className="font-medium text-sm">{format(new Date(sale.created_at), "MMM d, yyyy h:mm a")}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 col-span-2">
              <UserCheck className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Sold By</p>
                <p className="font-medium">{sale.sold_by_name || "Unknown"}</p>
              </div>
            </div>
          </div>

          <Separator />

          {/* Items List */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Package className="h-4 w-4 text-muted-foreground" />
              <h4 className="font-medium">Items Sold ({items.length})</h4>
            </div>

            {items.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No item details available
              </p>
            ) : (
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="w-[40%]">Product</TableHead>
                      <TableHead className="text-center">Qty</TableHead>
                      <TableHead className="text-right">Price</TableHead>
                      {items.some(i => Number(i.discount) > 0) && (
                        <TableHead className="text-right">Disc.</TableHead>
                      )}
                      <TableHead className="text-right">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium text-sm">
                          <span className="line-clamp-2">{item.product_name}</span>
                        </TableCell>
                        <TableCell className="text-center">{item.quantity}</TableCell>
                        <TableCell className="text-right text-sm">
                          {formatCurrency(Number(item.unit_price))}
                        </TableCell>
                        {items.some(i => Number(i.discount) > 0) && (
                          <TableCell className="text-right text-sm text-destructive">
                            {Number(item.discount) > 0 ? `-${formatCurrency(Number(item.discount))}` : '—'}
                          </TableCell>
                        )}
                        <TableCell className="text-right font-medium">
                          {formatCurrency(Number(item.total_price))}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>

          <Separator />

          {/* Totals Breakdown */}
          <div className="space-y-2 p-4 bg-primary/10 rounded-lg">
            {Number(sale.discount_amount) > 0 && (
              <>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>{formatCurrency(Number(sale.subtotal) || (Number(sale.total_amount) + Number(sale.discount_amount)))}</span>
                </div>
                <div className="flex justify-between text-sm text-destructive">
                  <span className="flex items-center gap-1">
                    Discount
                    {sale.discount_reason && (
                      <Badge variant="outline" className="text-[10px] px-1 py-0 font-normal">{sale.discount_reason}</Badge>
                    )}
                  </span>
                  <span>-{formatCurrency(Number(sale.discount_amount))}</span>
                </div>
              </>
            )}
            {Number(sale.tax_amount) > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Tax</span>
                <span>{formatCurrency(Number(sale.tax_amount))}</span>
              </div>
            )}
            <div className="flex justify-between items-center pt-1 border-t border-primary/20">
              <span className="font-medium">Total Amount</span>
              <span className="text-xl font-bold text-primary">
                {formatCurrency(Number(sale.total_amount))}
              </span>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button onClick={handleReprintReceipt} className="w-full sm:w-auto">
            <Printer className="h-4 w-4 mr-2" />
            Reprint Receipt
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
