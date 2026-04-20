import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Plus, FileText, Loader2, AlertTriangle, Clock, Check, X, Pencil, Trash2, User } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { usePurchaseOrders, useCreatePurchaseOrder, useUpdatePurchaseOrder, useDeletePurchaseOrder } from "@/hooks/usePurchaseOrders";
import { usePurchaseOrderRequests } from "@/hooks/usePurchaseOrders";
import type { PurchaseOrderRequest } from "@/hooks/usePurchaseOrders";
import { useSuppliers } from "@/hooks/useSuppliers";
import { useCurrentUserPermissions } from "@/hooks/usePermissions";
import { useCurrency } from "@/hooks/useCurrency";
import { useCreateApprovalRequest, useApproveRequest, useRejectRequest } from "@/hooks/useApprovalRequests";
import { useStaff } from "@/hooks/useStaff";
import { useAuth } from "@/contexts/AuthContext";
import { useBusiness } from "@/hooks/useBusiness";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";

const PurchaseOrders = () => {
  const { data: orders = [], isLoading } = usePurchaseOrders();
  const { data: pendingRequests = [], isLoading: isLoadingRequests } = usePurchaseOrderRequests();
  const { data: suppliers = [] } = useSuppliers();
  const { data: staffList = [] } = useStaff();
  const { data: business } = useBusiness();
  const { user } = useAuth();
  const createOrder = useCreatePurchaseOrder();
  const updateOrder = useUpdatePurchaseOrder();
  const deleteOrder = useDeletePurchaseOrder();
  const createApprovalRequest = useCreateApprovalRequest();
  const approveRequest = useApproveRequest();
  const rejectRequest = useRejectRequest();
  const { data: permissionData } = useCurrentUserPermissions();
  const { formatCurrency } = useCurrency();
  const queryClient = useQueryClient();
  
  const isOwner = permissionData?.isOwner || false;
  const permissions = permissionData?.permissions || [];
  const canCreate = isOwner || permissions.includes("inventory.item.create");
  const canManage = isOwner || permissions.includes("inventory.item.edit");
  
  const currentStaff = staffList.find(s => s.user_id === user?.id);

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingOrder, setEditingOrder] = useState<any>(null);
  const [newOrder, setNewOrder] = useState({
    supplier_id: "",
    expected_date: "",
    total_amount: 0,
    notes: "",
  });
  const [editForm, setEditForm] = useState({
    total_amount: 0,
    expected_date: "",
    notes: "",
  });

  // Merge actual POs and pending approval requests into unified list
  const unifiedOrders = [
    ...orders.map((o: any) => ({
      id: o.id,
      po_number: o.po_number,
      supplier_name: o.suppliers?.name || "—",
      total_amount: o.total_amount,
      status: o.status,
      created_at: o.created_at,
      expected_date: o.expected_date,
      notes: o.notes,
      source: "purchase_order" as const,
    })),
    ...pendingRequests
      .map((r) => ({
        id: r.id,
        po_number: r.po_number,
        supplier_name: r.supplier_name,
        total_amount: r.total_amount,
        status: r.status === "pending" ? "awaiting_approval" : r.status,
        created_at: r.created_at,
        expected_date: r.expected_date,
        notes: r.notes,
        resolved_at: r.resolved_at,
        approved_by_name: r.approved_by_name,
        source: "approval_request" as const,
      })),
  ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "awaiting_approval": return <Badge variant="outline" className="bg-purple-500/10 text-purple-500">Awaiting Approval</Badge>;
      case "pending": return <Badge variant="outline" className="bg-amber-500/10 text-amber-500">Pending</Badge>;
      case "approved": return <Badge variant="outline" className="bg-blue-500/10 text-blue-500">Approved</Badge>;
      case "received": return <Badge variant="outline" className="bg-green-500/10 text-green-500">Received</Badge>;
      case "cancelled": return <Badge variant="outline" className="bg-red-500/10 text-red-500">Cancelled</Badge>;
      case "rejected": return <Badge variant="outline" className="bg-red-500/10 text-red-500">Rejected</Badge>;
      default: return <Badge>{status}</Badge>;
    }
  };

  // --- Approve / Reject handlers (owner only, for awaiting_approval items) ---
  const handleApprove = async (orderId: string) => {
    setIsSubmitting(true);
    try {
      await approveRequest.mutateAsync({ requestId: orderId });
      queryClient.invalidateQueries({ queryKey: ["purchase_order_requests"] });
      queryClient.invalidateQueries({ queryKey: ["purchase_orders"] });
    } catch (error: any) {
      toast.error(error.message || "Failed to approve");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReject = async (orderId: string) => {
    setIsSubmitting(true);
    try {
      await rejectRequest.mutateAsync({ requestId: orderId });
      queryClient.invalidateQueries({ queryKey: ["purchase_order_requests"] });
    } catch (error: any) {
      toast.error(error.message || "Failed to reject");
    } finally {
      setIsSubmitting(false);
    }
  };

  // --- Edit handler (for actual purchase_orders, owner only) ---
  const handleOpenEdit = (order: any) => {
    setEditingOrder(order);
    setEditForm({
      total_amount: order.total_amount,
      expected_date: order.expected_date || "",
      notes: order.notes || "",
    });
    setIsEditDialogOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!editingOrder) return;
    setIsSubmitting(true);
    try {
      await updateOrder.mutateAsync({
        id: editingOrder.id,
        total_amount: editForm.total_amount,
        expected_date: editForm.expected_date || null,
        notes: editForm.notes || null,
      });
      setIsEditDialogOpen(false);
      setEditingOrder(null);
      toast.success("Purchase order updated");
    } catch (error: any) {
      toast.error(error.message || "Failed to update order");
    } finally {
      setIsSubmitting(false);
    }
  };

  // --- Delete handler (for actual purchase_orders, owner only) ---
  const handleDelete = async (orderId: string) => {
    setIsSubmitting(true);
    try {
      await deleteOrder.mutateAsync(orderId);
      toast.success("Purchase order deleted");
    } catch (error: any) {
      toast.error(error.message || "Failed to delete order");
    } finally {
      setIsSubmitting(false);
    }
  };

  // --- Delete approval request (for awaiting_approval items) ---
  const handleDeleteRequest = async (requestId: string) => {
    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from("approval_requests")
        .delete()
        .eq("id", requestId);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["purchase_order_requests"] });
      queryClient.invalidateQueries({ queryKey: ["approval-requests"] });
      queryClient.invalidateQueries({ queryKey: ["pending-approval-count"] });
      toast.success("Request deleted");
    } catch (error: any) {
      toast.error(error.message || "Failed to delete request");
    } finally {
      setIsSubmitting(false);
    }
  };

  // --- Existing handlers ---
  const handleCreateOrder = async () => {
    if (!newOrder.supplier_id) {
      toast.error("Please select a supplier");
      return;
    }

    setIsSubmitting(true);

    try {
      let requesterId = currentStaff?.id;

      if (!requesterId && business && user) {
        if (business.owner_user_id === user.id) {
          try {
            const { data: newStaff, error: createError } = await supabase
              .from("staff")
              .insert({
                business_id: business.id,
                user_id: user.id,
                full_name: business.owner_name,
                email: business.owner_email,
                role: "owner",
                is_active: true,
              })
              .select("id")
              .single();

            if (createError) {
              if (createError.code === "23505") {
                const { data: existingStaff } = await supabase
                  .from("staff")
                  .select("id")
                  .eq("user_id", user.id)
                  .eq("business_id", business.id)
                  .maybeSingle();

                if (existingStaff) {
                  requesterId = existingStaff.id;
                } else {
                  throw createError;
                }
              } else {
                throw createError;
              }
            } else {
              requesterId = newStaff.id;
            }
          } catch (error) {
            console.error("Failed to create owner staff record:", error);
            toast.error("Failed to identify staff record");
            setIsSubmitting(false);
            return;
          }
        }
      }

      if (!requesterId) {
        toast.error("Staff record not found");
        setIsSubmitting(false);
        return;
      }

      const supplier = suppliers.find(s => s.id === newOrder.supplier_id);
      const poNumber = `PO-${Date.now().toString().slice(-6)}`;

      await createApprovalRequest.mutateAsync({
        request_type: "purchase_order",
        requested_by: requesterId,
        amount: newOrder.total_amount,
        notes: JSON.stringify({
          poNumber,
          supplierId: newOrder.supplier_id,
          supplierName: supplier?.name,
          expectedDate: newOrder.expected_date || null,
          totalAmount: newOrder.total_amount,
          orderNotes: newOrder.notes || null,
        }),
      });

      setNewOrder({ supplier_id: "", expected_date: "", total_amount: 0, notes: "" });
      setIsDialogOpen(false);
      toast.success("Purchase order submitted for approval");
    } catch (error: any) {
      toast.error(error.message || "Failed to submit order for approval");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReceiveOrder = async (order: any) => {
    setIsSubmitting(true);
    
    try {
      let requesterId = currentStaff?.id;

      if (!requesterId && business && user && business.owner_user_id === user.id) {
        const { data: existingStaff } = await supabase
          .from("staff")
          .select("id")
          .eq("user_id", user.id)
          .eq("business_id", business.id)
          .maybeSingle();
        
        if (existingStaff) {
          requesterId = existingStaff.id;
        }
      }

      if (!requesterId) {
        toast.error("Staff record not found");
        setIsSubmitting(false);
        return;
      }

      await createApprovalRequest.mutateAsync({
        request_type: "purchase_order_receive",
        requested_by: requesterId,
        amount: order.total_amount,
        reference_id: order.id,
        reference_type: "purchase_order",
        notes: JSON.stringify({
          poNumber: order.po_number,
          supplierName: order.supplier_name,
          totalAmount: order.total_amount,
          action: "receive",
        }),
      });

      toast.success("Receive request submitted for approval");
    } catch (error: any) {
      toast.error(error.message || "Failed to submit receive request");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancelOrder = async (id: string) => {
    try {
      await updateOrder.mutateAsync({ 
        id, 
        status: "cancelled",
      });
      toast.success("Order cancelled");
    } catch (error: any) {
      toast.error(error.message || "Failed to cancel order");
    }
  };

  // --- Render actions per row ---
  const renderActions = (order: typeof unifiedOrders[0]) => {
    const actions: React.ReactNode[] = [];

    if (order.source === "approval_request" && order.status === "awaiting_approval") {
      // Owner can approve/reject pending approval requests
      if (isOwner) {
        actions.push(
          <Button key="approve" size="sm" variant="outline" onClick={() => handleApprove(order.id)} disabled={isSubmitting} className="text-green-600 hover:text-green-700">
            <Check className="h-3.5 w-3.5 mr-1" /> Approve
          </Button>,
          <Button key="reject" size="sm" variant="outline" onClick={() => handleReject(order.id)} disabled={isSubmitting} className="text-red-600 hover:text-red-700">
            <X className="h-3.5 w-3.5 mr-1" /> Reject
          </Button>,
        );
      }
      // Owner can delete the request
      if (isOwner) {
        actions.push(
          <Button key="delete" size="sm" variant="ghost" onClick={() => handleDeleteRequest(order.id)} disabled={isSubmitting} className="text-destructive hover:text-destructive">
            <Trash2 className="h-3.5 w-3.5" />
          </Button>,
        );
      }
    }

    if (order.source === "purchase_order") {
      // Receive / Cancel for pending POs
      if (order.status === "pending" && canManage) {
        actions.push(
          <Button key="receive" size="sm" variant="outline" onClick={() => handleReceiveOrder(order)} disabled={isSubmitting}>
            Receive
          </Button>,
          <Button key="cancel" size="sm" variant="destructive" onClick={() => handleCancelOrder(order.id)} disabled={isSubmitting}>
            Cancel
          </Button>,
        );
      }
      // Edit (owner only, not cancelled/received)
      if (isOwner && !["cancelled", "received"].includes(order.status)) {
        actions.push(
          <Button key="edit" size="sm" variant="ghost" onClick={() => handleOpenEdit(order)} disabled={isSubmitting}>
            <Pencil className="h-3.5 w-3.5" />
          </Button>,
        );
      }
      // Delete (owner only)
      if (isOwner) {
        actions.push(
          <Button key="delete" size="sm" variant="ghost" onClick={() => handleDelete(order.id)} disabled={isSubmitting} className="text-destructive hover:text-destructive">
            <Trash2 className="h-3.5 w-3.5" />
          </Button>,
        );
      }
    }

    return actions.length > 0 ? <div className="flex gap-1 flex-wrap">{actions}</div> : null;
  };

  if (isLoading || isLoadingRequests) {
    return (
      <main className="flex-1 overflow-y-auto p-6 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </main>
    );
  }

  return (
    <main className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Purchase Orders</h1>
          <p className="text-muted-foreground text-sm">Manage supplier orders</p>
        </div>
        {canCreate && (
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="w-full sm:w-auto"><Plus className="mr-2 h-4 w-4" />New Order</Button>
            </DialogTrigger>
            <DialogContent className="max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Create Purchase Order</DialogTitle>
                <DialogDescription>Submit a new purchase order for approval</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Supplier *</Label>
                  <Select value={newOrder.supplier_id} onValueChange={(v) => setNewOrder({ ...newOrder, supplier_id: v })}>
                    <SelectTrigger><SelectValue placeholder="Select supplier" /></SelectTrigger>
                    <SelectContent>
                      {suppliers.map((s) => (
                        <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Expected Delivery Date</Label>
                  <Input type="date" value={newOrder.expected_date} onChange={(e) => setNewOrder({ ...newOrder, expected_date: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Total Amount</Label>
                  <Input type="number" value={newOrder.total_amount} onChange={(e) => setNewOrder({ ...newOrder, total_amount: Number(e.target.value) })} />
                </div>
                <div className="space-y-2">
                  <Label>Notes</Label>
                  <Textarea value={newOrder.notes} onChange={(e) => setNewOrder({ ...newOrder, notes: e.target.value })} placeholder="Additional notes for this order..." rows={2} />
                </div>
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription className="text-xs">This purchase order requires admin approval before it can be processed.</AlertDescription>
                </Alert>
                <Button onClick={handleCreateOrder} className="w-full" disabled={isSubmitting}>
                  {isSubmitting ? (<><Loader2 className="h-4 w-4 animate-spin mr-2" />Submitting...</>) : (<><Clock className="h-4 w-4 mr-2" />Submit</>)}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Purchase Orders
          </CardTitle>
        </CardHeader>
        <CardContent>
          {unifiedOrders.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No purchase orders found. Create your first order to get started.</p>
            </div>
          ) : (
            <>
              {/* Desktop Table */}
              <div className="hidden md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Order #</TableHead>
                      <TableHead>Supplier</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Order Date</TableHead>
                      <TableHead>Resolved</TableHead>
                      <TableHead>Expected Delivery</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {unifiedOrders.map((order) => (
                      <TableRow key={order.id}>
                        <TableCell className="font-medium">{order.po_number}</TableCell>
                        <TableCell>{order.supplier_name}</TableCell>
                        <TableCell>{formatCurrency(order.total_amount)}</TableCell>
                        <TableCell>{getStatusBadge(order.status)}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {format(new Date(order.created_at), "MMM d, yyyy HH:mm")}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {order.source === "approval_request" && order.resolved_at ? (
                            <div>
                              <p>{format(new Date(order.resolved_at), "MMM d, yyyy HH:mm")}</p>
                              {order.approved_by_name && (
                                <p className="text-xs flex items-center gap-1">
                                  <User className="h-3 w-3" />
                                  {order.approved_by_name}
                                </p>
                              )}
                            </div>
                          ) : "—"}
                        </TableCell>
                        <TableCell>{order.expected_date || "—"}</TableCell>
                        <TableCell>{renderActions(order)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile Card Layout */}
              <div className="md:hidden space-y-3">
                {unifiedOrders.map((order) => (
                  <div key={order.id} className="border rounded-lg p-4 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-semibold text-sm">{order.po_number}</p>
                        <p className="text-xs text-muted-foreground">{order.supplier_name}</p>
                      </div>
                      {getStatusBadge(order.status)}
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <p className="text-muted-foreground text-xs">Amount</p>
                        <p className="font-medium">{formatCurrency(order.total_amount)}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground text-xs">Order Date</p>
                        <p>{format(new Date(order.created_at), "MMM d, yyyy HH:mm")}</p>
                      </div>
                      {order.expected_date && (
                        <div className="col-span-2">
                          <p className="text-muted-foreground text-xs">Expected Delivery</p>
                          <p>{order.expected_date}</p>
                        </div>
                      )}
                    </div>
                    {order.source === "approval_request" && order.resolved_at && (
                      <div className="border-t pt-2 space-y-1">
                        <p className="text-[10px] text-muted-foreground">
                          {order.status === "approved" ? "Approved" : order.status === "rejected" ? "Rejected" : "Resolved"}: {format(new Date(order.resolved_at), "MMM d, yyyy HH:mm")}
                          {order.approved_by_name && ` by ${order.approved_by_name}`}
                        </p>
                      </div>
                    )}
                    {renderActions(order) && (
                      <div className="flex flex-wrap gap-2 pt-1 border-t">
                        {renderActions(order)}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Purchase Order</DialogTitle>
            <DialogDescription>Update order details for {editingOrder?.po_number}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Total Amount</Label>
              <Input type="number" value={editForm.total_amount} onChange={(e) => setEditForm({ ...editForm, total_amount: Number(e.target.value) })} />
            </div>
            <div className="space-y-2">
              <Label>Expected Delivery Date</Label>
              <Input type="date" value={editForm.expected_date} onChange={(e) => setEditForm({ ...editForm, expected_date: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea value={editForm.notes} onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })} rows={2} />
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleSaveEdit} disabled={isSubmitting}>
                {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Save Changes
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </main>
  );
};

export default PurchaseOrders;
