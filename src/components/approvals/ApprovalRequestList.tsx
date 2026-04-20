import { useState, useMemo, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CheckCircle, XCircle, Clock, AlertTriangle, Loader2, ArrowRightLeft, Package, RefreshCw, Percent, User, Calendar, TrendingUp, TrendingDown, Filter, CalendarDays, Wallet, Receipt } from "lucide-react";
import { useApprovalRequests, useApproveRequest, useRejectRequest, ApprovalRequest } from "@/hooks/useApprovalRequests";
import { useLeaveRequests, useApproveLeaveRequest, useRejectLeaveRequest } from "@/hooks/useLeaveRequests";
import { usePayroll, useProcessPayroll } from "@/hooks/usePayroll";
import { useStaff } from "@/hooks/useStaff";
import { useProducts } from "@/hooks/useProducts";
import { useBranches } from "@/hooks/useBranches";
import { useBusiness } from "@/hooks/useBusiness";
import { useHasPermission } from "@/hooks/usePermissions";
import { useProcessStockAdjustment } from "@/hooks/useProcessStockAdjustment";
import { useProcessStockTransfer } from "@/hooks/useProcessStockTransfer";
import { useUserRole } from "@/hooks/useUserRole";
import { useCreatePurchaseOrder, useUpdatePurchaseOrder } from "@/hooks/usePurchaseOrders";
import { supabase } from "@/integrations/supabase/client";
import { useCreateActiveDiscount, useActiveDiscounts, useStopActiveDiscount } from "@/hooks/useActiveDiscounts";
import { format } from "date-fns";
import { toast } from "sonner";

type RequestTypeFilter = "all" | "refund" | "stock_adjustment" | "stock_transfer" | "discount" | "purchase_order" | "leave" | "payroll" | "expense";

const REQUEST_TYPE_OPTIONS: { value: RequestTypeFilter; label: string; icon: React.ReactNode }[] = [
  { value: "all", label: "All Types", icon: <Filter className="w-4 h-4" /> },
  { value: "leave", label: "Leave Requests", icon: <CalendarDays className="w-4 h-4" /> },
  { value: "payroll", label: "Payroll", icon: <Wallet className="w-4 h-4" /> },
  { value: "refund", label: "Refunds", icon: <RefreshCw className="w-4 h-4" /> },
  { value: "stock_adjustment", label: "Stock Adjustments", icon: <Package className="w-4 h-4" /> },
  { value: "stock_transfer", label: "Stock Transfers", icon: <ArrowRightLeft className="w-4 h-4" /> },
  { value: "discount", label: "Discounts", icon: <Percent className="w-4 h-4" /> },
  { value: "expense", label: "Expenses", icon: <Receipt className="w-4 h-4" /> },
  { value: "purchase_order", label: "Purchase Orders", icon: <Package className="w-4 h-4" /> },
];

// Leave type labels for display
const LEAVE_TYPE_LABELS: Record<string, string> = {
  annual: "Annual Leave",
  sick: "Sick Leave",
  maternity: "Maternity Leave",
  paternity: "Paternity Leave",
  unpaid: "Unpaid Leave",
  other: "Other",
};

