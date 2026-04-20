import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Package, AlertTriangle, XCircle, CheckCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface InventoryHealthData {
  total: number;
  inStock: number;
  lowStock: number;
  outOfStock: number;
}

interface InventoryHealthCardProps {
  data: InventoryHealthData;
  onClick?: () => void;
  className?: string;
}

export function InventoryHealthCard({ data, onClick, className }: InventoryHealthCardProps) {
  const { total, inStock, lowStock, outOfStock } = data;
  
  const inStockPercent = total > 0 ? (inStock / total) * 100 : 0;
  const lowStockPercent = total > 0 ? (lowStock / total) * 100 : 0;
  const outOfStockPercent = total > 0 ? (outOfStock / total) * 100 : 0;

  const healthScore = total > 0 
    ? Math.round(((inStock * 1) + (lowStock * 0.5) + (outOfStock * 0)) / total * 100)
    : 100;

  const healthStatus = healthScore >= 80 ? "good" : healthScore >= 50 ? "fair" : "critical";

  const statusConfig = {
    good: { color: "text-success", bg: "bg-success/10", label: "Healthy" },
    fair: { color: "text-warning", bg: "bg-warning/10", label: "Needs Attention" },
    critical: { color: "text-destructive", bg: "bg-destructive/10", label: "Critical" },
  };

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
            <Package className="h-5 w-5 text-primary" />
            Inventory Health
          </CardTitle>
          <Badge 
            variant="outline" 
            className={cn("text-xs", statusConfig[healthStatus].color, statusConfig[healthStatus].bg)}
          >
            {statusConfig[healthStatus].label}
          </Badge>
        </div>
        <CardDescription className="text-xs sm:text-sm">
          {total} total items across all categories
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Health Score */}
        <div className="flex items-center gap-4">
          <div className={cn(
            "w-16 h-16 rounded-full flex items-center justify-center text-xl font-bold",
            statusConfig[healthStatus].bg,
            statusConfig[healthStatus].color
          )}>
            {healthScore}%
          </div>
          <div className="flex-1">
            <div className="h-3 rounded-full bg-muted overflow-hidden flex">
              <div 
                className="bg-success transition-all duration-500" 
                style={{ width: `${inStockPercent}%` }} 
              />
              <div 
                className="bg-warning transition-all duration-500" 
                style={{ width: `${lowStockPercent}%` }} 
              />
              <div 
                className="bg-destructive transition-all duration-500" 
                style={{ width: `${outOfStockPercent}%` }} 
              />
            </div>
          </div>
        </div>

        {/* Status Breakdown */}
        <div className="grid grid-cols-3 gap-2 sm:gap-4">
          <div className="p-2 sm:p-3 rounded-lg bg-success/10 text-center">
            <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5 mx-auto mb-1 text-success" />
            <p className="text-lg sm:text-xl font-bold text-success">{inStock}</p>
            <p className="text-[10px] sm:text-xs text-muted-foreground">In Stock</p>
          </div>
          <div className={cn(
            "p-2 sm:p-3 rounded-lg text-center",
            lowStock > 0 ? "bg-warning/10" : "bg-muted/50"
          )}>
            <AlertTriangle className={cn(
              "h-4 w-4 sm:h-5 sm:w-5 mx-auto mb-1",
              lowStock > 0 ? "text-warning" : "text-muted-foreground"
            )} />
            <p className={cn(
              "text-lg sm:text-xl font-bold",
              lowStock > 0 ? "text-warning" : "text-muted-foreground"
            )}>{lowStock}</p>
            <p className="text-[10px] sm:text-xs text-muted-foreground">Low Stock</p>
          </div>
          <div className={cn(
            "p-2 sm:p-3 rounded-lg text-center",
            outOfStock > 0 ? "bg-destructive/10" : "bg-muted/50"
          )}>
            <XCircle className={cn(
              "h-4 w-4 sm:h-5 sm:w-5 mx-auto mb-1",
              outOfStock > 0 ? "text-destructive" : "text-muted-foreground"
            )} />
            <p className={cn(
              "text-lg sm:text-xl font-bold",
              outOfStock > 0 ? "text-destructive" : "text-muted-foreground"
            )}>{outOfStock}</p>
            <p className="text-[10px] sm:text-xs text-muted-foreground">Out of Stock</p>
          </div>
        </div>

        {/* Alerts */}
        {(lowStock > 0 || outOfStock > 0) && (
          <div className="p-2 sm:p-3 rounded-lg bg-muted/50 space-y-1">
            {outOfStock > 0 && (
              <p className="text-xs sm:text-sm text-destructive flex items-center gap-2">
                <XCircle className="h-3 w-3 sm:h-4 sm:w-4" />
                {outOfStock} items need immediate restocking
              </p>
            )}
            {lowStock > 0 && (
              <p className="text-xs sm:text-sm text-warning flex items-center gap-2">
                <AlertTriangle className="h-3 w-3 sm:h-4 sm:w-4" />
                {lowStock} items running low on stock
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
