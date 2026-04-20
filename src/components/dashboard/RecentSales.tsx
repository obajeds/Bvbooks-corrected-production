import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Loader2, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRecentSales } from "@/hooks/useDashboardStats";
import { formatDistanceToNow } from "date-fns";
import { useCurrency } from "@/hooks/useCurrency";
import { SaleDetailsDialog } from "@/components/sales/SaleDetailsDialog";

interface SaleItem {
  id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
}

interface Sale {
  id: string;
  invoice_number: string;
  customer?: { name: string } | null;
  total_amount: number;
  payment_method: string;
  created_at: string;
  sale_items?: SaleItem[];
  sold_by_name?: string;
}

export function RecentSales() {
  const { data: recentSales, isLoading } = useRecentSales(5);
  const { formatCurrency } = useCurrency();
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);

  const handleViewDetails = (sale: Sale) => {
    setSelectedSale(sale);
    setDetailsOpen(true);
  };

  return (
    <div className="rounded-lg border bg-card p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Recent Sales</h3>
        <Button variant="ghost" size="sm" asChild>
          <Link to="/dashboard/sales">
            View All <ArrowRight className="ml-1 h-4 w-4" />
          </Link>
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b text-left text-sm text-muted-foreground">
                <th className="pb-3 font-medium">Invoice</th>
                <th className="pb-3 font-medium">Customer</th>
                <th className="pb-3 font-medium">Sold By</th>
                <th className="pb-3 font-medium">Amount</th>
                <th className="pb-3 font-medium">Payment</th>
                <th className="pb-3 font-medium">Time</th>
                <th className="pb-3 font-medium text-right">Details</th>
              </tr>
            </thead>
            <tbody>
              {recentSales?.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-muted-foreground">
                    No recent sales
                  </td>
                </tr>
              ) : (
                recentSales?.map((sale) => (
                  <tr 
                    key={sale.id} 
                    className="border-b last:border-0 hover:bg-muted/50 cursor-pointer transition-colors"
                    onClick={() => handleViewDetails(sale as Sale)}
                  >
                    <td className="py-3 text-sm font-medium">{sale.invoice_number}</td>
                    <td className="py-3 text-sm">{sale.customer?.name || "Walk-in Customer"}</td>
                    <td className="py-3 text-sm">{sale.sold_by_name || "—"}</td>
                    <td className="py-3 text-sm">{formatCurrency(Number(sale.total_amount))}</td>
                    <td className="py-3">
                      <span className="inline-flex items-center rounded-full bg-secondary px-2 py-1 text-xs font-medium capitalize">
                        {sale.payment_method}
                      </span>
                    </td>
                    <td className="py-3 text-sm text-muted-foreground">
                      {formatDistanceToNow(new Date(sale.created_at), { addSuffix: true })}
                    </td>
                    <td className="py-3 text-right">
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleViewDetails(sale as Sale);
                        }}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      <SaleDetailsDialog
        sale={selectedSale}
        open={detailsOpen}
        onOpenChange={setDetailsOpen}
      />
    </div>
  );
}
