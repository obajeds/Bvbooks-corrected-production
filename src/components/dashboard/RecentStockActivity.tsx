import { Link } from "react-router-dom";
import { ArrowRight, ArrowUpCircle, ArrowDownCircle, RefreshCw, Loader2, ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useRecentStockMovements } from "@/hooks/useStockMovements";
import { formatDistanceToNow } from "date-fns";

const typeConfig = {
  in: { icon: ArrowUpCircle, label: "Stock In", className: "text-success" },
  out: { icon: ArrowDownCircle, label: "Stock Out", className: "text-danger" },
  sale: { icon: ShoppingCart, label: "Sale", className: "text-danger" },
  adjustment: { icon: RefreshCw, label: "Adjustment", className: "text-warning" },
};

export function RecentStockActivity() {
  const { data: stockActivities, isLoading } = useRecentStockMovements(5);

  return (
    <div className="rounded-lg border bg-card p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Recent Stock Activity</h3>
        <Button variant="ghost" size="sm" asChild>
          <Link to="/inventory">
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
                <th className="pb-3 font-medium">Product</th>
                <th className="pb-3 font-medium">Type</th>
                <th className="pb-3 font-medium">Quantity</th>
                <th className="pb-3 font-medium">Time</th>
              </tr>
            </thead>
            <tbody>
              {stockActivities?.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-muted-foreground">
                    No recent activity
                  </td>
                </tr>
              ) : (
                stockActivities?.map((activity) => {
                  const type = activity.type as keyof typeof typeConfig;
                  const config = typeConfig[type] || typeConfig.adjustment;
                  const Icon = config.icon;
                  return (
                    <tr key={activity.id} className="border-b last:border-0">
                      <td className="py-3 text-sm font-medium">
                        {activity.product?.name || "Unknown"}
                      </td>
                      <td className="py-3">
                        <span className={cn("inline-flex items-center gap-1 text-sm", config.className)}>
                          <Icon className="h-4 w-4" />
                          {config.label}
                        </span>
                      </td>
                      <td className={`py-3 text-sm font-medium ${type === "out" ? "text-red-600" : "text-green-600"}`}>
                        {type === "out" ? `-${Math.abs(activity.quantity)}` : `+${Math.abs(activity.quantity)}`}
                      </td>
                      <td className="py-3 text-sm text-muted-foreground">
                        {formatDistanceToNow(new Date(activity.created_at), { addSuffix: true })}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
