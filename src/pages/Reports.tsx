import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { 
  BarChart3, TrendingUp, Package, Users, Calendar as CalendarIcon, DollarSign, 
  ShoppingCart, ArrowUp, ArrowDown, Loader2, Lock, Crown, X, Banknote, 
  Smartphone, CreditCard, FileText, Activity, Sparkles
} from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { useSales } from "@/hooks/useSales";
import { useProducts } from "@/hooks/useProducts";
import { useCustomers } from "@/hooks/useCustomers";
import { useExpenses } from "@/hooks/useExpenses";
import { useUserRole } from "@/hooks/useUserRole";
import { useBusinessPlan } from "@/hooks/useFeatureGating";
import { format, subDays, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear } from "date-fns";
import { useSubscriptionNavigation } from "@/hooks/useSubscriptionNavigation";
import { useCurrency } from "@/hooks/useCurrency";
import { useBranchContext } from "@/contexts/BranchContext";
import { AISalesInsights } from "@/components/reports/AISalesInsights";
import { PerformanceMetricCard } from "@/components/reports/PerformanceMetricCard";
import { SalesTrendChart } from "@/components/reports/SalesTrendChart";
import { InventoryHealthCard } from "@/components/reports/InventoryHealthCard";
import { CustomerInsightsCard } from "@/components/reports/CustomerInsightsCard";
import { FinancialSummaryCard } from "@/components/reports/FinancialSummaryCard";
import { ReportExportButton } from "@/components/reports/ReportExportButton";
import { DateRange } from "react-day-picker";
import { cn } from "@/lib/utils";

// Helper to parse payment method from sale
const parsePaymentMethod = (paymentMethod: string): { cash: number; transfer: number; card: number } => {
  const result = { cash: 0, transfer: 0, card: 0 };
  
  if (!paymentMethod) return result;
  
  const normalizedMethod = paymentMethod.toLowerCase().trim();
  
  if (normalizedMethod.includes(':')) {
    const parts = normalizedMethod.split(',');
    parts.forEach(part => {
      const [method, amount] = part.split(':');
      const value = parseFloat(amount) || 0;
      if (method.includes('cash')) result.cash = value;
      else if (method.includes('transfer')) result.transfer = value;
      else if (method.includes('card') || method.includes('pos')) result.card = value;
    });
  }
  
  return result;
};

// Get normalized payment type
const getNormalizedPaymentType = (paymentMethod: string): 'cash' | 'transfer' | 'card' => {
  const method = paymentMethod?.toLowerCase().trim() || '';
  if (method.includes('transfer') || method.includes('bank')) return 'transfer';
  if (method.includes('card') || method.includes('pos')) return 'card';
  return 'cash';
};

type ReportType = "sales" | "inventory" | "customer" | "financial" | null;

