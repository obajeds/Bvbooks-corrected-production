import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Receipt, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useExpenses, useCreateExpense, useDeleteExpense } from "@/hooks/useExpenses";
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from "date-fns";
import { useFeatureEnabled } from "@/hooks/useFeatureGating";
import { UpgradePrompt } from "@/components/subscription/UpgradePrompt";
import { useCurrency } from "@/hooks/useCurrency";
import { useBranchContext } from "@/contexts/BranchContext";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { DateRangeFilter } from "@/components/inventory/DateRangeFilter";
import { DateRange } from "react-day-picker";
import { useCreateApprovalRequest } from "@/hooks/useApprovalRequests";
import { useUserRole } from "@/hooks/useUserRole";
import { useStaff } from "@/hooks/useStaff";
import { useAuth } from "@/contexts/AuthContext";

type PeriodFilter = "today" | "this_week" | "this_month" | "custom" | "all_time";

function computeDateRange(period: PeriodFilter, customRange?: DateRange): { from: string; to: string } | undefined {
  if (period === "all_time") return undefined;
  const today = new Date();
  switch (period) {
    case "today":
      return { from: format(today, "yyyy-MM-dd"), to: format(today, "yyyy-MM-dd") };
    case "this_week": {
      const ws = startOfWeek(today, { weekStartsOn: 1 });
      const we = endOfWeek(today, { weekStartsOn: 1 });
      return { from: format(ws, "yyyy-MM-dd"), to: format(we, "yyyy-MM-dd") };
    }
    case "this_month": {
      const ms = startOfMonth(today);
      const me = endOfMonth(today);
      return { from: format(ms, "yyyy-MM-dd"), to: format(me, "yyyy-MM-dd") };
    }
    case "custom": {
      if (customRange?.from) {
        return {
          from: format(customRange.from, "yyyy-MM-dd"),
          to: format(customRange.to || customRange.from, "yyyy-MM-dd"),
        };
      }
      return { from: format(today, "yyyy-MM-dd"), to: format(today, "yyyy-MM-dd") };
    }
  }
}

