import { useState, useMemo } from "react";
import { format } from "date-fns";
import { Calendar as CalendarIcon, Search, Banknote, CreditCard, Smartphone, Building2, CheckCircle2, AlertCircle, HelpCircle, ChevronDown, ChevronRight, Loader2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { useSettlements, useCreateSettlement, useDailySalesPaymentSummary } from "@/hooks/useSettlements";
import { useStaffMembers } from "@/hooks/useStaffMembers";
import { useCurrency } from "@/hooks/useCurrency";
import { useBranchContext } from "@/contexts/BranchContext";
import { useBusiness } from "@/hooks/useBusiness";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { DateRange } from "react-day-picker";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useBusinessPlan } from "@/hooks/useFeatureGating";
import { UpgradeRequired } from "@/components/subscription/UpgradeRequired";

const paymentTypeIcons: Record<string, React.ReactNode> = {
  cash: <Banknote className="h-4 w-4" />,
  card: <CreditCard className="h-4 w-4" />,
  transfer: <Smartphone className="h-4 w-4" />,
  bank: <Building2 className="h-4 w-4" />,
};

const sourceLabels: Record<string, string> = {
  pos_terminal: "POS Terminal",
  manual: "Manual Entry",
  bank: "Bank",
  cash: "Cash",
};

// Type for settlements from hook
interface Settlement {
  id: string;
  settlement_date: string;
  created_at: string;
  payment_type: string;
  amount: number | string;
  source: string;
  reference?: string;
  cashier?: { full_name: string };
  branch?: { name: string };
}

// Group settlements by cashier + date
interface GroupedSettlement {
  key: string;
  cashierName: string;
  branchName: string;
  date: string;
  time: string;
  cash: number;
  transfer: number;
  card: number;
  total: number;
  settlements: Settlement[];
}

function groupSettlements(settlements: Settlement[]): GroupedSettlement[] {
  const groups = new Map<string, GroupedSettlement>();
  
  settlements.forEach(s => {
    const dateKey = s.settlement_date;
    const cashierKey = s.cashier?.full_name || "Unknown";
    const key = `${dateKey}-${cashierKey}`;
    
    if (!groups.has(key)) {
      groups.set(key, {
        key,
        cashierName: s.cashier?.full_name || "—",
        branchName: s.branch?.name || "—",
        date: dateKey,
        time: s.created_at,
        cash: 0,
        transfer: 0,
        card: 0,
        total: 0,
        settlements: [],
      });
    }
    
    const group = groups.get(key)!;
    const amount = Number(s.amount) || 0;
    
    if (s.payment_type === 'cash') group.cash += amount;
    else if (s.payment_type === 'transfer') group.transfer += amount;
    else if (s.payment_type === 'card') group.card += amount;
    
    group.total += amount;
    group.settlements.push(s);
  });
  
  return Array.from(groups.values()).sort((a, b) => 
    new Date(b.date).getTime() - new Date(a.date).getTime()
  );
}

