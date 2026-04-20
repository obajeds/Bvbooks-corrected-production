import { useState, useMemo, useCallback } from "react";
import { startOfDay, startOfWeek, startOfMonth, format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Search, Loader2, Receipt, RotateCcw, AlertTriangle, DollarSign, Eye, Printer, ChevronLeft, ChevronRight, TrendingUp, TrendingDown, Wallet } from "lucide-react";
import { printInvoice } from "@/components/sales/InvoicePrint";
import { useSales, Sale } from "@/hooks/useSales";
import { supabase } from "@/integrations/supabase/client";
import { useUserRole } from "@/hooks/useUserRole";
import { useBranchContext } from "@/contexts/BranchContext";
import { useCreateApprovalRequest } from "@/hooks/useApprovalRequests";
import { useStaff } from "@/hooks/useStaff";
import { useHasPermission } from "@/hooks/usePermissions";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useBusiness } from "@/hooks/useBusiness";
import { useCurrency } from "@/hooks/useCurrency";
import { useTotalSales } from "@/hooks/useDashboardStats";
import { SaleDetailsDialog } from "@/components/sales/SaleDetailsDialog";
import { useExpenses } from "@/hooks/useExpenses";
import { DateRangeFilter } from "@/components/inventory/DateRangeFilter";
import { DateRange } from "react-day-picker";

const ITEMS_PER_PAGE = 20;

