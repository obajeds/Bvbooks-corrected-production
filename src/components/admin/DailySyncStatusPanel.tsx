import { useState } from "react";
import { format } from "date-fns";
import { Calendar, Lock, Unlock, RefreshCw, Check, AlertTriangle, Clock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useDailySyncStatus, useDayLocks, useLockDay, useUnlockDay } from "@/hooks/useDayLocks";
import { useStaffMembers } from "@/hooks/useStaffMembers";

interface DailySyncStatusPanelProps {
  className?: string;
}

export function DailySyncStatusPanel({ className }: DailySyncStatusPanelProps) {
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [unlockDialog, setUnlockDialog] = useState<{ cashierId: string; date: string } | null>(null);
  const [unlockReason, setUnlockReason] = useState('');

  const { data: syncStatuses, isLoading: syncLoading } = useDailySyncStatus(selectedDate);
  const { data: dayLocks, isLoading: locksLoading } = useDayLocks(selectedDate);
  const { data: staffMembers } = useStaffMembers();
  
  const lockDay = useLockDay();
  const unlockDay = useUnlockDay();

  const getStaffName = (cashierId: string) => {
    const staff = staffMembers?.find(s => s.user_id === cashierId);
    return staff?.full_name || 'Unknown';
  };

  const isLocked = (cashierId: string) => {
    return dayLocks?.some(lock => lock.cashier_id === cashierId && lock.locked);
  };

  const handleLock = (cashierId: string) => {
    lockDay.mutate({ cashierId, date: selectedDate });
  };

  const handleUnlock = () => {
    if (unlockDialog && unlockReason.trim()) {
      unlockDay.mutate({
        cashierId: unlockDialog.cashierId,
        date: unlockDialog.date,
        reason: unlockReason
      });
      setUnlockDialog(null);
      setUnlockReason('');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'synced':
        return <Badge className="bg-green-500"><Check className="h-3 w-3 mr-1" /> Synced</Badge>;
      case 'partial':
        return <Badge variant="secondary" className="bg-yellow-500 text-white"><AlertTriangle className="h-3 w-3 mr-1" /> Partial</Badge>;
      default:
        return <Badge variant="outline"><Clock className="h-3 w-3 mr-1" /> Pending</Badge>;
    }
  };

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <RefreshCw className="h-5 w-5" />
              Daily Sync Status
            </CardTitle>
            <CardDescription>
              Monitor cashier sync status and manage day locks
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Label htmlFor="sync-date" className="sr-only">Date</Label>
            <Input
              id="sync-date"
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-40"
            />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {syncLoading || locksLoading ? (
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : syncStatuses && syncStatuses.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cashier</TableHead>
                <TableHead>Expected</TableHead>
                <TableHead>Synced</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Last Sync</TableHead>
                <TableHead>Lock</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {syncStatuses.map((status) => {
                const locked = isLocked(status.cashier_id);
                return (
                  <TableRow key={status.id}>
                    <TableCell className="font-medium">
                      {getStaffName(status.cashier_id)}
                    </TableCell>
                    <TableCell>{status.expected_sales}</TableCell>
                    <TableCell>{status.synced_sales}</TableCell>
                    <TableCell>{getStatusBadge(status.status)}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {status.last_sync 
                        ? format(new Date(status.last_sync), 'HH:mm:ss')
                        : '-'}
                    </TableCell>
                    <TableCell>
                      {locked ? (
                        <Badge variant="destructive">
                          <Lock className="h-3 w-3 mr-1" /> Locked
                        </Badge>
                      ) : (
                        <Badge variant="outline">
                          <Unlock className="h-3 w-3 mr-1" /> Open
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {locked ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setUnlockDialog({ 
                            cashierId: status.cashier_id, 
                            date: status.sale_date 
                          })}
                        >
                          <Unlock className="h-4 w-4 mr-1" />
                          Unlock
                        </Button>
                      ) : (
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleLock(status.cashier_id)}
                          disabled={lockDay.isPending}
                        >
                          <Lock className="h-4 w-4 mr-1" />
                          Lock Day
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <Calendar className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>No sync activity for {format(new Date(selectedDate), 'MMMM d, yyyy')}</p>
          </div>
        )}

        {/* Day Locks Summary */}
        {dayLocks && dayLocks.length > 0 && (
          <div className="mt-6 pt-4 border-t">
            <h4 className="text-sm font-medium mb-3">Locked Days</h4>
            <div className="flex flex-wrap gap-2">
              {dayLocks.filter(l => l.locked).map(lock => (
                <Badge key={lock.id} variant="secondary" className="flex items-center gap-1">
                  <Lock className="h-3 w-3" />
                  {getStaffName(lock.cashier_id)}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </CardContent>

      {/* Unlock Dialog */}
      <Dialog open={!!unlockDialog} onOpenChange={() => setUnlockDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Unlock Day for Editing</DialogTitle>
            <DialogDescription>
              Unlocking will allow sales to be modified. Please provide a reason for audit purposes.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="unlock-reason">Reason for Unlocking</Label>
            <Textarea
              id="unlock-reason"
              value={unlockReason}
              onChange={(e) => setUnlockReason(e.target.value)}
              placeholder="e.g., Correction needed for invoice #123"
              className="mt-2"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUnlockDialog(null)}>
              Cancel
            </Button>
            <Button 
              onClick={handleUnlock}
              disabled={!unlockReason.trim() || unlockDay.isPending}
            >
              {unlockDay.isPending ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Unlock className="h-4 w-4 mr-2" />
              )}
              Unlock Day
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
