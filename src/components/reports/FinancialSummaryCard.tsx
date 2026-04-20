import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DollarSign, TrendingUp, TrendingDown, Receipt, Wallet, ArrowRight, Tag } from "lucide-react";
import { useCurrency } from "@/hooks/useCurrency";
import { cn } from "@/lib/utils";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Legend,
  Tooltip,
} from "recharts";

interface FinancialData {
  totalRevenue: number;
  costOfGoods: number;
  grossProfit: number;
  totalExpenses: number;
  netProfit: number;
  totalDiscounts?: number;
}

interface FinancialSummaryCardProps {
  data: FinancialData;
  onClick?: () => void;
  className?: string;
}

export function FinancialSummaryCard({ data, onClick, className }: FinancialSummaryCardProps) {
  const { formatCurrency } = useCurrency();
  const { totalRevenue, costOfGoods, grossProfit, totalExpenses, netProfit, totalDiscounts = 0 } = data;

  const profitMargin = totalRevenue > 0 ? Math.round((netProfit / totalRevenue) * 100) : 0;
  const grossMargin = totalRevenue > 0 ? Math.round((grossProfit / totalRevenue) * 100) : 0;

  const isProfit = netProfit >= 0;

  const pieData = [
    { name: "Cost of Goods", value: Math.max(0, costOfGoods), color: "hsl(var(--muted-foreground))" },
    { name: "Expenses", value: Math.max(0, totalExpenses), color: "hsl(var(--destructive))" },
    { name: "Net Profit", value: Math.max(0, netProfit), color: "hsl(var(--success))" },
  ].filter(item => item.value > 0);

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="rounded-lg border bg-background p-2 shadow-lg">
          <p className="text-sm font-medium">{payload[0].name}</p>
          <p className="text-sm text-muted-foreground">
            {formatCurrency(payload[0].value)}
          </p>
        </div>
      );
    }
    return null;
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
            <DollarSign className="h-5 w-5 text-primary" />
            Financial Summary
          </CardTitle>
          <Badge 
            variant="outline" 
            className={cn(
              "text-xs",
              isProfit ? "bg-success/10 text-success border-success/30" : "bg-destructive/10 text-destructive border-destructive/30"
            )}
          >
            {isProfit ? <TrendingUp className="h-3 w-3 mr-1" /> : <TrendingDown className="h-3 w-3 mr-1" />}
            {profitMargin}% margin
          </Badge>
        </div>
        <CardDescription className="text-xs sm:text-sm">
          Profit & loss overview for the selected period
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Chart */}
        {totalRevenue > 0 && (
          <div className="h-40 sm:h-48">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={40}
                  outerRadius={60}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
                <Legend 
                  iconSize={8} 
                  wrapperStyle={{ fontSize: "10px" }} 
                  formatter={(value) => <span className="text-foreground">{value}</span>}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Flow Breakdown */}
        <div className="space-y-2">
          <div className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
            <div className="flex items-center gap-2">
              <Wallet className="h-4 w-4 text-primary" />
              <span className="text-sm">Total Revenue</span>
            </div>
            <span className="font-semibold break-all">{formatCurrency(totalRevenue)}</span>
           </div>

          {totalDiscounts > 0 && (
            <div className="flex items-center justify-between p-2 rounded-lg bg-warning/10">
              <div className="flex items-center gap-2">
                <Tag className="h-4 w-4 text-warning" />
                <span className="text-sm text-warning">Discounts Given</span>
              </div>
              <span className="text-warning font-medium break-all">-{formatCurrency(totalDiscounts)}</span>
            </div>
          )}

          <div className="flex items-center gap-2 justify-center text-muted-foreground">
             <ArrowRight className="h-4 w-4 rotate-90" />
          </div>

          <div className="flex items-center justify-between p-2 rounded-lg bg-muted/30">
            <div className="flex items-center gap-2">
              <Receipt className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Cost of Goods</span>
            </div>
            <span className="text-muted-foreground break-all">-{formatCurrency(costOfGoods)}</span>
          </div>

          <div className="flex items-center justify-between p-2 rounded-lg bg-muted/30">
            <div className="flex items-center gap-2">
              <Receipt className="h-4 w-4 text-destructive" />
              <span className="text-sm text-muted-foreground">Expenses</span>
            </div>
            <span className="text-destructive break-all">-{formatCurrency(totalExpenses)}</span>
          </div>

          <div className="flex items-center gap-2 justify-center text-muted-foreground">
            <ArrowRight className="h-4 w-4 rotate-90" />
          </div>

          <div className={cn(
            "flex items-center justify-between p-3 rounded-lg",
            isProfit ? "bg-success/10" : "bg-destructive/10"
          )}>
            <div className="flex items-center gap-2">
              {isProfit ? (
                <TrendingUp className="h-5 w-5 text-success" />
              ) : (
                <TrendingDown className="h-5 w-5 text-destructive" />
              )}
              <span className="font-medium">Net Profit</span>
            </div>
            <span className={cn(
              "text-lg font-bold break-all",
              isProfit ? "text-success" : "text-destructive"
            )}>
              {formatCurrency(netProfit)}
            </span>
          </div>
        </div>

        {/* Margins */}
        <div className="grid grid-cols-2 gap-2 pt-2 border-t">
          <div className="text-center">
            <p className="text-xs text-muted-foreground">Gross Margin</p>
            <p className="text-lg font-bold">{grossMargin}%</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-muted-foreground">Net Margin</p>
            <p className={cn("text-lg font-bold", isProfit ? "text-success" : "text-destructive")}>
              {profitMargin}%
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
