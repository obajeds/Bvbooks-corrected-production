// Stock Adjustments - Professional (auto-process) & Enterprise (approval-based)
import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertTriangle, Plus, Package, TrendingUp, TrendingDown, Clock, CheckCircle, XCircle, Loader2, HelpCircle, User, Calendar, Eye, ArrowRight } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { PermissionGate } from "@/components/auth/PermissionGate";
import { StockAdjustmentDialog } from "@/components/inventory/StockAdjustmentDialog";
import { useApprovalRequests } from "@/hooks/useApprovalRequests";
import { useStockMovements } from "@/hooks/useStockMovements";
import { useBusiness } from "@/hooks/useBusiness";
import { useProducts } from "@/hooks/useProducts";
import { useBranches } from "@/hooks/useBranches";
import { useStaff } from "@/hooks/useStaff";
import { useAuth } from "@/contexts/AuthContext";
import { format } from "date-fns";
import { useNavigate } from "react-router-dom";
import { useBusinessPlan } from "@/hooks/useFeatureGating";
import { UpgradeRequired } from "@/components/subscription/UpgradeRequired";

const ADJUSTMENT_REASONS = {
  purchase_new_stock: "Purchase of new stocks",
  physical_count: "Physical count correction",
  damage_spoilage: "Damage or spoilage",
  theft_loss: "Theft or loss",
  data_entry_error: "Data entry error",
  opening_balance: "Opening balance correction",
  system_migration: "System migration fix",
  stock_movement: "Stock movement",
};

