import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Mail, MoreHorizontal, Clock, CheckCircle2, XCircle, AlertCircle, RefreshCw, Loader2 } from "lucide-react";
import { format, formatDistanceToNow, isPast } from "date-fns";
import { useStaffInvitations, useCancelInvitation, useResendInvitation, useInvitationBranchAssignments, StaffInvitation } from "@/hooks/useStaffInvitations";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useBranchContext } from "@/contexts/BranchContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function StaffInvitationsList() {
  const { data: allInvitations = [], isLoading } = useStaffInvitations();
  const { currentBranch, isOwner } = useBranchContext();
  const cancelInvitation = useCancelInvitation();
  const resendInvitation = useResendInvitation();
  const [selectedInvitationId, setSelectedInvitationId] = useState<string | null>(null);
  const { data: branchAssignments = [] } = useInvitationBranchAssignments(selectedInvitationId || undefined);

  // Fetch invitation IDs that belong to the current branch
  const { data: branchInvitationIds = [], isLoading: branchFilterLoading } = useQuery({
    queryKey: ["invitation-branch-filter", currentBranch?.id],
    queryFn: async () => {
      if (!currentBranch) return [];
      const { data, error } = await supabase
        .from("invitation_branch_assignments")
        .select("invitation_id")
        .eq("branch_id", currentBranch.id);
      if (error) throw error;
      return data?.map(d => d.invitation_id) || [];
    },
    enabled: !!currentBranch,
  });

  // Filter invitations by current branch for everyone
  // Wait for branch filter to load before showing any invitations
  const invitations: StaffInvitation[] = !currentBranch
    ? allInvitations
    : branchFilterLoading 
      ? [] 
      : allInvitations.filter(i => branchInvitationIds.includes(i.id));

  const getStatusBadge = (status: string, expiresAt: string) => {
    if (status === "accepted") {
      return <Badge className="bg-success text-success-foreground"><CheckCircle2 className="h-3 w-3 mr-1" />Accepted</Badge>;
    }
    if (status === "cancelled") {
      return <Badge variant="secondary"><XCircle className="h-3 w-3 mr-1" />Cancelled</Badge>;
    }
    if (status === "expired" || isPast(new Date(expiresAt))) {
      return <Badge variant="destructive"><AlertCircle className="h-3 w-3 mr-1" />Expired</Badge>;
    }
    return <Badge variant="outline" className="text-warning border-warning"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
  };

  const pendingInvitations = invitations.filter(i => i.status === "pending" && !isPast(new Date(i.expires_at)));
  const otherInvitations = invitations.filter(i => i.status !== "pending" || isPast(new Date(i.expires_at)));

  if (isLoading || (currentBranch && branchFilterLoading)) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  if (invitations.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
          <Mail className="h-12 w-12 mb-4 opacity-50" />
          <p>No invitations sent yet</p>
          <p className="text-sm">Use the "Invite Staff" button to send invitations</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <div className="space-y-6">
        {pendingInvitations.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Clock className="h-4 w-4 text-warning" />
                Pending Invitations ({pendingInvitations.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Sent</TableHead>
                    <TableHead>Expires</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pendingInvitations.map((invitation) => (
                    <TableRow key={invitation.id} className="cursor-pointer" onClick={() => setSelectedInvitationId(invitation.id)}>
                      <TableCell className="font-medium">{invitation.full_name}</TableCell>
                      <TableCell>{invitation.email}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {formatDistanceToNow(new Date(invitation.created_at), { addSuffix: true })}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {format(new Date(invitation.expires_at), "MMM d, yyyy")}
                      </TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="bg-popover border">
                            <DropdownMenuItem
                              onClick={() => resendInvitation.mutate(invitation)}
                              disabled={resendInvitation.isPending}
                            >
                              <RefreshCw className="h-4 w-4 mr-2" />
                              Resend
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => cancelInvitation.mutate(invitation.id)}
                              disabled={cancelInvitation.isPending}
                              className="text-destructive"
                            >
                              <XCircle className="h-4 w-4 mr-2" />
                              Cancel
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        {otherInvitations.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Invitation History</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {otherInvitations.map((invitation) => (
                    <TableRow key={invitation.id} className="cursor-pointer" onClick={() => setSelectedInvitationId(invitation.id)}>
                      <TableCell className="font-medium">{invitation.full_name}</TableCell>
                      <TableCell>{invitation.email}</TableCell>
                      <TableCell>{getStatusBadge(invitation.status, invitation.expires_at)}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {format(new Date(invitation.created_at), "MMM d, yyyy")}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Invitation Details Dialog */}
      <Dialog open={!!selectedInvitationId} onOpenChange={() => setSelectedInvitationId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invitation Details</DialogTitle>
          </DialogHeader>
          {selectedInvitationId && (
            <div className="space-y-4">
              {(() => {
                const invitation = invitations.find(i => i.id === selectedInvitationId);
                if (!invitation) return null;
                
                return (
                  <>
                    <div className="grid gap-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Name</span>
                        <span className="font-medium">{invitation.full_name}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Email</span>
                        <span>{invitation.email}</span>
                      </div>
                      {invitation.phone && (
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Phone</span>
                          <span>{invitation.phone}</span>
                        </div>
                      )}
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Status</span>
                        {getStatusBadge(invitation.status, invitation.expires_at)}
                      </div>
                    </div>

                    <div className="border-t pt-4">
                      <h4 className="font-medium mb-2">Branch Assignments</h4>
                      {branchAssignments.length === 0 ? (
                        <p className="text-sm text-muted-foreground">No branch assignments</p>
                      ) : (
                        <div className="space-y-2">
                          {branchAssignments.map((ba) => (
                            <div key={ba.id} className="flex items-center justify-between text-sm p-2 bg-muted rounded">
                              <div className="flex items-center gap-2">
                                <span>{ba.branches?.name}</span>
                                {ba.is_primary && <Badge variant="secondary" className="text-xs">Primary</Badge>}
                              </div>
                              <span className="text-muted-foreground">
                                {ba.role_templates?.name || "No role"}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </>
                );
              })()}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