const Sales = () => {
  const { currentBranch } = useBranchContext();
  const { user } = useAuth();
  const { data: business } = useBusiness();
  const { data: roleData } = useUserRole();
  const { data: staffList = [], isLoading: staffLoading } = useStaff();
  const { formatCurrency } = useCurrency();
  const { toast } = useToast();

  const userRole = roleData?.role;
  const isOwner = roleData?.isOwner ?? false;
  const canSeeAllSales = isOwner || (userRole && ["manager", "supervisor"].includes(userRole.toLowerCase()));

  const [searchTerm, setSearchTerm] = useState("");
  const [paymentFilter, setPaymentFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("today");
  const [customRange, setCustomRange] = useState<DateRange | undefined>();
  const [soldByFilter, setSoldByFilter] = useState("all");
  const [refundDialogOpen, setRefundDialogOpen] = useState(false);
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [refundReason, setRefundReason] = useState("");
  const [detailsSale, setDetailsSale] = useState<Sale | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  const { data: sales = [], isLoading } = useSales({
    branchId: currentBranch?.id,
    staffFilter: canSeeAllSales ? soldByFilter : undefined,
    userRole: userRole,
    userId: user?.id,
  });

  const { data: salesData } = useTotalSales();
  const createApprovalRequest = useCreateApprovalRequest();

  const canApproveRefunds = useHasPermission("approval.refund");
  const canRequestRefund = useHasPermission("pos.sale.refund");
  const currentStaff = staffList.find(s => s.user_id === user?.id);

  // Build "Sold By" dropdown options: staff + owner
  const soldByOptions = useMemo(() => {
    const options: { value: string; label: string }[] = [{ value: "all", label: "All Staff" }];
    if (business?.owner_user_id) {
      const ownerName = business.owner_name?.split(" ")[0] || "Owner";
      options.push({ value: business.owner_user_id, label: `${ownerName} (Owner)` });
    }
    staffList.forEach((s) => {
      if (s.user_id) {
        const firstName = s.full_name?.split(" ")[0] || s.email?.split("@")[0] || "Staff";
        options.push({ value: s.user_id, label: `${firstName} (${s.role || "Staff"})` });
      }
    });
    return options;
  }, [staffList, business]);

  const handleSoldByFilterChange = (value: string) => { setSoldByFilter(value); setCurrentPage(1); };

  // Compute expense date filter to match sales date filter
  const expenseDateFilter = useMemo(() => {
    const now = new Date();
    switch (dateFilter) {
      case "today":
        return { from: format(now, "yyyy-MM-dd"), to: format(now, "yyyy-MM-dd") };
      case "week":
        return { from: format(startOfWeek(now, { weekStartsOn: 1 }), "yyyy-MM-dd"), to: format(now, "yyyy-MM-dd") };
      case "month":
        return { from: format(startOfMonth(now), "yyyy-MM-dd"), to: format(now, "yyyy-MM-dd") };
      case "custom":
        if (customRange?.from) {
          return { from: format(customRange.from, "yyyy-MM-dd"), to: format(customRange.to || customRange.from, "yyyy-MM-dd") };
        }
        return { from: format(now, "yyyy-MM-dd"), to: format(now, "yyyy-MM-dd") };
      default:
        return undefined; // all time
    }
  }, [dateFilter, customRange]);

  const { data: expensesForPeriod = [] } = useExpenses(expenseDateFilter, currentBranch?.id);

  const filteredSales = sales.filter((sale) => {
    const matchesSearch = sale.invoice_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      sale.customer?.name?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesPayment = paymentFilter === "all" || sale.payment_method === paymentFilter;
    const saleDate = new Date(sale.created_at);
    const now = new Date();
    let matchesDate = true;
    if (dateFilter === "today") matchesDate = saleDate >= startOfDay(now);
    else if (dateFilter === "week") matchesDate = saleDate >= startOfWeek(now, { weekStartsOn: 1 });
    else if (dateFilter === "month") matchesDate = saleDate >= startOfMonth(now);
    else if (dateFilter === "custom" && customRange?.from) {
      const from = startOfDay(customRange.from);
      const to = customRange.to ? new Date(new Date(customRange.to).setHours(23, 59, 59, 999)) : new Date(new Date(customRange.from).setHours(23, 59, 59, 999));
      matchesDate = saleDate >= from && saleDate <= to;
    }
    return matchesSearch && matchesPayment && matchesDate;
  });

  const totalSalesAmount = useMemo(() => filteredSales.reduce((sum, s) => sum + Number(s.total_amount), 0), [filteredSales]);
  const totalExpenditure = useMemo(() => expensesForPeriod.reduce((sum, e) => sum + (e.amount || 0), 0), [expensesForPeriod]);
  const netAmount = totalSalesAmount - totalExpenditure;

  const totalPages = Math.ceil(filteredSales.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedSales = filteredSales.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  // Reset to page 1 when filters change
  const handleSearchChange = (value: string) => { setSearchTerm(value); setCurrentPage(1); };
  const handleDateFilterChange = (value: string) => { setDateFilter(value); setCurrentPage(1); };
  const handlePaymentFilterChange = (value: string) => { setPaymentFilter(value); setCurrentPage(1); };

  const handleRefundRequest = (sale: Sale) => {
    setSelectedSale(sale);
    setRefundDialogOpen(true);
    setRefundReason("");
  };

  const handleViewDetails = (sale: Sale, soldByName: string) => {
    setDetailsSale({ ...sale, sold_by_name: soldByName } as any);
    setDetailsOpen(true);
  };

  const handleReprintReceipt = (sale: Sale, soldByName: string) => {
    const saleForPrint = {
      ...sale,
      subtotal: Number(sale.subtotal) || Number(sale.total_amount),
      discount_amount: Number(sale.discount_amount) || 0,
      tax_amount: Number(sale.tax_amount) || 0,
    };
    
    printInvoice(saleForPrint as any, {
      businessName: business?.trading_name || business?.legal_name,
      businessAddress: business?.address || undefined,
      businessPhone: business?.phone || undefined,
      businessLogo: business?.logo_url,
      cashierName: soldByName !== "Unknown" ? soldByName : undefined,
    });
  };

  const submitRefundRequest = async () => {
    if (!selectedSale) {
      toast({ title: "No sale selected", variant: "destructive" });
      return;
    }
    
    if (staffLoading) {
      toast({ title: "Please wait, loading staff data...", variant: "destructive" });
      return;
    }
    
    let requesterId = currentStaff?.id;
    
    // Owner fallback: useStaff() filters out owner role, so query directly
    if (!requesterId && isOwner && user?.id && business?.id) {
      const { data: ownerStaff } = await supabase
        .from("staff")
        .select("id")
        .eq("user_id", user.id)
        .eq("business_id", business.id)
        .maybeSingle();
      requesterId = ownerStaff?.id;
    }
    
    if (!requesterId) {
      toast({ 
        title: "Unable to submit refund request", 
        description: "Your user account is not linked to a staff record. Please contact an administrator.",
        variant: "destructive" 
      });
      return;
    }

    try {
      await createApprovalRequest.mutateAsync({
        request_type: "refund",
        requested_by: requesterId,
        amount: Number(selectedSale.total_amount),
        reference_id: selectedSale.id,
        reference_type: "sale",
        notes: `Refund for invoice ${selectedSale.invoice_number}. Reason: ${refundReason || 'No reason provided'}`,
      });

      toast({
        title: canApproveRefunds ? "Refund request submitted" : "Refund request pending approval",
        description: canApproveRefunds 
          ? "You can approve this request in the Approvals page." 
          : "A manager will review your refund request.",
      });
      
      setRefundDialogOpen(false);
      setSelectedSale(null);
      setRefundReason("");
    } catch (error) {
      toast({ title: "Failed to submit refund request", variant: "destructive" });
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
    <main className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Sales</h1>
        <p className="text-muted-foreground">View and manage sales transactions</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="rounded-full p-2 bg-primary/10">
              <TrendingUp className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total Sales</p>
              <p className="text-lg font-bold">{formatCurrency(totalSalesAmount)}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="rounded-full p-2 bg-destructive/10">
              <TrendingDown className="h-5 w-5 text-destructive" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Expenditures</p>
              <p className="text-lg font-bold">{formatCurrency(totalExpenditure)}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className={`rounded-full p-2 ${netAmount >= 0 ? 'bg-primary/10' : 'bg-destructive/10'}`}>
              <Wallet className={`h-5 w-5 ${netAmount >= 0 ? 'text-primary' : 'text-destructive'}`} />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Net</p>
              <p className="text-lg font-bold">{formatCurrency(netAmount)}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5" />
            Sales History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search sales..."
                value={searchTerm}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex gap-2 flex-wrap w-full sm:w-auto">
              <Select value={dateFilter} onValueChange={handleDateFilterChange}>
                <SelectTrigger className="w-full sm:w-[150px]">
                  <SelectValue placeholder="Period" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="week">This Week</SelectItem>
                  <SelectItem value="month">This Month</SelectItem>
                  <SelectItem value="custom">Custom Date</SelectItem>
                  <SelectItem value="all">All Time</SelectItem>
                </SelectContent>
              </Select>
              {dateFilter === "custom" && (
                <DateRangeFilter dateRange={customRange} onDateRangeChange={setCustomRange} />
              )}
              <Select value={paymentFilter} onValueChange={handlePaymentFilterChange}>
                <SelectTrigger className="w-full sm:w-[150px]">
                  <SelectValue placeholder="Payment method" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Methods</SelectItem>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="transfer">Transfer</SelectItem>
                  <SelectItem value="card">Card</SelectItem>
                </SelectContent>
              </Select>
              {canSeeAllSales && (
                <Select value={soldByFilter} onValueChange={handleSoldByFilterChange}>
                  <SelectTrigger className="w-full sm:w-[150px]">
                    <SelectValue placeholder="Sold by" />
                  </SelectTrigger>
                  <SelectContent>
                    {soldByOptions.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          </div>

          {filteredSales.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Receipt className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No sales found. Make your first sale from the POS.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Invoice</TableHead>
                    <TableHead className="hidden sm:table-cell">Customer</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead className="hidden md:table-cell">Payment</TableHead>
                    <TableHead className="hidden sm:table-cell">Status</TableHead>
                    <TableHead className="hidden sm:table-cell">Sold By</TableHead>
                    <TableHead>Timestamp</TableHead>
                    <TableHead className="text-center">Details</TableHead>
                    {canRequestRefund && <TableHead className="text-right">Actions</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedSales.map((sale) => {
                    const soldByStaff = staffList.find(s => s.user_id === sale.created_by);
                    // Check if created_by is the business owner
                    const isOwnerSale = business?.owner_user_id === sale.created_by;
                    const ownerName = isOwnerSale ? business?.owner_name?.split(' ')[0] : null;
                    
                    // Get display name: staff name, owner name, or fallback to "Unknown"
                    const firstName = soldByStaff?.full_name?.split(' ')[0] || ownerName;
                    const role = soldByStaff?.role || (isOwnerSale ? "Owner" : null);
                    const soldByDisplay = firstName && role ? `${firstName} (${role})` : "Unknown";
                    
                    return (
                      <TableRow key={sale.id}>
                        <TableCell className="font-medium">{sale.invoice_number}</TableCell>
                        <TableCell className="hidden sm:table-cell">{sale.customer?.name || "Walk-in"}</TableCell>
                        <TableCell>{formatCurrency(Number(sale.total_amount))}</TableCell>
                        <TableCell className="hidden md:table-cell capitalize">{sale.payment_method}</TableCell>
                        <TableCell className="hidden sm:table-cell">
                          <Badge className="bg-green-500">{sale.payment_status}</Badge>
                        </TableCell>
                        <TableCell className="hidden sm:table-cell">
                          <span className="text-sm">{soldByDisplay}</span>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="text-sm">{new Date(sale.created_at).toLocaleDateString()}</span>
                            <span className="text-xs text-muted-foreground">{new Date(sale.created_at).toLocaleTimeString()}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex items-center justify-center gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleViewDetails(sale, soldByDisplay)}
                              title="View Details"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleReprintReceipt(sale, soldByDisplay)}
                              title="Reprint Receipt"
                            >
                              <Printer className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                        {canRequestRefund && (
                          <TableCell className="text-right">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleRefundRequest(sale)}
                            >
                              <RotateCcw className="h-4 w-4 mr-1" />
                              Refund
                            </Button>
                          </TableCell>
                        )}
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
        <CardFooter className="border-t pt-4">
          <div className="flex flex-col gap-4 w-full">
            <div className="flex items-center justify-between gap-3 w-full">
              <div className="flex items-center gap-2 p-3 bg-primary/10 rounded-lg">
                <DollarSign className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-xs text-muted-foreground">Today's Total Sales</p>
                  <p className="text-lg font-bold text-primary">{formatCurrency(salesData?.today || 0)}</p>
                </div>
              </div>
              {filteredSales.length > 0 && (
                <p className="text-sm text-muted-foreground">
                  Showing {startIndex + 1}–{Math.min(startIndex + ITEMS_PER_PAGE, filteredSales.length)} of {filteredSales.length} sales
                </p>
              )}
            </div>
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Previous
                </Button>
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter(page => page === 1 || page === totalPages || Math.abs(page - currentPage) <= 1)
                  .map((page, idx, arr) => (
                    <span key={page} className="flex items-center">
                      {idx > 0 && arr[idx - 1] !== page - 1 && (
                        <span className="px-2 text-muted-foreground">…</span>
                      )}
                      <Button
                        variant={page === currentPage ? "default" : "outline"}
                        size="sm"
                        className="min-w-[2rem]"
                        onClick={() => setCurrentPage(page)}
                      >
                        {page}
                      </Button>
                    </span>
                  ))}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                >
                  Next
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            )}
          </div>
        </CardFooter>
      </Card>

      {/* Refund Request Dialog */}
      <Dialog open={refundDialogOpen} onOpenChange={setRefundDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request Refund</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {selectedSale && (
              <div className="p-4 bg-muted rounded-lg space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Invoice:</span>
                  <span className="font-medium">{selectedSale.invoice_number}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Amount:</span>
                  <span className="font-medium">{formatCurrency(Number(selectedSale.total_amount))}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Date:</span>
                  <span>{new Date(selectedSale.created_at).toLocaleDateString()}</span>
                </div>
              </div>
            )}
            <div className="space-y-2">
              <Label>Reason for refund</Label>
              <Textarea
                value={refundReason}
                onChange={(e) => setRefundReason(e.target.value)}
                placeholder="Please provide a reason for this refund request..."
              />
            </div>
            {!canApproveRefunds && (
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" />
                Refund requests require manager approval
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRefundDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={submitRefundRequest}
              disabled={createApprovalRequest.isPending}
            >
              {createApprovalRequest.isPending ? "Submitting..." : "Submit Request"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Sale Details Dialog */}
      <SaleDetailsDialog
        sale={detailsSale}
        open={detailsOpen}
        onOpenChange={setDetailsOpen}
      />
    </main>
  );
};

export default Sales;