const StockAdjustments = () => {
  const { data: planInfo, isLoading: planLoading } = useBusinessPlan();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("my-requests");
  const { data: business } = useBusiness();
  const { data: allRequests = [], isLoading } = useApprovalRequests();
  const { data: stockMovements = [], isLoading: stockMovementsLoading } = useStockMovements();
  const { data: products = [] } = useProducts();
  const { data: branches = [] } = useBranches(business?.id);
  const { data: staffList = [] } = useStaff();
  const { user } = useAuth();
  const navigate = useNavigate();

  // Get current user's staff record (must be before early returns)
  const currentStaff = useMemo(() => {
    return staffList.find(s => s.user_id === user?.id);
  }, [staffList, user?.id]);

  // Filter only stock_adjustment type requests (for Enterprise)
  const adjustmentRequests = allRequests.filter(r => r.request_type === "stock_adjustment");
  
  // Filter for current user's requests
  const myRequests = useMemo(() => {
    if (!currentStaff?.id) return [];
    return adjustmentRequests.filter(r => r.requested_by === currentStaff.id);
  }, [adjustmentRequests, currentStaff?.id]);

  // Filter stock movements for adjustments (for Professional)
  const adjustmentMovements = useMemo(() => {
    if (!stockMovements) return [];
    return stockMovements.filter(m => 
      m.movement_type === 'adjustment' || 
      m.notes?.toLowerCase().includes('adjustment')
    ).map(m => ({
      id: m.id,
      product_name: m.products?.name || "Unknown Product",
      movement_type: m.movement_type,
      quantity: m.quantity,
      previous_quantity: m.previous_quantity,
      new_quantity: m.new_quantity,
      notes: m.notes,
      created_at: m.created_at,
      branch_name: m.branches?.name || "Unknown Location",
    }));
  }, [stockMovements]);

  // Gate for non-eligible plan users
  if (planLoading) {
    return (
      <main className="flex-1 overflow-y-auto p-4 sm:p-6 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </main>
    );
  }
  
  const currentPlan = planInfo?.effectivePlan;
  const isEnterprise = currentPlan === 'enterprise';
  
  if (currentPlan !== 'enterprise' && currentPlan !== 'professional') {
    return <UpgradeRequired featureKey="stock.adjustments" requiredPlan="professional" />;
  }

  const pendingRequests = adjustmentRequests.filter(r => r.status === "pending");
  const approvedRequests = adjustmentRequests.filter(r => r.status === "approved");
  const rejectedRequests = adjustmentRequests.filter(r => r.status === "rejected");

  const myPendingCount = myRequests.filter(r => r.status === "pending").length;
  const myApprovedCount = myRequests.filter(r => r.status === "approved").length;
  const myRejectedCount = myRequests.filter(r => r.status === "rejected").length;

  const getProductName = (productId: string | null) => {
    if (!productId) return "Unknown Product";
    const product = products.find(p => p.id === productId);
    return product?.name || "Unknown Product";
  };

  const getBranchName = (branchId: string | null) => {
    if (!branchId) return "All Locations";
    const branch = branches.find(b => b.id === branchId);
    return branch?.name || "Unknown Location";
  };

  const parseNotes = (notes: string | null) => {
    if (!notes) return { reason: "", note: "", adjustmentType: "increase", branchId: null, productId: null };
    try {
      const parsed = JSON.parse(notes);
      return parsed;
    } catch {
      return { reason: notes, note: "", adjustmentType: "increase", branchId: null, productId: null };
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge variant="outline" className="text-amber-500 border-amber-500 gap-1"><Clock className="w-3 h-3" />Pending Approval</Badge>;
      case "approved":
        return <Badge className="bg-green-500 gap-1"><CheckCircle className="w-3 h-3" />Approved</Badge>;
      case "rejected":
        return <Badge variant="destructive" className="gap-1"><XCircle className="w-3 h-3" />Rejected</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getAdjustmentTypeBadge = (type: string) => {
    if (type === "increase") {
      return <Badge className="bg-emerald-500 gap-1"><TrendingUp className="w-3 h-3" />Increase</Badge>;
    }
    return <Badge className="bg-rose-500 gap-1"><TrendingDown className="w-3 h-3" />Decrease</Badge>;
  };

  // Status progress tracker component
  const StatusTracker = ({ status }: { status: string }) => {
    const steps = [
      { key: "submitted", label: "Submitted", icon: Package },
      { key: "pending", label: "Pending Review", icon: Clock },
      { key: "approved", label: "Approved", icon: CheckCircle },
    ];

    const getStepStatus = (stepKey: string) => {
      if (status === "rejected") {
        if (stepKey === "submitted") return "complete";
        if (stepKey === "pending") return "rejected";
        return "inactive";
      }
      if (status === "pending") {
        if (stepKey === "submitted") return "complete";
        if (stepKey === "pending") return "current";
        return "inactive";
      }
      if (status === "approved") {
        return "complete";
      }
      return "inactive";
    };

    return (
      <div className="flex items-center gap-1 text-xs">
        {steps.map((step, index) => {
          const stepStatus = getStepStatus(step.key);
          const Icon = step.icon;
          
          return (
            <div key={step.key} className="flex items-center">
              <div className={`flex items-center gap-1 px-2 py-1 rounded-full ${
                stepStatus === "complete" ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" :
                stepStatus === "current" ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" :
                stepStatus === "rejected" ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" :
                "bg-muted text-muted-foreground"
              }`}>
                <Icon className="w-3 h-3" />
                <span className="hidden sm:inline">{step.label}</span>
              </div>
              {index < steps.length - 1 && (
                <ArrowRight className={`w-3 h-3 mx-1 ${
                  stepStatus === "complete" ? "text-green-500" : "text-muted-foreground/30"
                }`} />
              )}
            </div>
          );
        })}
        {status === "rejected" && (
          <>
            <ArrowRight className="w-3 h-3 mx-1 text-red-500" />
            <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
              <XCircle className="w-3 h-3" />
              <span className="hidden sm:inline">Rejected</span>
            </div>
          </>
        )}
      </div>
    );
  };

  // Mobile card view
  const renderMobileCard = (request: any, showTracker: boolean = false) => {
    const parsedNotes = parseNotes(request.notes);
    const reasonLabel = ADJUSTMENT_REASONS[parsedNotes.reason as keyof typeof ADJUSTMENT_REASONS] || parsedNotes.reason;
    
    return (
      <div key={request.id} className="p-4 border rounded-lg space-y-3 bg-card">
        <div className="flex items-start justify-between gap-2 flex-wrap">
          {getAdjustmentTypeBadge(parsedNotes.adjustmentType)}
          {!showTracker && getStatusBadge(request.status)}
        </div>

        {showTracker && (
          <div className="py-2 border-b">
            <StatusTracker status={request.status} />
          </div>
        )}
        
        <div className="space-y-2 text-sm">
          <div className="flex items-center gap-2">
            <Package className="w-4 h-4 text-muted-foreground" />
            <span className="font-medium">{getProductName(parsedNotes.productId || request.reference_id)}</span>
          </div>
          
          <div className="grid grid-cols-2 gap-2 text-muted-foreground">
            <span>Quantity:</span>
            <span className="font-medium text-foreground">{request.amount || 0}</span>
            
            <span>Location:</span>
            <span className="font-medium text-foreground">{getBranchName(parsedNotes.branchId)}</span>
            
            <span>Reason:</span>
            <span className="font-medium text-foreground">{reasonLabel}</span>
          </div>
          
          <div className="flex items-center gap-2 text-muted-foreground">
            <User className="w-4 h-4" />
            <span>
              {request.requester?.full_name || "Unknown"}
              {request.requester?.role && <span className="text-xs ml-1">({request.requester.role})</span>}
            </span>
          </div>
          
          <div className="flex items-center gap-2 text-muted-foreground">
            <Calendar className="w-4 h-4" />
            <span>{format(new Date(request.created_at), "MMM d, yyyy HH:mm")}</span>
          </div>
          
          {parsedNotes.note && (
            <div className="p-2 bg-muted rounded text-muted-foreground text-xs">
              <p>{parsedNotes.note}</p>
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderRequestsTable = (requests: any[], showTracker: boolean = false) => {
    if (requests.length === 0) {
      return (
        <div className="text-center py-12 text-muted-foreground">
          <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>No stock adjustments found</p>
          <p className="text-sm">Create a new adjustment to correct inventory discrepancies</p>
        </div>
      );
    }

    return (
      <>
        {/* Mobile view */}
        <div className="md:hidden space-y-3">
          {requests.map(request => renderMobileCard(request, showTracker))}
        </div>

        {/* Desktop table */}
        <div className="hidden md:block overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Quantity</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Reason</TableHead>
                {!showTracker && <TableHead>Requested By</TableHead>}
                <TableHead>{showTracker ? "Status Progress" : "Status"}</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {requests.map(request => {
                const parsedNotes = parseNotes(request.notes);
                const reasonLabel = ADJUSTMENT_REASONS[parsedNotes.reason as keyof typeof ADJUSTMENT_REASONS] || parsedNotes.reason;
                
                return (
                  <TableRow key={request.id}>
                    <TableCell className="font-medium">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger className="flex items-center gap-2">
                            <Package className="w-4 h-4 text-muted-foreground" />
                            {getProductName(parsedNotes.productId || request.reference_id)}
                          </TooltipTrigger>
                          {parsedNotes.note && (
                            <TooltipContent>
                              <p className="max-w-xs">{parsedNotes.note}</p>
                            </TooltipContent>
                          )}
                        </Tooltip>
                      </TooltipProvider>
                    </TableCell>
                    <TableCell>{getAdjustmentTypeBadge(parsedNotes.adjustmentType)}</TableCell>
                    <TableCell className="font-mono">{request.amount || 0}</TableCell>
                    <TableCell>{getBranchName(parsedNotes.branchId)}</TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground">{reasonLabel}</span>
                    </TableCell>
                    {!showTracker && (
                      <TableCell>
                        {request.requester?.full_name || "Unknown"}
                        {request.requester?.role && <span className="text-xs text-muted-foreground ml-1">({request.requester.role})</span>}
                      </TableCell>
                    )}
                    <TableCell>
                      {showTracker ? <StatusTracker status={request.status} /> : getStatusBadge(request.status)}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {format(new Date(request.created_at), "MMM d, yyyy HH:mm")}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </>
    );
  };

  // Render stock movements table for Professional plans
  const renderMovementsTable = (movements: any[]) => {
    if (movements.length === 0) {
      return (
        <div className="text-center py-12 text-muted-foreground">
          <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>No stock adjustments found</p>
          <p className="text-sm">Create a new adjustment to correct inventory discrepancies</p>
        </div>
      );
    }

    return (
      <>
        {/* Mobile view */}
        <div className="md:hidden space-y-3">
          {movements.map(movement => (
            <div key={movement.id} className="p-4 border rounded-lg space-y-3 bg-card">
              <div className="flex items-start justify-between gap-2 flex-wrap">
                {movement.movement_type === "out" || movement.movement_type === "sale" || movement.movement_type === "damage" || movement.movement_type === "transfer_out" ? (
                  <Badge className="bg-rose-500 gap-1"><TrendingDown className="w-3 h-3" />Decrease</Badge>
                ) : (
                  <Badge className="bg-emerald-500 gap-1"><TrendingUp className="w-3 h-3" />Increase</Badge>
                )}
              </div>
              
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <Package className="w-4 h-4 text-muted-foreground" />
                  <span className="font-medium">{movement.product_name}</span>
                </div>
                
                <div className="grid grid-cols-2 gap-2 text-muted-foreground">
                  <span>Quantity Changed:</span>
                  <span className="font-medium text-foreground">{Math.abs(movement.quantity)}</span>
                  
                  <span>Stock Change:</span>
                  <span className="font-medium text-foreground">{movement.previous_quantity} → {movement.new_quantity}</span>
                  
                  <span>Location:</span>
                  <span className="font-medium text-foreground">{movement.branch_name}</span>
                </div>
                
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Calendar className="w-4 h-4" />
                  <span>{format(new Date(movement.created_at), "MMM d, yyyy HH:mm")}</span>
                </div>
                
                {movement.notes && (
                  <div className="p-2 bg-muted rounded text-muted-foreground text-xs">
                    <p>{movement.notes}</p>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Desktop table */}
        <div className="hidden md:block overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Quantity Changed</TableHead>
                <TableHead>Previous → New</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Notes</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {movements.map(movement => (
                <TableRow key={movement.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      <Package className="w-4 h-4 text-muted-foreground" />
                      {movement.product_name}
                    </div>
                  </TableCell>
                  <TableCell>
                    {movement.movement_type === "out" || movement.movement_type === "sale" || movement.movement_type === "damage" || movement.movement_type === "transfer_out" ? (
                      <Badge className="bg-rose-500 gap-1"><TrendingDown className="w-3 h-3" />Decrease</Badge>
                    ) : (
                      <Badge className="bg-emerald-500 gap-1"><TrendingUp className="w-3 h-3" />Increase</Badge>
                    )}
                  </TableCell>
                  <TableCell className="font-mono">{Math.abs(movement.quantity)}</TableCell>
                  <TableCell className="font-mono text-sm">
                    <span className="text-muted-foreground">{movement.previous_quantity}</span>
                    {" → "}
                    <span className="font-medium">{movement.new_quantity}</span>
                  </TableCell>
                  <TableCell>{movement.branch_name}</TableCell>
                  <TableCell>
                    <span className="text-sm text-muted-foreground">{movement.notes || "—"}</span>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {format(new Date(movement.created_at), "MMM d, yyyy HH:mm")}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </>
    );
  };

  return (
    <main className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Stock Adjustments</h1>
          <p className="text-muted-foreground text-sm sm:text-base">
            Correct inventory mismatches when physical stock differs from system stock
          </p>
        </div>
        
        <PermissionGate permissions={["inventory.adjust.create"]}>
          <Button onClick={() => setIsDialogOpen(true)} className="w-full sm:w-auto">
            <Plus className="w-4 h-4 mr-2" />
            New Adjustment
          </Button>
        </PermissionGate>
      </div>

      {/* Info Card */}
      <Card className="border-blue-200 bg-blue-50/50 dark:bg-blue-950/20 dark:border-blue-900">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <HelpCircle className="w-5 h-5 text-blue-500 mt-0.5 flex-shrink-0" />
            <div className="space-y-1">
              <p className="font-medium text-blue-900 dark:text-blue-100">When to use Stock Adjustments</p>
              <p className="text-sm text-blue-700 dark:text-blue-300">
                <strong>Sales</strong> change stock because customers buy. <strong>Purchases</strong> change stock because suppliers deliver. 
                <strong> Adjustments</strong> change stock because reality disagrees with the system.
                {isEnterprise 
                  ? " All adjustments require admin approval before stock is updated."
                  : " Adjustments are processed immediately when submitted."}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* My Requests Status Card - Only show if user has pending requests (Enterprise only) */}
      {isEnterprise && myPendingCount > 0 && (
        <Card className="border-amber-200 bg-amber-50/50 dark:bg-amber-950/20 dark:border-amber-900">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-full bg-amber-100 dark:bg-amber-900/50">
                  <Clock className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <p className="font-medium text-amber-900 dark:text-amber-100">
                    You have {myPendingCount} pending request{myPendingCount > 1 ? 's' : ''}
                  </p>
                  <p className="text-sm text-amber-700 dark:text-amber-300">
                    Awaiting admin approval before stock is updated
                  </p>
                </div>
              </div>
              <Button 
                variant="outline" 
                size="sm"
                className="border-amber-300 text-amber-700 hover:bg-amber-100 dark:border-amber-700 dark:text-amber-400"
                onClick={() => setActiveTab("my-requests")}
              >
                <Eye className="w-4 h-4 mr-2" />
                View Status
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Summary Cards - Only show approval stats for Enterprise */}
      {isEnterprise && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-900/30">
                  <Clock className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{pendingRequests.length}</p>
                  <p className="text-xs text-muted-foreground">Pending</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{approvedRequests.length}</p>
                  <p className="text-xs text-muted-foreground">Approved</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-red-100 dark:bg-red-900/30">
                  <XCircle className="w-5 h-5 text-red-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{rejectedRequests.length}</p>
                  <p className="text-xs text-muted-foreground">Rejected</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                  <Package className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{adjustmentRequests.length}</p>
                  <p className="text-xs text-muted-foreground">Total</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tabbed Adjustments List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="w-5 h-5" />
            {isEnterprise ? "Adjustment Requests" : "Adjustment History"}
          </CardTitle>
          <CardDescription>
            {isEnterprise 
              ? "Track your stock adjustment requests and their approval status"
              : "View your stock adjustment history"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {(isLoading || stockMovementsLoading) ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : isEnterprise ? (
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="grid w-full grid-cols-2 mb-4">
                  <TabsTrigger value="my-requests" className="gap-2">
                    <User className="w-4 h-4" />
                    My Requests
                    {myPendingCount > 0 && (
                      <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
                        {myPendingCount}
                      </Badge>
                    )}
                  </TabsTrigger>
                  <TabsTrigger value="all" className="gap-2">
                    <Package className="w-4 h-4" />
                    All History
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="my-requests" className="mt-0">
                  {myRequests.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                      <User className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>You haven't submitted any adjustments yet</p>
                      <p className="text-sm">Click "New Adjustment" to create one</p>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center gap-4 mb-4 p-3 bg-muted/50 rounded-lg text-sm">
                        <span className="text-muted-foreground">Your requests:</span>
                        <div className="flex items-center gap-1">
                          <Clock className="w-4 h-4 text-amber-500" />
                          <span>{myPendingCount} pending</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <CheckCircle className="w-4 h-4 text-green-500" />
                          <span>{myApprovedCount} approved</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <XCircle className="w-4 h-4 text-red-500" />
                          <span>{myRejectedCount} rejected</span>
                        </div>
                      </div>
                      {renderRequestsTable(myRequests, true)}
                    </>
                  )}
                </TabsContent>

                <TabsContent value="all" className="mt-0">
                  {renderRequestsTable(adjustmentRequests, false)}
                </TabsContent>
              </Tabs>
            ) : (
              // Professional plan: show stock movements directly (auto-processed)
              renderMovementsTable(adjustmentMovements)
          )}
        </CardContent>
      </Card>

      <StockAdjustmentDialog 
        open={isDialogOpen} 
        onOpenChange={setIsDialogOpen} 
      />
    </main>
  );
};

export default StockAdjustments;
