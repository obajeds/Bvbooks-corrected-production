import { Card, CardContent } from "@/components/ui/card";
import { TrendingUp, TrendingDown, Minus, ShoppingCart, DollarSign } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCurrency } from "@/hooks/useCurrency";

interface TodaysProfitCardProps {
  value: number;
  trend: 'up' | 'down' | 'stable';
  mode: 'profit' | 'sales';
}

export function TodaysProfitCard({ value, trend, mode }: TodaysProfitCardProps) {
  const { formatCurrency } = useCurrency();

  const trendConfig = {
    up: {
      icon: TrendingUp,
      label: "Trending up",
      color: "text-success",
    },
    down: {
      icon: TrendingDown,
      label: "Trending down",
      color: "text-destructive",
    },
    stable: {
      icon: Minus,
      label: "Stable",
      color: "text-muted-foreground",
    }
  };

  const modeConfig = {
    profit: {
      title: "Today's Profit",
      icon: DollarSign,
    },
    sales: {
      title: "Today's Sales",
      icon: ShoppingCart,
    }
  };

  const tConfig = trendConfig[trend];
  const mConfig = modeConfig[mode];
  const TrendIcon = tConfig.icon;

  return (
    <Card className="bg-primary text-primary-foreground border-0 shadow-lg overflow-hidden">
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-sm text-primary-foreground/80">{mConfig.title}</p>
            <p className="text-3xl sm:text-4xl font-bold tracking-tight break-all">
              {formatCurrency(value)}
            </p>
          </div>
          <div className={cn(
            "flex items-center gap-2 px-3 py-2 rounded-full",
            "bg-primary-foreground/10"
          )}>
            <TrendIcon className={cn("h-5 w-5", tConfig.color)} />
            <span className="text-sm font-medium capitalize hidden sm:inline">
              {tConfig.label}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
