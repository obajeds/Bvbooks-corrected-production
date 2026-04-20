import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Wallet, Loader2, ShieldAlert, Calendar } from "lucide-react";
import { toast } from "sonner";
import { useStaffMembers } from "@/hooks/useStaffMembers";
import { usePayroll, useCreatePayroll, useProcessPayroll } from "@/hooks/usePayroll";
import { useUserRole } from "@/hooks/useUserRole";
import { useBusinessPlan } from "@/hooks/useFeatureGating";
import { UpgradeRequired } from "@/components/subscription/UpgradeRequired";
import { useCurrency } from "@/hooks/useCurrency";
import { format } from "date-fns";

export default function Payroll() {
  const { data: planInfo, isLoading: planLoading } = useBusinessPlan();
  const { data: roleData, isLoading: roleLoading } = useUserRole();
  const { data: staff = [] } = useStaffMembers();
  const { data: payrolls = [], isLoading } = usePayroll();
  const createPayroll = useCreatePayroll();
  const processPayroll = useProcessPayroll();

  if (planLoading) {
    return (
      <main className="flex-1 overflow-y-auto p-4 sm:p-6 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </main>
    );
  }
  
  if (planInfo?.effectivePlan === 'free') {
    return <UpgradeRequired featureKey="team.hrm" requiredPlan="professional" />;
  }

  if (!roleLoading && !roleData?.isOwner) {
    return (
      <main className="flex-1 overflow-y-auto p-4 sm:p-6 flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="pt-6 text-center">
            <ShieldAlert className="h-12 w-12 mx-auto text-destructive mb-4" />
            <h2 className="text-xl font-semibold mb-2">Access Restricted</h2>
            <p className="text-muted-foreground">
              Financial reports and payroll are only accessible to business administrators.
            </p>
          </CardContent>
        </Card>
      </main>
    );
  }

  const [showAdd, setShowAdd] = useState(false);
  const [newPayroll, setNewPayroll] = useState({
    staff_id: "",
    period_start: "",
    period_end: "",
    basic_salary: 0,
    allowances: 0,
    deductions: 0,
  });
  const { formatCurrency } = useCurrency();

  const handleAdd = async () => {
    if (!newPayroll.staff_id || !newPayroll.period_start) {
      toast.error("Please fill all required fields");
      return;
    }

    try {
      await createPayroll.mutateAsync({
        staff_id: newPayroll.staff_id,
        period_start: newPayroll.period_start,
        period_end: newPayroll.period_end || null,
        basic_salary: newPayroll.basic_salary,
        allowances: newPayroll.allowances,
        deductions: newPayroll.deductions,
      });
      toast.success("Payroll created");
      setShowAdd(false);
      setNewPayroll({ staff_id: "", period_start: "", period_end: "", basic_salary: 0, allowances: 0, deductions: 0 });
    } catch (error: any) {
      toast.error(error.message || "Failed to create payroll");
    }
  };

  const handleProcess = async (id: string) => {
    try {
      await processPayroll.mutateAsync(id);
      toast.success("Payroll processed");
    } catch (error: any) {
      toast.error(error.message || "Failed to process payroll");
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending": return <Badge variant="outline" className="bg-amber-500/10 text-amber-500">Pending</Badge>;
      case "paid": return <Badge variant="outline" className="bg-green-500/10 text-green-500">Paid</Badge>;
      default: return <Badge>{status}</Badge>;
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
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Payroll</h1>
          <p className="text-muted-foreground text-sm">Manage staff salaries and payments</p>
        </div>
        <Dialog open={showAdd} onOpenChange={setShowAdd}>
          <DialogTrigger asChild>
            <Button className="w-full sm:w-auto"><Plus className="mr-2 h-4 w-4" /> Create Payroll</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Payroll</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Staff *</Label>
                <Select value={newPayroll.staff_id} onValueChange={(v) => setNewPayroll({ ...newPayroll, staff_id: v })}>
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
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Period Start *</Label>
                  <Input type="date" value={newPayroll.period_start} onChange={(e) => setNewPayroll({ ...newPayroll, period_start: e.target.value })} />
                </div>
                <div>
                  <Label>Period End</Label>
                  <Input type="date" value={newPayroll.period_end} onChange={(e) => setNewPayroll({ ...newPayroll, period_end: e.target.value })} />
                </div>
              </div>
              <div>
                <Label>Basic Salary</Label>
                <Input type="number" value={newPayroll.basic_salary} onChange={(e) => setNewPayroll({ ...newPayroll, basic_salary: Number(e.target.value) })} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Allowances</Label>
                  <Input type="number" value={newPayroll.allowances} onChange={(e) => setNewPayroll({ ...newPayroll, allowances: Number(e.target.value) })} />
                </div>
                <div>
                  <Label>Deductions</Label>
                  <Input type="number" value={newPayroll.deductions} onChange={(e) => setNewPayroll({ ...newPayroll, deductions: Number(e.target.value) })} />
                </div>
              </div>
              <div className="bg-muted p-3 rounded-lg">
                <span className="text-sm text-muted-foreground">Net Salary: </span>
                <span className="font-semibold">
                  {formatCurrency(newPayroll.basic_salary + newPayroll.allowances - newPayroll.deductions)}
                </span>
              </div>
              <Button onClick={handleAdd} disabled={createPayroll.isPending} className="w-full">
                {createPayroll.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Create Payroll
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5" />
            Payroll Records
          </CardTitle>
        </CardHeader>
        <CardContent>
          {payrolls.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Wallet className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No payroll records found. Create your first payroll to get started.</p>
            </div>
          ) : (
            <>
              {/* Mobile Cards */}
              <div className="md:hidden space-y-3">
                {payrolls.map((payroll: any) => (
                  <div key={payroll.id} className="border rounded-lg p-4 space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-medium text-sm">{payroll.staff?.full_name || "—"}</p>
                        <p className="text-xs text-muted-foreground">
                          {payroll.period_start}{payroll.period_end ? ` → ${payroll.period_end}` : ""}
                        </p>
                      </div>
                      {getStatusBadge(payroll.status)}
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <p className="text-xs text-muted-foreground">Basic</p>
                        <p className="font-medium">{formatCurrency(payroll.basic_salary)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Net Salary</p>
                        <p className="font-semibold">{formatCurrency(payroll.net_salary)}</p>
                      </div>
                    </div>
                    <div className="border-t pt-2 space-y-1">
                      <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        Created: {format(new Date(payroll.created_at), "MMM d, yyyy HH:mm")}
                      </p>
                      {payroll.paid_at && (
                        <p className="text-[10px] text-green-600 flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          Paid: {format(new Date(payroll.paid_at), "MMM d, yyyy HH:mm")}
                        </p>
                      )}
                    </div>
                    {payroll.status === "pending" && (
                      <Button size="sm" onClick={() => handleProcess(payroll.id)} disabled={processPayroll.isPending} className="w-full">
                        Process Payment
                      </Button>
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
                      <TableHead>Period</TableHead>
                      <TableHead>Basic</TableHead>
                      <TableHead>Net Salary</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead>Paid At</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {payrolls.map((payroll: any) => (
                      <TableRow key={payroll.id}>
                        <TableCell className="font-medium">{payroll.staff?.full_name || "—"}</TableCell>
                        <TableCell className="text-sm">{payroll.period_start}{payroll.period_end ? ` → ${payroll.period_end}` : ""}</TableCell>
                        <TableCell>{formatCurrency(payroll.basic_salary)}</TableCell>
                        <TableCell className="font-semibold">{formatCurrency(payroll.net_salary)}</TableCell>
                        <TableCell>{getStatusBadge(payroll.status)}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {format(new Date(payroll.created_at), "MMM d, yyyy HH:mm")}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {payroll.paid_at ? format(new Date(payroll.paid_at), "MMM d, yyyy HH:mm") : "—"}
                        </TableCell>
                        <TableCell>
                          {payroll.status === "pending" && (
                            <Button size="sm" onClick={() => handleProcess(payroll.id)} disabled={processPayroll.isPending}>
                              Process Payment
                            </Button>
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
