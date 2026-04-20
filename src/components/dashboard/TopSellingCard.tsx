import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, Crown, Medal, Award } from "lucide-react";
import { useCurrency } from "@/hooks/useCurrency";
import { cn } from "@/lib/utils";

interface TopSellingItem {
  name: string;
  quantity: number;
  revenue: number;
}

interface TopSellingCardProps {
  items: TopSellingItem[];
}

export function TopSellingCard({ items }: TopSellingCardProps) {
  const { formatCurrency, formatCompact } = useCurrency();

  const getRankIcon = (index: number) => {
    if (index === 0) return <Crown className="h-4 w-4 text-yellow-500" />;
    if (index === 1) return <Medal className="h-4 w-4 text-slate-400" />;
    if (index === 2) return <Award className="h-4 w-4 text-amber-600" />;
    return null;
  };

  const getRankBg = (index: number) => {
    if (index === 0) return "bg-yellow-500/10 border-yellow-500/20";
    if (index === 1) return "bg-slate-400/10 border-slate-400/20";
    if (index === 2) return "bg-amber-600/10 border-amber-600/20";
    return "bg-muted/50";
  };

  return (
    <Card className="border shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base font-semibold">
          <TrendingUp className="h-5 w-5 text-success" />
          Top Selling This Month
        </CardTitle>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground">
            <TrendingUp className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No sales data yet</p>
          </div>
        ) : (
          <div className="space-y-2">
            {items.slice(0, 5).map((item, index) => (
              <div 
                key={index} 
                className={cn(
                  "flex items-center justify-between p-3 rounded-lg border transition-colors",
                  getRankBg(index)
                )}
              >
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "h-8 w-8 rounded-full flex items-center justify-center text-sm font-bold",
                    index < 3 ? "bg-background" : "bg-muted"
                  )}>
                    {getRankIcon(index) || <span className="text-muted-foreground">{index + 1}</span>}
                  </div>
                  <div>
                    <p className="text-sm font-medium truncate max-w-[140px] sm:max-w-[180px]">
                      {item.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {item.quantity} units sold
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold">{formatCompact(item.revenue)}</p>
                  <Badge variant="secondary" className="text-xs">
                    Revenue
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
