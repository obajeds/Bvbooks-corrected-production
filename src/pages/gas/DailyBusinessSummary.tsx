import { useState, useEffect, useMemo } from "react";
import { format, parseISO } from "date-fns";
import { Calendar as CalendarIcon, Download, FileText, Users, Banknote, CreditCard, ArrowRightLeft, TrendingUp, AlertTriangle, Unlock, Clock, RefreshCw, Trash2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useBranchDailySales, useLiveDailySummary, useReopenDailySale, useDeleteDailySale, DailyPumpSale } from "@/hooks/useDailyPumpSales";
import { useDailySalesPaymentSummary } from "@/hooks/useSettlements";
import { useBranches } from "@/hooks/useBranches";
import { useCurrency } from "@/hooks/useCurrency";
import { useBranchContext } from "@/contexts/BranchContext";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

export default function DailyBusinessSummary() {
  const { formatCurrency } = useCurrency();
  const { currentBranch } = useBranchContext();
  const { data: branches = [] } = useBranches(currentBranch?.business_id);
  const queryClient = useQueryClient();
  
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedBranchId, setSelectedBranchId] = useState<string>("");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState<{ sale: DailyPumpSale } | null>(null);
  const [deleteReason, setDeleteReason] = useState("");

  // Initialize branch ID from currentBranch on first load
  useEffect(() => {
    if (currentBranch?.id && !selectedBranchId) {
      setSelectedBranchId(currentBranch.id);
    }
  }, [currentBranch?.id, selectedBranchId]);
  
  // Sync when branch switcher changes
  useEffect(() => {
    if (currentBranch?.id) {
      setSelectedBranchId(currentBranch.id);
    }
  }, [currentBranch?.id]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["branch-daily-sales"] }),
      queryClient.invalidateQueries({ queryKey: ["daily-sales-payment-summary"] }),
    ]);
    setIsRefreshing(false);
    toast.success("Data refreshed");
  };
  
  // Use local date components to avoid timezone mismatch with cashier's UTC-based date
  const dateString = `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}-${String(selectedDate.getDate()).padStart(2, '0')}`;
  const { data: sales = [], isLoading: salesLoading } = useBranchDailySales(dateString, selectedBranchId);
  const { data: salesPaymentSummary } = useDailySalesPaymentSummary(dateString, selectedBranchId);
  const reopenSale = useReopenDailySale();
  const deleteSale = useDeleteDailySale();
  
  // SINGLE SOURCE OF TRUTH - Compute summary LIVE from raw sales data
  // Pump sales only for liters/expected revenue, payments come from Shop Sales (POS)
  const liveSummary = useLiveDailySummary(sales);
  
  // Payment data comes ONLY from Shop Sales (POS) - not from pump entry fields
  // Since payment fields were removed from pump entry form, use salesPaymentSummary
  const shopCash = salesPaymentSummary?.cash || 0;
  const shopTransfer = salesPaymentSummary?.transfer || 0;
  const shopCard = salesPaymentSummary?.card || 0;
  const shopTotal = shopCash + shopTransfer + shopCard;
  
  // Variance: Shop Sales vs Pump Expected Revenue
  const totalVariance = shopTotal - liveSummary.total_expected;
  
  const combinedSummary = {
    total_cash: shopCash,
    total_transfer: shopTransfer,
    total_card: shopCard,
    grand_total: shopTotal,
    total_expected: liveSummary.total_expected,
    total_variance: totalVariance,
    shortage_count: totalVariance < 0 ? 1 : 0,
    cashier_count: liveSummary.cashier_count,
    submitted_count: liveSummary.submitted_count,
    pending_count: liveSummary.pending_count,
  };

  // Group sales by fuel type for breakdown
  const salesByFuelType = useMemo(() => {
    const byFuelType: Record<string, { label: string; liters: number; expected: number; unit: string }> = {};
    const fuelLabels: Record<string, string> = {
      pms: "PMS",
      ago: "AGO",
      dpk: "DPK",
      lpg: "LPG",
    };
    
    for (const sale of sales) {
      const fuelType = sale.pump?.fuel_type || 'unknown';
      const unit = sale.pump?.unit || (fuelType === 'lpg' ? 'Kg' : 'L');
      
      if (!byFuelType[fuelType]) {
        byFuelType[fuelType] = { 
          label: fuelLabels[fuelType] || fuelType.toUpperCase(),
          liters: 0, 
          expected: 0,
          unit
        };
      }
      byFuelType[fuelType].liters += sale.liters_sold || 0;
      byFuelType[fuelType].expected += sale.expected_revenue || 0;
    }
    
    return byFuelType;
  }, [sales]);

  // Group sales by staff - track pump entries (liters, expected revenue)
  // Payment data is branch-wide from Shop Sales, not per-cashier
  const salesByStaff = sales.reduce((acc, sale) => {
    const staffName = sale.staff?.full_name || 'Unknown';
    if (!acc[staffName]) {
      acc[staffName] = {
        staffName,
        entries: [],
        totalLiters: 0,
        totalExpected: 0,
        allSubmitted: true,
      };
    }
    acc[staffName].entries.push(sale);
    acc[staffName].totalLiters += sale.liters_sold || 0;
    acc[staffName].totalExpected += sale.expected_revenue || 0;
    if (sale.status === 'pending') acc[staffName].allSubmitted = false;
    return acc;
  }, {} as Record<string, {
    staffName: string;
    entries: DailyPumpSale[];
    totalLiters: number;
    totalExpected: number;
    allSubmitted: boolean;
  }>);

  const staffList = Object.values(salesByStaff);

  const handleReopenSale = async (saleId: string) => {
    await reopenSale.mutateAsync(saleId);
  };

  const handleDeleteSale = async () => {
    if (!deleteDialog || !deleteReason.trim()) return;
    await deleteSale.mutateAsync(deleteDialog.sale.id);
    setDeleteDialog(null);
    setDeleteReason("");
  };

  const exportCSV = () => {
    if (sales.length === 0) {
      toast.error("No data to export");
      return;
    }

    const headers = ["Date", "Cashier", "Pump", "Fuel Type", "Opening", "Closing", "Qty", "Unit", "Price/Unit", "Expected", "Status"];
    const rows = sales.map(s => [
      s.sale_date,
      s.staff?.full_name || 'Unknown',
      s.pump?.name || '',
      s.pump?.fuel_type?.toUpperCase() || '',
      s.opening_meter,
      s.closing_meter,
      s.liters_sold,
      s.pump?.unit || (s.pump?.fuel_type === 'lpg' ? 'Kg' : 'L'),
      s.price_per_liter,
      s.expected_revenue,
      s.status,
    ]);

    const csvContent = [headers, ...rows].map(r => r.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `daily-sales-${dateString}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("CSV exported successfully");
  };

  const exportPDF = () => {
    toast.info("PDF export coming soon - use print to PDF for now");
    window.print();
  };

  const getFuelTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      pms: "PMS",
      ago: "AGO",
      dpk: "DPK",
      lpg: "LPG",
    };
    return labels[type] || type.toUpperCase();
  };

  // Get unit from pump configuration (falls back to fuel-type logic for legacy data)
  const getUnitLabel = (pump?: { unit?: string; fuel_type?: string }) => {
    if (pump?.unit) return pump.unit;
    return pump?.fuel_type === 'lpg' ? 'Kg' : 'L';
  };

  return (
    <div className="space-y-6 print:space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 print:hidden">
        <div>
          <h1 className="text-2xl font-bold">Daily Business Summary</h1>
          <p className="text-muted-foreground">Real-time sales aggregation and cashier reconciliation</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isRefreshing}>
            <RefreshCw className={cn("h-4 w-4 mr-2", isRefreshing && "animate-spin")} />
            Refresh
          </Button>
          <Button variant="outline" size="sm" onClick={exportCSV}>
            <Download className="h-4 w-4 mr-2" />
            CSV
          </Button>
          <Button variant="outline" size="sm" onClick={exportPDF}>
            <FileText className="h-4 w-4 mr-2" />
            PDF
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 print:hidden">
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="w-[200px] justify-start">
              <CalendarIcon className="mr-2 h-4 w-4" />
              {format(selectedDate, "PPP")}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={(date) => date && setSelectedDate(date)}
              disabled={(date) => date > new Date()}
              initialFocus
            />
          </PopoverContent>
        </Popover>

        <Select value={selectedBranchId} onValueChange={setSelectedBranchId}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Select branch" />
          </SelectTrigger>
          <SelectContent>
            {branches.map((branch) => (
              <SelectItem key={branch.id} value={branch.id}>
                {branch.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Print Header */}
      <div className="hidden print:block text-center mb-6">
        <h1 className="text-xl font-bold">Daily Business Summary - Audit Report</h1>
        <p className="text-sm text-muted-foreground">
          Date: {format(selectedDate, "PPPP")} | Branch: {branches.find(b => b.id === selectedBranchId)?.name}
        </p>
      </div>

      {salesLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      ) : (
        <>
          {/* Summary Cards - LIVE FROM SINGLE SOURCE OF TRUTH + SALES DATA */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card className="bg-success/10 border-success/20">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-success">Total Cash</p>
                    <p className="text-2xl font-bold">{formatCurrency(combinedSummary.total_cash)}</p>
                  </div>
                  <Banknote className="h-8 w-8 text-success opacity-80" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-purple-500/10 border-purple-500/20">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-purple-600">Total Transfer</p>
                    <p className="text-2xl font-bold">{formatCurrency(combinedSummary.total_transfer)}</p>
                  </div>
                  <ArrowRightLeft className="h-8 w-8 text-purple-600 opacity-80" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-blue-500/10 border-blue-500/20">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-blue-600">Total Card</p>
                    <p className="text-2xl font-bold">{formatCurrency(combinedSummary.total_card)}</p>
                  </div>
                  <CreditCard className="h-8 w-8 text-blue-600 opacity-80" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-primary/10 border-primary/20">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-primary">Grand Total</p>
                    <p className="text-2xl font-bold">{formatCurrency(combinedSummary.grand_total)}</p>
                  </div>
                  <TrendingUp className="h-8 w-8 text-primary opacity-80" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Variance Alert */}
          {combinedSummary.total_variance !== 0 && (
            <Card className={cn(
              "border-2",
              combinedSummary.total_variance < 0 ? "border-destructive bg-destructive/5" : "border-warning bg-warning/5"
            )}>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <AlertTriangle className={cn(
                    "h-6 w-6",
                    combinedSummary.total_variance < 0 ? "text-destructive" : "text-warning"
                  )} />
                  <div>
                    <p className="font-medium">
                      {combinedSummary.total_variance < 0 ? "Total Shortage" : "Total Overage"} Detected
                    </p>
                    <p className={cn(
                      "text-2xl font-bold",
                      combinedSummary.total_variance < 0 ? "text-destructive" : "text-warning"
                    )}>
                      {formatCurrency(Math.abs(combinedSummary.total_variance))}
                    </p>
                  </div>
                  <div className="ml-auto text-sm text-muted-foreground">
                    {combinedSummary.shortage_count} entries with shortages
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Status Summary */}
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              <span>{combinedSummary.cashier_count} Cashiers</span>
            </div>
            <Badge variant="default" className="bg-success">
              {combinedSummary.submitted_count} Submitted
            </Badge>
            <Badge variant="secondary">
              {combinedSummary.pending_count} Pending
            </Badge>
          </div>

          {/* Pump Expected vs Shop Sales Comparison */}
          <Card className="border-accent/30 bg-accent/5">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Reconciliation Summary</CardTitle>
              <CardDescription>Pump expected revenue vs actual shop sales</CardDescription>
            </CardHeader>
            <CardContent>
              {/* Fuel Type Breakdown */}
              {Object.keys(salesByFuelType).length > 0 && (
                <div className="mb-4">
                  <div className="text-sm font-medium mb-2 text-muted-foreground">Revenue by Fuel Type</div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    {Object.entries(salesByFuelType).map(([fuelType, data]) => (
                      <div key={fuelType} className="rounded-lg border bg-background p-3">
                        <div className="flex items-center justify-between mb-1">
                          <Badge variant="outline" className="text-xs">{data.label}</Badge>
                          <span className="text-xs text-muted-foreground">{data.liters.toLocaleString()} {data.unit}</span>
                        </div>
                        <div className="text-sm font-semibold">{formatCurrency(data.expected)}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Summary Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-3 rounded-lg bg-background border">
                  <div className="text-xs text-muted-foreground mb-1">Pump Expected</div>
                  <div className="text-lg font-bold">{formatCurrency(combinedSummary.total_expected)}</div>
                </div>
                <div className="p-3 rounded-lg bg-background border">
                  <div className="text-xs text-muted-foreground mb-1">Shop Sales Total</div>
                  <div className="text-lg font-bold">{formatCurrency(combinedSummary.grand_total)}</div>
                </div>
                <div className={cn(
                  "p-3 rounded-lg border",
                  combinedSummary.total_variance >= 0 ? "bg-success/10 border-success/30" : "bg-destructive/10 border-destructive/30"
                )}>
                  <div className="text-xs text-muted-foreground mb-1">Variance</div>
                  <div className={cn(
                    "text-lg font-bold",
                    combinedSummary.total_variance >= 0 ? "text-success" : "text-destructive"
                  )}>
                    {combinedSummary.total_variance >= 0 ? "+" : ""}{formatCurrency(combinedSummary.total_variance)}
                  </div>
                </div>
                <div className="p-3 rounded-lg bg-background border">
                  <div className="text-xs text-muted-foreground mb-1">Status</div>
                  <Badge variant={Math.abs(combinedSummary.total_variance) < 0.01 ? "default" : combinedSummary.total_variance > 0 ? "secondary" : "destructive"}
                    className={Math.abs(combinedSummary.total_variance) < 0.01 ? "bg-success" : ""}>
                    {Math.abs(combinedSummary.total_variance) < 0.01 ? "Balanced" : combinedSummary.total_variance > 0 ? "Excess" : "Shortage"}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Cashier Breakdown Table */}
          <Card>
            <CardHeader>
              <CardTitle>Cashier Pump Entries</CardTitle>
              <CardDescription>Individual cashier meter readings and expected revenue</CardDescription>
            </CardHeader>
            <CardContent>
              {staffList.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No sales entries for this date
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Cashier</TableHead>
                      <TableHead>Entries</TableHead>
                      <TableHead className="text-right">Qty Sold</TableHead>
                      <TableHead className="text-right">Expected Revenue</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {staffList.map((staff) => (
                      <TableRow key={staff.staffName}>
                        <TableCell className="font-medium">{staff.staffName}</TableCell>
                        <TableCell>{staff.entries.length}</TableCell>
                        <TableCell className="text-right">{staff.totalLiters.toLocaleString()}</TableCell>
                        <TableCell className="text-right font-medium">{formatCurrency(staff.totalExpected)}</TableCell>
                        <TableCell>
                          <Badge variant={staff.allSubmitted ? "default" : "secondary"}>
                            {staff.allSubmitted ? "Submitted" : "Pending"}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {/* Shop Sales Summary Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Banknote className="h-5 w-5" />
                Shop Sales (Real-time)
              </CardTitle>
              <CardDescription>Payment collections from POS for selected date</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4">
                <div className="p-4 rounded-lg bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800">
                  <div className="flex items-center gap-2 text-green-700 dark:text-green-400 mb-1">
                    <Banknote className="h-4 w-4" />
                    <span className="text-sm font-medium">Cash</span>
                  </div>
                  <p className="text-xl font-bold text-green-800 dark:text-green-300">{formatCurrency(shopCash)}</p>
                </div>
                <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800">
                  <div className="flex items-center gap-2 text-blue-700 dark:text-blue-400 mb-1">
                    <ArrowRightLeft className="h-4 w-4" />
                    <span className="text-sm font-medium">Transfer</span>
                  </div>
                  <p className="text-xl font-bold text-blue-800 dark:text-blue-300">{formatCurrency(shopTransfer)}</p>
                </div>
                <div className="p-4 rounded-lg bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800">
                  <div className="flex items-center gap-2 text-purple-700 dark:text-purple-400 mb-1">
                    <CreditCard className="h-4 w-4" />
                    <span className="text-sm font-medium">Card</span>
                  </div>
                  <p className="text-xl font-bold text-purple-800 dark:text-purple-300">{formatCurrency(shopCard)}</p>
                </div>
              </div>
              <div className="mt-4 pt-4 border-t">
                <div className="flex justify-between items-center">
                  <span className="font-medium">Total Shop Sales</span>
                  <span className="text-xl font-bold">{formatCurrency(shopTotal)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Detailed Entries Table */}
          <Card>
            <CardHeader>
              <CardTitle>Detailed Pump Entries</CardTitle>
              <CardDescription>All pump meter readings for the selected date</CardDescription>
            </CardHeader>
            <CardContent>
              {sales.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No entries for this date
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Cashier</TableHead>
                      <TableHead>Pump</TableHead>
                      <TableHead>Fuel</TableHead>
                      <TableHead className="text-right">Open</TableHead>
                      <TableHead className="text-right">Close</TableHead>
                      <TableHead className="text-right">Qty</TableHead>
                      <TableHead className="text-right">Price/Unit</TableHead>
                      <TableHead className="text-right">Expected</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Submitted At</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sales.map((sale) => (
                      <TableRow key={sale.id}>
                        <TableCell>
                          {sale.staff?.full_name || 'Unknown'}
                        </TableCell>
                        <TableCell>{sale.pump?.name}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{getFuelTypeLabel(sale.pump?.fuel_type || '')}</Badge>
                        </TableCell>
                        <TableCell className="text-right text-muted-foreground">{sale.opening_meter?.toLocaleString()}</TableCell>
                        <TableCell className="text-right">{sale.closing_meter?.toLocaleString()}</TableCell>
                        <TableCell className="text-right font-medium">{sale.liters_sold?.toLocaleString()} {getUnitLabel(sale.pump)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(sale.price_per_liter)}</TableCell>
                        <TableCell className="text-right font-bold">{formatCurrency(sale.expected_revenue)}</TableCell>
                        <TableCell>
                          <Badge variant={sale.status === 'submitted' ? "default" : "secondary"}>
                            {sale.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {sale.submitted_at ? (
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {format(parseISO(sale.submitted_at), "h:mm a")}
                            </span>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            {sale.status === 'submitted' && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleReopenSale(sale.id)}
                                disabled={reopenSale.isPending}
                              >
                                <Unlock className="h-3 w-3 mr-1" />
                                Reopen
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-destructive hover:text-destructive hover:bg-destructive/10"
                              onClick={() => setDeleteDialog({ sale })}
                              disabled={deleteSale.isPending}
                            >
                              <Trash2 className="h-3 w-3 mr-1" />
                              Delete
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteDialog} onOpenChange={() => { setDeleteDialog(null); setDeleteReason(""); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Pump Entry</DialogTitle>
            <DialogDescription>
              This will permanently delete the entry by{" "}
              <strong>{deleteDialog?.sale.staff?.full_name || "Unknown"}</strong> for pump{" "}
              <strong>{deleteDialog?.sale.pump?.name}</strong> ({deleteDialog?.sale.liters_sold?.toLocaleString()} {deleteDialog?.sale.pump?.unit || "L"} sold).
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="delete-reason">Reason for Deletion</Label>
            <Textarea
              id="delete-reason"
              value={deleteReason}
              onChange={(e) => setDeleteReason(e.target.value)}
              placeholder="e.g., Wrong data submitted, duplicate entry, wrong cashier..."
              className="mt-2"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setDeleteDialog(null); setDeleteReason(""); }}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteSale}
              disabled={!deleteReason.trim() || deleteSale.isPending}
            >
              {deleteSale.isPending ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4 mr-2" />
              )}
              Delete Entry
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
