import { useState, useMemo } from "react";
import { format, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, isWithinInterval, parseISO } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, Calendar as CalendarIcon, Banknote, Smartphone, CreditCard } from "lucide-react";
import { ReportExportButton } from "@/components/reports/ReportExportButton";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { useSales } from "@/hooks/useSales";
import { useExpenses } from "@/hooks/useExpenses";
import { useProducts } from "@/hooks/useProducts";
import { useCurrency } from "@/hooks/useCurrency";
import { useBusinessPlan } from "@/hooks/useFeatureGating";
import { UpgradeRequired } from "@/components/subscription/UpgradeRequired";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { useBusiness } from "@/hooks/useBusiness";
import { useBranchContext } from "@/contexts/BranchContext";

type PeriodFilter = "daily" | "weekly" | "monthly" | "custom";

const Accounting = () => {
  const { data: planInfo, isLoading: planLoading } = useBusinessPlan();
  const { user } = useAuth();
  const { data: business } = useBusiness();
  const { currentBranch } = useBranchContext();
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>("daily");
  const [customDate, setCustomDate] = useState<Date>(new Date());
  
  const { data: sales = [], isLoading: salesLoading } = useSales({ branchId: currentBranch?.id });
  const { data: expenses = [], isLoading: expensesLoading } = useExpenses(undefined, currentBranch?.id);
  const { data: products = [], isLoading: productsLoading } = useProducts();
  const { formatCurrency } = useCurrency();

  // Calculate date range based on filter
  const dateRange = useMemo(() => {
    const now = customDate;
    switch (periodFilter) {
      case "daily":
        return { from: startOfDay(now), to: endOfDay(now) };
      case "weekly":
        return { from: startOfWeek(now, { weekStartsOn: 1 }), to: endOfWeek(now, { weekStartsOn: 1 }) };
      case "monthly":
        return { from: startOfMonth(now), to: endOfMonth(now) };
      case "custom":
        return { from: startOfDay(now), to: endOfDay(now) };
      default:
        return { from: startOfDay(now), to: endOfDay(now) };
    }
  }, [periodFilter, customDate]);

  // Filter sales by date range
  const filteredSales = useMemo(() => {
    return sales.filter(sale => {
      const saleDate = parseISO(sale.created_at);
      return isWithinInterval(saleDate, { start: dateRange.from, end: dateRange.to });
    });
  }, [sales, dateRange]);

  // Filter expenses by date range
  const filteredExpenses = useMemo(() => {
    return expenses.filter(expense => {
      const expenseDate = parseISO(expense.expense_date);
      return isWithinInterval(expenseDate, { start: dateRange.from, end: dateRange.to });
    });
  }, [expenses, dateRange]);

  // Calculate payment breakdown
  const paymentBreakdown = useMemo(() => {
    const breakdown = { cash: 0, transfer: 0, card: 0 };
    
    filteredSales.forEach(sale => {
      const amount = Number(sale.total_amount) || 0;
      const method = sale.payment_method?.toLowerCase() || 'cash';
      
      // Handle split payments
      if (method.includes(':')) {
        const parts = method.split(',');
        parts.forEach(part => {
          const [type, amountStr] = part.split(':');
          const partAmount = parseFloat(amountStr) || 0;
          const normalizedType = type.trim().toLowerCase();
          if (normalizedType === 'cash') breakdown.cash += partAmount;
          else if (normalizedType === 'transfer') breakdown.transfer += partAmount;
          else if (normalizedType === 'card' || normalizedType === 'pos') breakdown.card += partAmount;
        });
      } else {
        if (method.includes('cash')) breakdown.cash += amount;
        else if (method.includes('transfer')) breakdown.transfer += amount;
        else if (method.includes('card') || method.includes('pos')) breakdown.card += amount;
        else breakdown.cash += amount; // Default to cash
      }
    });
    
    return breakdown;
  }, [filteredSales]);

  // Revenue = sum of filtered sales
  const totalRevenue = filteredSales.reduce((sum, s) => sum + Number(s.total_amount), 0);
  
  // COGS = sum of (quantity × cost_price) for filtered sale items
  // Prefer cost_price recorded at time of sale for accuracy
  const totalCOGS = filteredSales.reduce((sum, sale) => {
    const saleCost = (sale.sale_items || []).reduce((itemSum, item: any) => {
      const recordedCost = item.cost_price != null ? Number(item.cost_price) : 0;
      let unitCost: number;
      if (recordedCost > 0) {
        unitCost = recordedCost;
      } else {
        // Fallback for old sales without recorded cost_price
        const product = products.find(p => p.id === item.product_id);
        unitCost = product ? Number(product.cost_price) || 0 : 0;
      }
      return itemSum + (unitCost * Number(item.quantity || 0));
    }, 0);
    return sum + saleCost;
  }, 0);
  
  // Gross Profit = Revenue - COGS
  const grossProfit = totalRevenue - totalCOGS;
  
  // Operating Expenses (filtered)
  const totalExpenses = filteredExpenses.reduce((sum, e) => sum + Number(e.amount), 0);
  
  // Net Profit = Gross Profit - Expenses
  const netProfit = grossProfit - totalExpenses;
  
  // Gross margin percentage
  const grossMargin = totalRevenue > 0 ? ((grossProfit / totalRevenue) * 100).toFixed(1) : "0";

  // Combine sales and expenses into transactions list
  const transactions = [
    ...filteredSales.map((s) => ({
      id: s.id,
      date: s.created_at,
      description: `Sale - ${s.invoice_number}`,
      type: "income" as const,
      amount: Number(s.total_amount),
      category: "Sales",
      paymentMethod: s.payment_method,
    })),
    ...filteredExpenses.map((e) => ({
      id: e.id,
      date: e.expense_date,
      description: e.description,
      type: "expense" as const,
      amount: Number(e.amount),
      category: "Expense",
      paymentMethod: null,
    })),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const isLoading = salesLoading || expensesLoading || productsLoading;

  const isOwner = !!user && !!business && business.owner_user_id === user.id;

  // Get period label for display
  const getPeriodLabel = () => {
    switch (periodFilter) {
      case "daily":
        return format(customDate, "MMMM dd, yyyy");
      case "weekly":
        return `${format(dateRange.from, "MMM dd")} - ${format(dateRange.to, "MMM dd, yyyy")}`;
      case "monthly":
        return format(customDate, "MMMM yyyy");
      case "custom":
        return format(customDate, "MMMM dd, yyyy");
      default:
        return "";
    }
  };

  const exportData = {
    headers: ["Date", "Description", "Category", "Type", "Amount"],
    rows: transactions.map(tx => [
      format(parseISO(tx.date), "MMM dd, yyyy hh:mm a"),
      tx.description,
      tx.category,
      tx.type,
      tx.type === "income" ? tx.amount : -tx.amount,
    ]),
    title: `Accounting Report - ${getPeriodLabel()}`,
  };

  if (isLoading || planLoading) {
    return (
      <main className="flex-1 overflow-y-auto p-6 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </main>
    );
  }

  // Gate for Free plan users
  if (planInfo?.effectivePlan === 'free') {
    return <UpgradeRequired featureKey="accounting.profit_loss" requiredPlan="professional" />;
  }

  return (
    <main className="flex-1 overflow-y-auto p-6 space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Accounting</h1>
          <p className="text-muted-foreground">{currentBranch?.name || "All Branches"} • Financial overview for {getPeriodLabel()}</p>
        </div>
        
        {/* Period Filters */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center bg-muted rounded-lg p-1">
            <Button
              variant={periodFilter === "daily" ? "default" : "ghost"}
              size="sm"
              onClick={() => setPeriodFilter("daily")}
            >
              Daily
            </Button>
            <Button
              variant={periodFilter === "weekly" ? "default" : "ghost"}
              size="sm"
              onClick={() => setPeriodFilter("weekly")}
            >
              Weekly
            </Button>
            <Button
              variant={periodFilter === "monthly" ? "default" : "ghost"}
              size="sm"
              onClick={() => setPeriodFilter("monthly")}
            >
              Monthly
            </Button>
          </div>
          
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2">
                <CalendarIcon className="h-4 w-4" />
                {format(customDate, "MMM dd, yyyy")}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <Calendar
                mode="single"
                selected={customDate}
                onSelect={(date) => date && setCustomDate(date)}
                initialFocus
              />
            </PopoverContent>
          </Popover>
          {isOwner && (
            <ReportExportButton data={exportData} filename={`accounting-${format(customDate, "yyyy-MM-dd")}`} />
          )}
        </div>
      </div>

      {/* Payment Breakdown Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium">
              <Banknote className="h-4 w-4 text-green-600" />
              Cash
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-green-600">{formatCurrency(paymentBreakdown.cash)}</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium">
              <Smartphone className="h-4 w-4 text-purple-600" />
              Transfer
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-purple-600">{formatCurrency(paymentBreakdown.transfer)}</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium">
              <CreditCard className="h-4 w-4 text-blue-600" />
              Card
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-blue-600">{formatCurrency(paymentBreakdown.card)}</p>
          </CardContent>
        </Card>
        
        <Card className="border-2 border-primary/20 bg-primary/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Sales</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-primary">{formatCurrency(totalRevenue)}</p>
            <p className="text-xs text-muted-foreground mt-1">{filteredSales.length} transactions</p>
          </CardContent>
        </Card>
      </div>

      {/* Profit Breakdown Cards */}
      <div className="grid gap-4 md:grid-cols-5">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-primary">{formatCurrency(totalRevenue)}</p>
            <p className="text-xs text-muted-foreground mt-1">Total sales income</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Cost of Goods</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-orange-500">{formatCurrency(totalCOGS)}</p>
            <p className="text-xs text-muted-foreground mt-1">Purchase cost of items sold</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Gross Profit</CardTitle>
          </CardHeader>
          <CardContent>
            <p className={`text-2xl font-bold ${grossProfit >= 0 ? "text-green-500" : "text-red-500"}`}>
              {formatCurrency(grossProfit)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">{grossMargin}% margin</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Expenses</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-red-500">{formatCurrency(totalExpenses)}</p>
            <p className="text-xs text-muted-foreground mt-1">Operating expenses</p>
          </CardContent>
        </Card>
        
        <Card className="border-2 border-primary/20 bg-primary/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Net Profit</CardTitle>
          </CardHeader>
          <CardContent>
            <p className={`text-2xl font-bold ${netProfit >= 0 ? "text-green-600" : "text-red-600"}`}>
              {formatCurrency(netProfit)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">Gross Profit − Expenses</p>
          </CardContent>
        </Card>
      </div>

      {/* Profit Calculation Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Profit Calculation</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between py-2 border-b">
              <span>Revenue (Total Sales)</span>
              <span className="font-medium">{formatCurrency(totalRevenue)}</span>
            </div>
            <div className="flex justify-between py-2 border-b text-orange-600">
              <span>− Cost of Goods Sold (COGS)</span>
              <span className="font-medium">({formatCurrency(totalCOGS)})</span>
            </div>
            <div className="flex justify-between py-2 border-b font-medium">
              <span>= Gross Profit</span>
              <span className={grossProfit >= 0 ? "text-green-600" : "text-red-600"}>
                {formatCurrency(grossProfit)}
              </span>
            </div>
            <div className="flex justify-between py-2 border-b text-red-600">
              <span>− Operating Expenses</span>
              <span className="font-medium">({formatCurrency(totalExpenses)})</span>
            </div>
            <div className="flex justify-between py-3 bg-muted/50 px-3 rounded-lg font-bold text-base">
              <span>= Net Profit</span>
              <span className={netProfit >= 0 ? "text-green-600" : "text-red-600"}>
                {formatCurrency(netProfit)}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Transactions</CardTitle>
        </CardHeader>
        <CardContent>
          {transactions.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <p>No transactions found for {getPeriodLabel()}.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions.map((tx) => (
                  <TableRow key={tx.id}>
                    <TableCell>{format(parseISO(tx.date), "MMM dd, hh:mm a")}</TableCell>
                    <TableCell className="font-medium">{tx.description}</TableCell>
                    <TableCell>{tx.category}</TableCell>
                    <TableCell>
                      <Badge className={cn(
                        tx.type === "income" ? "bg-green-500" : "bg-red-500"
                      )}>{tx.type}</Badge>
                    </TableCell>
                    <TableCell className={cn(
                      "text-right font-medium",
                      tx.type === "income" ? "text-green-600" : "text-red-600"
                    )}>
                      {tx.type === "income" ? "+" : "-"}{formatCurrency(tx.amount)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </main>
  );
};

export default Accounting;
