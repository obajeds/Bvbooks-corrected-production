import { useState, useMemo, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  ClipboardList, Plus, Package, TrendingUp, TrendingDown, CheckCircle,
  Loader2, Search, AlertTriangle, Clock, History,
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  useReconciliationHistory,
  useReconciliationSession,
  useStartReconciliation,
  useUpdatePhysicalCount,
  useApplyReconciliationItem,
  useCompleteReconciliation,
  type ReconciliationItem,
} from "@/hooks/useStockReconciliation";
import { useCategories } from "@/hooks/useCategories";

const StockReconciliation = () => {
  const isMobile = useIsMobile();
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [confirmApplyAll, setConfirmApplyAll] = useState(false);
  const [localCounts, setLocalCounts] = useState<Record<string, string>>({});

  const { data: history = [], isLoading: historyLoading } = useReconciliationHistory();
  const { data: sessionData, isLoading: sessionLoading } = useReconciliationSession(activeSessionId);
  const { data: categories = [] } = useCategories();
  const startMutation = useStartReconciliation();
  const updateCountMutation = useUpdatePhysicalCount();
  const applyItemMutation = useApplyReconciliationItem();
  const completeMutation = useCompleteReconciliation();

  const session = sessionData?.session;
  const items = sessionData?.items || [];

  // Check for in-progress session on load
  const activeFromHistory = useMemo(() => {
    return history.find((h) => h.status === "in_progress");
  }, [history]);

  // Auto-resume in-progress session
  useMemo(() => {
    if (activeFromHistory && !activeSessionId) {
      setActiveSessionId(activeFromHistory.id);
    }
  }, [activeFromHistory, activeSessionId]);

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const nameMatch = !searchQuery || item.product?.name?.toLowerCase().includes(searchQuery.toLowerCase());
      const catMatch = categoryFilter === "all" || item.product?.category_id === categoryFilter;
      const statMatch =
        statusFilter === "all" ||
        (statusFilter === "variance" && item.variance !== null && item.variance !== 0) ||
        statusFilter === item.status;
      return nameMatch && catMatch && statMatch;
    });
  }, [items, searchQuery, categoryFilter, statusFilter]);

  const stats = useMemo(() => {
    const counted = items.filter((i) => i.status === "counted" || i.status === "applied").length;
    const withVariance = items.filter((i) => i.variance !== null && i.variance !== 0).length;
    const totalShortage = items.reduce((sum, i) => sum + (i.variance !== null && i.variance < 0 ? Math.abs(i.variance) : 0), 0);
    const totalExcess = items.reduce((sum, i) => sum + (i.variance !== null && i.variance > 0 ? i.variance : 0), 0);
    const applied = items.filter((i) => i.status === "applied").length;
    return { total: items.length, counted, withVariance, totalShortage, totalExcess, applied };
  }, [items]);

  const handleStartSession = useCallback(async () => {
    try {
      const newSession = await startMutation.mutateAsync();
      setActiveSessionId(newSession.id);
      setLocalCounts({});
    } catch {
      // error handled in hook
    }
  }, [startMutation]);

  const handleCountChange = useCallback(
    (itemId: string, value: string) => {
      setLocalCounts((prev) => ({ ...prev, [itemId]: value }));
    },
    []
  );

  const handleCountBlur = useCallback(
    async (item: ReconciliationItem) => {
      const raw = localCounts[item.id];
      if (raw === undefined || raw === "") return;
      const val = parseFloat(raw);
      if (isNaN(val) || val < 0) {
        toast.error("Physical count must be a non-negative number");
        return;
      }
      try {
        await updateCountMutation.mutateAsync({
          itemId: item.id,
          physicalQuantity: val,
          sessionId: activeSessionId!,
        });
      } catch {
        // handled in hook
      }
    },
    [localCounts, updateCountMutation, activeSessionId]
  );

  const handleApplyItem = useCallback(
    async (item: ReconciliationItem) => {
      try {
        await applyItemMutation.mutateAsync({ item, sessionId: activeSessionId! });
        toast.success(`Applied reconciliation for ${item.product?.name}`);
      } catch {
        // handled in hook
      }
    },
    [applyItemMutation, activeSessionId]
  );

  const handleApplyAll = useCallback(async () => {
    setConfirmApplyAll(false);
    const toApply = items.filter(
      (i) => i.status === "counted" && i.variance !== null && i.variance !== 0
    );
    let applied = 0;
    for (const item of toApply) {
      try {
        await applyItemMutation.mutateAsync({ item, sessionId: activeSessionId! });
        applied++;
      } catch {
        // continue
      }
    }
    toast.success(`Applied ${applied} of ${toApply.length} items`);
  }, [items, applyItemMutation, activeSessionId]);

  const handleComplete = useCallback(async () => {
    if (!activeSessionId) return;
    try {
      await completeMutation.mutateAsync(activeSessionId);
      setActiveSessionId(null);
      setLocalCounts({});
    } catch {
      // handled
    }
  }, [activeSessionId, completeMutation]);

  const getVarianceBadge = (variance: number | null) => {
    if (variance === null) return null;
    if (variance === 0) return <Badge variant="secondary" className="text-xs">Match</Badge>;
    if (variance > 0) return <Badge className="bg-[hsl(var(--success))] text-[hsl(var(--success-foreground))] border-[hsl(var(--success))] text-xs">+{variance}</Badge>;
    return <Badge variant="destructive" className="text-xs">{variance}</Badge>;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending": return <Badge variant="outline" className="text-xs"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
      case "counted": return <Badge variant="secondary" className="text-xs">Counted</Badge>;
      case "applied": return <Badge className="bg-[hsl(var(--success))] text-[hsl(var(--success-foreground))] border-[hsl(var(--success))] text-xs"><CheckCircle className="h-3 w-3 mr-1" />Applied</Badge>;
      case "skipped": return <Badge variant="outline" className="text-xs">Skipped</Badge>;
      default: return null;
    }
  };

  // Active session view
  if (activeSessionId && session) {
    const countableWithVariance = items.filter(
      (i) => i.status === "counted" && i.variance !== null && i.variance !== 0
    ).length;

    return (
      <div className="space-y-4">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
          <div>
            <h1 className="text-xl font-semibold text-foreground flex items-center gap-2">
              <ClipboardList className="h-5 w-5" />
              Stock Reconciliation
            </h1>
            <p className="text-sm text-muted-foreground">
              Started {format(new Date(session.created_at), "PPp")}
            </p>
          </div>
          <div className="flex gap-2 flex-wrap">
            {countableWithVariance > 0 && (
              <Button
                size="sm"
                onClick={() => setConfirmApplyAll(true)}
                disabled={applyItemMutation.isPending}
              >
                Apply All ({countableWithVariance})
              </Button>
            )}
            <Button
              size="sm"
              variant="outline"
              onClick={handleComplete}
              disabled={completeMutation.isPending}
            >
              {completeMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
              Complete
            </Button>
          </div>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
          <Card className="p-3">
            <div className="text-xs text-muted-foreground">Total Items</div>
            <div className="text-lg font-bold text-foreground">{stats.total}</div>
          </Card>
          <Card className="p-3">
            <div className="text-xs text-muted-foreground">Counted</div>
            <div className="text-lg font-bold text-foreground">{stats.counted}</div>
          </Card>
          <Card className="p-3">
            <div className="text-xs text-muted-foreground">With Variance</div>
            <div className="text-lg font-bold text-foreground">{stats.withVariance}</div>
          </Card>
          <Card className="p-3">
            <div className="text-xs text-muted-foreground flex items-center gap-1"><TrendingDown className="h-3 w-3 text-destructive" />Shortage</div>
            <div className="text-lg font-bold text-destructive">{stats.totalShortage}</div>
          </Card>
          <Card className="p-3">
            <div className="text-xs text-muted-foreground flex items-center gap-1"><TrendingUp className="h-3 w-3 text-[hsl(var(--success))]" />Excess</div>
            <div className="text-lg font-bold text-[hsl(var(--success))]">{stats.totalExcess}</div>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search products..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {categories.map((cat: any) => (
                <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-[150px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="counted">Counted</SelectItem>
              <SelectItem value="applied">Applied</SelectItem>
              <SelectItem value="variance">Variance Only</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Items - mobile cards / desktop table */}
        {sessionLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : isMobile ? (
          <div className="space-y-2">
            {filteredItems.map((item) => (
              <Card key={item.id} className="p-3">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <div className="font-medium text-sm text-foreground">{item.product?.name}</div>
                    <div className="text-xs text-muted-foreground">{item.product?.categories?.name || "Uncategorized"}</div>
                  </div>
                  {getStatusBadge(item.status)}
                </div>
                <div className="grid grid-cols-3 gap-2 text-sm mb-2">
                  <div>
                    <div className="text-xs text-muted-foreground">System</div>
                    <div className="font-medium">{item.system_quantity}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Physical</div>
                    <Input
                      type="number"
                      min="0"
                      className="h-8 text-sm"
                      value={localCounts[item.id] ?? (item.physical_quantity !== null ? String(item.physical_quantity) : "")}
                      onChange={(e) => handleCountChange(item.id, e.target.value)}
                      onBlur={() => handleCountBlur(item)}
                      disabled={item.status === "applied"}
                    />
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Variance</div>
                    <div className="mt-1">{getVarianceBadge(item.variance)}</div>
                  </div>
                </div>
                {item.status === "counted" && item.variance !== null && item.variance !== 0 && (
                  <Button
                    size="sm"
                    className="w-full"
                    onClick={() => handleApplyItem(item)}
                    disabled={applyItemMutation.isPending}
                  >
                    Apply
                  </Button>
                )}
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead className="text-right">System Stock</TableHead>
                  <TableHead className="text-right w-[120px]">Physical Count</TableHead>
                  <TableHead className="text-center">Variance</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredItems.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.product?.name}</TableCell>
                    <TableCell className="text-muted-foreground">{item.product?.categories?.name || "—"}</TableCell>
                    <TableCell className="text-right tabular-nums">{item.system_quantity}</TableCell>
                    <TableCell className="text-right">
                      <Input
                        type="number"
                        min="0"
                        className="h-8 w-[100px] text-right ml-auto"
                        value={localCounts[item.id] ?? (item.physical_quantity !== null ? String(item.physical_quantity) : "")}
                        onChange={(e) => handleCountChange(item.id, e.target.value)}
                        onBlur={() => handleCountBlur(item)}
                        disabled={item.status === "applied"}
                      />
                    </TableCell>
                    <TableCell className="text-center">{getVarianceBadge(item.variance)}</TableCell>
                    <TableCell className="text-center">{getStatusBadge(item.status)}</TableCell>
                    <TableCell className="text-right">
                      {item.status === "counted" && item.variance !== null && item.variance !== 0 ? (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleApplyItem(item)}
                          disabled={applyItemMutation.isPending}
                        >
                          Apply
                        </Button>
                      ) : null}
                    </TableCell>
                  </TableRow>
                ))}
                {filteredItems.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                      No items match your filters
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </Card>
        )}

        {/* Apply All Confirmation */}
        <AlertDialog open={confirmApplyAll} onOpenChange={setConfirmApplyAll}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Apply All Reconciliations?</AlertDialogTitle>
              <AlertDialogDescription>
                This will update stock for {countableWithVariance} items with variances.
                Total shortage: {stats.totalShortage} units. Total excess: {stats.totalExcess} units.
                This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleApplyAll}>Apply All</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    );
  }

  // Start screen with history
  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
        <div>
          <h1 className="text-xl font-semibold text-foreground flex items-center gap-2">
            <ClipboardList className="h-5 w-5" />
            Stock Reconciliation
          </h1>
          <p className="text-sm text-muted-foreground">
            Compare physical stock against system records
          </p>
        </div>
        <Button onClick={handleStartSession} disabled={startMutation.isPending}>
          {startMutation.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <Plus className="h-4 w-4 mr-2" />
          )}
          Start Reconciliation
        </Button>
      </div>

      {/* History */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <History className="h-4 w-4" />
            Reconciliation History
          </CardTitle>
          <CardDescription>Past reconciliation sessions for this branch</CardDescription>
        </CardHeader>
        <CardContent>
          {historyLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : history.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Package className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No reconciliations yet</p>
              <p className="text-xs">Start your first reconciliation to audit stock</p>
            </div>
          ) : (
            <div className="space-y-2">
              {history.map((h) => (
                <div
                  key={h.id}
                  className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-3 rounded-lg border cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => {
                    if (h.status === "in_progress") {
                      setActiveSessionId(h.id);
                    }
                  }}
                >
                  <div className="flex items-center gap-3">
                    <div>
                      <div className="font-medium text-sm">
                        {format(new Date(h.created_at), "PPp")}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {h.total_items} items · {h.items_counted} counted · {h.items_with_variance} with variance
                      </div>
                    </div>
                  </div>
                  <Badge
                    variant={h.status === "completed" ? "default" : h.status === "in_progress" ? "secondary" : "outline"}
                    className="mt-1 sm:mt-0"
                  >
                    {h.status === "in_progress" ? "In Progress" : h.status === "completed" ? "Completed" : "Cancelled"}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default StockReconciliation;