const ApprovalRequestList = () => {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("pending");
  const [typeFilter, setTypeFilter] = useState<RequestTypeFilter>("all");
  const [selectedRequest, setSelectedRequest] = useState<ApprovalRequest | null>(null);
  const [actionType, setActionType] = useState<"approve" | "reject" | null>(null);
  const [notes, setNotes] = useState("");
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  const { data: pendingRequests = [], isLoading: pendingLoading } = useApprovalRequests("pending");
  const { data: allRequests = [], isLoading: allLoading } = useApprovalRequests();
  const { data: leaveRequests = [], isLoading: leaveLoading } = useLeaveRequests();
  const { data: payrollRecords = [], isLoading: payrollLoading } = usePayroll();
  const { data: staffList = [] } = useStaff();
  const { data: products = [] } = useProducts();
  const { data: business } = useBusiness();
  const { data: branches = [] } = useBranches(business?.id);
  const { data: roleData } = useUserRole();
  
  const canApproveRefund = useHasPermission("approval.refund");
  const canApproveStockAdjustment = useHasPermission("approval.stock_adjustment");
  const canApproveDiscount = useHasPermission("approval.discount");
  const canStopDiscount = useHasPermission("approval.discount.stop");
  const canApproveExpense = useHasPermission("approval.expense" as any);

  const approveRequest = useApproveRequest();
  const rejectRequest = useRejectRequest();
  const approveLeave = useApproveLeaveRequest();
  const rejectLeave = useRejectLeaveRequest();
  const processPayroll = useProcessPayroll();
  const processStockAdjustment = useProcessStockAdjustment();
  const processStockTransfer = useProcessStockTransfer();
  const createPurchaseOrder = useCreatePurchaseOrder();
  const updatePurchaseOrder = useUpdatePurchaseOrder();
  const createActiveDiscount = useCreateActiveDiscount();
  const { data: activeDiscounts = [] } = useActiveDiscounts();
  const stopActiveDiscount = useStopActiveDiscount();

  // Pending leave requests
  const pendingLeaveRequests = useMemo(() => 
    leaveRequests.filter((lr: any) => lr.status === "pending"), 
    [leaveRequests]
  );

  // Pending payroll records
  const pendingPayrollRecords = useMemo(() => 
    payrollRecords.filter((pr: any) => pr.status === "pending"), 
    [payrollRecords]
  );

  // Get current user ID on mount
  useEffect(() => {
    const getCurrentUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUserId(user?.id || null);
    };
    getCurrentUser();
  }, []);

  // Find the current user's staff record
  const currentStaff = useMemo(() => {
    if (!currentUserId) return null;
    return staffList.find(s => s.user_id === currentUserId) || null;
  }, [staffList, currentUserId]);

  const isOwner = roleData?.isOwner ?? false;

  // Adjustment reason labels
  const ADJUSTMENT_REASONS: Record<string, string> = {
    physical_count: "Physical count correction",
    damage_spoilage: "Damage or spoilage",
    theft_loss: "Theft or loss",
    data_entry_error: "Data entry error",
    opening_balance: "Opening balance correction",
    system_migration: "System migration fix",
  };

  // Helper to format stock adjustment details
  const formatStockAdjustmentDetails = (request: ApprovalRequest) => {
    if (request.request_type !== "stock_adjustment" || !request.notes) {
      return null;
    }

    try {
      const parsed = JSON.parse(request.notes);
      const product = products.find(p => p.id === parsed.productId);
      const branch = branches.find(b => b.id === parsed.branchId);
      const reasonLabel = ADJUSTMENT_REASONS[parsed.reason] || parsed.reason;
      
      return {
        productName: product?.name || "Unknown Product",
        branchName: branch?.name || "All Locations",
        adjustmentType: parsed.adjustmentType,
        previousQuantity: parsed.previousQuantity,
        newQuantity: parsed.newQuantity,
        reason: reasonLabel,
        note: parsed.note,
      };
    } catch {
      return null;
    }
  };

  // Helper to format stock transfer details
  const formatStockTransferDetails = (request: ApprovalRequest) => {
    if (request.request_type !== "stock_transfer" || !request.notes) {
      return null;
    }

    try {
      const parsed = JSON.parse(request.notes);
      const product = products.find(p => p.id === parsed.productId);
      const fromBranch = branches.find(b => b.id === parsed.fromBranchId);
      const toBranch = branches.find(b => b.id === parsed.toBranchId);
      
      return {
        productName: product?.name || "Unknown Product",
        fromBranchName: fromBranch?.name || "Unknown Branch",
        toBranchName: toBranch?.name || "Unknown Branch",
        quantity: parsed.quantity || request.amount || 0,
        note: parsed.note,
      };
    } catch {
      return null;
    }
  };

  // Helper to format purchase order details
  const formatPurchaseOrderDetails = (request: ApprovalRequest) => {
    if ((request.request_type !== "purchase_order" && request.request_type !== "purchase_order_receive") || !request.notes) {
      return null;
    }

    try {
      const parsed = JSON.parse(request.notes);
      return {
        poNumber: parsed.poNumber,
        supplierName: parsed.supplierName || "Unknown Supplier",
        totalAmount: parsed.totalAmount || request.amount || 0,
        expectedDate: parsed.expectedDate,
        orderNotes: parsed.orderNotes,
        action: parsed.action || (request.request_type === "purchase_order_receive" ? "receive" : "create"),
      };
    } catch {
      return null;
    }
  };

  // Helper to format expense details from JSON notes
  const formatExpenseDetails = (request: ApprovalRequest) => {
    if (request.request_type !== "expense" || !request.notes) {
      return null;
    }

    try {
      const parsed = JSON.parse(request.notes);
      const branch = branches.find(b => b.id === parsed.branchId);
      return {
        description: parsed.description || "Expense",
        amount: parsed.amount,
        paymentMethod: parsed.paymentMethod || "cash",
        expenseDate: parsed.expenseDate,
        branchName: branch?.name || null,
      };
    } catch {
      return null;
    }
  };

  const canApprove = (requestType: string) => {
    // Owner can approve all types
    if (isOwner) return true;
    
    switch (requestType) {
      case "refund": return canApproveRefund;
      case "stock_adjustment": 
      case "stock_transfer": 
      case "purchase_order":
      case "purchase_order_receive": return canApproveStockAdjustment;
      case "discount": return canApproveDiscount;
      case "expense": return canApproveExpense;
      case "leave":
      case "payroll": return isOwner;
      default: return false;
    }
  };

  // Check if current user can approve/reject a specific request
  const canActOnRequest = (request: ApprovalRequest) => {
    // First check if user has permission to approve this type
    if (!canApprove(request.request_type)) return false;
    
    // Owner/Admin can approve any request including their own
    if (isOwner) {
      return true;
    }
    
    // Staff can't approve their own requests
    if (currentStaff && currentStaff.id === request.requested_by) {
      return false;
    }
    
    return true;
  };

  const handleAction = async () => {
    if (!selectedRequest || !actionType) return;

    // Capture all request data into local constants BEFORE any async calls
    // to prevent race conditions from React Query cache invalidation re-renders
    const capturedRequest = { ...selectedRequest };
    const capturedRequestType = selectedRequest.request_type;
    const capturedNotes = selectedRequest.notes;
    const capturedRequestId = selectedRequest.id;
    const capturedRequestedBy = selectedRequest.requested_by;
    const capturedReferenceId = selectedRequest.reference_id;
    const capturedAmount = selectedRequest.amount;
    const capturedBusinessId = business?.id;

    // Determine the approver ID
    let approverId: string | null = null;
    
    if (currentStaff) {
      approverId = currentStaff.id;
    } else if (isOwner && currentUserId && business) {
      // Owner without staff record - auto-create one for them
      try {
        const { data: newStaff, error: createError } = await supabase
          .from("staff")
          .insert({
            business_id: business.id,
            user_id: currentUserId,
            full_name: business.owner_name,
            email: business.owner_email,
            role: "owner",
            is_active: true,
          })
          .select("id")
          .single();
        
        if (createError) {
          // If duplicate, try to fetch existing
          if (createError.code === "23505") {
            const { data: existingStaff } = await supabase
              .from("staff")
              .select("id")
              .eq("user_id", currentUserId)
              .eq("business_id", business.id)
              .maybeSingle();
            
            if (existingStaff) {
              approverId = existingStaff.id;
            } else {
              throw createError;
            }
          } else {
            throw createError;
          }
        } else {
          approverId = newStaff.id;
        }
      } catch (error) {
        console.error("Failed to create owner staff record:", error);
        toast.error("Unable to process approval. Please try again.");
        return;
      }
    }

    if (!approverId) {
      toast.error("Unable to identify approver. Please try again.");
      return;
    }

    // Validate that approver is not the requester (except for owners)
    if (!isOwner && approverId === capturedRequestedBy) {
      toast.error("You cannot approve or reject your own request.");
      setSelectedRequest(null);
      setActionType(null);
      return;
    }

    try {
      if (actionType === "approve") {
        await approveRequest.mutateAsync({
          requestId: capturedRequestId,
          notes,
        });

        // Process stock adjustment if applicable
        if (capturedRequestType === "stock_adjustment" && capturedNotes) {
          try {
            const parsedNotes = JSON.parse(capturedNotes);
            await processStockAdjustment.mutateAsync({
              requestId: capturedRequestId,
              productId: parsedNotes.productId || capturedReferenceId,
              adjustmentType: parsedNotes.adjustmentType,
              quantity: capturedAmount || 0,
              previousQuantity: parsedNotes.previousQuantity || 0,
              branchId: parsedNotes.branchId,
              staffId: approverId,
              notes: parsedNotes.note,
            });
          } catch (e) {
            console.error("Failed to process stock adjustment:", e);
          }
        }

        // Process stock transfer if applicable
        if (capturedRequestType === "stock_transfer" && capturedNotes) {
          try {
            const parsedNotes = JSON.parse(capturedNotes);
            await processStockTransfer.mutateAsync({
              requestId: capturedRequestId,
              productId: parsedNotes.productId,
              fromBranchId: parsedNotes.fromBranchId,
              toBranchId: parsedNotes.toBranchId,
              quantity: parsedNotes.quantity || capturedAmount || 0,
              staffId: approverId,
              notes: parsedNotes.note,
            });
          } catch (e) {
            console.error("Failed to process stock transfer:", e);
          }
        }

        // Process purchase order creation if applicable
        if (capturedRequestType === "purchase_order" && capturedNotes) {
          try {
            const parsedNotes = JSON.parse(capturedNotes);
            await createPurchaseOrder.mutateAsync({
              po_number: parsedNotes.poNumber,
              supplier_id: parsedNotes.supplierId,
              expected_date: parsedNotes.expectedDate || null,
              total_amount: parsedNotes.totalAmount || 0,
              notes: parsedNotes.orderNotes || null,
            });
          } catch (e) {
            console.error("Failed to create purchase order:", e);
          }
        }

        // Process purchase order receive if applicable
        if (capturedRequestType === "purchase_order_receive" && capturedReferenceId) {
          try {
            await updatePurchaseOrder.mutateAsync({
              id: capturedReferenceId,
              status: "received",
              received_date: new Date().toISOString().split("T")[0],
            });
          } catch (e) {
            console.error("Failed to mark purchase order as received:", e);
          }
        }

        // Process discount approval - create persistent active discount
        if (capturedRequestType === "discount" && capturedNotes) {
          try {
            const parsedNotes = JSON.parse(capturedNotes);
            await createActiveDiscount.mutateAsync({
              discount_percent: parsedNotes.discountPercent,
              reason: parsedNotes.reason || "Approved discount",
              approved_by: approverId,
              approval_request_id: capturedRequestId,
              notes: notes || null,
            });
            toast.success("Discount is now active and will apply to all sales until stopped.");
          } catch (e) {
            console.error("Failed to create active discount:", e);
            toast.error("Discount approved but failed to activate. Please activate manually.");
          }
        }

        // Process expense approval - create the actual expense record
        if (capturedRequestType === "expense" && capturedNotes) {
          try {
            const parsedNotes = JSON.parse(capturedNotes);
            const { error: expenseError } = await supabase
              .from("expenses")
              .insert({
                business_id: capturedBusinessId!,
                branch_id: parsedNotes.branchId || null,
                description: parsedNotes.description,
                amount: parsedNotes.amount,
                payment_method: parsedNotes.paymentMethod || "cash",
                expense_date: parsedNotes.expenseDate || new Date().toISOString().split("T")[0],
                created_by: capturedRequestedBy,
              });
            if (expenseError) {
              console.error("Expense insert failed:", expenseError);
              throw expenseError;
            }
            queryClient.invalidateQueries({ queryKey: ["expenses"] });
            queryClient.invalidateQueries({ queryKey: ["todays_expenses"] });
            toast.success("Expense has been approved and recorded.");
          } catch (e) {
            console.error("Failed to create expense from approval:", e);
            toast.error("Expense approved but failed to record. Please add manually.", { duration: 10000 });
          }
        }
      } else {
        await rejectRequest.mutateAsync({
          requestId: capturedRequestId,
          notes,
        });
      }
      setSelectedRequest(null);
      setActionType(null);
      setNotes("");
    } catch (error: any) {
      console.error("Approval action failed:", error);
      // More specific error handling
      if (error.message?.includes("check_requester_not_approver")) {
        toast.error("You cannot approve or reject your own request.");
      }
    }
  };

  const getRequestTypeIcon = (type: string) => {
    switch (type) {
      case "refund": return <RefreshCw className="w-3 h-3" />;
      case "stock_adjustment": return <Package className="w-3 h-3" />;
      case "stock_transfer": return <ArrowRightLeft className="w-3 h-3" />;
      case "discount": return <Percent className="w-3 h-3" />;
      case "purchase_order":
      case "purchase_order_receive": return <Package className="w-3 h-3" />;
      case "leave": return <CalendarDays className="w-3 h-3" />;
      case "payroll": return <Wallet className="w-3 h-3" />;
      case "expense": return <Receipt className="w-3 h-3" />;
      default: return null;
    }
  };

  const getRequestTypeBadge = (type: string) => {
    switch (type) {
      case "refund":
        return <Badge variant="destructive" className="gap-1">{getRequestTypeIcon(type)}Refund</Badge>;
      case "stock_adjustment":
        return <Badge className="bg-amber-500 gap-1">{getRequestTypeIcon(type)}Stock Adjustment</Badge>;
      case "stock_transfer":
        return <Badge className="bg-indigo-500 gap-1">{getRequestTypeIcon(type)}Stock Transfer</Badge>;
      case "discount":
        return <Badge className="bg-blue-500 gap-1">{getRequestTypeIcon(type)}Discount</Badge>;
      case "purchase_order":
        return <Badge className="bg-emerald-500 gap-1">{getRequestTypeIcon(type)}Purchase Order</Badge>;
      case "purchase_order_receive":
        return <Badge className="bg-teal-500 gap-1">{getRequestTypeIcon(type)}PO Receive</Badge>;
      case "leave":
        return <Badge className="bg-purple-500 gap-1">{getRequestTypeIcon(type)}Leave</Badge>;
      case "payroll":
        return <Badge className="bg-orange-500 gap-1">{getRequestTypeIcon(type)}Payroll</Badge>;
      case "expense":
        return <Badge className="bg-cyan-600 gap-1">{getRequestTypeIcon(type)}Expense</Badge>;
      default:
        return <Badge variant="secondary">{type}</Badge>;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge variant="outline" className="text-amber-500 border-amber-500"><Clock className="w-3 h-3 mr-1" />Pending</Badge>;
      case "approved":
        return <Badge className="bg-green-500"><CheckCircle className="w-3 h-3 mr-1" />Approved</Badge>;
      case "rejected":
        return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" />Rejected</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const formatCurrency = (amount: number | null) => {
    if (amount === null) return "-";
    return new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", minimumFractionDigits: 0 }).format(amount);
  };

  const formatAmount = (request: ApprovalRequest) => {
    if (request.request_type === "stock_transfer" || request.request_type === "stock_adjustment") {
      return `${request.amount || 0}`;
    }
    return formatCurrency(request.amount);
  };

  // Filter requests by type
  const filterByType = (requests: ApprovalRequest[]) => {
    if (typeFilter === "all") return requests;
    if (typeFilter === "purchase_order") {
      return requests.filter(r => r.request_type === "purchase_order" || r.request_type === "purchase_order_receive");
    }
    return requests.filter(r => r.request_type === typeFilter);
  };

  const resolvedRequests = allRequests.filter(r => r.status !== "pending");
  const resolvedLeaveRequests = leaveRequests.filter((lr: any) => lr.status !== "pending");
  const resolvedPayrollRecords = payrollRecords.filter((pr: any) => pr.status !== "pending");
  
  // Filtered requests - standard approval requests only for non-leave/payroll filters
  const filteredPendingRequests = typeFilter === "leave" || typeFilter === "payroll" 
    ? [] 
    : filterByType(pendingRequests);
  const filteredResolvedRequests = typeFilter === "leave" || typeFilter === "payroll" 
    ? [] 
    : filterByType(resolvedRequests);

  // Get counts by type for pending requests (including leave and payroll)
  const pendingCountByType = useMemo(() => {
    return {
      all: pendingRequests.length + pendingLeaveRequests.length + pendingPayrollRecords.length,
      refund: pendingRequests.filter(r => r.request_type === "refund").length,
      stock_adjustment: pendingRequests.filter(r => r.request_type === "stock_adjustment").length,
      stock_transfer: pendingRequests.filter(r => r.request_type === "stock_transfer").length,
      discount: pendingRequests.filter(r => r.request_type === "discount").length,
      purchase_order: pendingRequests.filter(r => r.request_type === "purchase_order" || r.request_type === "purchase_order_receive").length,
      leave: pendingLeaveRequests.length,
      payroll: pendingPayrollRecords.length,
      expense: pendingRequests.filter(r => r.request_type === "expense").length,
    };
  }, [pendingRequests, pendingLeaveRequests, pendingPayrollRecords]);

  // Mobile card view for individual request
  const renderMobileCard = (request: ApprovalRequest, showActions: boolean) => {
    const stockDetails = formatStockAdjustmentDetails(request);
    const transferDetails = formatStockTransferDetails(request);
    const expenseDetails = formatExpenseDetails(request);
    
    return (
      <div key={request.id} className="p-4 border rounded-lg space-y-3 bg-card">
        <div className="flex items-start justify-between gap-2">
          {getRequestTypeBadge(request.request_type)}
          {getStatusBadge(request.status)}
        </div>
        
        <div className="space-y-2 text-sm">
          <div className="flex items-center gap-2 text-muted-foreground">
            <User className="w-4 h-4" />
            <span>Requested by: <span className="text-foreground font-medium">
              {request.requester?.full_name || "Unknown"}
              {request.requester?.role && <span className="text-xs ml-1">({request.requester.role})</span>}
            </span></span>
          </div>
          
          {stockDetails ? (
            <>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Package className="w-4 h-4" />
                <span>Product: <span className="text-foreground font-medium">{stockDetails.productName}</span></span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                {stockDetails.adjustmentType === "increase" ? (
                  <TrendingUp className="w-4 h-4 text-emerald-500" />
                ) : (
                  <TrendingDown className="w-4 h-4 text-rose-500" />
                )}
                <span>
                  {stockDetails.adjustmentType === "increase" ? "Increase" : "Decrease"}: 
                  <span className="text-foreground font-medium ml-1">{request.amount}</span>
                  <span className="text-muted-foreground ml-1">
                    ({stockDetails.previousQuantity} → {stockDetails.newQuantity})
                  </span>
                </span>
              </div>
              <div className="p-2 bg-muted rounded">
                <p className="text-muted-foreground text-xs mb-1">Reason:</p>
                <p className="font-medium">{stockDetails.reason}</p>
                {stockDetails.note && (
                  <p className="text-muted-foreground mt-1 text-xs">{stockDetails.note}</p>
                )}
              </div>
            </>
          ) : transferDetails ? (
            <>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Package className="w-4 h-4" />
                <span>Product: <span className="text-foreground font-medium">{transferDetails.productName}</span></span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <ArrowRightLeft className="w-4 h-4 text-indigo-500" />
                <span>Quantity: <span className="text-foreground font-medium">{transferDetails.quantity}</span></span>
              </div>
              <div className="p-2 bg-muted rounded">
                <p className="text-muted-foreground text-xs mb-1">Transfer:</p>
                <p className="font-medium">{transferDetails.fromBranchName} → {transferDetails.toBranchName}</p>
                {transferDetails.note && (
                  <p className="text-muted-foreground mt-1 text-xs">{transferDetails.note}</p>
                )}
              </div>
            </>
          ) : expenseDetails ? (
            <>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Receipt className="w-4 h-4" />
                <span>Amount: <span className="text-foreground font-medium">{formatCurrency(expenseDetails.amount)}</span></span>
              </div>
              <div className="p-2 bg-muted rounded">
                <p className="font-medium">{expenseDetails.description}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {expenseDetails.paymentMethod} • {expenseDetails.expenseDate}
                  {expenseDetails.branchName && ` • ${expenseDetails.branchName}`}
                </p>
              </div>
            </>
          ) : (
            <>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Package className="w-4 h-4" />
                <span>Amount: <span className="text-foreground font-medium">{formatAmount(request)}</span></span>
              </div>
              {request.notes && (
                <div className="p-2 bg-muted rounded text-muted-foreground">
                  <p className="line-clamp-2">{request.notes}</p>
                </div>
              )}
            </>
          )}
          
          <div className="flex items-center gap-2 text-muted-foreground">
            <Calendar className="w-4 h-4" />
            <span>{format(new Date(request.created_at), "MMM d, yyyy HH:mm")}</span>
          </div>
          
          {request.approver && request.status !== "pending" && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <User className="w-4 h-4" />
              <span>
                {request.status === "approved" ? "Approved" : "Rejected"} by: 
                <span className="text-foreground font-medium ml-1">
                  {request.approver.full_name}
                  {request.approver.role && <span className="text-xs ml-1">({request.approver.role})</span>}
                </span>
              </span>
            </div>
          )}
        </div>

      {showActions && canActOnRequest(request) && (
        <div className="flex gap-2 pt-2 border-t">
          <Button
            size="sm"
            variant="outline"
            className="flex-1 text-green-600 hover:text-green-700 hover:bg-green-50"
            onClick={() => {
              setSelectedRequest(request);
              setActionType("approve");
            }}
          >
            <CheckCircle className="w-4 h-4 mr-1" />
            Approve
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="flex-1 text-red-600 hover:text-red-700 hover:bg-red-50"
            onClick={() => {
              setSelectedRequest(request);
              setActionType("reject");
            }}
          >
            <XCircle className="w-4 h-4 mr-1" />
            Reject
          </Button>
        </div>
      )}
      {showActions && !canActOnRequest(request) && canApprove(request.request_type) && (
        <div className="text-center pt-2 border-t">
          <p className="text-sm text-muted-foreground">You cannot approve your own request</p>
        </div>
      )}
    </div>
  );
  };
  const renderTable = (requests: ApprovalRequest[], showActions: boolean, hideEmptyState: boolean = false) => {
    if (requests.length === 0) {
      if (hideEmptyState) return null;
      return (
        <div className="text-center py-12 text-muted-foreground">
          <AlertTriangle className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>No requests found</p>
        </div>
      );
    }

    return (
      <>
        {/* Mobile view */}
        <div className="md:hidden space-y-3">
          {requests.map((request) => renderMobileCard(request, showActions))}
        </div>

        {/* Desktop table view */}
        <div className="hidden md:block overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Type</TableHead>
                <TableHead>Requested By</TableHead>
                <TableHead>Amount/Qty</TableHead>
                <TableHead className="max-w-[200px]">Details</TableHead>
                <TableHead>Status</TableHead>
                {!showActions && <TableHead>Resolved By</TableHead>}
                <TableHead>Date</TableHead>
                {showActions && <TableHead className="text-right">Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {requests.map((request) => {
                const stockDetails = formatStockAdjustmentDetails(request);
                const transferDetails = formatStockTransferDetails(request);
                return (
                <TableRow key={request.id}>
                  <TableCell>{getRequestTypeBadge(request.request_type)}</TableCell>
                  <TableCell className="font-medium">
                    {request.requester?.full_name || "Unknown"}
                    {request.requester?.role && <span className="text-xs text-muted-foreground ml-1">({request.requester.role})</span>}
                  </TableCell>
                  <TableCell>
                    {stockDetails ? (
                      <div className="flex items-center gap-1">
                        {stockDetails.adjustmentType === "increase" ? (
                          <TrendingUp className="w-3 h-3 text-emerald-500" />
                        ) : (
                          <TrendingDown className="w-3 h-3 text-rose-500" />
                        )}
                        <span>{request.amount}</span>
                      </div>
                    ) : transferDetails ? (
                      <div className="flex items-center gap-1">
                        <ArrowRightLeft className="w-3 h-3 text-indigo-500" />
                        <span>{transferDetails.quantity}</span>
                      </div>
                    ) : (
                      formatAmount(request)
                    )}
                  </TableCell>
                  <TableCell className="max-w-[250px]">
                    {stockDetails ? (
                      <div className="space-y-0.5">
                        <p className="font-medium text-sm truncate">{stockDetails.productName}</p>
                        <p className="text-xs text-muted-foreground">{stockDetails.reason}</p>
                        <p className="text-xs text-muted-foreground">
                          {stockDetails.previousQuantity} → {stockDetails.newQuantity}
                        </p>
                      </div>
                    ) : transferDetails ? (
                      <div className="space-y-0.5">
                        <p className="font-medium text-sm truncate">{transferDetails.productName}</p>
                        <p className="text-xs text-muted-foreground">
                          {transferDetails.fromBranchName} → {transferDetails.toBranchName}
                        </p>
                        {transferDetails.note && (
                          <p className="text-xs text-muted-foreground truncate">{transferDetails.note}</p>
                        )}
                      </div>
                    ) : (() => {
                      const ed = formatExpenseDetails(request);
                      return ed ? (
                        <div className="space-y-0.5">
                          <p className="font-medium text-sm truncate">{ed.description}</p>
                          <p className="text-xs text-muted-foreground">
                            {ed.paymentMethod} • {ed.expenseDate}
                          </p>
                        </div>
                      ) : (
                        <p className="truncate text-muted-foreground text-sm">{request.notes || "-"}</p>
                      );
                    })()}
                  </TableCell>
                  <TableCell>{getStatusBadge(request.status)}</TableCell>
                  {!showActions && (
                    <TableCell>
                      {request.approver ? (
                        <span>
                          {request.approver.full_name}
                          {request.approver.role && <span className="text-xs text-muted-foreground ml-1">({request.approver.role})</span>}
                        </span>
                      ) : "-"}
                    </TableCell>
                  )}
                  <TableCell className="text-muted-foreground text-sm">
                    {format(new Date(request.created_at), "MMM d, yyyy HH:mm")}
                  </TableCell>
                  {showActions && (
                    <TableCell className="text-right">
                      {canActOnRequest(request) ? (
                        <div className="flex gap-2 justify-end">
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-green-600 hover:text-green-700 hover:bg-green-50"
                            onClick={() => {
                              setSelectedRequest(request);
                              setActionType("approve");
                            }}
                          >
                            <CheckCircle className="w-4 h-4 mr-1" />
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            onClick={() => {
                              setSelectedRequest(request);
                              setActionType("reject");
                            }}
                          >
                            <XCircle className="w-4 h-4 mr-1" />
                            Reject
                          </Button>
                        </div>
                      ) : !isOwner && currentStaff?.id === request.requested_by ? (
                        <span className="text-sm text-muted-foreground">Your request</span>
                      ) : null}
                    </TableCell>
                  )}
                </TableRow>
              );
              })}
            </TableBody>
          </Table>
        </div>
      </>
    );
  };

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
                <CheckCircle className="h-5 w-5 text-primary" />
                Approval Center
              </CardTitle>
              <CardDescription className="mt-1">
                Manage all approval requests in one place
              </CardDescription>
            </div>
            
            {/* Type filter - shown on both mobile and desktop */}
            <div className="flex items-center gap-2">
              <Select value={typeFilter} onValueChange={(value) => setTypeFilter(value as RequestTypeFilter)}>
                <SelectTrigger className="w-full sm:w-[200px]">
                  <div className="flex items-center gap-2">
                    <Filter className="h-4 w-4 text-muted-foreground" />
                    <SelectValue placeholder="Filter by type" />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  {REQUEST_TYPE_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      <div className="flex items-center gap-2">
                        {option.icon}
                        <span>{option.label}</span>
                        {option.value !== "all" && pendingCountByType[option.value] > 0 && (
                          <Badge variant="secondary" className="ml-auto text-xs">
                            {pendingCountByType[option.value]}
                          </Badge>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Quick type stats for desktop */}
          <div className="hidden sm:flex gap-2 mb-4 flex-wrap">
            {REQUEST_TYPE_OPTIONS.filter(o => o.value !== "all").map((option) => (
              <Button
                key={option.value}
                variant={typeFilter === option.value ? "default" : "outline"}
                size="sm"
                onClick={() => setTypeFilter(option.value)}
                className="gap-2"
              >
                {option.icon}
                {option.label}
                {pendingCountByType[option.value] > 0 && (
                  <Badge 
                    variant={typeFilter === option.value ? "secondary" : "outline"} 
                    className="ml-1 text-xs"
                  >
                    {pendingCountByType[option.value]}
                  </Badge>
                )}
              </Button>
            ))}
            {typeFilter !== "all" && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setTypeFilter("all")}
                className="text-muted-foreground"
              >
                Clear filter
              </Button>
            )}
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-4 w-full sm:w-auto">
              <TabsTrigger value="pending" className="relative flex-1 sm:flex-none">
                Pending
                {pendingCountByType.all > 0 && (
                  <span className="ml-2 bg-amber-500 text-white text-xs rounded-full px-2 py-0.5">
                    {typeFilter === "all" ? pendingCountByType.all : pendingCountByType[typeFilter] || 0}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger value="history" className="flex-1 sm:flex-none">History</TabsTrigger>
            </TabsList>

            <TabsContent value="pending">
              {(pendingLoading || leaveLoading || payrollLoading) ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : (
                <>
                  {/* Leave Requests Section */}
                  {(typeFilter === "all" || typeFilter === "leave") && pendingLeaveRequests.length > 0 && (
                    <div className="mb-6">
                      {typeFilter === "all" && (
                        <h3 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
                          <CalendarDays className="w-4 h-4" /> Leave Requests ({pendingLeaveRequests.length})
                        </h3>
                      )}
                      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                        {pendingLeaveRequests.map((leave: any) => (
                          <div key={leave.id} className="p-4 border rounded-lg space-y-3 bg-card">
                            <div className="flex items-start justify-between gap-2 flex-wrap">
                              {getRequestTypeBadge("leave")}
                              {getStatusBadge(leave.status)}
                            </div>
                            <div className="space-y-2 text-sm">
                              <div className="flex items-center gap-2 text-muted-foreground">
                                <User className="w-4 h-4 shrink-0" />
                                <span className="truncate">Staff: <span className="text-foreground font-medium">{leave.staff?.full_name || "Unknown"}</span></span>
                              </div>
                              <div className="flex items-center gap-2 text-muted-foreground">
                                <CalendarDays className="w-4 h-4 shrink-0" />
                                <span>Type: <span className="text-foreground font-medium">{LEAVE_TYPE_LABELS[leave.leave_type] || leave.leave_type}</span></span>
                              </div>
                              <div className="flex items-start gap-2 text-muted-foreground">
                                <Calendar className="w-4 h-4 shrink-0 mt-0.5" />
                                <div className="flex flex-col sm:flex-row sm:items-center gap-1">
                                  <span className="text-foreground font-medium">{leave.start_date}</span>
                                  <span className="hidden sm:inline">to</span>
                                  <span className="sm:hidden">→</span>
                                  <span className="text-foreground font-medium">{leave.end_date}</span>
                                  <Badge variant="secondary" className="w-fit text-xs">{leave.days} days</Badge>
                                </div>
                              </div>
                              {leave.reason && (
                                <div className="p-2 bg-muted rounded text-muted-foreground">
                                  <p className="text-xs mb-1">Reason:</p>
                                  <p className="font-medium text-foreground line-clamp-2">{leave.reason}</p>
                                </div>
                              )}
                            </div>
                            {isOwner && (
                              <div className="flex gap-2 pt-2 border-t">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="flex-1 min-h-[40px] text-green-600 hover:text-green-700 hover:bg-green-50 dark:hover:bg-green-950"
                                  onClick={async () => {
                                    try {
                                      await approveLeave.mutateAsync(leave.id);
                                      toast.success("Leave request approved");
                                    } catch (e: any) {
                                      toast.error(e.message || "Failed to approve");
                                    }
                                  }}
                                  disabled={approveLeave.isPending}
                                >
                                  <CheckCircle className="w-4 h-4 mr-1" />
                                  Approve
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="flex-1 min-h-[40px] text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950"
                                  onClick={async () => {
                                    try {
                                      await rejectLeave.mutateAsync(leave.id);
                                      toast.success("Leave request rejected");
                                    } catch (e: any) {
                                      toast.error(e.message || "Failed to reject");
                                    }
                                  }}
                                  disabled={rejectLeave.isPending}
                                >
                                  <XCircle className="w-4 h-4 mr-1" />
                                  Reject
                                </Button>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Payroll Section */}
                  {(typeFilter === "all" || typeFilter === "payroll") && pendingPayrollRecords.length > 0 && (
                    <div className="mb-6">
                      {typeFilter === "all" && (
                        <h3 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
                          <Wallet className="w-4 h-4" /> Pending Payroll ({pendingPayrollRecords.length})
                        </h3>
                      )}
                      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                        {pendingPayrollRecords.map((payroll: any) => (
                          <div key={payroll.id} className="p-4 border rounded-lg space-y-3 bg-card">
                            <div className="flex items-start justify-between gap-2 flex-wrap">
                              {getRequestTypeBadge("payroll")}
                              {getStatusBadge(payroll.status)}
                            </div>
                            <div className="space-y-2 text-sm">
                              <div className="flex items-center gap-2 text-muted-foreground">
                                <User className="w-4 h-4 shrink-0" />
                                <span className="truncate">Staff: <span className="text-foreground font-medium">{payroll.staff?.full_name || "Unknown"}</span></span>
                              </div>
                              <div className="flex items-start gap-2 text-muted-foreground">
                                <Calendar className="w-4 h-4 shrink-0 mt-0.5" />
                                <div className="flex flex-col sm:flex-row sm:items-center gap-1">
                                  <span className="text-foreground font-medium">{payroll.period_start}</span>
                                  {payroll.period_end && (
                                    <>
                                      <span className="hidden sm:inline">to</span>
                                      <span className="sm:hidden">→</span>
                                      <span className="text-foreground font-medium">{payroll.period_end}</span>
                                    </>
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center gap-2 text-muted-foreground">
                                <Wallet className="w-4 h-4 shrink-0" />
                                <span>Net Salary: <span className="text-foreground font-medium text-lg">{formatCurrency(payroll.net_salary)}</span></span>
                              </div>
                            </div>
                            {isOwner && (
                              <div className="flex gap-2 pt-2 border-t">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="flex-1 min-h-[40px] text-green-600 hover:text-green-700 hover:bg-green-50 dark:hover:bg-green-950"
                                  onClick={async () => {
                                    try {
                                      await processPayroll.mutateAsync(payroll.id);
                                      toast.success("Payroll processed successfully");
                                    } catch (e: any) {
                                      toast.error(e.message || "Failed to process");
                                    }
                                  }}
                                  disabled={processPayroll.isPending}
                                >
                                  <CheckCircle className="w-4 h-4 mr-1" />
                                  Process Payment
                                </Button>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Regular Approval Requests Section */}
                  {typeFilter !== "leave" && typeFilter !== "payroll" && (
                    <>
                      {typeFilter === "all" && (pendingLeaveRequests.length > 0 || pendingPayrollRecords.length > 0) && filteredPendingRequests.length > 0 && (
                        <h3 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
                          <Package className="w-4 h-4" /> Other Approvals ({filteredPendingRequests.length})
                        </h3>
                      )}
                      {renderTable(filteredPendingRequests, true, typeFilter === "all" && (pendingLeaveRequests.length > 0 || pendingPayrollRecords.length > 0))}
                    </>
                  )}

                  {/* Empty state when no pending items match filter */}
                  {typeFilter === "leave" && pendingLeaveRequests.length === 0 && (
                    <div className="text-center py-12 text-muted-foreground">
                      <CalendarDays className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No pending leave requests</p>
                    </div>
                  )}
                  {typeFilter === "payroll" && pendingPayrollRecords.length === 0 && (
                    <div className="text-center py-12 text-muted-foreground">
                      <Wallet className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No pending payroll records</p>
                    </div>
                  )}
                  {typeFilter === "all" && pendingLeaveRequests.length === 0 && pendingPayrollRecords.length === 0 && filteredPendingRequests.length === 0 && (
                    <div className="text-center py-12 text-muted-foreground">
                      <AlertTriangle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No pending requests</p>
                    </div>
                  )}
                </>
              )}
            </TabsContent>

            <TabsContent value="history">
              {(allLoading || leaveLoading || payrollLoading) ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : (
                <>
                  {/* Resolved Leave Requests */}
                  {(typeFilter === "all" || typeFilter === "leave") && resolvedLeaveRequests.length > 0 && (
                    <div className="mb-6">
                      {typeFilter === "all" && (
                        <h3 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
                          <CalendarDays className="w-4 h-4" /> Leave Request History ({resolvedLeaveRequests.length})
                        </h3>
                      )}
                      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                        {resolvedLeaveRequests.map((leave: any) => (
                          <div key={leave.id} className="p-4 border rounded-lg space-y-3 bg-card">
                            <div className="flex items-start justify-between gap-2 flex-wrap">
                              {getRequestTypeBadge("leave")}
                              {getStatusBadge(leave.status)}
                            </div>
                            <div className="space-y-2 text-sm">
                              <div className="flex items-center gap-2 text-muted-foreground">
                                <User className="w-4 h-4 shrink-0" />
                                <span className="truncate">Staff: <span className="text-foreground font-medium">{leave.staff?.full_name || "Unknown"}</span></span>
                              </div>
                              <div className="flex items-center gap-2 text-muted-foreground">
                                <CalendarDays className="w-4 h-4 shrink-0" />
                                <span>Type: <span className="text-foreground font-medium">{LEAVE_TYPE_LABELS[leave.leave_type] || leave.leave_type}</span></span>
                              </div>
                              <div className="flex items-start gap-2 text-muted-foreground">
                                <Calendar className="w-4 h-4 shrink-0 mt-0.5" />
                                <div className="flex flex-col sm:flex-row sm:items-center gap-1">
                                  <span className="text-foreground font-medium">{leave.start_date}</span>
                                  <span className="hidden sm:inline">to</span>
                                  <span className="sm:hidden">→</span>
                                  <span className="text-foreground font-medium">{leave.end_date}</span>
                                  <Badge variant="secondary" className="w-fit text-xs">{leave.days} days</Badge>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Resolved Payroll */}
                  {(typeFilter === "all" || typeFilter === "payroll") && resolvedPayrollRecords.length > 0 && (
                    <div className="mb-6">
                      {typeFilter === "all" && (
                        <h3 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
                          <Wallet className="w-4 h-4" /> Payroll History ({resolvedPayrollRecords.length})
                        </h3>
                      )}
                      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                        {resolvedPayrollRecords.map((payroll: any) => (
                          <div key={payroll.id} className="p-4 border rounded-lg space-y-3 bg-card">
                            <div className="flex items-start justify-between gap-2 flex-wrap">
                              {getRequestTypeBadge("payroll")}
                              {getStatusBadge(payroll.status === "paid" ? "approved" : payroll.status)}
                            </div>
                            <div className="space-y-2 text-sm">
                              <div className="flex items-center gap-2 text-muted-foreground">
                                <User className="w-4 h-4 shrink-0" />
                                <span className="truncate">Staff: <span className="text-foreground font-medium">{payroll.staff?.full_name || "Unknown"}</span></span>
                              </div>
                              <div className="flex items-start gap-2 text-muted-foreground">
                                <Calendar className="w-4 h-4 shrink-0 mt-0.5" />
                                <div className="flex flex-col sm:flex-row sm:items-center gap-1">
                                  <span className="text-foreground font-medium">{payroll.period_start}</span>
                                  {payroll.period_end && (
                                    <>
                                      <span className="hidden sm:inline">to</span>
                                      <span className="sm:hidden">→</span>
                                      <span className="text-foreground font-medium">{payroll.period_end}</span>
                                    </>
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center gap-2 text-muted-foreground">
                                <Wallet className="w-4 h-4 shrink-0" />
                                <span>Net Salary: <span className="text-foreground font-medium text-lg">{formatCurrency(payroll.net_salary)}</span></span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Regular Approval Requests History */}
                  {typeFilter !== "leave" && typeFilter !== "payroll" && (
                    <>
                      {typeFilter === "all" && (resolvedLeaveRequests.length > 0 || resolvedPayrollRecords.length > 0) && filteredResolvedRequests.length > 0 && (
                        <h3 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
                          <Package className="w-4 h-4" /> Other Approvals History ({filteredResolvedRequests.length})
                        </h3>
                      )}
                      {renderTable(filteredResolvedRequests, false, typeFilter === "all" && (resolvedLeaveRequests.length > 0 || resolvedPayrollRecords.length > 0))}
                    </>
                  )}

                  {/* Empty states for history */}
                  {typeFilter === "leave" && resolvedLeaveRequests.length === 0 && (
                    <div className="text-center py-12 text-muted-foreground">
                      <CalendarDays className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No leave request history</p>
                    </div>
                  )}
                  {typeFilter === "payroll" && resolvedPayrollRecords.length === 0 && (
                    <div className="text-center py-12 text-muted-foreground">
                      <Wallet className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No payroll history</p>
                    </div>
                  )}
                </>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <Dialog open={!!selectedRequest && !!actionType} onOpenChange={() => {
        setSelectedRequest(null);
        setActionType(null);
        setNotes("");
      }}>
        <DialogContent className="max-w-md mx-4 sm:mx-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {actionType === "approve" ? (
                <CheckCircle className="w-5 h-5 text-green-500" />
              ) : (
                <XCircle className="w-5 h-5 text-red-500" />
              )}
              {actionType === "approve" ? "Approve Request" : "Reject Request"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {(() => {
              const stockDetails = selectedRequest ? formatStockAdjustmentDetails(selectedRequest) : null;
              const transferDetails = selectedRequest ? formatStockTransferDetails(selectedRequest) : null;
              return (
                <div className="p-4 bg-muted rounded-lg space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground text-sm">Type:</span>
                    {selectedRequest && getRequestTypeBadge(selectedRequest.request_type)}
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground text-sm">Requested by:</span>
                    <span className="font-medium">
                      {selectedRequest?.requester?.full_name}
                      {selectedRequest?.requester?.role && <span className="text-xs text-muted-foreground ml-1">({selectedRequest.requester.role})</span>}
                    </span>
                  </div>
                  
                  {stockDetails ? (
                    <>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground text-sm">Product:</span>
                        <span className="font-medium">{stockDetails.productName}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground text-sm">Adjustment:</span>
                        <div className="flex items-center gap-2">
                          <Badge className={stockDetails.adjustmentType === "increase" ? "bg-emerald-500" : "bg-rose-500"}>
                            {stockDetails.adjustmentType === "increase" ? (
                              <TrendingUp className="w-3 h-3 mr-1" />
                            ) : (
                              <TrendingDown className="w-3 h-3 mr-1" />
                            )}
                            {stockDetails.adjustmentType === "increase" ? "Increase" : "Decrease"}
                          </Badge>
                          <span className="font-medium">{selectedRequest?.amount}</span>
                        </div>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground text-sm">Stock Change:</span>
                        <span className="font-mono font-medium">
                          {stockDetails.previousQuantity} → {stockDetails.newQuantity}
                        </span>
                      </div>
                      <div className="pt-3 border-t">
                        <span className="text-muted-foreground text-sm block mb-1">Reason:</span>
                        <p className="text-sm bg-background p-2 rounded font-medium">{stockDetails.reason}</p>
                        {stockDetails.note && (
                          <p className="text-xs text-muted-foreground mt-2">{stockDetails.note}</p>
                        )}
                      </div>
                    </>
                  ) : transferDetails ? (
                    <>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground text-sm">Product:</span>
                        <span className="font-medium">{transferDetails.productName}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground text-sm">Quantity:</span>
                        <div className="flex items-center gap-2">
                          <ArrowRightLeft className="w-4 h-4 text-indigo-500" />
                          <span className="font-medium">{transferDetails.quantity}</span>
                        </div>
                      </div>
                      <div className="pt-3 border-t">
                        <span className="text-muted-foreground text-sm block mb-1">Transfer Route:</span>
                        <p className="text-sm bg-background p-2 rounded font-medium">
                          {transferDetails.fromBranchName} → {transferDetails.toBranchName}
                        </p>
                        {transferDetails.note && (
                          <p className="text-xs text-muted-foreground mt-2">{transferDetails.note}</p>
                        )}
                      </div>
                    </>
                  ) : (() => {
                    const ed = selectedRequest ? formatExpenseDetails(selectedRequest) : null;
                    return ed ? (
                      <>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground text-sm">Description:</span>
                          <span className="font-medium">{ed.description}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground text-sm">Amount:</span>
                          <span className="font-medium">{formatCurrency(ed.amount)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground text-sm">Payment:</span>
                          <span className="font-medium capitalize">{ed.paymentMethod}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground text-sm">Date:</span>
                          <span className="font-medium">{ed.expenseDate}</span>
                        </div>
                        {ed.branchName && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground text-sm">Branch:</span>
                            <span className="font-medium">{ed.branchName}</span>
                          </div>
                        )}
                      </>
                    ) : (
                      <>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground text-sm">Amount:</span>
                          <span className="font-medium">{selectedRequest && formatAmount(selectedRequest)}</span>
                        </div>
                        {selectedRequest?.notes && (
                          <div className="pt-3 border-t">
                            <span className="text-muted-foreground text-sm block mb-1">Request details:</span>
                            <p className="text-sm bg-background p-2 rounded">{selectedRequest.notes}</p>
                          </div>
                        )}
                      </>
                    );
                  })()}
                </div>
              );
            })()}
            <div className="space-y-2">
              <Label>Add notes (optional)</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add any notes for this decision..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => {
              setSelectedRequest(null);
              setActionType(null);
              setNotes("");
            }} className="w-full sm:w-auto">
              Cancel
            </Button>
            <Button
              onClick={handleAction}
              variant={actionType === "approve" ? "default" : "destructive"}
              disabled={approveRequest.isPending || rejectRequest.isPending}
              className="w-full sm:w-auto"
            >
              {(approveRequest.isPending || rejectRequest.isPending) && (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              )}
              {actionType === "approve" ? "Confirm Approval" : "Confirm Rejection"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default ApprovalRequestList;