const Reports = () => {
  const [activeReport, setActiveReport] = useState<ReportType>(null);
  const [period, setPeriod] = useState("week");
  const [customDateRange, setCustomDateRange] = useState<DateRange | undefined>(undefined);
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const { data: roleData } = useUserRole();
  const { data: planInfo } = useBusinessPlan();
  const { navigateToUpgrade, isNavigating } = useSubscriptionNavigation();
  const { formatCurrency } = useCurrency();
  const { currentBranch } = useBranchContext();
  
  const isFreePlan = planInfo?.effectivePlan === 'free';

  const { data: sales = [], isLoading: salesLoading } = useSales({ branchId: currentBranch?.id });
  const { data: products = [], isLoading: productsLoading } = useProducts();
  const { data: customers = [], isLoading: customersLoading } = useCustomers();
  const { data: expenses = [], isLoading: expensesLoading } = useExpenses(undefined, currentBranch?.id);

  const isLoading = salesLoading || productsLoading || customersLoading || expensesLoading;

  // Get date range based on selected period or custom range
  const getDateRange = () => {
    if (period === "custom" && customDateRange?.from) {
      return { 
        start: startOfDay(customDateRange.from), 
        end: customDateRange.to ? endOfDay(customDateRange.to) : endOfDay(customDateRange.from) 
      };
    }
    
    const now = new Date();
    switch (period) {
      case "today":
        return { start: startOfDay(now), end: endOfDay(now) };
      case "week":
        return { start: startOfWeek(now, { weekStartsOn: 1 }), end: endOfWeek(now, { weekStartsOn: 1 }) };
      case "month":
        return { start: startOfMonth(now), end: endOfMonth(now) };
      case "year":
        return { start: startOfYear(now), end: endOfYear(now) };
      default:
        return { start: startOfWeek(now, { weekStartsOn: 1 }), end: endOfWeek(now, { weekStartsOn: 1 }) };
    }
  };

  const handlePeriodChange = (value: string) => {
    setPeriod(value);
    if (value !== "custom") {
      setCustomDateRange(undefined);
    }
  };

  const handleCustomDateSelect = (range: DateRange | undefined) => {
    setCustomDateRange(range);
    if (range?.from && range?.to) {
      setPeriod("custom");
      setIsDatePickerOpen(false);
    }
  };

  const clearCustomDate = () => {
    setCustomDateRange(undefined);
    setPeriod("week");
  };

  const getDateRangeLabel = () => {
    if (period === "custom" && customDateRange?.from) {
      if (customDateRange.to) {
        return `${format(customDateRange.from, "MMM d")} - ${format(customDateRange.to, "MMM d, yyyy")}`;
      }
      return format(customDateRange.from, "MMM d, yyyy");
    }
    return null;
  };

  const getPeriodLabel = () => {
    switch (period) {
      case "today": return "Today";
      case "week": return "This Week";
      case "month": return "This Month";
      case "year": return "This Year";
      case "custom": return getDateRangeLabel() || "Custom";
      default: return "This Week";
    }
  };

  const { start, end } = getDateRange();

  // Get previous period for comparison
  const getPreviousPeriodRange = () => {
    const diff = end.getTime() - start.getTime();
    return {
      start: new Date(start.getTime() - diff),
      end: new Date(end.getTime() - diff),
    };
  };

  const prevPeriod = getPreviousPeriodRange();

  // Filter sales by period
  const filteredSales = sales.filter(sale => {
    const saleDate = new Date(sale.created_at);
    return saleDate >= start && saleDate <= end;
  });

  const prevFilteredSales = sales.filter(sale => {
    const saleDate = new Date(sale.created_at);
    return saleDate >= prevPeriod.start && saleDate <= prevPeriod.end;
  });

  // Calculate sales metrics
  const totalRevenue = filteredSales.reduce((sum, sale) => sum + Number(sale.total_amount), 0);
  const prevTotalRevenue = prevFilteredSales.reduce((sum, sale) => sum + Number(sale.total_amount), 0);
  const totalInvoices = filteredSales.length;
  const prevTotalInvoices = prevFilteredSales.length;
  const avgOrderValue = totalInvoices > 0 ? totalRevenue / totalInvoices : 0;

  // Calculate trends
  const revenueTrend = prevTotalRevenue > 0 
    ? Math.round(((totalRevenue - prevTotalRevenue) / prevTotalRevenue) * 100) 
    : 0;
  const invoiceTrend = prevTotalInvoices > 0 
    ? Math.round(((totalInvoices - prevTotalInvoices) / prevTotalInvoices) * 100) 
    : 0;

  // Group sales by date with payment method breakdown
  const salesByDate = filteredSales.reduce((acc, sale) => {
    const dateKey = format(new Date(sale.created_at), "yyyy-MM-dd");
    if (!acc[dateKey]) {
      acc[dateKey] = { date: dateKey, invoices: 0, cash: 0, transfer: 0, card: 0, total: 0 };
    }
    acc[dateKey].invoices++;
    
    const amount = Number(sale.total_amount);
    const paymentMethod = sale.payment_method || 'cash';
    
    if (paymentMethod.includes(':')) {
      const parsed = parsePaymentMethod(paymentMethod);
      acc[dateKey].cash += parsed.cash;
      acc[dateKey].transfer += parsed.transfer;
      acc[dateKey].card += parsed.card;
    } else {
      const type = getNormalizedPaymentType(paymentMethod);
      acc[dateKey][type] += amount;
    }
    
    acc[dateKey].total += amount;
    return acc;
  }, {} as Record<string, { date: string; invoices: number; cash: number; transfer: number; card: number; total: number }>);

  const salesData = Object.values(salesByDate)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  // Transform for chart
  const chartData = useMemo(() => salesData.map(item => ({
    date: item.date,
    displayDate: format(new Date(item.date), "MMM d"),
    revenue: item.total,
    transactions: item.invoices,
    cash: item.cash,
    transfer: item.transfer,
    card: item.card,
  })), [salesData]);
  
  // Calculate totals by payment method
  const totalCash = salesData.reduce((sum, d) => sum + d.cash, 0);
  const totalTransfer = salesData.reduce((sum, d) => sum + d.transfer, 0);
  const totalCard = salesData.reduce((sum, d) => sum + d.card, 0);

  // Inventory metrics (uses global products for reports - aggregate view)
  const totalProducts = products.length;
  const stockValue = products.reduce((sum, p) => sum + (Number(p.cost_price) * p.stock_quantity), 0);
  const lowStockItems = products.filter(p => p.stock_quantity <= p.low_stock_threshold && p.stock_quantity > 0);
  const criticalItems = products.filter(p => p.stock_quantity === 0);
  const inStockItems = products.filter(p => p.stock_quantity > p.low_stock_threshold);

  const inventoryData = products
    .map(p => ({
      name: p.name,
      sku: p.sku || "-",
      stock: p.stock_quantity,
      status: p.stock_quantity === 0 ? "Critical" : p.stock_quantity <= p.low_stock_threshold ? "Low Stock" : "In Stock",
      value: Number(p.cost_price) * p.stock_quantity,
    }))
    .sort((a, b) => a.stock - b.stock)
    .slice(0, 20);

  // Customer metrics
  const totalCustomers = customers.length;
  const newCustomers = customers.filter(c => {
    const createdDate = new Date(c.created_at);
    return createdDate >= start && createdDate <= end;
  }).length;
  const totalCustomerSpent = customers.reduce((sum, c) => sum + Number(c.total_purchases), 0);
  const avgSpentPerCustomer = totalCustomers > 0 ? totalCustomerSpent / totalCustomers : 0;

  const customerData = customers
    .map(c => ({
      name: c.name,
      orders: c.total_orders,
      spent: Number(c.total_purchases),
      lastVisit: c.last_purchase_at ? format(new Date(c.last_purchase_at), "yyyy-MM-dd") : "-",
    }))
    .sort((a, b) => b.spent - a.spent)
    .slice(0, 20);

  // Financial metrics
  const filteredExpenses = expenses.filter(exp => {
    const expDate = new Date(exp.expense_date);
    return expDate >= start && expDate <= end;
  });
  const totalExpenses = filteredExpenses.reduce((sum, exp) => sum + Number(exp.amount), 0);
  // Build a product cost lookup map as fallback for old sales without recorded cost_price
  const productCostMap = new Map<string, number | null>(
    products.map(p => [p.id, p.cost_price != null ? Number(p.cost_price) : null])
  );
  
  const costOfGoods = filteredSales.reduce((sum, sale) => {
    const items = sale.sale_items || [];
    return sum + items.reduce((itemSum, item: any) => {
      // Prefer cost_price recorded at time of sale (accurate for profit reporting)
      const recordedCost = item.cost_price != null ? Number(item.cost_price) : 0;
      let unitCost: number;
      if (recordedCost > 0) {
        unitCost = recordedCost;
      } else {
        // Fallback for old sales: use current product cost_price or estimate
        const productCost = item.product_id ? productCostMap.get(item.product_id) : undefined;
        if (productCost != null && productCost > 0) {
          unitCost = productCost;
        } else {
          unitCost = Number(item.unit_price) * 0.7;
        }
      }
      return itemSum + unitCost * item.quantity;
    }, 0);
  }, 0);
  const totalDiscounts = filteredSales.reduce((sum, sale) => sum + (Number(sale.discount_amount) || 0), 0);
  const grossProfit = totalRevenue - costOfGoods;
  const grossMargin = totalRevenue > 0 ? Math.round((grossProfit / totalRevenue) * 100) : 0;
  // Net profit = gross profit minus expenses; if no expenses, net profit equals gross profit
  const netProfit = totalExpenses > 0 ? grossProfit - totalExpenses : grossProfit;

  const financialData = [
    { category: "Total Revenue", amount: totalRevenue },
    { category: "Total Discounts Given", amount: totalDiscounts },
    { category: "Cost of Goods Sold", amount: costOfGoods },
    { category: "Gross Profit", amount: grossProfit },
    { category: "Operating Expenses", amount: totalExpenses },
    { category: "Net Profit", amount: netProfit },
  ];

  // Export data preparation
  const salesExportData = {
    title: `Sales Report - ${getPeriodLabel()}`,
    headers: ["Date", "Transactions", "Cash", "Transfer", "Card", "Total"],
    rows: salesData.map(row => [
      format(new Date(row.date), "yyyy-MM-dd"),
      row.invoices,
      row.cash,
      row.transfer,
      row.card,
      row.total
    ])
  };

  const inventoryExportData = {
    title: `Inventory Report - ${getPeriodLabel()}`,
    headers: ["Product", "SKU", "Stock", "Status", "Value"],
    rows: inventoryData.map(row => [row.name, row.sku, row.stock, row.status, row.value])
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "In Stock": return "text-success bg-success/10";
      case "Low Stock": return "text-warning bg-warning/10";
      case "Critical": return "text-destructive bg-destructive/10";
      default: return "text-muted-foreground bg-muted";
    }
  };

  if (isLoading) {
    return (
      <main className="flex-1 overflow-y-auto p-4 sm:p-6 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </main>
    );
  }

  return (
    <main className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 sm:space-y-6">
      {/* Header with Date Navigation */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight flex items-center gap-2">
              <Activity className="h-6 w-6 sm:h-8 sm:w-8 text-primary" />
              Performance & Analytics
            </h1>
            <p className="text-sm sm:text-base text-muted-foreground">
              {currentBranch?.name || "All Branches"} • Real-time business insights
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {/* Period Selector */}
            <Select value={period} onValueChange={handlePeriodChange}>
              <SelectTrigger className="w-[130px] sm:w-[150px]">
                <CalendarIcon className="h-4 w-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-popover border">
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="week">This Week</SelectItem>
                <SelectItem value="month">This Month</SelectItem>
                <SelectItem value="year">This Year</SelectItem>
                {period === "custom" && customDateRange?.from && (
                  <SelectItem value="custom">Custom Range</SelectItem>
                )}
              </SelectContent>
            </Select>
            
            {/* Custom Date Range Picker */}
            <Popover open={isDatePickerOpen} onOpenChange={setIsDatePickerOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className={cn(
                    "text-left font-normal",
                    !customDateRange && "text-muted-foreground",
                    period === "custom" && customDateRange?.from && "border-primary"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  <span className="hidden sm:inline">{getDateRangeLabel() || "Custom"}</span>
                  <span className="sm:hidden">Custom</span>
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0 bg-popover" align="end">
                <div className="p-3 border-b">
                  <p className="text-sm font-medium">Select date range</p>
                </div>
                <Calendar
                  initialFocus
                  mode="range"
                  defaultMonth={customDateRange?.from}
                  selected={customDateRange}
                  onSelect={handleCustomDateSelect}
                  numberOfMonths={1}
                  className="p-3 pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
            
            {period === "custom" && customDateRange && (
              <Button variant="ghost" size="icon" className="h-9 w-9" onClick={clearCustomDate}>
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        {/* Period Badge */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Badge variant="outline" className="text-xs">
            <CalendarIcon className="h-3 w-3 mr-1" />
            {getPeriodLabel()}
          </Badge>
          <span>•</span>
          <span>{format(start, "MMM d")} - {format(end, "MMM d, yyyy")}</span>
        </div>
      </div>

      {/* AI Sales & Loss Insights Section - Prominently displayed */}
      <AISalesInsights />

      {/* Key Metrics Overview */}
      <div className="grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-5">
        <PerformanceMetricCard
          title="Total Revenue"
          value={formatCurrency(totalRevenue)}
          subtitle={`${totalInvoices} transactions`}
          icon={<DollarSign className="h-5 w-5" />}
          trend={{ value: revenueTrend, label: "vs prev period" }}
          status={revenueTrend >= 0 ? "success" : "danger"}
          onClick={() => setActiveReport("sales")}
        />
        <PerformanceMetricCard
          title="Transactions"
          value={totalInvoices}
          subtitle={`Avg: ${formatCurrency(avgOrderValue)}`}
          icon={<ShoppingCart className="h-5 w-5" />}
          trend={{ value: invoiceTrend, label: "vs prev period" }}
          status={invoiceTrend >= 0 ? "success" : "neutral"}
          onClick={() => setActiveReport("sales")}
        />
        <PerformanceMetricCard
          title="Products"
          value={totalProducts}
          subtitle={lowStockItems.length > 0 ? `${lowStockItems.length} low stock` : "All stocked"}
          icon={<Package className="h-5 w-5" />}
          status={criticalItems.length > 0 ? "danger" : lowStockItems.length > 0 ? "warning" : "success"}
          onClick={() => setActiveReport("inventory")}
        />
        {roleData?.isOwner && (
          <PerformanceMetricCard
            title="Gross Profit"
            value={formatCurrency(grossProfit)}
            subtitle={`${grossMargin}% margin`}
            icon={<TrendingUp className="h-5 w-5" />}
            status={grossProfit >= 0 ? "success" : "danger"}
            onClick={() => !isFreePlan && setActiveReport("financial")}
          />
        )}
        {roleData?.isOwner && (
          <PerformanceMetricCard
            title="Net Profit"
            value={formatCurrency(netProfit)}
            subtitle={totalExpenses > 0 ? `After ${formatCurrency(totalExpenses)} expenses` : "No expenses recorded"}
            icon={<DollarSign className="h-5 w-5" />}
            status={netProfit >= 0 ? "success" : "danger"}
            onClick={() => !isFreePlan && setActiveReport("financial")}
          />
        )}
        {roleData?.isOwner && (
          <PerformanceMetricCard
            title="Discounts Given"
            value={formatCurrency(totalDiscounts)}
            subtitle={`${filteredSales.filter(s => Number(s.discount_amount) > 0).length} discounted sales`}
            icon={<Banknote className="h-5 w-5" />}
            status={totalDiscounts > 0 ? "warning" : "neutral"}
            onClick={() => setActiveReport("financial")}
          />
        )}
      </div>

      {/* Charts and Visual Reports */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Sales Trend Chart */}
        <SalesTrendChart data={chartData} className="lg:col-span-2" />
      </div>

      {/* Detailed Report Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {/* Inventory Health */}
        <InventoryHealthCard
          data={{
            total: totalProducts,
            inStock: inStockItems.length,
            lowStock: lowStockItems.length,
            outOfStock: criticalItems.length,
          }}
          onClick={() => setActiveReport("inventory")}
        />

        {/* Customer Insights */}
        {!isFreePlan ? (
          <CustomerInsightsCard
            data={{
              totalCustomers,
              newCustomers,
              totalSpent: totalCustomerSpent,
              avgSpentPerCustomer,
              topCustomers: customerData.slice(0, 3),
            }}
            onClick={() => setActiveReport("customer")}
          />
        ) : (
          <Card className="border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Users className="h-5 w-5 text-muted-foreground" />
                Customer Insights
                <Lock className="h-4 w-4 text-muted-foreground" />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Unlock customer analytics and trends
              </p>
              <Button size="sm" onClick={() => navigateToUpgrade()} disabled={isNavigating}>
                <Crown className="h-4 w-4 mr-2" />
                Upgrade
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Financial Summary */}
        {roleData?.isOwner && !isFreePlan ? (
          <FinancialSummaryCard
            data={{
              totalRevenue,
              costOfGoods,
              grossProfit,
              totalExpenses,
              netProfit,
              totalDiscounts,
            }}
            onClick={() => setActiveReport("financial")}
          />
        ) : roleData?.isOwner && isFreePlan ? (
          <Card className="border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <TrendingUp className="h-5 w-5 text-muted-foreground" />
                Financial Summary
                <Lock className="h-4 w-4 text-muted-foreground" />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Unlock profit & loss analytics
              </p>
              <Button size="sm" onClick={() => navigateToUpgrade()} disabled={isNavigating}>
                <Crown className="h-4 w-4 mr-2" />
                Upgrade
              </Button>
            </CardContent>
          </Card>
        ) : null}
      </div>

      {/* Standard Reports Grid */}
      <div>
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <FileText className="h-5 w-5 text-primary" />
          Detailed Reports
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card 
            className="cursor-pointer hover:border-primary transition-colors group"
            onClick={() => setActiveReport("sales")}
          >
            <CardContent className="p-4">
                <div className="flex items-center justify-between">
                <div className="p-2 rounded-lg bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                  <BarChart3 className="h-5 w-5" />
                </div>
                <ReportExportButton data={salesExportData} filename="sales-report" locked={isFreePlan} />
              </div>
              <h3 className="font-semibold mt-3">Sales Report</h3>
              <p className="text-sm text-muted-foreground">Daily breakdown by payment method</p>
              <div className="mt-2 text-sm">
                <span className="font-medium">{formatCurrency(totalRevenue)}</span>
                <span className="text-muted-foreground"> • {totalInvoices} sales</span>
              </div>
            </CardContent>
          </Card>

          <Card 
            className="cursor-pointer hover:border-primary transition-colors group"
            onClick={() => setActiveReport("inventory")}
          >
            <CardContent className="p-4">
                <div className="flex items-center justify-between">
                <div className="p-2 rounded-lg bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                  <Package className="h-5 w-5" />
                </div>
                <ReportExportButton data={inventoryExportData} filename="inventory-report" locked={isFreePlan} />
              </div>
              <h3 className="font-semibold mt-3">Inventory Report</h3>
              <p className="text-sm text-muted-foreground">Stock levels and movements</p>
              <div className="mt-2 flex items-center gap-2 text-sm">
                <span className="font-medium">{totalProducts} items</span>
                {lowStockItems.length > 0 && (
                  <Badge variant="outline" className="text-warning bg-warning/10 text-xs">
                    {lowStockItems.length} low
                  </Badge>
                )}
                {criticalItems.length > 0 && (
                  <Badge variant="outline" className="text-destructive bg-destructive/10 text-xs">
                    {criticalItems.length} out
                  </Badge>
                )}
              </div>
            </CardContent>
          </Card>

          {!isFreePlan ? (
            <Card 
              className="cursor-pointer hover:border-primary transition-colors group"
              onClick={() => setActiveReport("customer")}
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="p-2 rounded-lg bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                    <Users className="h-5 w-5" />
                  </div>
                </div>
                <h3 className="font-semibold mt-3">Customer Report</h3>
                <p className="text-sm text-muted-foreground">Insights and trends</p>
                <div className="mt-2 flex items-center gap-2 text-sm">
                  <span className="font-medium">{totalCustomers} customers</span>
                  {newCustomers > 0 && (
                    <Badge variant="outline" className="text-success bg-success/10 text-xs">
                      +{newCustomers} new
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="border-amber-200/50 dark:border-amber-800/50 opacity-75">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="p-2 rounded-lg bg-muted text-muted-foreground">
                    <Users className="h-5 w-5" />
                  </div>
                  <Lock className="h-4 w-4 text-muted-foreground" />
                </div>
                <h3 className="font-semibold mt-3 text-muted-foreground">Customer Report</h3>
                <p className="text-xs text-muted-foreground">Upgrade to unlock</p>
              </CardContent>
            </Card>
          )}

          {roleData?.isOwner && !isFreePlan ? (
            <Card 
              className="cursor-pointer hover:border-primary transition-colors group"
              onClick={() => setActiveReport("financial")}
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="p-2 rounded-lg bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                    <TrendingUp className="h-5 w-5" />
                  </div>
                </div>
                <h3 className="font-semibold mt-3">Financial Report</h3>
                <p className="text-sm text-muted-foreground">Profit & expense analysis</p>
                <div className="mt-2 text-sm">
                  <span className={cn("font-medium", netProfit >= 0 ? "text-success" : "text-destructive")}>
                    {formatCurrency(netProfit)}
                  </span>
                  <span className="text-muted-foreground"> net profit</span>
                </div>
              </CardContent>
            </Card>
          ) : roleData?.isOwner ? (
            <Card className="border-amber-200/50 dark:border-amber-800/50 opacity-75">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="p-2 rounded-lg bg-muted text-muted-foreground">
                    <TrendingUp className="h-5 w-5" />
                  </div>
                  <Lock className="h-4 w-4 text-muted-foreground" />
                </div>
                <h3 className="font-semibold mt-3 text-muted-foreground">Financial Report</h3>
                <p className="text-xs text-muted-foreground">Upgrade to unlock</p>
              </CardContent>
            </Card>
          ) : null}
        </div>
      </div>

      {/* Sales Report Dialog */}
      <Dialog open={activeReport === "sales"} onOpenChange={(open) => !open && setActiveReport(null)}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Sales Report - {getPeriodLabel()}
              </DialogTitle>
              <ReportExportButton data={salesExportData} filename="sales-report" locked={isFreePlan} />
            </div>
          </DialogHeader>
          <div className="space-y-4">
            {/* Summary Cards by Payment Method */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Card className="bg-success/10 border-success/30">
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2 text-success text-sm">
                    <Banknote className="h-4 w-4" />
                    Cash
                  </div>
                  <div className="text-xl font-bold">{formatCurrency(totalCash)}</div>
                </CardContent>
              </Card>
              <Card className="bg-blue-500/10 border-blue-500/30">
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 text-sm">
                    <Smartphone className="h-4 w-4" />
                    Transfer
                  </div>
                  <div className="text-xl font-bold">{formatCurrency(totalTransfer)}</div>
                </CardContent>
              </Card>
              <Card className="bg-purple-500/10 border-purple-500/30">
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2 text-purple-600 dark:text-purple-400 text-sm">
                    <CreditCard className="h-4 w-4" />
                    Card
                  </div>
                  <div className="text-xl font-bold">{formatCurrency(totalCard)}</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2 text-muted-foreground text-sm">
                    <DollarSign className="h-4 w-4" />
                    Total
                  </div>
                  <div className="text-xl font-bold">{formatCurrency(totalRevenue)}</div>
                  <div className="text-xs text-muted-foreground">{totalInvoices} transactions</div>
                </CardContent>
              </Card>
            </div>
            
            {/* Daily Breakdown Table */}
            {salesData.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No sales data for this period
              </div>
            ) : (
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead>Date</TableHead>
                      <TableHead className="text-right">Transactions</TableHead>
                      <TableHead className="text-right">
                        <span className="flex items-center justify-end gap-1">
                          <Banknote className="h-3 w-3 text-success" />
                          Cash
                        </span>
                      </TableHead>
                      <TableHead className="text-right">
                        <span className="flex items-center justify-end gap-1">
                          <Smartphone className="h-3 w-3 text-blue-600" />
                          Transfer
                        </span>
                      </TableHead>
                      <TableHead className="text-right">
                        <span className="flex items-center justify-end gap-1">
                          <CreditCard className="h-3 w-3 text-purple-600" />
                          Card
                        </span>
                      </TableHead>
                      <TableHead className="text-right font-semibold">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {salesData.map((row) => (
                      <TableRow key={row.date}>
                        <TableCell className="font-medium">{format(new Date(row.date), "EEE, MMM d")}</TableCell>
                        <TableCell className="text-right text-muted-foreground">{row.invoices}</TableCell>
                        <TableCell className="text-right text-success">{formatCurrency(row.cash)}</TableCell>
                        <TableCell className="text-right text-blue-600 dark:text-blue-400">{formatCurrency(row.transfer)}</TableCell>
                        <TableCell className="text-right text-purple-600 dark:text-purple-400">{formatCurrency(row.card)}</TableCell>
                        <TableCell className="text-right font-semibold">{formatCurrency(row.total)}</TableCell>
                      </TableRow>
                    ))}
                    <TableRow className="bg-muted/50 font-semibold border-t-2">
                      <TableCell>Period Total</TableCell>
                      <TableCell className="text-right">{totalInvoices}</TableCell>
                      <TableCell className="text-right text-success">{formatCurrency(totalCash)}</TableCell>
                      <TableCell className="text-right text-blue-600 dark:text-blue-400">{formatCurrency(totalTransfer)}</TableCell>
                      <TableCell className="text-right text-purple-600 dark:text-purple-400">{formatCurrency(totalCard)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(totalRevenue)}</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Inventory Report Dialog */}
      <Dialog open={activeReport === "inventory"} onOpenChange={(open) => !open && setActiveReport(null)}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Inventory Report
              </DialogTitle>
              <ReportExportButton data={inventoryExportData} filename="inventory-report" locked={isFreePlan} />
            </div>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <Card>
                <CardContent className="pt-4">
                  <div className="text-muted-foreground text-sm">Total Products</div>
                  <div className="text-2xl font-bold">{totalProducts}</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4">
                  <div className="text-muted-foreground text-sm">Stock Value</div>
                  <div className="text-2xl font-bold">{formatCurrency(stockValue)}</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4">
                  <div className="text-muted-foreground text-sm">Low Stock Items</div>
                  <div className="text-2xl font-bold text-warning">{lowStockItems.length}</div>
                </CardContent>
              </Card>
            </div>
            {inventoryData.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No products found
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead>SKU</TableHead>
                    <TableHead className="text-right">Stock</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Value</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {inventoryData.map((row) => (
                    <TableRow key={row.sku}>
                      <TableCell className="font-medium">{row.name}</TableCell>
                      <TableCell className="text-muted-foreground">{row.sku}</TableCell>
                      <TableCell className="text-right">{row.stock}</TableCell>
                      <TableCell>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(row.status)}`}>
                          {row.status}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">{formatCurrency(row.value)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Customer Report Dialog */}
      <Dialog open={activeReport === "customer"} onOpenChange={(open) => !open && setActiveReport(null)}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Customer Report - {getPeriodLabel()}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <Card>
                <CardContent className="pt-4">
                  <div className="text-muted-foreground text-sm">Total Customers</div>
                  <div className="text-2xl font-bold">{totalCustomers}</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4">
                  <div className="text-muted-foreground text-sm">Total Spent</div>
                  <div className="text-2xl font-bold">{formatCurrency(totalCustomerSpent)}</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4">
                  <div className="text-muted-foreground text-sm">New This Period</div>
                  <div className="text-2xl font-bold text-success">{newCustomers}</div>
                </CardContent>
              </Card>
            </div>
            {customerData.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No customers found
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Customer</TableHead>
                    <TableHead className="text-right">Orders</TableHead>
                    <TableHead className="text-right">Total Spent</TableHead>
                    <TableHead>Last Visit</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {customerData.map((row, idx) => (
                    <TableRow key={idx}>
                      <TableCell className="font-medium">{row.name}</TableCell>
                      <TableCell className="text-right">{row.orders}</TableCell>
                      <TableCell className="text-right">{formatCurrency(row.spent)}</TableCell>
                      <TableCell className="text-muted-foreground">{row.lastVisit}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Financial Report Dialog */}
      <Dialog open={activeReport === "financial"} onOpenChange={(open) => !open && setActiveReport(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Financial Report - {getPeriodLabel()}
              </DialogTitle>
              <ReportExportButton
                data={{
                  headers: ["Category", "Amount"],
                  rows: financialData.map(row => [row.category, row.amount]),
                  title: `Financial Report - ${getPeriodLabel()}`,
                }}
                filename={`financial-report-${format(new Date(), "yyyy-MM-dd")}`}
              />
            </div>
          </DialogHeader>
          <div className="space-y-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Category</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {financialData.map((row) => (
                  <TableRow key={row.category}>
                    <TableCell className="font-medium">{row.category}</TableCell>
                    <TableCell className={cn(
                      "text-right",
                      row.category === 'Net Profit' && (row.amount >= 0 ? 'text-success font-bold' : 'text-destructive font-bold')
                    )}>
                      {formatCurrency(row.amount)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </DialogContent>
      </Dialog>
    </main>
  );
};

export default Reports;
