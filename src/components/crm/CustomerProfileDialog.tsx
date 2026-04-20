import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { 
  User, Phone, Mail, Calendar, ShoppingBag, Gift, 
  Wallet, Clock, Receipt, ChevronRight, Package
} from "lucide-react";
import { format } from "date-fns";
import { useCurrency } from "@/hooks/useCurrency";
import { useCustomerPurchaseHistory, type CustomerPurchase } from "@/hooks/useCustomerPurchaseHistory";
import type { Tables } from "@/integrations/supabase/types";

type Customer = Tables<"customers">;

interface CustomerProfileDialogProps {
  customer: Customer | null;
  groupName?: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CustomerProfileDialog({ 
  customer, 
  groupName,
  open, 
  onOpenChange 
}: CustomerProfileDialogProps) {
  const { formatCurrency } = useCurrency();
  const { data: purchaseHistory = [], isLoading } = useCustomerPurchaseHistory(
    open && customer ? customer.id : null
  );

  if (!customer) return null;

  const formatPaymentMethod = (method: string) => {
    const methods: Record<string, string> = {
      cash: "Cash",
      transfer: "Transfer",
      card: "Card",
      credit: "Credit",
    };
    return methods[method?.toLowerCase()] || method || "Cash";
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl h-[90vh] max-h-[800px] overflow-hidden flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Customer Profile
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="flex-1 min-h-0">
          <div className="space-y-6 px-6 py-4">
            {/* Customer Info Section */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center justify-between">
                  <span>{customer.name}</span>
                  {groupName && (
                    <Badge variant="outline">{groupName}</Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="flex items-center gap-3">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">Phone</p>
                      <p className="font-medium">{customer.phone || "Not provided"}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">Email</p>
                      <p className="font-medium">{customer.email || "Not provided"}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">Customer Since</p>
                      <p className="font-medium">
                        {format(new Date(customer.created_at), "MMM d, yyyy")}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">Last Purchase</p>
                      <p className="font-medium">
                        {customer.last_purchase_at 
                          ? format(new Date(customer.last_purchase_at), "MMM d, yyyy 'at' h:mm a")
                          : "No purchases yet"}
                      </p>
                    </div>
                  </div>
                </div>

                {customer.notes && (
                  <div className="pt-2 border-t">
                    <p className="text-xs text-muted-foreground mb-1">Notes</p>
                    <p className="text-sm">{customer.notes}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <Card className="p-3">
                <div className="flex items-center gap-2 mb-1">
                  <Wallet className="h-4 w-4 text-primary" />
                  <span className="text-xs text-muted-foreground">Total Spend</span>
                </div>
                <p className="text-lg font-bold">{formatCurrency(customer.total_purchases || 0)}</p>
              </Card>
              <Card className="p-3">
                <div className="flex items-center gap-2 mb-1">
                  <ShoppingBag className="h-4 w-4 text-primary" />
                  <span className="text-xs text-muted-foreground">Orders</span>
                </div>
                <p className="text-lg font-bold">{customer.total_orders || 0}</p>
              </Card>
              <Card className="p-3">
                <div className="flex items-center gap-2 mb-1">
                  <Gift className="h-4 w-4 text-primary" />
                  <span className="text-xs text-muted-foreground">Points</span>
                </div>
                <p className="text-lg font-bold">{customer.reward_points || 0}</p>
              </Card>
              <Card className="p-3">
                <div className="flex items-center gap-2 mb-1">
                  <Receipt className="h-4 w-4 text-primary" />
                  <span className="text-xs text-muted-foreground">Points Value</span>
                </div>
                <p className="text-lg font-bold">{formatCurrency(customer.reward_points_value || 0)}</p>
              </Card>
            </div>

            {/* Purchase History */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <ShoppingBag className="h-5 w-5" />
                  Purchase History
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="space-y-3">
                    <Skeleton className="h-16 w-full" />
                    <Skeleton className="h-16 w-full" />
                    <Skeleton className="h-16 w-full" />
                  </div>
                ) : purchaseHistory.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <ShoppingBag className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p>No purchase history found</p>
                  </div>
                ) : (
                  <Accordion type="single" collapsible className="space-y-2">
                    {purchaseHistory.map((purchase) => (
                      <AccordionItem 
                        key={purchase.id} 
                        value={purchase.id}
                        className="border rounded-lg px-3"
                      >
                        <AccordionTrigger className="hover:no-underline py-3">
                          <div className="flex items-center justify-between w-full pr-2">
                            <div className="flex items-center gap-3 text-left">
                              <div>
                                <p className="font-medium text-sm">
                                  {purchase.invoice_number}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {format(new Date(purchase.created_at), "MMM d, yyyy 'at' h:mm a")}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              <Badge variant="secondary" className="text-xs">
                                {formatPaymentMethod(purchase.payment_method)}
                              </Badge>
                              <span className="font-semibold text-sm">
                                {formatCurrency(purchase.total_amount)}
                              </span>
                            </div>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent>
                          <div className="pt-2 pb-3">
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead className="text-xs">Product</TableHead>
                                  <TableHead className="text-xs text-right">Qty</TableHead>
                                  <TableHead className="text-xs text-right">Price</TableHead>
                                  <TableHead className="text-xs text-right">Total</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {purchase.items.map((item) => (
                                  <TableRow key={item.id}>
                                    <TableCell className="text-sm py-2">
                                      <div className="flex items-center gap-2">
                                        <Package className="h-3 w-3 text-muted-foreground" />
                                        {item.product_name}
                                      </div>
                                    </TableCell>
                                    <TableCell className="text-sm text-right py-2">
                                      {item.quantity}
                                    </TableCell>
                                    <TableCell className="text-sm text-right py-2">
                                      {formatCurrency(item.unit_price)}
                                    </TableCell>
                                    <TableCell className="text-sm text-right py-2 font-medium">
                                      {formatCurrency(item.total_price)}
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                )}
              </CardContent>
            </Card>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
