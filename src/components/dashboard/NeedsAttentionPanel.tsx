import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Package, AlertCircle, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";

interface NeedsAttentionPanelProps {
  stockAtRisk: number;
  totalStock: number;
  outOfStock: number;
  lowStock: number;
}

export function NeedsAttentionPanel({ 
  stockAtRisk, 
  totalStock, 
  outOfStock, 
  lowStock 
}: NeedsAttentionPanelProps) {
  const hasIssues = stockAtRisk > 0;

  return (
    <Card className={cn(
      "border shadow-sm",
      hasIssues && "border-warning/50 bg-warning/5"
    )}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-base font-semibold">
            <AlertTriangle className={cn(
              "h-5 w-5",
              hasIssues ? "text-warning" : "text-muted-foreground"
            )} />
            Needs Attention
          </div>
          {hasIssues && (
            <Badge variant="outline" className="bg-warning/10 text-warning border-warning/30">
              {stockAtRisk} items
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Stock at Risk Summary */}
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
              <p className="text-sm font-medium">Stock at Risk</p>
              <p className="text-xs text-muted-foreground">
                {stockAtRisk} of {totalStock} items
              </p>
            </div>
          </div>
          <Button variant="ghost" size="sm" asChild>
            <Link to="/inventory/stock">
              View stock control
              <ArrowRight className="ml-1 h-4 w-4" />
            </Link>
          </Button>
        </div>

        {/* Alerts Breakdown */}
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Alerts & Insights
          </p>
          
          {outOfStock > 0 && (
            <div className="flex items-center gap-3 p-3 rounded-lg border border-destructive/20 bg-destructive/5">
              <AlertCircle className="h-4 w-4 text-destructive flex-shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-medium text-destructive">
                  {outOfStock} item{outOfStock > 1 ? 's' : ''} out of stock
                </p>
              </div>
              <Button variant="ghost" size="sm" asChild className="text-destructive hover:text-destructive">
                <Link to="/inventory/stock?filter=out_of_stock">View</Link>
              </Button>
            </div>
          )}

          {lowStock > 0 && (
            <div className="flex items-center gap-3 p-3 rounded-lg border border-warning/20 bg-warning/5">
              <AlertTriangle className="h-4 w-4 text-warning flex-shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-medium text-warning">
                  {lowStock} item{lowStock > 1 ? 's' : ''} running low
                </p>
              </div>
              <Button variant="ghost" size="sm" asChild className="text-warning hover:text-warning">
                <Link to="/inventory/stock?filter=low_stock">View</Link>
              </Button>
            </div>
          )}

          {!hasIssues && (
            <div className="flex items-center gap-3 p-3 rounded-lg border border-success/20 bg-success/5">
              <Package className="h-4 w-4 text-success flex-shrink-0" />
              <p className="text-sm font-medium text-success">All stock levels healthy</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
