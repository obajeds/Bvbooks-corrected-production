import { useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Activity as ActivityIcon, Loader2, Radio, User, Clock, FileText } from "lucide-react";
import { useActivityLogs } from "@/hooks/useActivityLogs";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { useBusiness } from "@/hooks/useBusiness";
import { useBranchContext } from "@/contexts/BranchContext";
import { useIsMobile } from "@/hooks/use-mobile";
import { formatDistanceToNow } from "date-fns";

const Activity = () => {
  const { data: activities = [], isLoading } = useActivityLogs();
  const { data: business } = useBusiness();
  const { currentBranch, isOwner } = useBranchContext();
  const queryClient = useQueryClient();
  const isMobile = useIsMobile();

  // Real-time subscription for activity logs
  useEffect(() => {
    if (!business?.id) return;

    const channel = supabase
      .channel('activity-logs-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'activity_logs',
          filter: `business_id=eq.${business.id}`
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["activity_logs", business.id] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [business?.id, queryClient]);

  const getActionVariant = (action: string) => {
    if (action.includes('delete')) return 'destructive';
    if (action.includes('create') || action.includes('completed')) return 'default';
    return 'secondary';
  };

  const formatAction = (action: string) => action.replace(/_/g, ' ');

  const parseDetails = (activity: any) => {
    let detailsObj = activity.details;
    if (typeof detailsObj === "string") {
      try {
        detailsObj = JSON.parse(detailsObj);
      } catch {
        detailsObj = null;
      }
    }
    
    return activity.entity_name || 
      (detailsObj?.invoice_number) || 
      (detailsObj?.total_amount ? `Amount: ${detailsObj.total_amount}` : null);
  };

  const getTimestamp = (activity: any) => {
    let detailsObj = activity.details;
    if (typeof detailsObj === "string") {
      try {
        detailsObj = JSON.parse(detailsObj);
      } catch {
        detailsObj = null;
      }
    }
    return detailsObj?.timestamp || activity.created_at;
  };

  if (isLoading) {
    return (
      <main className="flex-1 overflow-y-auto p-4 sm:p-6 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </main>
    );
  }

  return (
    <main className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 sm:space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Activity Log</h1>
        <p className="text-sm sm:text-base text-muted-foreground flex items-center gap-2">
          <Radio className="h-3 w-3 text-green-500 animate-pulse" />
          Tracking activities in real-time
        </p>
      </div>

      <Card>
        <CardHeader className="pb-3 sm:pb-6">
          <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
            <ActivityIcon className="h-4 w-4 sm:h-5 sm:w-5" />
            Recent Activities
            {activities.length > 0 && (
              <Badge variant="secondary" className="ml-2 text-xs">
                {activities.length}
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="px-3 sm:px-6">
          {activities.length === 0 ? (
            <div className="text-center py-8 sm:py-12 text-muted-foreground">
              <ActivityIcon className="h-10 w-10 sm:h-12 sm:w-12 mx-auto mb-4 opacity-50" />
              <p className="text-sm sm:text-base">No activities recorded yet.</p>
              <p className="text-xs sm:text-sm mt-2">Activities will appear here as you use the system.</p>
            </div>
          ) : isMobile ? (
            // Mobile card-based view
            <div className="space-y-3">
              {activities.map((activity: any) => {
                const staffName = activity.staff?.full_name || "System";
                const staffRole = activity.staff?.role;
                const displayName = staffRole ? `${staffName} (${staffRole})` : staffName;
                const detailsDisplay = parseDetails(activity);
                const actionTimestamp = getTimestamp(activity);

                return (
                  <div
                    key={activity.id}
                    className="border rounded-lg p-3 space-y-2 bg-card hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <Badge variant={getActionVariant(activity.action)} className="text-xs">
                        {formatAction(activity.action)}
                      </Badge>
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        {formatDistanceToNow(new Date(actionTimestamp), { addSuffix: true })}
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-2 text-sm">
                      <Badge variant="outline" className="text-xs">
                        {activity.entity_type}
                      </Badge>
                      {detailsDisplay && (
                        <span className="text-muted-foreground truncate flex-1">
                          {detailsDisplay}
                        </span>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <User className="h-3 w-3" />
                      <span className="truncate">{displayName}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            // Desktop table view
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Action</TableHead>
                    <TableHead>Module</TableHead>
                    <TableHead>Performed By</TableHead>
                    <TableHead className="hidden lg:table-cell">User ID</TableHead>
                    <TableHead>Details</TableHead>
                    <TableHead>Timestamp</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {activities.map((activity: any) => {
                    const staffName = activity.staff?.full_name || "System";
                    const staffRole = activity.staff?.role;
                    const displayName = staffRole ? `${staffName} (${staffRole})` : staffName;
                    const userId = activity.user_id || activity.staff_id || "-";
                    const detailsDisplay = parseDetails(activity) || "-";
                    const actionTimestamp = getTimestamp(activity);

                    return (
                      <TableRow key={activity.id}>
                        <TableCell>
                          <Badge variant={getActionVariant(activity.action)}>
                            {formatAction(activity.action)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{activity.entity_type}</Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-medium">{displayName}</span>
                          </div>
                        </TableCell>
                        <TableCell className="hidden lg:table-cell font-mono text-xs text-muted-foreground">
                          {typeof userId === 'string' && userId !== '-' ? `${userId.substring(0, 8)}...` : '-'}
                        </TableCell>
                        <TableCell>
                          <span className="text-sm">{detailsDisplay}</span>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="text-sm font-medium">
                              {formatDistanceToNow(new Date(actionTimestamp), { addSuffix: true })}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {new Date(actionTimestamp).toLocaleString()}
                            </span>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </main>
  );
};

export default Activity;
