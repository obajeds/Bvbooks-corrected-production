import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Package, AlertCircle, AlertTriangle, TrendingDown, ArrowRight, CheckCircle } from "lucide-react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";

interface StockAlertItem {
  name: string;
  quantity: number;
  threshold: number;
}

interface StockAlertsPanelProps {
  outOfStockItems: StockAlertItem[];
  lowStockItems: StockAlertItem[];
  atRiskItems: StockAlertItem[];
  totalStock: number;
}

type AlertCategory = 'out_of_stock' | 'low_stock' | 'at_risk';

const alertConfig: Record<AlertCategory, {
  icon: React.ElementType;
  label: string;
  description: string;
  bgColor: string;
  borderColor: string;
  textColor: string;
  iconColor: string;
  filter: string;
}> = {
  out_of_stock: {
    icon: AlertCircle,
    label: "Out of Stock",
    description: "Need immediate restocking",
    bgColor: "bg-destructive/5",
    borderColor: "border-destructive/20",
    textColor: "text-destructive",
    iconColor: "text-destructive",
    filter: "out_of_stock"
  },
  low_stock: {
    icon: AlertTriangle,
    label: "Running Low",
    description: "Below reorder level",
    bgColor: "bg-warning/5",
    borderColor: "border-warning/20",
    textColor: "text-warning",
    iconColor: "text-warning",
    filter: "low_stock"
  },
  at_risk: {
    icon: TrendingDown,
    label: "At Risk",
    description: "Approaching reorder level",
    bgColor: "bg-orange-500/5",
    borderColor: "border-orange-500/20",
    textColor: "text-orange-600",
    iconColor: "text-orange-500",
    filter: "at_risk"
  }
};

function AlertCategoryRow({ 
  category, 
  count 
}: { 
  category: AlertCategory; 
  count: number;
}) {
  const config = alertConfig[category];
  const Icon = config.icon;

  if (count === 0) return null;

  return (
    <div className={cn(
      "flex items-center justify-between p-3 rounded-lg border",
      config.bgColor,
      config.borderColor
    )}>
      <div className="flex items-center gap-3">
        <Icon className={cn("h-4 w-4 flex-shrink-0", config.iconColor)} />
        <div>
          <p className={cn("text-sm font-medium", config.textColor)}>
            {count} item{count > 1 ? 's' : ''} {config.label.toLowerCase()}
          </p>
          <p className="text-xs text-muted-foreground">{config.description}</p>
        </div>
      </div>
      <Button variant="ghost" size="sm" asChild className={cn(config.textColor, `hover:${config.textColor}`)}>
        <Link to={`/inventory/stock?filter=${config.filter}`}>View</Link>
      </Button>
    </div>
  );
}

export function StockAlertsPanel({ 
  outOfStockItems, 
  lowStockItems, 
  atRiskItems,
  totalStock 
}: StockAlertsPanelProps) {
  const outOfStockCount = outOfStockItems.length;
  const lowStockCount = lowStockItems.length;
  const atRiskCount = atRiskItems.length;
  const totalAlerts = outOfStockCount + lowStockCount + atRiskCount;
  const hasIssues = totalAlerts > 0;

  return (
    <Card className={cn(
      "border shadow-sm",
      hasIssues && "border-warning/50 bg-warning/5"
    )}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-base font-semibold">
            <Package className={cn(
              "h-5 w-5",
              hasIssues ? "text-warning" : "text-muted-foreground"
            )} />
            Stock Alerts
          </div>
          <div className="flex items-center gap-2">
            {hasIssues && (
              <Badge variant="outline" className="bg-warning/10 text-warning border-warning/30">
                {totalAlerts} alert{totalAlerts > 1 ? 's' : ''}
              </Badge>
            )}
            <Button variant="ghost" size="sm" asChild>
              <Link to="/inventory/stock">
                View all stock
                <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Summary Bar */}
        <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
          <div className="flex items-center gap-3">
            <div className={cn(
              "h-10 w-10 rounded-full flex items-center justify-center",
              hasIssues ? "bg-warning/20" : "bg-success/20"
            )}>
              <Package className={cn(
                "h-5 w-5",
                hasIssues ? "text-warning" : "text-success"
              )} />
            </div>
            <div>
              <p className="text-sm font-medium">Stock Overview</p>
              <p className="text-xs text-muted-foreground">
                {totalAlerts} of {totalStock} items need attention
              </p>
            </div>
          </div>
        </div>

        {/* Alert Categories */}
        <div className="space-y-2">
          <AlertCategoryRow category="out_of_stock" count={outOfStockCount} />
          <AlertCategoryRow category="low_stock" count={lowStockCount} />
          <AlertCategoryRow category="at_risk" count={atRiskCount} />

          {!hasIssues && (
            <div className="flex items-center gap-3 p-3 rounded-lg border border-success/20 bg-success/5">
              <CheckCircle className="h-4 w-4 text-success flex-shrink-0" />
              <p className="text-sm font-medium text-success">All stock levels healthy</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