// Grouped settlements table component
function GroupedSettlementTable({ 
  settlements, 
  formatCurrency 
}: { 
  settlements: Settlement[]; 
  formatCurrency: (amount: number) => string;
}) {
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  
  const grouped = useMemo(() => groupSettlements(settlements), [settlements]);
  
  const toggleRow = (key: string) => {
    setExpandedRows(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };
  
  if (grouped.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No settlements found
      </div>
    );
  }
  
  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-8"></TableHead>
            <TableHead>Date</TableHead>
            <TableHead>Cashier</TableHead>
            <TableHead>Branch</TableHead>
            <TableHead className="text-right">Cash</TableHead>
            <TableHead className="text-right">Transfer</TableHead>
            <TableHead className="text-right">Card</TableHead>
            <TableHead className="text-right">Total</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {grouped.map((group) => {
            const isExpanded = expandedRows.has(group.key);
            return (
              <>
                <TableRow 
                  key={group.key}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => toggleRow(group.key)}
                >
                  <TableCell className="w-8">
                    {isExpanded ? (
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    )}
                  </TableCell>
                  <TableCell>{format(new Date(group.date), "MMM dd, yyyy")}</TableCell>
                  <TableCell className="font-medium">{group.cashierName}</TableCell>
                  <TableCell>{group.branchName}</TableCell>
                  <TableCell className="text-right">
                    {group.cash > 0 ? formatCurrency(group.cash) : "—"}
                  </TableCell>
                  <TableCell className="text-right">
                    {group.transfer > 0 ? formatCurrency(group.transfer) : "—"}
                  </TableCell>
                  <TableCell className="text-right">
                    {group.card > 0 ? formatCurrency(group.card) : "—"}
                  </TableCell>
                  <TableCell className="text-right font-semibold">
                    {formatCurrency(group.total)}
                  </TableCell>
                </TableRow>
                {isExpanded && (
                  <TableRow key={`${group.key}-details`}>
                    <TableCell colSpan={8} className="bg-muted/30 p-0">
                      <div className="p-4 space-y-2">
                        <p className="text-xs font-medium text-muted-foreground mb-2">Payment Breakdown</p>
                        <div className="grid gap-2 md:grid-cols-3">
                          {group.cash > 0 && (
                            <div className="flex items-center justify-between p-3 bg-background rounded-lg border">
                              <span className="flex items-center gap-2 text-sm">
                                <Banknote className="h-4 w-4 text-success" />
                                Cash
                              </span>
                              <span className="font-medium">{formatCurrency(group.cash)}</span>
                            </div>
                          )}
                          {group.transfer > 0 && (
                            <div className="flex items-center justify-between p-3 bg-background rounded-lg border">
                              <span className="flex items-center gap-2 text-sm">
                                <Smartphone className="h-4 w-4 text-purple-600" />
                                Transfer
                              </span>
                              <span className="font-medium">{formatCurrency(group.transfer)}</span>
                            </div>
                          )}
                          {group.card > 0 && (
                            <div className="flex items-center justify-between p-3 bg-background rounded-lg border">
                              <span className="flex items-center gap-2 text-sm">
                                <CreditCard className="h-4 w-4 text-blue-600" />
                                Card
                              </span>
                              <span className="font-medium">{formatCurrency(group.card)}</span>
                            </div>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-2">
                          Recorded at {format(new Date(group.time), "hh:mm a")}
                        </p>
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

// Hook to get expected sales by cashier for a specific date
function useCashierExpectedAmounts(date: string) {
  const { data: business } = useBusiness();
  const { currentBranch, isOwner } = useBranchContext();

  return useQuery({
    queryKey: ["cashier-expected-amounts", business?.id, currentBranch?.id, date],
    queryFn: async () => {
      if (!business?.id || !date) return [];

      // Get sales for the business
      let salesQuery = supabase
        .from("sales")
        .select("created_by, payment_method, total_amount, created_at")
        .eq("business_id", business.id);

      if (currentBranch?.id) {
        salesQuery = salesQuery.eq("branch_id", currentBranch.id);
      }

      const { data: salesData, error: salesError } = await salesQuery;
      if (salesError) throw salesError;

      // Filter by date
      const filteredSales = (salesData || []).filter(sale => {
        const saleDate = sale.created_at?.split('T')[0];
        return saleDate === date;
      });

      // Get user IDs from sales
      const userIds = [...new Set(filteredSales.map(s => s.created_by).filter(Boolean))];
      
      // Get staff records by user_id to map user_id -> staff.id
      // First try active staff, then fallback to any staff record
      let staffMap: Record<string, { staff_id: string; full_name: string }> = {};
      if (userIds.length > 0) {
        // Get ALL staff records for these users (both active and inactive)
        const { data: staffData } = await supabase
          .from("staff")
          .select("id, user_id, full_name, is_active")
          .eq("business_id", business.id)
          .in("user_id", userIds)
          .order("is_active", { ascending: false }) // Active first
          .order("created_at", { ascending: true });
        
        // Only take the first staff record per user_id (prefer active ones)
        (staffData || []).forEach(s => {
          if (s.user_id && !staffMap[s.user_id]) {
            staffMap[s.user_id] = { staff_id: s.id, full_name: s.full_name };
          }
        });
      }

      // Group by cashier (staff_id) and payment type
      const cashierMap = new Map<string, { 
        cashier_id: string; 
        cashier_name: string; 
        cash: number; 
        transfer: number; 
        card: number;
      }>();

      filteredSales.forEach(sale => {
        const userId = sale.created_by || 'unknown';
        const staffInfo = staffMap[userId];
        
        // Skip if no staff record found for this user
        if (!staffInfo) return;
        
        const cashierId = staffInfo.staff_id;
        const cashierName = staffInfo.full_name;
        
        if (!cashierMap.has(cashierId)) {
          cashierMap.set(cashierId, {
            cashier_id: cashierId,
            cashier_name: cashierName,
            cash: 0,
            transfer: 0,
            card: 0,
          });
        }

        const entry = cashierMap.get(cashierId)!;
        const amount = Number(sale.total_amount) || 0;
        const method = sale.payment_method?.toLowerCase() || 'cash';

        if (method.includes('cash')) entry.cash += amount;
        else if (method.includes('transfer')) entry.transfer += amount;
        else if (method.includes('card') || method.includes('pos')) entry.card += amount;
        else entry.cash += amount; // Default to cash
      });

      return Array.from(cashierMap.values());
    },
    enabled: !!business?.id && !!date,
  });
}

export default function Settlements() {
  const { data: planInfo, isLoading: planLoading } = useBusinessPlan();
  const [searchQuery, setSearchQuery] = useState("");
  const [paymentFilter, setPaymentFilter] = useState<string>("all");
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedDate, setSelectedDate] = useState(format(new Date(), "yyyy-MM-dd"));
  
  // Gate for Free plan users
  if (planLoading) {
    return (
      <div className="flex-1 overflow-y-auto p-6 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  
  if (planInfo?.effectivePlan === 'free') {
    return <UpgradeRequired featureKey="accounting.settlements" requiredPlan="professional" />;
  }
  
  // Settlement form state - now with expected amounts pre-filled
  const [settlementForm, setSettlementForm] = useState<{
    cashier_id: string;
    cashier_name: string;
    expected_cash: number;
    expected_transfer: number;
    expected_card: number;
    actual_cash: string;
    actual_transfer: string;
    actual_card: string;
    notes: string;
  }>({
    cashier_id: "",
    cashier_name: "",
    expected_cash: 0,
    expected_transfer: 0,
    expected_card: 0,
    actual_cash: "",
    actual_transfer: "",
    actual_card: "",
    notes: "",
  });

  const { formatCurrency } = useCurrency();
  const { currentBranch } = useBranchContext();
  
  const { data: settlements = [], isLoading } = useSettlements(
    dateRange?.from && dateRange?.to ? { from: dateRange.from, to: dateRange.to } : undefined
  );
  const { data: salesPaymentSummary } = useDailySalesPaymentSummary(selectedDate, currentBranch?.id);
  const { data: cashierExpected = [] } = useCashierExpectedAmounts(selectedDate);
  const { data: staffMembers = [] } = useStaffMembers();
  const createSettlement = useCreateSettlement();

  const filteredSettlements = settlements.filter(settlement => {
    const matchesSearch = 
      settlement.cashier?.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      settlement.reference?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesPayment = paymentFilter === "all" || settlement.payment_type === paymentFilter;
    
    return matchesSearch && matchesPayment;
  });

  // Calculate expected amounts from daily sales for the selected date
  const expectedTotals = useMemo(() => {
    return {
      cash: cashierExpected.reduce((sum, c) => sum + c.cash, 0),
      transfer: cashierExpected.reduce((sum, c) => sum + c.transfer, 0),
      card: cashierExpected.reduce((sum, c) => sum + c.card, 0),
    };
  }, [cashierExpected]);

  // Calculate actual settlements for the selected date
  const actualTotals = useMemo(() => {
    const dateSettlements = settlements.filter(s => s.settlement_date === selectedDate);
    return dateSettlements.reduce((acc, s) => {
      acc[s.payment_type] = (acc[s.payment_type] || 0) + Number(s.amount);
      return acc;
    }, { cash: 0, transfer: 0, card: 0 } as Record<string, number>);
  }, [settlements, selectedDate]);

  // Calculate differences and status
  const getStatus = (expected: number, actual: number) => {
    const diff = actual - expected;
    if (Math.abs(diff) < 1) return { status: 'balanced', label: 'Balanced', color: 'text-green-600 bg-green-100' };
    if (diff < 0) return { status: 'shortage', label: 'Shortage', color: 'text-red-600 bg-red-100' };
    return { status: 'excess', label: 'Excess', color: 'text-blue-600 bg-blue-100' };
  };

  const openSettlementDialog = (cashierData?: { cashier_id: string; cashier_name: string; cash: number; transfer: number; card: number }) => {
    if (cashierData) {
      setSettlementForm({
        cashier_id: cashierData.cashier_id,
        cashier_name: cashierData.cashier_name,
        expected_cash: cashierData.cash,
        expected_transfer: cashierData.transfer,
        expected_card: cashierData.card,
        actual_cash: cashierData.cash.toString(),
        actual_transfer: cashierData.transfer.toString(),
        actual_card: cashierData.card.toString(),
        notes: "",
      });
    } else {
      setSettlementForm({
        cashier_id: "",
        cashier_name: "",
        expected_cash: 0,
        expected_transfer: 0,
        expected_card: 0,
        actual_cash: "",
        actual_transfer: "",
        actual_card: "",
        notes: "",
      });
    }
    setIsDialogOpen(true);
  };

  const handleSubmitSettlement = async () => {
    if (!settlementForm.cashier_id || isSubmitting) return;
    setIsSubmitting(true);

    try {
    const { data: existingSettlements } = await supabase
      .from("settlements")
      .select("id, payment_type")
      .eq("cashier_id", settlementForm.cashier_id)
      .eq("settlement_date", selectedDate);

    const existingTypes = new Set((existingSettlements || []).map(s => s.payment_type));

    const newSettlements = [];
    
    // Create settlement for each payment type that has an amount AND doesn't already exist
    if (parseFloat(settlementForm.actual_cash) > 0 && !existingTypes.has("cash")) {
      newSettlements.push({
        cashier_id: settlementForm.cashier_id,
        payment_type: "cash",
        amount: parseFloat(settlementForm.actual_cash),
        source: "manual" as const,
        notes: settlementForm.notes || undefined,
        settlement_date: selectedDate,
      });
    }
    if (parseFloat(settlementForm.actual_transfer) > 0 && !existingTypes.has("transfer")) {
      newSettlements.push({
        cashier_id: settlementForm.cashier_id,
        payment_type: "transfer",
        amount: parseFloat(settlementForm.actual_transfer),
        source: "pos_terminal" as const,
        notes: settlementForm.notes || undefined,
        settlement_date: selectedDate,
      });
    }
    if (parseFloat(settlementForm.actual_card) > 0 && !existingTypes.has("card")) {
      newSettlements.push({
        cashier_id: settlementForm.cashier_id,
        payment_type: "card",
        amount: parseFloat(settlementForm.actual_card),
        source: "pos_terminal" as const,
        notes: settlementForm.notes || undefined,
        settlement_date: selectedDate,
      });
    }

    if (newSettlements.length === 0) {
      const { toast } = await import("sonner");
      toast.error("Settlements already recorded for this cashier on this date.");
      return;
    }

    // Create all settlements
    for (const s of newSettlements) {
      await createSettlement.mutateAsync(s);
    }

    setIsDialogOpen(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Calculate variances for the form
  const cashVariance = parseFloat(settlementForm.actual_cash || "0") - settlementForm.expected_cash;
  const transferVariance = parseFloat(settlementForm.actual_transfer || "0") - settlementForm.expected_transfer;
  const cardVariance = parseFloat(settlementForm.actual_card || "0") - settlementForm.expected_card;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight">Settlements</h1>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <HelpCircle className="h-4 w-4 text-muted-foreground" />
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  <p className="text-sm">
                    <strong>What is this?</strong> At end of shift, cashiers record what they actually collected. 
                    The system compares this against expected sales to identify any shortages or excesses.
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <p className="text-muted-foreground">
            Compare expected vs actual collections
            {currentBranch && ` for ${currentBranch.name}`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="w-[180px]"
          />
        </div>
      </div>

      {/* Help Alert */}
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          <strong>How it works:</strong> Select a cashier below to record their end-of-shift settlement. 
          Expected amounts are pre-filled from POS sales. Adjust if the actual collected amount differs, then save.
        </AlertDescription>
      </Alert>

      {/* Cashier Expected Amounts - Quick Settlement Cards */}
      <Card>
        <CardHeader>
          <CardTitle>Cashier Settlements for {format(new Date(selectedDate), "MMM dd, yyyy")}</CardTitle>
          <CardDescription>Click on a cashier to record their settlement</CardDescription>
        </CardHeader>
        <CardContent>
          {cashierExpected.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No sales found for this date. Make sales in POS first.
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {cashierExpected.map((cashier) => {
                const total = cashier.cash + cashier.transfer + cashier.card;
                return (
                  <Card 
                    key={cashier.cashier_id} 
                    className="cursor-pointer hover:border-primary transition-colors"
                    onClick={() => openSettlementDialog(cashier)}
                  >
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base">{cashier.cashier_name}</CardTitle>
                      <CardDescription>Expected from sales</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="flex items-center gap-1"><Banknote className="h-3 w-3" /> Cash</span>
                        <span className="font-medium">{formatCurrency(cashier.cash)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="flex items-center gap-1"><Smartphone className="h-3 w-3" /> Transfer</span>
                        <span className="font-medium">{formatCurrency(cashier.transfer)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="flex items-center gap-1"><CreditCard className="h-3 w-3" /> Card</span>
                        <span className="font-medium">{formatCurrency(cashier.card)}</span>
                      </div>
                      <div className="border-t pt-2 flex justify-between font-semibold">
                        <span>Total</span>
                        <span>{formatCurrency(total)}</span>
                      </div>
                      <Button className="w-full mt-2" size="sm">
                        <CheckCircle2 className="mr-2 h-4 w-4" />
                        Record Settlement
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Settlement Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Record Settlement for {settlementForm.cashier_name}</DialogTitle>
            <DialogDescription>
              Confirm or adjust the amounts actually collected. Pre-filled from expected sales.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            {/* Cash */}
            <div className="grid gap-2">
              <div className="flex items-center justify-between">
                <Label className="flex items-center gap-2">
                  <Banknote className="h-4 w-4" /> Cash Collected
                </Label>
                <span className="text-xs text-muted-foreground">
                  Expected: {formatCurrency(settlementForm.expected_cash)}
                </span>
              </div>
              <Input
                type="number"
                placeholder="0.00"
                value={settlementForm.actual_cash}
                onChange={(e) => setSettlementForm({ ...settlementForm, actual_cash: e.target.value })}
              />
              {cashVariance !== 0 && (
                <span className={cn("text-xs", cashVariance > 0 ? "text-green-600" : "text-red-600")}>
                  {cashVariance > 0 ? "+" : ""}{formatCurrency(cashVariance)} variance
                </span>
              )}
            </div>

            {/* Transfer */}
            <div className="grid gap-2">
              <div className="flex items-center justify-between">
                <Label className="flex items-center gap-2">
                  <Smartphone className="h-4 w-4" /> Transfer Collected
                </Label>
                <span className="text-xs text-muted-foreground">
                  Expected: {formatCurrency(settlementForm.expected_transfer)}
                </span>
              </div>
              <Input
                type="number"
                placeholder="0.00"
                value={settlementForm.actual_transfer}
                onChange={(e) => setSettlementForm({ ...settlementForm, actual_transfer: e.target.value })}
              />
              {transferVariance !== 0 && (
                <span className={cn("text-xs", transferVariance > 0 ? "text-green-600" : "text-red-600")}>
                  {transferVariance > 0 ? "+" : ""}{formatCurrency(transferVariance)} variance
                </span>
              )}
            </div>

            {/* Card */}
            <div className="grid gap-2">
              <div className="flex items-center justify-between">
                <Label className="flex items-center gap-2">
                  <CreditCard className="h-4 w-4" /> Card Collected
                </Label>
                <span className="text-xs text-muted-foreground">
                  Expected: {formatCurrency(settlementForm.expected_card)}
                </span>
              </div>
              <Input
                type="number"
                placeholder="0.00"
                value={settlementForm.actual_card}
                onChange={(e) => setSettlementForm({ ...settlementForm, actual_card: e.target.value })}
              />
              {cardVariance !== 0 && (
                <span className={cn("text-xs", cardVariance > 0 ? "text-green-600" : "text-red-600")}>
                  {cardVariance > 0 ? "+" : ""}{formatCurrency(cardVariance)} variance
                </span>
              )}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="notes">Notes (if any variance)</Label>
              <Textarea
                id="notes"
                placeholder="Explain any difference between expected and actual..."
                value={settlementForm.notes}
                onChange={(e) => setSettlementForm({ ...settlementForm, notes: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleSubmitSettlement}
              disabled={isSubmitting || createSettlement.isPending || !settlementForm.cashier_id}
            >
              {isSubmitting || createSettlement.isPending ? "Saving..." : "Confirm Settlement"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Daily Summary - Expected vs Actual */}
      <Card>
        <CardHeader>
          <CardTitle>Daily Summary - {format(new Date(selectedDate), "MMM dd, yyyy")}</CardTitle>
          <CardDescription>Expected from sales vs Actual settlements</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            {/* Cash */}
            {(() => {
              const status = getStatus(expectedTotals.cash, actualTotals.cash || 0);
              const diff = (actualTotals.cash || 0) - expectedTotals.cash;
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
                      <p className="font-semibold">{formatCurrency(expectedTotals.cash)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Actual</p>
                      <p className="font-semibold">{formatCurrency(actualTotals.cash || 0)}</p>
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
              const status = getStatus(expectedTotals.transfer, actualTotals.transfer || 0);
              const diff = (actualTotals.transfer || 0) - expectedTotals.transfer;
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
                      <p className="font-semibold">{formatCurrency(expectedTotals.transfer)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Actual</p>
                      <p className="font-semibold">{formatCurrency(actualTotals.transfer || 0)}</p>
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
              const status = getStatus(expectedTotals.card, actualTotals.card || 0);
              const diff = (actualTotals.card || 0) - expectedTotals.card;
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
                      <p className="font-semibold">{formatCurrency(expectedTotals.card)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Actual</p>
                      <p className="font-semibold">{formatCurrency(actualTotals.card || 0)}</p>
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
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-sm text-muted-foreground">Total Expected</p>
                <p className="text-xl font-bold">
                  {formatCurrency(expectedTotals.cash + expectedTotals.transfer + expectedTotals.card)}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Actual</p>
                <p className="text-xl font-bold">
                  {formatCurrency((actualTotals.cash || 0) + (actualTotals.transfer || 0) + (actualTotals.card || 0))}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Net Difference</p>
                {(() => {
                  const totalExpected = expectedTotals.cash + expectedTotals.transfer + expectedTotals.card;
                  const totalActual = (actualTotals.cash || 0) + (actualTotals.transfer || 0) + (actualTotals.card || 0);
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


      {/* Grouped Settlement Records */}
      <Card>
        <CardHeader>
          <CardTitle>Settlement Records</CardTitle>
          <CardDescription>Click on a row to see payment breakdown</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4 md:flex-row md:items-center mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by cashier or reference..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={paymentFilter} onValueChange={setPaymentFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Payment type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="cash">Cash</SelectItem>
                <SelectItem value="transfer">Transfer</SelectItem>
                <SelectItem value="card">Card</SelectItem>
              </SelectContent>
            </Select>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className={cn("w-[280px] justify-start text-left font-normal", !dateRange && "text-muted-foreground")}>
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dateRange?.from ? (
                    dateRange.to ? (
                      <>
                        {format(dateRange.from, "LLL dd, y")} - {format(dateRange.to, "LLL dd, y")}
                      </>
                    ) : (
                      format(dateRange.from, "LLL dd, y")
                    )
                  ) : (
                    "Pick a date range"
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  initialFocus
                  mode="range"
                  defaultMonth={dateRange?.from}
                  selected={dateRange}
                  onSelect={setDateRange}
                  numberOfMonths={2}
                />
              </PopoverContent>
            </Popover>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : (
            <GroupedSettlementTable settlements={filteredSettlements} formatCurrency={formatCurrency} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
