import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { DollarSign, TrendingUp, TrendingDown, Package, Receipt } from "lucide-react";
import { DateRangeFilter } from "@/components/inventory/DateRangeFilter";
import { useAllBranchesOverview } from "@/hooks/useAllBranchesOverview";
import { useCurrency } from "@/hooks/useCurrency";
import { format, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from "date-fns";
import { cn } from "@/lib/utils";
import type { DateRange } from "react-day-picker";

type Period = "today" | "week" | "month" | "all_time" | "custom";

function computeDateRange(period: Period): { from: string; to: string } | undefined {
  const now = new Date();
  switch (period) {
    case "today":
      return { from: startOfDay(now).toISOString(), to: endOfDay(now).toISOString() };
    case "week":
      return { from: startOfWeek(now, { weekStartsOn: 1 }).toISOString(), to: endOfDay(now).toISOString() };
    case "month":
      return { from: startOfMonth(now).toISOString(), to: endOfDay(now).toISOString() };
    case "all_time":
      return undefined;
    default:
      return undefined;
  }
}

export function AdminBusinessOverview() {
  const [period, setPeriod] = useState<Period>("today");
  const [customRange, setCustomRange] = useState<DateRange | undefined>();
  const { formatCurrency } = useCurrency();

  const dateFilter = useMemo(() => {
    if (period === "custom" && customRange?.from) {
      return {
        from: startOfDay(customRange.from).toISOString(),
        to: endOfDay(customRange.to || customRange.from).toISOString(),
      };
    }
    return computeDateRange(period);
  }, [period, customRange]);

  const { data, isLoading } = useAllBranchesOverview(dateFilter);

  const periods: { label: string; value: Period }[] = [
    { label: "Today", value: "today" },
    { label: "This Week", value: "week" },
    { label: "This Month", value: "month" },
    { label: "All Time", value: "all_time" },
    { label: "Custom", value: "custom" },
  ];

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-24" />)}
        </div>
        <Skeleton className="h-40" />
      </div>
    );
  }

  const cards = [
    { label: "Total Sales", value: data?.totalSales ?? 0, icon: DollarSign, color: "text-emerald-500" },
    { label: "Total Expenses", value: data?.totalExpenses ?? 0, icon: Receipt, color: "text-orange-500" },
    { label: "Stock Value", value: data?.totalStockValue ?? 0, icon: Package, color: "text-blue-500" },
    { label: "Net Profit", value: data?.netProfit ?? 0, icon: (data?.netProfit ?? 0) >= 0 ? TrendingUp : TrendingDown, color: (data?.netProfit ?? 0) >= 0 ? "text-emerald-600" : "text-destructive" },
  ];

  return (
    <div className="space-y-4">
      {/* Period filter */}
      <div className="flex flex-wrap items-center gap-2">
        {periods.map(p => (
          <Button
            key={p.value}
            size="sm"
            variant={period === p.value ? "default" : "outline"}
            onClick={() => setPeriod(p.value)}
          >
            {p.label}
          </Button>
        ))}
        {period === "custom" && (
          <DateRangeFilter dateRange={customRange} onDateRangeChange={setCustomRange} />
        )}
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {cards.map(c => (
          <Card key={c.label}>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <c.icon className={cn("h-4 w-4", c.color)} />
                <span className="text-xs text-muted-foreground">{c.label}</span>
              </div>
              <p className="text-lg font-bold">{formatCurrency(c.value)}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Branch breakdown */}
      {data?.byBranch && data.byBranch.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Branch Breakdown</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Branch</TableHead>
                    <TableHead className="text-right">Sales</TableHead>
                    <TableHead className="text-right">Expenses</TableHead>
                    <TableHead className="text-right">Stock Value</TableHead>
                    <TableHead className="text-right">Profit</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.byBranch.map(b => (
                    <TableRow key={b.branchId}>
                      <TableCell className="font-medium">{b.branchName}</TableCell>
                      <TableCell className="text-right">{formatCurrency(b.sales)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(b.expenses)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(b.stockValue)}</TableCell>
                      <TableCell className={cn("text-right font-medium", b.profit >= 0 ? "text-emerald-600" : "text-destructive")}>
                        {formatCurrency(b.profit)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
