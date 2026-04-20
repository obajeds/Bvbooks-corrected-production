import { useState, useMemo, useEffect, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Fuel, Calculator, Check, Lock, AlertCircle, Save, Receipt, Minus, Wallet, ShoppingCart } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { usePumps } from "@/hooks/usePumps";
import { 
  useMySales, 
  usePreviousClosingMeter, 
  useCreateDailySale, 
  useSubmitDailySale,
  useCurrentStaffId,
  useIsBusinessOwner,
  useBranchDailySales,
  useLastSubmissionTime
} from "@/hooks/useDailyPumpSales";
import { useCurrency } from "@/hooks/useCurrency";
import { useTodaysExpenses } from "@/hooks/useExpenses";
import { useDailySalesPaymentSummary } from "@/hooks/useSettlements";
import { useBranchContext } from "@/contexts/BranchContext";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { PumpSalesHistory } from "@/components/gas/PumpSalesHistory";

const schema = z.object({
  pump_id: z.string().min(1, "Please select a pump"),
  closing_meter: z.coerce.number().min(0, "Must be a positive number"),
  cash_collected: z.coerce.number().min(0, "Must be a positive number"),
  transfer_collected: z.coerce.number().min(0, "Must be a positive number"),
  pos_collected: z.coerce.number().min(0, "Must be a positive number"), // Card
  notes: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

export default function CashierSalesEntry() {
  const { formatCurrency } = useCurrency();
  const { currentBranch } = useBranchContext();
  const { user } = useAuth();
  const today = format(new Date(), "yyyy-MM-dd");
  
  const { data: pumps = [], isLoading: pumpsLoading } = usePumps();
  const { data: staffId, isLoading: staffLoading } = useCurrentStaffId();
  const { data: isOwner = false, isLoading: ownerLoading } = useIsBusinessOwner();
  const { data: mySales = [], isLoading: salesLoading } = useMySales();
  const { data: branchSales = [], isLoading: branchSalesLoading } = useBranchDailySales(today, currentBranch?.id);
  const { data: lastSubmissionTime } = useLastSubmissionTime();
  
  // Only scope shop sales/expenses to the current user when they are an active cashier (have a staff record).
  // Owners/admins without a staff record see branch-wide data.
  // Shop sales: show ALL branch sales after last submission (not filtered by cashier)
  // Expenses: keep cashier-scoped so each cashier sees only their own expenses
  const submissionCutoff = staffId ? lastSubmissionTime : undefined;
  
  const { data: todaysExpenses, isLoading: expensesLoading } = useTodaysExpenses(undefined, staffId ? user?.id : undefined, submissionCutoff);
  const { data: salesPaymentSummary, isLoading: salesSummaryLoading } = useDailySalesPaymentSummary(today, currentBranch?.id, undefined, submissionCutoff);
  
  // For owners without staff ID, show branch sales in read-only mode
  const canEnterSales = !!staffId;
  const isViewOnlyOwner = isOwner && !staffId;
  const displaySales = staffId ? mySales : (isOwner ? branchSales : []);
  
  const createSale = useCreateDailySale();
  const submitSale = useSubmitDailySale();
  
  const [selectedPumpId, setSelectedPumpId] = useState<string>("");
  const [currentEntryId, setCurrentEntryId] = useState<string | null>(null);
  const { data: previousMeter = 0 } = usePreviousClosingMeter(selectedPumpId);
  
  const selectedPump = pumps.find(p => p.id === selectedPumpId);
  
  // Compute live summary from actual sales data - SINGLE SOURCE OF TRUTH
  // Plus include current form values for true real-time display
  
  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      pump_id: "",
      closing_meter: 0,
      cash_collected: 0,
      transfer_collected: 0,
      pos_collected: 0,
      notes: "",
    },
  });

  // Auto-save disabled - entries are only saved when submission button is clicked

  // Track if we've loaded data for current pump to prevent re-resetting
  const [loadedPumpId, setLoadedPumpId] = useState<string | null>(null);

  // Check if there's already a pending entry for this pump today
  // Allow multiple entries per pump per day (for different shifts)
  // Only reset form when pump selection CHANGES, not on every displaySales update
  useEffect(() => {
    if (selectedPumpId && canEnterSales && selectedPumpId !== loadedPumpId) {
      // Only load pending entries for editing - submitted entries stay locked
      const pendingEntry = displaySales.find(
        s => s.pump_id === selectedPumpId && s.status === 'pending'
      );
      if (pendingEntry) {
        setCurrentEntryId(pendingEntry.id);
        form.reset({
          pump_id: pendingEntry.pump_id,
          closing_meter: pendingEntry.closing_meter,
          cash_collected: pendingEntry.cash_collected,
          transfer_collected: pendingEntry.transfer_collected,
          pos_collected: pendingEntry.pos_collected,
          notes: pendingEntry.notes || "",
        });
      } else {
        // No pending entry - allow creating new entry (even if submitted ones exist)
        setCurrentEntryId(null);
        // Reset form for new entry
        form.reset({
          pump_id: selectedPumpId,
          closing_meter: 0,
          cash_collected: 0,
          transfer_collected: 0,
          pos_collected: 0,
          notes: "",
        });
      }
      setLoadedPumpId(selectedPumpId);
    }
  }, [selectedPumpId, canEnterSales]);

  // Update currentEntryId when a new entry is created (from auto-save creating it)
  useEffect(() => {
    if (selectedPumpId && !currentEntryId && loadedPumpId === selectedPumpId) {
      const pendingEntry = displaySales.find(
        s => s.pump_id === selectedPumpId && s.status === 'pending'
      );
      if (pendingEntry) {
        setCurrentEntryId(pendingEntry.id);
      }
    }
  }, [displaySales, selectedPumpId, currentEntryId, loadedPumpId]);

  const closingMeter = form.watch("closing_meter");
  const cashCollected = form.watch("cash_collected");
  const transferCollected = form.watch("transfer_collected");
  const posCollected = form.watch("pos_collected"); // Card

  // Real-time calculations for current form entry
  const calculations = useMemo(() => {
    const liters = Math.max(0, closingMeter - previousMeter);
    const pricePerLiter = selectedPump?.price_per_liter ?? 0;
    const expectedRevenue = liters * pricePerLiter;
    const totalCollected = cashCollected + transferCollected + posCollected;
    const variance = totalCollected - expectedRevenue;
    
    return {
      liters,
      pricePerLiter,
      expectedRevenue,
      totalCollected,
      variance,
    };
  }, [closingMeter, previousMeter, selectedPump?.price_per_liter, cashCollected, transferCollected, posCollected]);

  // Merge current form values into displaySales for real-time display in Today's Entries
  const displaySalesWithFormValues = useMemo(() => {
    if (!currentEntryId) return displaySales;
    
    return displaySales.map(sale => {
      if (sale.id === currentEntryId) {
        // Merge real-time form values for the active entry
        return {
          ...sale,
          closing_meter: closingMeter,
          liters_sold: calculations.liters,
          expected_revenue: calculations.expectedRevenue,
          cash_collected: cashCollected,
          transfer_collected: transferCollected,
          pos_collected: posCollected,
          total_collected: calculations.totalCollected,
          variance: calculations.variance,
        };
      }
      return sale;
    });
  }, [displaySales, currentEntryId, closingMeter, calculations, cashCollected, transferCollected, posCollected]);

  // Compute live summary: persisted pump sales + current form values
  const pumpSummary = useMemo(() => {
    let total_cash = 0;
    let total_transfer = 0;
    let total_card = 0;
    let entry_count = 0;
    let pending_count = 0;
    let submitted_count = 0;
    
    for (const sale of displaySales) {
      if (currentEntryId && sale.id === currentEntryId) continue;
      
      total_cash += sale.cash_collected || 0;
      total_transfer += sale.transfer_collected || 0;
      total_card += sale.pos_collected || 0;
      entry_count++;
      
      if (sale.status === 'submitted') {
        submitted_count++;
      } else {
        pending_count++;
      }
    }
    
    // Add current form values
    if (selectedPumpId) {
      total_cash += cashCollected || 0;
      total_transfer += transferCollected || 0;
      total_card += posCollected || 0;
    }
    
    const grandTotal = total_cash + total_transfer + total_card;
    
    return {
      total_cash,
      total_transfer,
      total_card,
      grand_total: grandTotal,
      entry_count: entry_count + (selectedPumpId && !currentEntryId ? 1 : 0),
      pending_count: pending_count + (selectedPumpId ? 1 : 0),
      submitted_count,
    };
  }, [displaySales, currentEntryId, selectedPumpId, cashCollected, transferCollected, posCollected]);

  // Calculate total expected revenue from all pump sales, grouped by fuel type
  const pumpRevenueByFuelType = useMemo(() => {
    const byFuelType: Record<string, { expected: number; liters: number; unit: string; label: string }> = {};
    
    const fuelLabels: Record<string, string> = {
      pms: "PMS",
      ago: "AGO", 
      dpk: "DPK",
      lpg: "LPG",
    };
    
    for (const sale of displaySales) {
      // Skip the current entry being edited to avoid double counting
      if (currentEntryId && sale.id === currentEntryId) continue;
      
      const fuelType = sale.pump?.fuel_type || 'unknown';
      const unit = sale.pump?.unit || (fuelType === 'lpg' ? 'Kg' : 'L');
      
      if (!byFuelType[fuelType]) {
        byFuelType[fuelType] = { 
          expected: 0, 
          liters: 0, 
          unit,
          label: fuelLabels[fuelType] || fuelType.toUpperCase()
        };
      }
      byFuelType[fuelType].expected += sale.expected_revenue || 0;
      byFuelType[fuelType].liters += sale.liters_sold || 0;
    }
    
    // Add current form's expected revenue
    if (selectedPumpId && selectedPump) {
      const fuelType = selectedPump.fuel_type || 'unknown';
      const unit = selectedPump.unit || (fuelType === 'lpg' ? 'Kg' : 'L');
      
      if (!byFuelType[fuelType]) {
        byFuelType[fuelType] = { 
          expected: 0, 
          liters: 0, 
          unit,
          label: fuelLabels[fuelType] || fuelType.toUpperCase()
        };
      }
      byFuelType[fuelType].expected += calculations.expectedRevenue;
      byFuelType[fuelType].liters += calculations.liters;
    }
    
    return byFuelType;
  }, [displaySales, currentEntryId, selectedPumpId, selectedPump, calculations.expectedRevenue, calculations.liters]);

  // Total expected revenue across all fuel types
  const pumpExpectedRevenue = useMemo(() => {
    return Object.values(pumpRevenueByFuelType).reduce((sum, item) => sum + item.expected, 0);
  }, [pumpRevenueByFuelType]);

  // Combined summary: Pump + Shop sales - Expenses
  const combinedSummary = useMemo(() => {
    const shopCash = salesPaymentSummary?.cash || 0;
    const shopTransfer = salesPaymentSummary?.transfer || 0;
    const shopCard = salesPaymentSummary?.card || 0;
    const shopTotal = shopCash + shopTransfer + shopCard;

    const totalCash = pumpSummary.total_cash + shopCash;
    const totalTransfer = pumpSummary.total_transfer + shopTransfer;
    const totalCard = pumpSummary.total_card + shopCard;
    const grandTotal = pumpSummary.grand_total + shopTotal;

    const cashExpenses = todaysExpenses?.cashExpenses || 0;
    const totalExpenses = todaysExpenses?.total || 0;

    // Use Pump Expected Revenue (from meter readings) as the base for reconciliation
    // This auto-updates as cashier enters closing meter
    const pumpTotal = pumpExpectedRevenue;
    // Total Cash to Remit = Pump Total - (All Transfer + All Card) from both pump entries and shop sales
    const totalCashToRemit = pumpTotal - (totalTransfer + totalCard);
    
    // Net Cash to Remit = Total Cash to Remit - Cash Expenses
    const netCashToRemit = totalCashToRemit - cashExpenses;
    
    // Net Grand Total = Grand Total - Cash Expenses
    const netGrandTotal = grandTotal - cashExpenses;

    // Compare Pump Expected Revenue vs Shop Total Sales
    const variance = shopTotal - pumpExpectedRevenue;
    const isBalanced = Math.abs(variance) < 0.01; // Account for floating point

    return {
      total_cash: totalCash,
      total_transfer: totalTransfer,
      total_card: totalCard,
      grand_total: grandTotal,
      pump_total: pumpTotal, // Now shows expected revenue from meters
      pump_collected: pumpSummary.grand_total, // Actual collected amounts
      total_cash_to_remit: totalCashToRemit,
      cash_expenses: cashExpenses,
      total_expenses: totalExpenses,
      net_cash: netCashToRemit,
      net_grand_total: netGrandTotal,
      pump_expected_revenue: pumpExpectedRevenue,
      shop_total: shopTotal,
      variance,
      isBalanced,
    };
  }, [pumpSummary, salesPaymentSummary, todaysExpenses, pumpExpectedRevenue]);

  const handlePumpChange = (pumpId: string) => {
    // Reset loadedPumpId to allow the useEffect to load data for new pump
    setLoadedPumpId(null);
    setSelectedPumpId(pumpId);
    setCurrentEntryId(null);
  };

  const onSubmit = async (data: FormData) => {
    if (currentEntryId) {
      // Submit existing entry
      await submitSale.mutateAsync(currentEntryId);
    } else {
      // Create and auto-submit
      const result = await createSale.mutateAsync({
        pump_id: data.pump_id,
        opening_meter: previousMeter,
        closing_meter: data.closing_meter,
        price_per_liter: selectedPump?.price_per_liter ?? 0,
        cash_collected: data.cash_collected,
        pos_collected: data.pos_collected,
        transfer_collected: data.transfer_collected,
        notes: data.notes,
      });
      
      // Auto-submit
      await submitSale.mutateAsync(result.id);
    }
    
    form.reset({
      pump_id: "",
      closing_meter: 0,
      cash_collected: 0,
      transfer_collected: 0,
      pos_collected: 0,
      notes: "",
    });
    setSelectedPumpId("");
    setCurrentEntryId(null);
  };

  const handleSubmitSale = async (saleId: string) => {
    await submitSale.mutateAsync(saleId);
  };

  const getFuelTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      pms: "PMS (Petrol)",
      ago: "AGO (Diesel)",
      dpk: "DPK (Kerosene)",
      lpg: "LPG (Gas)",
    };
    return labels[type] || type.toUpperCase();
  };

  // Get unit from pump configuration (falls back to fuel-type logic for legacy data)
  const getUnitLabel = (pump?: { unit?: string; fuel_type?: string }) => {
    if (pump?.unit) return pump.unit;
    return pump?.fuel_type === 'lpg' ? 'Kg' : 'L';
  };

  // Check if a pump has submitted entries today
  const getPumpEntryStatus = (pumpId: string) => {
    const submittedCount = displaySales.filter(
      s => s.pump_id === pumpId && s.status === 'submitted'
    ).length;
    const pendingEntry = displaySales.find(
      s => s.pump_id === pumpId && s.status === 'pending'
    );
    return { submittedCount, hasPending: !!pendingEntry };
  };

  if (pumpsLoading || salesLoading || expensesLoading || staffLoading || ownerLoading || branchSalesLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }


  if (!staffId && !isOwner) {
    return (
      <div className="flex items-center justify-center h-64">
        <Alert variant="destructive" className="max-w-md">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Unable to identify your staff account. Please ensure you are assigned to this branch.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-4 md:space-y-6 px-2 sm:px-4 md:px-6 py-4">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold">Daily Sales Entry</h1>
        <p className="text-sm sm:text-base text-muted-foreground">
          Record your pump sales for today
          <span className="hidden sm:inline"> • </span>
          <span className="block sm:inline font-medium">{currentBranch?.name || "Select a branch"}</span>
          {isViewOnlyOwner && (
            <Badge variant="secondary" className="ml-2 text-xs">View Only</Badge>
          )}
        </p>
      </div>

      {isViewOnlyOwner && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="text-sm">
            You are viewing as an admin. To enter sales, you need a staff profile. Use the Daily Business Summary page to view all cashier entries.
          </AlertDescription>
        </Alert>
      )}

      <div className="grid gap-4 md:gap-6 lg:grid-cols-2">
        {/* Entry Form - Only show if user can enter sales */}
        {canEnterSales && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Fuel className="h-5 w-5" />
              New Pump Entry
            </CardTitle>
            <CardDescription>Enter closing meter reading and payment breakdown</CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="pump_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Select Pump</FormLabel>
                      <Select 
                        onValueChange={(value) => {
                          field.onChange(value);
                          handlePumpChange(value);
                        }} 
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Choose a pump..." />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {pumps.map((pump) => {
                            const status = getPumpEntryStatus(pump.id);
                            return (
                              <SelectItem key={pump.id} value={pump.id}>
                                {pump.name} - {getFuelTypeLabel(pump.fuel_type)} @ {formatCurrency(pump.price_per_liter)}/{getUnitLabel(pump)}
                                {status.submittedCount > 0 && (
                                  <span className="ml-2 text-xs text-muted-foreground">
                                    ({status.submittedCount} submitted)
                                  </span>
                                )}
                                {status.hasPending && (
                                  <span className="ml-2 text-xs text-amber-600">
                                    (draft)
                                  </span>
                                )}
                              </SelectItem>
                            );
                          })}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {selectedPumpId && (
                  <>
                    {currentEntryId ? (
                      <Alert>
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>
                          Editing existing entry - changes save automatically
                        </AlertDescription>
                      </Alert>
                    ) : getPumpEntryStatus(selectedPumpId).submittedCount > 0 ? (
                      <Alert className="border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950">
                        <Check className="h-4 w-4 text-green-600" />
                        <AlertDescription className="text-green-800 dark:text-green-200">
                          {getPumpEntryStatus(selectedPumpId).submittedCount} entry/entries already submitted today. You can add another entry (e.g., for a new shift).
                        </AlertDescription>
                      </Alert>
                    ) : null}
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                      <div>
                        <Label className="text-sm">Opening Meter (Read-only)</Label>
                        <Input 
                          value={previousMeter.toLocaleString()} 
                          disabled 
                          className="bg-muted"
                        />
                      </div>
                      <FormField
                        control={form.control}
                        name="closing_meter"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Closing Meter</FormLabel>
                            <FormControl>
                              <Input 
                                type="number" 
                                step="0.01"
                                inputMode="decimal"
                                value={field.value === 0 ? '' : field.value}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  if (val === '') {
                                    field.onChange(0);
                                  } else {
                                    const num = parseFloat(val);
                                    if (!isNaN(num)) {
                                      field.onChange(num);
                                    }
                                  }
                                }}
                                onBlur={field.onBlur}
                                name={field.name}
                                ref={field.ref}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    {/* Real-time Calculations */}
                    <Card className="bg-muted/50">
                      <CardContent className="p-3 sm:pt-4">
                        <div className="grid grid-cols-2 gap-1.5 sm:gap-2 text-xs sm:text-sm">
                          <div>{getUnitLabel(selectedPump) === 'Kg' ? 'Kg' : 'Liters'} Sold:</div>
                          <div className="font-medium">{calculations.liters.toLocaleString()} {getUnitLabel(selectedPump)}</div>
                          <div>Price/{getUnitLabel(selectedPump)}:</div>
                          <div className="font-medium">{formatCurrency(calculations.pricePerLiter)}</div>
                          <div>Expected Revenue:</div>
                          <div className="font-bold text-primary">{formatCurrency(calculations.expectedRevenue)}</div>
                        </div>
                      </CardContent>
                    </Card>

                    <FormField
                      control={form.control}
                      name="notes"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Notes (Optional)</FormLabel>
                          <FormControl>
                            <Textarea 
                              placeholder="Any additional notes..."
                              {...field}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    <Button 
                      type="submit" 
                      className="w-full"
                      disabled={createSale.isPending || submitSale.isPending}
                    >
                      <Check className="mr-2 h-4 w-4" />
                      {createSale.isPending || submitSale.isPending ? "Submitting..." : "Submit & Lock"}
                    </Button>
                  </>
                )}
              </form>
            </Form>
          </CardContent>
        </Card>
        )}

        {/* Today's Summary & Entries */}
        <div className={cn("space-y-4 md:space-y-6", !canEnterSales && "lg:col-span-2")}>
        {/* Pump Expected Revenue - from meter readings */}
          <Card className="border-primary/20">
            <CardHeader className="p-4 sm:p-6 pb-2">
              <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                <Fuel className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                Pump Expected Revenue
              </CardTitle>
              <CardDescription className="text-xs sm:text-sm">Expected revenue based on meter readings</CardDescription>
            </CardHeader>
            <CardContent className="p-4 sm:p-6 pt-0">
              {/* Breakdown by Fuel Type */}
              {Object.keys(pumpRevenueByFuelType).length > 0 && (
                <div className="grid grid-cols-2 gap-1.5 sm:gap-2 mb-3">
                  {Object.entries(pumpRevenueByFuelType).map(([fuelType, data]) => (
                    <div key={fuelType} className="rounded-lg border bg-background p-2">
                      <div className="flex items-center justify-between">
                        <Badge variant="outline" className="text-xs">{data.label}</Badge>
                        <span className="text-xs text-muted-foreground">{data.liters.toLocaleString()} {data.unit}</span>
                      </div>
                      <div className="text-sm font-semibold mt-1">{formatCurrency(data.expected)}</div>
                    </div>
                  ))}
                </div>
              )}
              
              {/* Grand Total */}
              <div className="rounded-lg border bg-card p-3 sm:p-4 text-center">
                <div className="text-xs text-muted-foreground mb-1">Total Expected (from Meters)</div>
                <div className="text-xl sm:text-2xl font-bold text-primary break-all">
                  {formatCurrency(pumpExpectedRevenue)}
                </div>
              </div>
              
              {/* Comparison with Shop Sales */}
              <div className="mt-3 sm:mt-4 p-2 sm:p-3 rounded-lg bg-muted/50 space-y-1.5 sm:space-y-2">
                <div className="flex justify-between items-center text-xs sm:text-sm">
                  <span className="text-muted-foreground">Shop Sales Total</span>
                  <span className="font-medium">{formatCurrency(combinedSummary.shop_total)}</span>
                </div>
                <div className="flex justify-between items-center text-xs sm:text-sm">
                  <span className="text-muted-foreground">Pump Expected</span>
                  <span className="font-medium">{formatCurrency(pumpExpectedRevenue)}</span>
                </div>
                <div className="border-t pt-2 flex justify-between items-center">
                  <span className="font-semibold text-sm">Variance</span>
                  <Badge 
                    variant={combinedSummary.isBalanced ? "default" : combinedSummary.variance > 0 ? "secondary" : "destructive"}
                    className={cn(
                      combinedSummary.isBalanced && "bg-success",
                      combinedSummary.variance > 0 && !combinedSummary.isBalanced && "bg-blue-600"
                    )}
                  >
                    {combinedSummary.isBalanced 
                      ? "Balanced" 
                      : combinedSummary.variance > 0 
                        ? `Excess: ${formatCurrency(combinedSummary.variance)}`
                        : `Shortage: ${formatCurrency(Math.abs(combinedSummary.variance))}`
                    }
                  </Badge>
                </div>
              </div>


              <div className="mt-2 flex flex-wrap gap-1.5 sm:gap-2 text-xs text-muted-foreground">
                <Badge variant="outline" className="text-[10px] sm:text-xs">{pumpSummary.entry_count} entries</Badge>
                <Badge variant="secondary" className="text-[10px] sm:text-xs">{pumpSummary.pending_count} pending</Badge>
                <Badge variant="default" className="bg-success text-[10px] sm:text-xs">{pumpSummary.submitted_count} submitted</Badge>
              </div>
            </CardContent>
          </Card>

          {/* Shop Sales - from sales table (POS) */}
          <Card className="border-accent/30 bg-accent/5">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <ShoppingCart className="h-5 w-5 text-accent-foreground" />
                Shop Sales
              </CardTitle>
              <CardDescription>POS sales from the shop ({currentBranch?.name || "Branch"})</CardDescription>
            </CardHeader>
            <CardContent>
              {salesSummaryLoading ? (
                <div className="flex items-center justify-center py-4">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-3 gap-2 sm:gap-3">
                    <div className="rounded-lg border bg-background p-2 sm:p-3 text-center">
                      <div className="text-[10px] sm:text-xs text-muted-foreground mb-0.5 sm:mb-1">Cash</div>
                      <div className="text-sm sm:text-lg font-bold text-success break-all">
                        {formatCurrency(salesPaymentSummary?.cash || 0)}
                      </div>
                    </div>
                    <div className="rounded-lg border bg-background p-2 sm:p-3 text-center">
                      <div className="text-[10px] sm:text-xs text-muted-foreground mb-0.5 sm:mb-1">Transfer</div>
                      <div className="text-sm sm:text-lg font-bold text-blue-600 break-all">
                        {formatCurrency(salesPaymentSummary?.transfer || 0)}
                      </div>
                    </div>
                    <div className="rounded-lg border bg-background p-2 sm:p-3 text-center">
                      <div className="text-[10px] sm:text-xs text-muted-foreground mb-0.5 sm:mb-1">Card</div>
                      <div className="text-sm sm:text-lg font-bold text-purple-600 break-all">
                        {formatCurrency(salesPaymentSummary?.card || 0)}
                      </div>
                    </div>
                  </div>
                  <div className="mt-3 pt-3 border-t flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Shop Total</span>
                    <span className="text-lg font-semibold">
                      {formatCurrency(
                        (salesPaymentSummary?.cash || 0) + 
                        (salesPaymentSummary?.transfer || 0) + 
                        (salesPaymentSummary?.card || 0)
                      )}
                    </span>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Expenses Box */}
          <Card className="border-warning/30 bg-warning/5">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <Receipt className="h-5 w-5 text-warning" />
                Today's Expenses
              </CardTitle>
              <CardDescription>Expenses deducted from cash remittance</CardDescription>
            </CardHeader>
            <CardContent>
              {(todaysExpenses?.expenses?.length || 0) === 0 ? (
                <div className="text-center py-4 text-muted-foreground">
                  <Receipt className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No expenses recorded today</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {todaysExpenses?.expenses.map((expense) => (
                    <div key={expense.id} className="flex justify-between items-center text-sm p-2 rounded bg-background">
                      <div>
                        <span className="font-medium">{expense.description}</span>
                        <Badge variant="outline" className="ml-2 text-xs">{expense.payment_method}</Badge>
                      </div>
                      <span className={cn(
                        "font-semibold",
                        expense.payment_method?.toLowerCase() === "cash" ? "text-warning" : "text-muted-foreground"
                      )}>
                        -{formatCurrency(expense.amount)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
              <div className="mt-3 pt-3 border-t space-y-2">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">Total Expenses</span>
                  <span className="font-semibold text-warning">
                    -{formatCurrency(combinedSummary.total_expenses)}
                  </span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">Cash Expenses (deducted)</span>
                  <span className="font-semibold text-destructive">
                    -{formatCurrency(combinedSummary.cash_expenses)}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Combined Totals - Net Cash to Remit */}
          <Card className={cn(
            "border-2",
            combinedSummary.net_cash >= 0 ? "border-success/50 bg-success/5" : "border-destructive/50 bg-destructive/5"
          )}>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <Wallet className="h-5 w-5" />
                Combined Totals
              </CardTitle>
              <CardDescription>End of day cash reconciliation</CardDescription>
            </CardHeader>
            <CardContent className="p-4 sm:p-6 pt-0">
              <div className="space-y-3 sm:space-y-4">
                {/* Step 1: Pump Expected Revenue - (Transfer + Card) = Total Cash to Remit */}
                <div className="p-2 sm:p-3 bg-muted/50 rounded-lg space-y-1.5 sm:space-y-2">
                  <div className="flex justify-between items-center text-xs sm:text-sm gap-2">
                    <span className="text-muted-foreground">Pump Total (from meters)</span>
                    <span className="font-medium text-primary break-all">{formatCurrency(combinedSummary.pump_total)}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs sm:text-sm gap-2">
                    <span className="text-muted-foreground flex items-center gap-1">
                      <Minus className="h-3 w-3 shrink-0" /> <span>Transfer (Pump + Shop)</span>
                    </span>
                    <span className="font-medium break-all">{formatCurrency(combinedSummary.total_transfer)}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs sm:text-sm gap-2">
                    <span className="text-muted-foreground flex items-center gap-1">
                      <Minus className="h-3 w-3 shrink-0" /> <span>Card (Pump + Shop)</span>
                    </span>
                    <span className="font-medium break-all">{formatCurrency(combinedSummary.total_card)}</span>
                  </div>
                  <div className="border-t pt-2 flex justify-between items-center gap-2">
                    <span className="font-semibold text-xs sm:text-sm">= Total Cash to Remit</span>
                    <span className="font-bold break-all">{formatCurrency(combinedSummary.total_cash_to_remit)}</span>
                  </div>
                </div>

                {/* Step 2: Net Cash to Remit = Total Cash to Remit - Cash Expenses */}
                <div className="p-2 sm:p-3 bg-muted/50 rounded-lg space-y-1.5 sm:space-y-2">
                  <div className="flex justify-between items-center text-xs sm:text-sm gap-2">
                    <span className="text-muted-foreground">Total Cash to Remit</span>
                    <span className="font-medium break-all">{formatCurrency(combinedSummary.total_cash_to_remit)}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs sm:text-sm gap-2">
                    <span className="text-muted-foreground flex items-center gap-1">
                      <Minus className="h-3 w-3 shrink-0" /> Cash Expenses
                    </span>
                    <span className="font-medium text-destructive break-all">{formatCurrency(combinedSummary.cash_expenses)}</span>
                  </div>
                  <div className="border-t pt-2 flex justify-between items-center gap-2">
                    <span className="font-semibold text-xs sm:text-sm">= Net Cash to Remit</span>
                    <span className={cn(
                      "text-base sm:text-lg font-bold break-all",
                      combinedSummary.net_cash >= 0 ? "text-success" : "text-destructive"
                    )}>
                      {formatCurrency(combinedSummary.net_cash)}
                    </span>
                  </div>
                </div>

                {/* Step 3: Net Grand Total = Grand Total - Cash Expenses */}
                <div className="p-2 sm:p-3 bg-primary/10 rounded-lg space-y-1.5 sm:space-y-2">
                  <div className="flex justify-between items-center text-xs sm:text-sm gap-2">
                    <span className="text-muted-foreground">Grand Total</span>
                    <span className="font-medium break-all">{formatCurrency(combinedSummary.grand_total)}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs sm:text-sm gap-2">
                    <span className="text-muted-foreground flex items-center gap-1">
                      <Minus className="h-3 w-3 shrink-0" /> Cash Expenses
                    </span>
                    <span className="font-medium text-destructive break-all">{formatCurrency(combinedSummary.cash_expenses)}</span>
                  </div>
                  <div className="border-t pt-2 flex justify-between items-center gap-2">
                    <span className="font-semibold text-xs sm:text-sm">= Net Grand Total (EOD)</span>
                    <span className="text-base sm:text-lg font-bold text-primary break-all">
                      {formatCurrency(combinedSummary.net_grand_total)}
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Variance Check: Pump Expected Revenue vs Shop Sales */}
          <Card className={cn(
            "border-2",
            combinedSummary.isBalanced ? "border-success bg-success/10" :
            combinedSummary.variance > 0 ? "border-warning bg-warning/10" :
            "border-destructive bg-destructive/10"
          )}>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <Calculator className="h-5 w-5" />
                End of Day Balance Check
              </CardTitle>
              <CardDescription>Pump Expected Revenue vs Shop Total Sales</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">Pump Expected Revenue</span>
                  <span className="font-medium">{formatCurrency(combinedSummary.pump_expected_revenue)}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">Shop Total Sales</span>
                  <span className="font-medium">{formatCurrency(combinedSummary.shop_total)}</span>
                </div>
                <div className="border-t pt-3 flex justify-between items-center">
                  <span className="font-semibold">
                    {combinedSummary.isBalanced ? "Status" :
                     combinedSummary.variance > 0 ? "Excess (Shop > Pump)" : "Shortage (Pump > Shop)"}
                  </span>
                  <span className={cn(
                    "text-xl font-bold",
                    combinedSummary.isBalanced ? "text-success" :
                    combinedSummary.variance > 0 ? "text-warning" : "text-destructive"
                  )}>
                    {combinedSummary.isBalanced ? (
                      <span className="flex items-center gap-2">
                        <Check className="h-5 w-5" /> Balanced
                      </span>
                    ) : (
                      <>{combinedSummary.variance > 0 ? "+" : ""}{formatCurrency(combinedSummary.variance)}</>
                    )}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Today's Entries</CardTitle>
              <CardDescription>
                {isViewOnlyOwner ? "All branch entries for today" : "Your sales entries for today"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {displaySalesWithFormValues.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Fuel className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>No entries yet today</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {displaySalesWithFormValues.map((sale) => (
                    <Card key={sale.id} className="overflow-hidden">
                      <CardContent className="p-3 sm:p-4">
                        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <div className="font-medium flex flex-wrap items-center gap-1.5 sm:gap-2">
                              <span className="truncate">{sale.pump?.name}</span>
                              <Badge variant="outline" className="text-[10px] sm:text-xs shrink-0">
                                {getFuelTypeLabel(sale.pump?.fuel_type || '')}
                              </Badge>
                            </div>
                            {/* Show staff name for admin/owner view */}
                            {isViewOnlyOwner && sale.staff?.full_name && (
                              <div className="text-xs text-muted-foreground mt-0.5">
                                by {sale.staff.full_name}
                              </div>
                            )}
                            <div className="text-xs sm:text-sm text-muted-foreground mt-1">
                              {sale.liters_sold?.toLocaleString()} {getUnitLabel(sale.pump)} @ {formatCurrency(sale.price_per_liter)}/{getUnitLabel(sale.pump)}
                            </div>
                            <div className="text-xs sm:text-sm font-medium text-primary mt-0.5">
                              Expected: {formatCurrency(sale.expected_revenue || 0)}
                            </div>
                          </div>
                          <Badge 
                            variant={sale.status === 'submitted' ? 'default' : 'secondary'}
                            className={cn(
                              "text-[10px] sm:text-xs shrink-0",
                              sale.status === 'submitted' ? 'bg-success' : ''
                            )}
                          >
                            {sale.status === 'submitted' ? (
                              <><Lock className="h-3 w-3 mr-1" /> Submitted</>
                            ) : (
                              'Pending'
                            )}
                          </Badge>
                        </div>
                        
                        {/* Show payment data from Shop Sales (real-time from POS) */}
                        <div className="grid grid-cols-3 gap-1.5 sm:gap-2 mt-2 sm:mt-3 text-xs sm:text-sm">
                          <div className="flex flex-col sm:flex-row sm:items-center">
                            <span className="text-muted-foreground">Cash:</span>
                            <span className="sm:ml-1 font-medium text-success">
                              {formatCurrency(salesPaymentSummary?.cash || 0)}
                            </span>
                          </div>
                          <div className="flex flex-col sm:flex-row sm:items-center">
                            <span className="text-muted-foreground">Transfer:</span>
                            <span className="sm:ml-1 font-medium text-blue-600">
                              {formatCurrency(salesPaymentSummary?.transfer || 0)}
                            </span>
                          </div>
                          <div className="flex flex-col sm:flex-row sm:items-center">
                            <span className="text-muted-foreground">Card:</span>
                            <span className="sm:ml-1 font-medium text-purple-600">
                              {formatCurrency(salesPaymentSummary?.card || 0)}
                            </span>
                          </div>
                        </div>
                        {/* Show total collected from shop sales */}
                        <div className="mt-2 pt-2 border-t flex justify-between text-xs sm:text-sm">
                          <span className="text-muted-foreground">Shop Total:</span>
                          <span className="font-medium break-all">
                            {formatCurrency((salesPaymentSummary?.cash || 0) + (salesPaymentSummary?.transfer || 0) + (salesPaymentSummary?.card || 0))}
                          </span>
                        </div>

                        {/* Variance: Shop Sales vs Pump Expected Revenue */}
                        {(() => {
                          const shopTotal = (salesPaymentSummary?.cash || 0) + (salesPaymentSummary?.transfer || 0) + (salesPaymentSummary?.card || 0);
                          const entryVariance = shopTotal - (sale.expected_revenue || 0);
                          const isBalanced = Math.abs(entryVariance) < 0.01;
                          
                          if (isBalanced) return null;
                          
                          return (
                            <div className={cn(
                              "mt-2 p-2 rounded text-sm",
                              entryVariance > 0 ? "bg-blue-500/20 text-blue-600" : "bg-destructive/20 text-destructive"
                            )}>
                              <AlertCircle className="h-3 w-3 inline mr-1" />
                              {entryVariance > 0 ? "Excess" : "Shortage"}: {formatCurrency(Math.abs(entryVariance))}
                            </div>
                          );
                        })()}

                        {sale.status === 'pending' && canEnterSales && (
                          <Button 
                            size="sm" 
                            className="w-full mt-3"
                            onClick={() => handleSubmitSale(sale.id)}
                            disabled={submitSale.isPending}
                          >
                            <Check className="h-3 w-3 mr-1" />
                            Submit & Lock
                          </Button>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Submission History */}
          <PumpSalesHistory pumpId={selectedPumpId || undefined} staffId={staffId || undefined} />
        </div>
      </div>
    </div>
  );
}
