import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Calendar, Check, X, Loader2, User } from "lucide-react";
import { toast } from "sonner";
import { useStaffMembers } from "@/hooks/useStaffMembers";
import { useLeaveRequests, useCreateLeaveRequest, useApproveLeaveRequest, useRejectLeaveRequest } from "@/hooks/useLeaveRequests";
import { useBusinessPlan } from "@/hooks/useFeatureGating";
import { UpgradeRequired } from "@/components/subscription/UpgradeRequired";
import { format } from "date-fns";

const leaveTypes = [
  { value: "annual", label: "Annual Leave" },
  { value: "sick", label: "Sick Leave" },
  { value: "maternity", label: "Maternity Leave" },
  { value: "paternity", label: "Paternity Leave" },
  { value: "unpaid", label: "Unpaid Leave" },
  { value: "other", label: "Other" },
];

const getLeaveTypeLabel = (value: string) => {
  return leaveTypes.find(t => t.value === value)?.label || value;
};

export default function Leave() {
  const { data: planInfo, isLoading: planLoading } = useBusinessPlan();
  const { data: staff = [] } = useStaffMembers();
  const { data: requests = [], isLoading } = useLeaveRequests();
  const createLeaveRequest = useCreateLeaveRequest();
  const approveLeaveRequest = useApproveLeaveRequest();
  const rejectLeaveRequest = useRejectLeaveRequest();

  const [showAdd, setShowAdd] = useState(false);
  const [newRequest, setNewRequest] = useState({
    staff_id: "",
    leave_type: "",
    start_date: "",
    end_date: "",
    reason: "",
  });

  const calculateDays = (start: string, end: string) => {
    if (!start || !end) return 0;
    const startDate = new Date(start);
    const endDate = new Date(end);
    const diff = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    return diff > 0 ? diff : 0;
  };

  const handleAdd = async () => {
    if (!newRequest.staff_id || !newRequest.leave_type || !newRequest.start_date || !newRequest.end_date) {
      toast.error("Please fill all required fields");
      return;
    }

    const days = calculateDays(newRequest.start_date, newRequest.end_date);
    if (days <= 0) {
      toast.error("End date must be after start date");
      return;
    }

    try {
      await createLeaveRequest.mutateAsync({
        staff_id: newRequest.staff_id,
        leave_type: newRequest.leave_type,
        start_date: newRequest.start_date,
        end_date: newRequest.end_date,
        days,
        reason: newRequest.reason || null,
      });
      toast.success("Leave request submitted");
      setShowAdd(false);
      setNewRequest({ staff_id: "", leave_type: "", start_date: "", end_date: "", reason: "" });
    } catch (error: any) {
      toast.error(error.message || "Failed to submit request");
    }
  };

  const handleApprove = async (id: string) => {
    try {
      await approveLeaveRequest.mutateAsync(id);
      toast.success("Leave request approved");
    } catch (error: any) {
      toast.error(error.message || "Failed to approve request");
    }
  };

  const handleReject = async (id: string) => {
    try {
      await rejectLeaveRequest.mutateAsync(id);
      toast.success("Leave request rejected");
    } catch (error: any) {
      toast.error(error.message || "Failed to reject request");
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending": return <Badge variant="outline" className="bg-amber-500/10 text-amber-500">Pending</Badge>;
      case "approved": return <Badge variant="outline" className="bg-green-500/10 text-green-500">Approved</Badge>;
      case "rejected": return <Badge variant="outline" className="bg-red-500/10 text-red-500">Rejected</Badge>;
      default: return <Badge>{status}</Badge>;
    }
  };

  if (isLoading || planLoading) {
    return (
      <main className="flex-1 overflow-y-auto p-4 sm:p-6 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </main>
    );
  }

  if (planInfo?.effectivePlan === 'free') {
    return <UpgradeRequired featureKey="team.hrm" requiredPlan="professional" />;
  }

  return (
    <main className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Leave Management</h1>
          <p className="text-muted-foreground text-sm">Manage staff leave requests</p>
        </div>
        <Dialog open={showAdd} onOpenChange={setShowAdd}>
          <DialogTrigger asChild>
            <Button className="w-full sm:w-auto"><Plus className="mr-2 h-4 w-4" /> Request Leave</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Request Leave</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Staff *</Label>
                <Select value={newRequest.staff_id} onValueChange={(v) => setNewRequest({ ...newRequest, staff_id: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select staff" />
                  </SelectTrigger>
                  <SelectContent>
                    {staff.map((s) => (
                      <SelectItem key={s.id} value={s.id}>{s.full_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Leave Type *</Label>
                <Select value={newRequest.leave_type} onValueChange={(v) => setNewRequest({ ...newRequest, leave_type: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select leave type" />
                  </SelectTrigger>
                  <SelectContent>
                    {leaveTypes.map((type) => (
                      <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Start Date *</Label>
                  <Input type="date" value={newRequest.start_date} onChange={(e) => setNewRequest({ ...newRequest, start_date: e.target.value })} />
                </div>
                <div>
                  <Label>End Date *</Label>
                  <Input type="date" value={newRequest.end_date} onChange={(e) => setNewRequest({ ...newRequest, end_date: e.target.value })} />
                </div>
              </div>
              {newRequest.start_date && newRequest.end_date && (
                <div className="bg-muted p-3 rounded-lg">
                  <span className="text-sm text-muted-foreground">Duration: </span>
                  <span className="font-semibold">{calculateDays(newRequest.start_date, newRequest.end_date)} days</span>
                </div>
              )}
              <div>
                <Label>Reason</Label>
                <Input value={newRequest.reason} onChange={(e) => setNewRequest({ ...newRequest, reason: e.target.value })} placeholder="Reason for leave" />
              </div>
              <Button onClick={handleAdd} disabled={createLeaveRequest.isPending} className="w-full">
                {createLeaveRequest.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Submit Request
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Leave Requests
          </CardTitle>
        </CardHeader>
        <CardContent>
          {requests.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No leave requests found.</p>
            </div>
          ) : (
            <>
              {/* Mobile Cards */}
              <div className="md:hidden space-y-3">
                {requests.map((request: any) => (
                  <div key={request.id} className="border rounded-lg p-4 space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-medium text-sm">{request.staff?.full_name || "—"}</p>
                        <p className="text-xs text-muted-foreground">{request.staff?.role}</p>
                      </div>
                      {getStatusBadge(request.status)}
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <p className="text-xs text-muted-foreground">Type</p>
                        <p className="font-medium">{getLeaveTypeLabel(request.leave_type)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Days</p>
                        <p className="font-medium">{request.days}</p>
                      </div>
                      <div className="col-span-2">
                        <p className="text-xs text-muted-foreground">Duration</p>
                        <p className="text-sm">{format(new Date(request.start_date), "MMM d")} — {format(new Date(request.end_date), "MMM d, yyyy")}</p>
                      </div>
                      {request.reason && (
                        <div className="col-span-2">
                          <p className="text-xs text-muted-foreground">Reason</p>
                          <p className="text-sm">{request.reason}</p>
                        </div>
                      )}
                    </div>
                    <div className="border-t pt-2 space-y-1">
                      <p className="text-[10px] text-muted-foreground">
                        Requested: {format(new Date(request.created_at), "MMM d, yyyy HH:mm")}
                      </p>
                      {request.approved_at && (
                        <p className="text-[10px] text-muted-foreground">
                          {request.status === "approved" ? "Approved" : "Rejected"}: {format(new Date(request.approved_at), "MMM d, yyyy HH:mm")}
                          {request.approver?.full_name && ` by ${request.approver.full_name}`}
                        </p>
                      )}
                    </div>
                    {request.status === "pending" && (
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" onClick={() => handleApprove(request.id)} disabled={approveLeaveRequest.isPending} className="flex-1">
                          <Check className="h-4 w-4 mr-1" /> Approve
                        </Button>
                        <Button size="sm" variant="destructive" onClick={() => handleReject(request.id)} disabled={rejectLeaveRequest.isPending} className="flex-1">
                          <X className="h-4 w-4 mr-1" /> Reject
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Desktop Table */}
              <div className="hidden md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Staff</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Duration</TableHead>
                      <TableHead>Days</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Requested</TableHead>
                      <TableHead>Resolved</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {requests.map((request: any) => (
                      <TableRow key={request.id}>
                        <TableCell className="font-medium">
                          {request.staff?.full_name || "—"}
                          {request.staff?.role && <span className="text-xs text-muted-foreground ml-1">({request.staff.role})</span>}
                        </TableCell>
                        <TableCell>{getLeaveTypeLabel(request.leave_type)}</TableCell>
                        <TableCell className="text-sm">
                          {format(new Date(request.start_date), "MMM d")} — {format(new Date(request.end_date), "MMM d")}
                        </TableCell>
                        <TableCell>{request.days}</TableCell>
                        <TableCell>{getStatusBadge(request.status)}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {format(new Date(request.created_at), "MMM d, yyyy HH:mm")}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {request.approved_at ? (
                            <div>
                              <p>{format(new Date(request.approved_at), "MMM d, yyyy HH:mm")}</p>
                              {request.approver?.full_name && (
                                <p className="text-xs flex items-center gap-1">
                                  <User className="h-3 w-3" />
                                  {request.approver.full_name}
                                </p>
                              )}
                            </div>
                          ) : "—"}
                        </TableCell>
                        <TableCell>
                          {request.status === "pending" && (
                            <div className="flex gap-2">
                              <Button size="sm" variant="outline" onClick={() => handleApprove(request.id)} disabled={approveLeaveRequest.isPending}>
                                <Check className="h-4 w-4" />
                              </Button>
                              <Button size="sm" variant="destructive" onClick={() => handleReject(request.id)} disabled={rejectLeaveRequest.isPending}>
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
