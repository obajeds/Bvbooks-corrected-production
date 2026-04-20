import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, UserPlus, TrendingUp, ShoppingBag } from "lucide-react";
import { useCurrency } from "@/hooks/useCurrency";
import { cn } from "@/lib/utils";

interface CustomerData {
  totalCustomers: number;
  newCustomers: number;
  totalSpent: number;
  avgSpentPerCustomer: number;
  topCustomers?: Array<{
    name: string;
    orders: number;
    spent: number;
  }>;
}

interface CustomerInsightsCardProps {
  data: CustomerData;
  onClick?: () => void;
  className?: string;
}

export function CustomerInsightsCard({ data, onClick, className }: CustomerInsightsCardProps) {
  const { formatCurrency } = useCurrency();
  const { totalCustomers, newCustomers, totalSpent, avgSpentPerCustomer, topCustomers = [] } = data;

  const newCustomerPercent = totalCustomers > 0 ? Math.round((newCustomers / totalCustomers) * 100) : 0;

  return (
    <Card 
      className={cn(
        "transition-all duration-200 hover:shadow-md",
        onClick && "cursor-pointer hover:border-primary",
        className
      )}
      onClick={onClick}
    >
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
            <Users className="h-5 w-5 text-primary" />
            Customer Insights
          </CardTitle>
          {newCustomers > 0 && (
            <Badge variant="outline" className="text-xs bg-success/10 text-success border-success/30">
              <UserPlus className="h-3 w-3 mr-1" />
              +{newCustomers} new
            </Badge>
          )}
        </div>
        <CardDescription className="text-xs sm:text-sm">
          Customer activity and purchasing trends
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Key Metrics */}
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 rounded-lg bg-muted/50 text-center">
            <Users className="h-5 w-5 mx-auto mb-1 text-primary" />
            <p className="text-xl sm:text-2xl font-bold">{totalCustomers}</p>
            <p className="text-xs text-muted-foreground">Total Customers</p>
          </div>
          <div className="p-3 rounded-lg bg-muted/50 text-center">
            <ShoppingBag className="h-5 w-5 mx-auto mb-1 text-primary" />
            <p className="text-xl sm:text-2xl font-bold break-all">{formatCurrency(avgSpentPerCustomer)}</p>
            <p className="text-xs text-muted-foreground">Avg. per Customer</p>
          </div>
        </div>

        {/* New Customers Highlight */}
        {newCustomers > 0 && (
          <div className="p-3 rounded-lg bg-success/10 border border-success/20">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <UserPlus className="h-4 w-4 text-success" />
                <span className="text-sm font-medium">New Customers</span>
              </div>
              <div className="text-right">
                <span className="text-lg font-bold text-success">{newCustomers}</span>
                <span className="text-xs text-muted-foreground ml-1">({newCustomerPercent}%)</span>
              </div>
            </div>
          </div>
        )}

        {/* Top Customers */}
        {topCustomers.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Top Customers
            </p>
            <div className="space-y-2">
              {topCustomers.slice(0, 3).map((customer, index) => (
                <div 
                  key={index} 
                  className="flex items-center justify-between p-2 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <div className={cn(
                      "w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold",
                      index === 0 ? "bg-amber-500 text-white" : 
                      index === 1 ? "bg-gray-400 text-white" : 
                      "bg-amber-700 text-white"
                    )}>
                      {index + 1}
                    </div>
                    <div>
                      <p className="text-sm font-medium truncate max-w-[120px]">{customer.name}</p>
                      <p className="text-xs text-muted-foreground">{customer.orders} orders</p>
                    </div>
                  </div>
                  <p className="text-sm font-semibold text-primary break-all">
                    {formatCurrency(customer.spent)}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Total Revenue from Customers */}
        <div className="pt-2 border-t">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Total Customer Spend</span>
            <span className="text-lg font-bold break-all">{formatCurrency(totalSpent)}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
