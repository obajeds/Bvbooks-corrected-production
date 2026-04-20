import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Clock, AlertTriangle, CheckCircle, User, Building2, Eye } from "lucide-react";
import { useAfterHoursAlerts, useReviewAfterHoursAlert } from "@/hooks/useAfterHoursAlerts";
import { useAuth } from "@/contexts/AuthContext";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useBusiness } from "@/hooks/useBusiness";
import { UpgradePrompt } from "@/components/subscription/UpgradePrompt";

export function AfterHoursAlerts() {
  const { data: business, isLoading: businessLoading } = useBusiness();
  const { data: alerts, isLoading } = useAfterHoursAlerts();
  const reviewAlert = useReviewAfterHoursAlert();
  const { user } = useAuth();
  const [selectedAlert, setSelectedAlert] = useState<(typeof alerts)[0] | null>(null);

  // Enterprise-only feature check
  const currentPlan = business?.current_plan;
  const isEnterprise = currentPlan === 'enterprise';

  // Show loading while checking plan
  if (businessLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            After-Hours Alerts
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-20 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!isEnterprise) {
    return <UpgradePrompt featureName="After-Hours Alerts" requiredPlan="enterprise" />;
  }

  const unreviewed = alerts?.filter((a) => !a.is_reviewed) || [];
  const hasUnreviewed = unreviewed.length > 0;

  const handleReview = async (alertId: string) => {
    if (!user?.id) return;
    try {
      await reviewAlert.mutateAsync({ alertId, userId: user.id });
      toast.success("Alert marked as reviewed");
      setSelectedAlert(null);
    } catch (error) {
      toast.error("Failed to review alert");
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            After-Hours Alerts
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-20 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className={cn(hasUnreviewed && "border-warning")}>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className={cn("h-5 w-5", hasUnreviewed ? "text-warning" : "text-muted-foreground")} />
              After-Hours Alerts
            </div>
            {hasUnreviewed && (
              <Badge variant="outline" className="bg-warning/10 text-warning border-warning/20">
                {unreviewed.length} new
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!alerts || alerts.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground">
              <CheckCircle className="h-8 w-8 mx-auto mb-2 text-success" />
              <p className="text-sm">No after-hours activity detected</p>
            </div>
          ) : (
            <div className="space-y-3">
              {alerts.slice(0, 5).map((alert) => (
                <div
                  key={alert.id}
                  className={cn(
                    "flex items-start gap-3 p-3 rounded-lg border cursor-pointer hover:bg-muted/50 transition-colors",
                    !alert.is_reviewed && "bg-warning/5 border-warning/20"
                  )}
                  onClick={() => setSelectedAlert(alert)}
                >
                  <AlertTriangle
                    className={cn(
                      "h-4 w-4 mt-0.5 flex-shrink-0",
                      alert.is_reviewed ? "text-muted-foreground" : "text-warning"
                    )}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium truncate">{alert.description}</span>
                      {!alert.is_reviewed && (
                        <Badge variant="outline" className="text-xs bg-warning/10 text-warning">
                          New
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                      {alert.staff && (
                        <>
                          <User className="h-3 w-3" />
                          <span>{alert.staff.full_name}</span>
                        </>
                      )}
                      {alert.branch && (
                        <>
                          <Building2 className="h-3 w-3 ml-2" />
                          <span>{alert.branch.name}</span>
                        </>
                      )}
                      <span className="ml-auto">
                        {format(new Date(alert.activity_time), "MMM d, h:mm a")}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Alert Detail Dialog */}
      <Dialog open={!!selectedAlert} onOpenChange={() => setSelectedAlert(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-warning" />
              After-Hours Activity
            </DialogTitle>
          </DialogHeader>
          {selectedAlert && (
            <div className="space-y-4">
              <div className="p-4 bg-muted rounded-lg space-y-2">
                <p className="font-medium">{selectedAlert.description}</p>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-muted-foreground">Type:</span>
                    <Badge variant="outline" className="ml-2 capitalize">
                      {selectedAlert.alert_type}
                    </Badge>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Time:</span>
                    <span className="ml-2">
                      {format(new Date(selectedAlert.activity_time), "MMM d, yyyy h:mm a")}
                    </span>
                  </div>
                  {selectedAlert.staff && (
                    <div>
                      <span className="text-muted-foreground">Staff:</span>
                      <span className="ml-2">{selectedAlert.staff.full_name}</span>
                    </div>
                  )}
                  {selectedAlert.branch && (
                    <div>
                      <span className="text-muted-foreground">Branch:</span>
                      <span className="ml-2">{selectedAlert.branch.name}</span>
                    </div>
                  )}
                </div>
              </div>

              {selectedAlert.is_reviewed ? (
                <div className="flex items-center gap-2 text-success">
                  <CheckCircle className="h-4 w-4" />
                  <span className="text-sm">
                    Reviewed on {format(new Date(selectedAlert.reviewed_at!), "MMM d, yyyy")}
                  </span>
                </div>
              ) : (
                <Button
                  onClick={() => handleReview(selectedAlert.id)}
                  disabled={reviewAlert.isPending}
                  className="w-full"
                >
                  <Eye className="h-4 w-4 mr-2" />
                  Mark as Reviewed
                </Button>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
