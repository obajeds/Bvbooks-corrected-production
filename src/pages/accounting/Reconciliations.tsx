import { useState, useMemo } from "react";
import { format, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from "date-fns";
import { CheckCircle2, Clock, ArrowUpCircle, ArrowDownCircle, Search, ChevronDown, ChevronRight, Banknote, Smartphone, CreditCard, Loader2, CalendarDays } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { useReconciliations, useReviewReconciliation, type ReconciliationStatus, type Reconciliation } from "@/hooks/useReconciliations";
import { useCurrency } from "@/hooks/useCurrency";
import { useBranchContext } from "@/contexts/BranchContext";
import { useStaff } from "@/hooks/useStaff";
import { useSalesPaymentSummary } from "@/hooks/useSettlements";
import { useBusinessPlan } from "@/hooks/useFeatureGating";
import { UpgradeRequired } from "@/components/subscription/UpgradeRequired";
import { DateRangeFilter } from "@/components/inventory/DateRangeFilter";
import { useIsMobile } from "@/hooks/use-mobile";
import { DateRange } from "react-day-picker";

type PeriodFilter = "today" | "this_week" | "this_month" | "custom";

function computeDateRange(period: PeriodFilter, customRange?: DateRange): { from: Date; to: Date } {
  const now = new Date();
  switch (period) {
    case "today":
      return { from: startOfDay(now), to: endOfDay(now) };
    case "this_week":
      return { from: startOfWeek(now, { weekStartsOn: 1 }), to: endOfWeek(now, { weekStartsOn: 1 }) };
    case "this_month":
      return { from: startOfMonth(now), to: endOfMonth(now) };
    case "custom":
      return {
        from: customRange?.from ? startOfDay(customRange.from) : startOfDay(now),
        to: customRange?.to ? endOfDay(customRange.to) : endOfDay(now),
      };
  }
}

const periodLabels: Record<PeriodFilter, string> = {
  today: "Today",
  this_week: "This Week",
  this_month: "This Month",
  custom: "Custom Date",
};

const statusConfig: Record<ReconciliationStatus, { label: string; color: string; icon: React.ReactNode }> = {
  pending: { label: "Pending", color: "bg-yellow-100 text-yellow-800 border-yellow-300", icon: <Clock className="h-3 w-3" /> },
  balanced: { label: "Balanced", color: "bg-green-100 text-green-800 border-green-300", icon: <CheckCircle2 className="h-3 w-3" /> },
  shortage: { label: "Shortage", color: "bg-red-100 text-red-800 border-red-300", icon: <ArrowDownCircle className="h-3 w-3" /> },
  excess: { label: "Excess", color: "bg-blue-100 text-blue-800 border-blue-300", icon: <ArrowUpCircle className="h-3 w-3" /> },
};

const paymentTypeIcons: Record<string, React.ReactNode> = {
  cash: <Banknote className="h-4 w-4 text-success" />,
  transfer: <Smartphone className="h-4 w-4 text-purple-600" />,
  card: <CreditCard className="h-4 w-4 text-blue-600" />,
};

// Group reconciliations by cashier + date
interface GroupedReconciliation {
  key: string;
  cashierName: string;
  branchName: string;
  date: string;
  time: string;
  items: {
    type: string;
    expected: number;
    actual: number;
    difference: number;
    status: ReconciliationStatus;
    id: string;
  }[];
  totalExpected: number;
  totalActual: number;
  totalDifference: number;
  overallStatus: ReconciliationStatus;
  reconciliations: Reconciliation[];
}

function groupReconciliations(reconciliations: Reconciliation[]): GroupedReconciliation[] {
  const groups = new Map<string, GroupedReconciliation>();
  
  reconciliations.forEach(r => {
    const dateKey = r.sale_date;
    const cashierKey = r.cashier?.full_name || "Unknown";
    const key = `${dateKey}-${cashierKey}`;
    
    if (!groups.has(key)) {
      groups.set(key, {
        key,
        cashierName: r.cashier?.full_name || "—",
        branchName: r.branch?.name || "—",
        date: dateKey,
        time: r.created_at,
        items: [],
        totalExpected: 0,
        totalActual: 0,
        totalDifference: 0,
        overallStatus: "balanced",
        reconciliations: [],
      });
    }
    
    const group = groups.get(key)!;
    const expected = Number(r.expected_amount) || 0;
    const actual = Number(r.actual_amount) || 0;
    const diff = Number(r.difference) || 0;
    
    group.items.push({
      type: r.payment_type,
      expected,
      actual,
      difference: diff,
      status: r.status,
      id: r.id,
    });
    
    group.totalExpected += expected;
    group.totalActual += actual;
    group.totalDifference += diff;
    group.reconciliations.push(r);
    
    if (r.status === 'shortage') group.overallStatus = 'shortage';
    else if (r.status === 'excess' && group.overallStatus !== 'shortage') group.overallStatus = 'excess';
    else if (r.status === 'pending' && group.overallStatus === 'balanced') group.overallStatus = 'pending';
  });
  
  return Array.from(groups.values()).sort((a, b) => 
    new Date(b.date).getTime() - new Date(a.date).getTime()
  );
}

// Mobile card for a grouped reconciliation
function ReconciliationMobileCard({
  group,
  formatCurrency,
  onReview,
}: {
  group: GroupedReconciliation;
  formatCurrency: (amount: number) => string;
  onReview: (rec: Reconciliation) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const config = statusConfig[group.overallStatus];

  return (
    <div className="border rounded-lg p-4 space-y-3">
      <div className="flex items-center justify-between" onClick={() => setExpanded(!expanded)}>
        <div>
          <p className="font-medium">{group.cashierName}</p>
          <p className="text-xs text-muted-foreground">{format(new Date(group.date), "MMM dd, yyyy")} · {group.branchName}</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className={cn("text-xs", config.color)}>
            {config.icon}
            <span className="ml-1">{config.label}</span>
          </Badge>
          {expanded ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 text-sm">
        <div>
          <p className="text-muted-foreground text-xs">Expected</p>
          <p className="font-semibold">{formatCurrency(group.totalExpected)}</p>
        </div>
        <div>
          <p className="text-muted-foreground text-xs">Actual</p>
          <p className="font-semibold">{formatCurrency(group.totalActual)}</p>
        </div>
        <div>
          <p className="text-muted-foreground text-xs">Diff</p>
          <p className={cn("font-semibold", group.totalDifference < 0 ? "text-red-600" : group.totalDifference > 0 ? "text-green-600" : "")}>
            {group.totalDifference > 0 ? "+" : ""}{formatCurrency(group.totalDifference)}
          </p>
        </div>
      </div>

      {expanded && (
        <div className="space-y-2 pt-2 border-t">
          <p className="text-xs font-medium text-muted-foreground">Payment Breakdown</p>
          {group.items.map((item) => {
            const itemConfig = statusConfig[item.status];
            const rec = group.reconciliations.find(r => r.id === item.id);
            return (
              <div key={item.id} className="p-3 bg-muted/30 rounded-lg space-y-2">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-sm font-medium capitalize">
                    {paymentTypeIcons[item.type] || null}
                    {item.type}
                  </span>
                  <Badge variant="outline" className={cn("text-xs", itemConfig.color)}>{itemConfig.label}</Badge>
                </div>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div>
                    <p className="text-muted-foreground">Expected</p>
                    <p className="font-medium">{formatCurrency(item.expected)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Actual</p>
                    <p className="font-medium">{formatCurrency(item.actual)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Diff</p>
                    <p className={cn("font-medium", item.difference < 0 ? "text-red-600" : item.difference > 0 ? "text-green-600" : "")}>
                      {item.difference > 0 ? "+" : ""}{formatCurrency(item.difference)}
                    </p>
                  </div>
                </div>
                {rec && (item.status === 'pending' || item.status === 'shortage' || item.status === 'excess') && (
                  <Button variant="outline" size="sm" className="w-full mt-1" onClick={() => onReview(rec)}>
                    Review
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// Grouped reconciliations table component (desktop)
function GroupedReconciliationTable({ 
  reconciliations, 
  formatCurrency,
  onReview,
}: { 
  reconciliations: Reconciliation[]; 
  formatCurrency: (amount: number) => string;
  onReview: (rec: Reconciliation) => void;
}) {
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const grouped = useMemo(() => groupReconciliations(reconciliations), [reconciliations]);
  
  const toggleRow = (key: string) => {
    setExpandedRows(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };
  
  if (grouped.length === 0) return null;
  
  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-8"></TableHead>
            <TableHead>Date</TableHead>
            <TableHead>Cashier</TableHead>
            <TableHead>Branch</TableHead>
            <TableHead className="text-right">Expected</TableHead>
            <TableHead className="text-right">Actual</TableHead>
            <TableHead className="text-right">Difference</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {grouped.map((group) => {
            const isExpanded = expandedRows.has(group.key);
            const config = statusConfig[group.overallStatus];
            return (
              <>
                <TableRow 
                  key={group.key}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => toggleRow(group.key)}
                >
                  <TableCell className="w-8">
                    {isExpanded ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                  </TableCell>
                  <TableCell>{format(new Date(group.date), "MMM dd, yyyy")}</TableCell>
                  <TableCell className="font-medium">{group.cashierName}</TableCell>
                  <TableCell>{group.branchName}</TableCell>
                  <TableCell className="text-right">{formatCurrency(group.totalExpected)}</TableCell>
                  <TableCell className="text-right">{formatCurrency(group.totalActual)}</TableCell>
                  <TableCell className={cn("text-right font-medium", group.totalDifference < 0 ? "text-red-600" : group.totalDifference > 0 ? "text-green-600" : "")}>
                    {group.totalDifference > 0 ? "+"  : ""}{formatCurrency(group.totalDifference)}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={cn("flex items-center gap-1 w-fit", config.color)}>
                      {config.icon}
                      {config.label}
                    </Badge>
                  </TableCell>
                </TableRow>
                {isExpanded && (
                  <TableRow key={`${group.key}-details`}>
                    <TableCell colSpan={8} className="bg-muted/30 p-0">
                      <div className="p-4 space-y-3">
                        <p className="text-xs font-medium text-muted-foreground">Payment Breakdown</p>
                        <div className="grid gap-3 md:grid-cols-3">
                          {group.items.map((item) => {
                            const itemConfig = statusConfig[item.status];
                            const rec = group.reconciliations.find(r => r.id === item.id);
                            return (
                              <div key={item.id} className="p-3 bg-background rounded-lg border space-y-2">
                                <div className="flex items-center justify-between">
                                  <span className="flex items-center gap-2 text-sm font-medium capitalize">
                                    {paymentTypeIcons[item.type] || null}
                                    {item.type}
                                  </span>
                                  <Badge variant="outline" className={cn("text-xs", itemConfig.color)}>{itemConfig.label}</Badge>
                                </div>
                                <div className="grid grid-cols-3 gap-2 text-xs">
                                  <div>
                                    <p className="text-muted-foreground">Expected</p>
                                    <p className="font-medium">{formatCurrency(item.expected)}</p>
                                  </div>
                                  <div>
                                    <p className="text-muted-foreground">Actual</p>
                                    <p className="font-medium">{formatCurrency(item.actual)}</p>
                                  </div>
                                  <div>
                                    <p className="text-muted-foreground">Diff</p>
                                    <p className={cn("font-medium", item.difference < 0 ? "text-red-600" : item.difference > 0 ? "text-green-600" : "")}>
                                      {item.difference > 0 ? "+" : ""}{formatCurrency(item.difference)}
                                    </p>
                                  </div>
                                </div>
                                {rec && (item.status === 'pending' || item.status === 'shortage' || item.status === 'excess') && (
                                  <Button variant="outline" size="sm" className="w-full mt-2" onClick={(e) => { e.stopPropagation(); onReview(rec); }}>
                                    Review
                                  </Button>
                                )}
                              </div>
                            );
                          })}
                        </div>
                        <p className="text-xs text-muted-foreground">Recorded at {format(new Date(group.time), "hh:mm a")}</p>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

export default function Reconciliations() {
  const { data: planInfo, isLoading: planLoading } = useBusinessPlan();
  const isMobile = useIsMobile();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>("today");
  const [customRange, setCustomRange] = useState<DateRange | undefined>(undefined);
  const [selectedReconciliation, setSelectedReconciliation] = useState<Reconciliation | null>(null);
  const [reviewNotes, setReviewNotes] = useState("");
  const [newStatus, setNewStatus] = useState<ReconciliationStatus>("balanced");
  
  // Gate for Free plan users
  if (planLoading) {
    return (
      <div className="flex-1 overflow-y-auto p-6 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  
  if (planInfo?.effectivePlan === 'free') {
    return <UpgradeRequired featureKey="accounting.reconciliations" requiredPlan="professional" />;
  }

  const { formatCurrency } = useCurrency();
  const { currentBranch } = useBranchContext();
  
  const dateRange = computeDateRange(periodFilter, customRange);
  
  // Fetch expected amounts from sales for the period
  const { data: expectedFromSales } = useSalesPaymentSummary(dateRange);
  
  // Fetch reconciliations for the period
  const { data: reconciliations = [], isLoading } = useReconciliations(
    dateRange,
    statusFilter !== "all" ? statusFilter as ReconciliationStatus : undefined
  );
  const reviewReconciliation = useReviewReconciliation();
  const { data: currentStaff } = useStaff();
  
  const currentStaffMember = Array.isArray(currentStaff) && currentStaff.length > 0 ? currentStaff[0] : null;

  // Calculate actual amounts from reconciliations
  const actualFromReconciliations = useMemo(() => {
    return reconciliations.reduce((acc, r) => {
      acc[r.payment_type] = (acc[r.payment_type] || 0) + Number(r.actual_amount);
      return acc;
    }, { cash: 0, transfer: 0, card: 0 } as Record<string, number>);
  }, [reconciliations]);

  const expectedTotals = {
    cash: expectedFromSales?.cash || 0,
    transfer: expectedFromSales?.transfer || 0,
    card: expectedFromSales?.card || 0,
  };

  // Summary stats from reconciliation records
  const summaryStats = useMemo(() => {
    const total = reconciliations.length;
    const shortages = reconciliations.filter(r => r.status === 'shortage').length;
    const excesses = reconciliations.filter(r => r.status === 'excess').length;
    const pending = reconciliations.filter(r => r.status === 'pending').length;
    const netDiff = reconciliations.reduce((sum, r) => sum + Number(r.difference), 0);
    return { total, shortages, excesses, pending, netDiff };
  }, [reconciliations]);

  const getStatus = (expected: number, actual: number) => {
    const diff = actual - expected;
    if (expected === 0 && actual === 0) return { status: 'pending', label: 'No Data', color: 'text-muted-foreground bg-muted' };
    if (Math.abs(diff) < 1) return { status: 'balanced', label: 'Balanced', color: 'text-green-600 bg-green-100' };
    if (diff < 0) return { status: 'shortage', label: 'Shortage', color: 'text-red-600 bg-red-100' };
    return { status: 'excess', label: 'Excess', color: 'text-blue-600 bg-blue-100' };
  };

  const filteredReconciliations = reconciliations.filter(rec => {
    const matchesSearch = 
      rec.cashier?.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      rec.payment_type.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  const grouped = useMemo(() => groupReconciliations(filteredReconciliations), [filteredReconciliations]);

  const handleReview = async () => {
    if (!selectedReconciliation || !currentStaffMember?.id) return;
    await reviewReconciliation.mutateAsync({
      id: selectedReconciliation.id,
      status: newStatus,
      review_notes: reviewNotes,
      reviewer_id: currentStaffMember.id,
    });
    setSelectedReconciliation(null);
    setReviewNotes("");
  };

  const openReviewDialog = (rec: Reconciliation) => {
    setSelectedReconciliation(rec);
    setNewStatus(rec.status === 'shortage' || rec.status === 'excess' ? 'balanced' : 'balanced');
    setReviewNotes(rec.review_notes || "");
  };

  const periodDescription = periodFilter === "custom" && customRange?.from
    ? `${format(customRange.from, "MMM dd")}${customRange.to ? ` - ${format(customRange.to, "MMM dd, yyyy")}` : ""}`
    : periodLabels[periodFilter];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Reconciliations</h1>
          <p className="text-muted-foreground">
            Compare expected vs actual amounts — {periodDescription}
            {currentBranch && ` · ${currentBranch.name}`}
          </p>
        </div>
      </div>

      {/* Period Filter Bar */}
      <div className="flex flex-wrap items-center gap-2">
        {(["today", "this_week", "this_month"] as PeriodFilter[]).map((period) => (
          <Button
            key={period}
            variant={periodFilter === period ? "default" : "outline"}
            size="sm"
            onClick={() => {
              setPeriodFilter(period);
              setCustomRange(undefined);
            }}
          >
            {periodLabels[period]}
          </Button>
        ))}
        <div className="flex items-center gap-1">
          <Button
            variant={periodFilter === "custom" ? "default" : "outline"}
            size="sm"
            onClick={() => setPeriodFilter("custom")}
          >
            <CalendarDays className="h-4 w-4 mr-1" />
            Custom
          </Button>
          {periodFilter === "custom" && (
            <DateRangeFilter
              dateRange={customRange}
              onDateRangeChange={(range) => setCustomRange(range)}
            />
          )}
        </div>
      </div>

      {/* Summary Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Card className="p-3">
          <p className="text-xs text-muted-foreground">Total Records</p>
          <p className="text-xl font-bold">{summaryStats.total}</p>
        </Card>
        <Card className="p-3">
          <p className="text-xs text-muted-foreground">Pending</p>
          <p className="text-xl font-bold text-yellow-600">{summaryStats.pending}</p>
        </Card>
        <Card className="p-3">
          <p className="text-xs text-muted-foreground">Shortages</p>
          <p className="text-xl font-bold text-red-600">{summaryStats.shortages}</p>
        </Card>
        <Card className="p-3">
          <p className="text-xs text-muted-foreground">Excesses</p>
          <p className="text-xl font-bold text-blue-600">{summaryStats.excesses}</p>
        </Card>
        <Card className="p-3 col-span-2 md:col-span-1">
          <p className="text-xs text-muted-foreground">Net Difference</p>
          <p className={cn("text-xl font-bold", summaryStats.netDiff < 0 ? "text-red-600" : summaryStats.netDiff > 0 ? "text-green-600" : "")}>
            {summaryStats.netDiff > 0 ? "+" : ""}{formatCurrency(summaryStats.netDiff)}
          </p>
        </Card>
      </div>

      {/* Daily Summary - Expected vs Actual */}
      <Card>
        <CardHeader>
          <CardTitle>Payment Summary — {periodDescription}</CardTitle>
          <CardDescription>Expected from sales vs Actual reconciled amounts</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 grid-cols-1 md:grid-cols-3">
            {/* Cash */}
            {(() => {
              const expected = expectedTotals.cash;
              const actual = actualFromReconciliations.cash || 0;
              const status = getStatus(expected, actual);
              const diff = actual - expected;
              return (
                <div className="p-4 rounded-lg border space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2 font-medium">
                      <Banknote className="h-4 w-4 text-green-600" />
                      Cash
                    </span>
                    <Badge className={status.color}>{status.label}</Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <p className="text-muted-foreground">Expected</p>
                      <p className="font-semibold">{formatCurrency(expected)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Actual</p>
                      <p className="font-semibold">{formatCurrency(actual)}</p>
                    </div>
                  </div>
                  {Math.abs(diff) >= 1 && (
                    <p className={`text-sm font-medium ${diff < 0 ? 'text-red-600' : 'text-green-600'}`}>
                      Difference: {diff > 0 ? '+' : ''}{formatCurrency(diff)}
                    </p>
                  )}
                </div>
              );
            })()}

            {/* Transfer */}
            {(() => {
              const expected = expectedTotals.transfer;
              const actual = actualFromReconciliations.transfer || 0;
              const status = getStatus(expected, actual);
              const diff = actual - expected;
              return (
                <div className="p-4 rounded-lg border space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2 font-medium">
                      <Smartphone className="h-4 w-4 text-purple-600" />
                      Transfer
                    </span>
                    <Badge className={status.color}>{status.label}</Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <p className="text-muted-foreground">Expected</p>
                      <p className="font-semibold">{formatCurrency(expected)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Actual</p>
                      <p className="font-semibold">{formatCurrency(actual)}</p>
                    </div>
                  </div>
                  {Math.abs(diff) >= 1 && (
                    <p className={`text-sm font-medium ${diff < 0 ? 'text-red-600' : 'text-green-600'}`}>
                      Difference: {diff > 0 ? '+' : ''}{formatCurrency(diff)}
                    </p>
                  )}
                </div>
              );
            })()}

            {/* Card */}
            {(() => {
              const expected = expectedTotals.card;
              const actual = actualFromReconciliations.card || 0;
              const status = getStatus(expected, actual);
              const diff = actual - expected;
              return (
                <div className="p-4 rounded-lg border space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2 font-medium">
                      <CreditCard className="h-4 w-4 text-blue-600" />
                      Card
                    </span>
                    <Badge className={status.color}>{status.label}</Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <p className="text-muted-foreground">Expected</p>
                      <p className="font-semibold">{formatCurrency(expected)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Actual</p>
                      <p className="font-semibold">{formatCurrency(actual)}</p>
                    </div>
                  </div>
                  {Math.abs(diff) >= 1 && (
                    <p className={`text-sm font-medium ${diff < 0 ? 'text-red-600' : 'text-green-600'}`}>
                      Difference: {diff > 0 ? '+' : ''}{formatCurrency(diff)}
                    </p>
                  )}
                </div>
              );
            })()}
          </div>

          {/* Total Summary */}
          <div className="mt-4 p-4 rounded-lg bg-muted/50 border">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-sm text-muted-foreground">Total Expected</p>
                <p className="text-xl font-bold">
                  {formatCurrency(expectedTotals.cash + expectedTotals.transfer + expectedTotals.card)}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Actual</p>
                <p className="text-xl font-bold">
                  {formatCurrency((actualFromReconciliations.cash || 0) + (actualFromReconciliations.transfer || 0) + (actualFromReconciliations.card || 0))}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Net Difference</p>
                {(() => {
                  const totalExpected = expectedTotals.cash + expectedTotals.transfer + expectedTotals.card;
                  const totalActual = (actualFromReconciliations.cash || 0) + (actualFromReconciliations.transfer || 0) + (actualFromReconciliations.card || 0);
                  const diff = totalActual - totalExpected;
                  return (
                    <p className={`text-xl font-bold ${diff < 0 ? 'text-red-600' : diff > 0 ? 'text-green-600' : ''}`}>
                      {diff > 0 ? '+' : ''}{formatCurrency(diff)}
                    </p>
                  );
                })()}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Reconciliation Records */}
      <Card>
        <CardHeader>
          <CardTitle>Reconciliation Records</CardTitle>
          <CardDescription>Review and resolve payment discrepancies</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4 md:flex-row md:items-center mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by cashier or payment type..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="balanced">Balanced</SelectItem>
                <SelectItem value="shortage">Shortage</SelectItem>
                <SelectItem value="excess">Excess</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : filteredReconciliations.length === 0 ? (
            <div className="text-center py-12 space-y-2">
              <p className="text-muted-foreground">No reconciliation records for this period</p>
              <p className="text-sm text-muted-foreground">Try selecting a different date range to view historical records</p>
            </div>
          ) : isMobile ? (
            <div className="space-y-3">
              {grouped.map((group) => (
                <ReconciliationMobileCard
                  key={group.key}
                  group={group}
                  formatCurrency={formatCurrency}
                  onReview={openReviewDialog}
                />
              ))}
            </div>
          ) : (
            <GroupedReconciliationTable 
              reconciliations={filteredReconciliations} 
              formatCurrency={formatCurrency}
              onReview={openReviewDialog}
            />
          )}
        </CardContent>
      </Card>

      {/* Review Dialog */}
      <Dialog open={!!selectedReconciliation} onOpenChange={(open) => !open && setSelectedReconciliation(null)}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Review Reconciliation</DialogTitle>
            <DialogDescription>
              Update the status and add notes for this reconciliation record
            </DialogDescription>
          </DialogHeader>
          {selectedReconciliation && (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4 p-4 bg-muted rounded-lg">
                <div>
                  <p className="text-sm text-muted-foreground">Expected</p>
                  <p className="text-lg font-semibold">{formatCurrency(Number(selectedReconciliation.expected_amount))}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Actual</p>
                  <p className="text-lg font-semibold">{formatCurrency(Number(selectedReconciliation.actual_amount))}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-sm text-muted-foreground">Difference</p>
                  <p className={cn(
                    "text-lg font-semibold",
                    Number(selectedReconciliation.difference) < 0 ? "text-red-600" : 
                    Number(selectedReconciliation.difference) > 0 ? "text-green-600" : ""
                  )}>
                    {formatCurrency(Number(selectedReconciliation.difference))}
                  </p>
                </div>
              </div>
              
              <div className="grid gap-2">
                <Label>Update Status</Label>
                <Select value={newStatus} onValueChange={(v) => setNewStatus(v as ReconciliationStatus)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="balanced">Balanced</SelectItem>
                    <SelectItem value="shortage">Mark as Shortage</SelectItem>
                    <SelectItem value="excess">Mark as Excess</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="grid gap-2">
                <Label>Review Notes</Label>
                <Textarea
                  placeholder="Add notes about this reconciliation..."
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  rows={3}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedReconciliation(null)}>
              Cancel
            </Button>
            <Button 
              onClick={handleReview}
              disabled={reviewReconciliation.isPending}
            >
              {reviewReconciliation.isPending ? "Saving..." : "Save Review"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