const Expenses = () => {
  const { isEnabled: expensesEnabled, isLoading: featureLoading, requiresUpgrade, availableInPlan } = useFeatureEnabled("expenses.recording");
  const { isOwner, hasPermission, currentBranch } = useBranchContext();
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>("today");
  const [customRange, setCustomRange] = useState<DateRange | undefined>();

  const dateFilter = useMemo(() => computeDateRange(periodFilter, customRange), [periodFilter, customRange]);

  const { data: expenses = [], isLoading } = useExpenses(dateFilter, currentBranch?.id);
  const createExpense = useCreateExpense();
  const deleteExpense = useDeleteExpense();
  const createApprovalRequest = useCreateApprovalRequest();
  const { data: roleData } = useUserRole();
  const { data: staffList = [] } = useStaff();
  const { user } = useAuth();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newExpense, setNewExpense] = useState({ description: "", amount: "", payment_method: "cash" });
  const { formatCurrency } = useCurrency();

  // Check if expense approvals feature is enabled (Enterprise)
  const { isEnabled: expenseApprovalsEnabled } = useFeatureEnabled("approvals.expense");
  
  // Determine if this user's expenses should go through approval
  const requiresApproval = expenseApprovalsEnabled && !roleData?.isOwner;

  // Find current user's staff record for approval requests
  const currentStaff = useMemo(() => {
    if (!user?.id) return null;
    return staffList.find(s => s.user_id === user.id) || null;
  }, [staffList, user?.id]);

  const canCreate = isOwner || hasPermission("expenses.create") || hasPermission("operations.expenses.record");
  const canView = isOwner || hasPermission("expenses.view") || hasPermission("operations.expenses.view");
  const canDelete = isOwner || hasPermission("expenses.approve") || hasPermission("operations.expenses.approve");

  const totalAmount = useMemo(() => expenses.reduce((sum, e) => sum + (e.amount || 0), 0), [expenses]);

  const handleDeleteExpense = async (id: string) => {
    try {
      await deleteExpense.mutateAsync(id);
      toast.success("Expense deleted successfully");
    } catch (error: any) {
      toast.error(error.message || "Failed to delete expense");
    }
  };

  const handleAddExpense = async () => {
    if (!newExpense.description || !newExpense.amount) {
      toast.error("Please fill in all required fields");
      return;
    }

    try {
      if (requiresApproval && currentStaff) {
        // Route through approval queue
        await createApprovalRequest.mutateAsync({
          request_type: "expense",
          requested_by: currentStaff.id,
          amount: parseFloat(newExpense.amount),
          notes: JSON.stringify({
            description: newExpense.description,
            amount: parseFloat(newExpense.amount),
            paymentMethod: newExpense.payment_method,
            expenseDate: new Date().toISOString().split("T")[0],
            branchId: currentBranch?.id || null,
          }),
        });
        setNewExpense({ description: "", amount: "", payment_method: "cash" });
        setIsDialogOpen(false);
        toast.success("Expense submitted for approval");
      } else {
        // Direct creation (owner or approval not required)
        await createExpense.mutateAsync({
          description: newExpense.description,
          amount: parseFloat(newExpense.amount),
          payment_method: newExpense.payment_method,
          expense_date: new Date().toISOString().split("T")[0],
        });
        setNewExpense({ description: "", amount: "", payment_method: "cash" });
        setIsDialogOpen(false);
        toast.success("Expense recorded successfully");
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to record expense");
    }
  };

  if (isLoading || featureLoading) {
    return (
      <main className="flex-1 overflow-y-auto p-6 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </main>
    );
  }

  if (!expensesEnabled && requiresUpgrade) {
    return (
      <main className="flex-1 overflow-y-auto p-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Expenses</h1>
          <p className="text-muted-foreground">Track and manage business expenses</p>
        </div>
        <UpgradePrompt featureName="Expense Recording" requiredPlan={availableInPlan} />
      </main>
    );
  }

  return (
    <main className="flex-1 overflow-y-auto p-6 space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Expenses</h1>
          <p className="text-muted-foreground">Track and manage business expenses</p>
        </div>
        {canCreate && (
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="mr-2 h-4 w-4" />Add Expense</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Record Expense</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Description *</Label>
                  <Input value={newExpense.description} onChange={(e) => setNewExpense({ ...newExpense, description: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Amount *</Label>
                  <Input type="number" value={newExpense.amount} onChange={(e) => setNewExpense({ ...newExpense, amount: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Payment Method</Label>
                  <Input value={newExpense.payment_method} onChange={(e) => setNewExpense({ ...newExpense, payment_method: e.target.value })} placeholder="cash, transfer, card" />
                </div>
                <Button onClick={handleAddExpense} className="w-full" disabled={createExpense.isPending}>
                  {createExpense.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Record Expense
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Period Filter Bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <ToggleGroup
          type="single"
          value={periodFilter}
          onValueChange={(val) => {
            if (val) setPeriodFilter(val as PeriodFilter);
          }}
          variant="outline"
          size="sm"
        >
          <ToggleGroupItem value="today">Today</ToggleGroupItem>
          <ToggleGroupItem value="this_week">This Week</ToggleGroupItem>
          <ToggleGroupItem value="this_month">This Month</ToggleGroupItem>
          <ToggleGroupItem value="custom">Custom Date</ToggleGroupItem>
          <ToggleGroupItem value="all_time">All Time</ToggleGroupItem>
        </ToggleGroup>
        {periodFilter === "custom" && (
          <DateRangeFilter dateRange={customRange} onDateRangeChange={setCustomRange} />
        )}
      </div>

      {/* Summary */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <span className="font-semibold text-foreground text-base">{formatCurrency(totalAmount)}</span>
        <span>total across {expenses.length} expense{expenses.length !== 1 ? "s" : ""}</span>
      </div>

      {canView ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Receipt className="h-5 w-5" />
              Expense Records
            </CardTitle>
          </CardHeader>
          <CardContent>
            {expenses.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Receipt className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No expenses recorded for this period.</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Description</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Payment Method</TableHead>
                    <TableHead>Date</TableHead>
                    {canDelete && <TableHead className="w-[60px]"></TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {expenses.map((expense) => (
                    <TableRow key={expense.id}>
                      <TableCell className="font-medium">{expense.description}</TableCell>
                      <TableCell>{formatCurrency(expense.amount)}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{expense.payment_method}</Badge>
                      </TableCell>
                      <TableCell>{format(new Date(expense.expense_date), "MMM dd, yyyy")}</TableCell>
                      {canDelete && (
                        <TableCell>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Expense</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete "{expense.description}" ({formatCurrency(expense.amount)})? This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDeleteExpense(expense.id)}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            <Receipt className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>You can record expenses but cannot view expense records.</p>
          </CardContent>
        </Card>
      )}
    </main>
  );
};

export default Expenses;
