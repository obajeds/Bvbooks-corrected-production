import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Bell,
  Mail,
  Settings2,
  Activity,
  AlertTriangle,
  CheckCircle,
  XCircle,
  RotateCcw,
  TrendingUp,
  Calendar,
  Search,
  RefreshCw,
} from "lucide-react";
import {
  useNotificationDefaults,
  useUpdateNotificationDefault,
  useAllNotificationAuditLogs,
  useNotificationStats,
  NOTIFICATION_TYPES,
  type NotificationTypeKey,
} from "@/hooks/useNotificationPreferences";
import { format } from "date-fns";

const StatusBadge = ({ status }: { status: string }) => {
  const variants: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; icon: React.ReactNode }> = {
    pending: { variant: "outline", icon: <RotateCcw className="h-3 w-3 mr-1 animate-spin" /> },
    sent: { variant: "secondary", icon: <Mail className="h-3 w-3 mr-1" /> },
    delivered: { variant: "default", icon: <CheckCircle className="h-3 w-3 mr-1" /> },
    failed: { variant: "destructive", icon: <XCircle className="h-3 w-3 mr-1" /> },
    retrying: { variant: "outline", icon: <RefreshCw className="h-3 w-3 mr-1 animate-spin" /> },
  };

  const config = variants[status] || variants.pending;

  return (
    <Badge variant={config.variant} className="flex items-center gap-0.5">
      {config.icon}
      {status}
    </Badge>
  );
};

export const SuperAdminNotificationPanel = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");

  const { data: defaults, isLoading: defaultsLoading } = useNotificationDefaults();
  const updateDefault = useUpdateNotificationDefault();
  const { data: stats, isLoading: statsLoading } = useNotificationStats();
  const { data: auditLogs, isLoading: logsLoading, refetch: refetchLogs } = useAllNotificationAuditLogs({
    limit: 100,
    status: statusFilter !== "all" ? (statusFilter as "pending" | "sent" | "delivered" | "failed" | "retrying") : undefined,
    notificationType: typeFilter !== "all" ? (typeFilter as NotificationTypeKey) : undefined,
  });

  const handleToggleAvailability = (type: NotificationTypeKey, isAvailable: boolean) => {
    updateDefault.mutate({
      notification_type: type,
      is_available: isAvailable,
    });
  };

  const handleToggleEnforced = (type: NotificationTypeKey, isEnforced: boolean) => {
    updateDefault.mutate({
      notification_type: type,
      is_enforced: isEnforced,
    });
  };

  const filteredLogs = auditLogs?.filter(log => {
    if (searchQuery) {
      const searchLower = searchQuery.toLowerCase();
      return (
        log.recipient_email?.toLowerCase().includes(searchLower) ||
        log.subject?.toLowerCase().includes(searchLower) ||
        (log as any).businesses?.trading_name?.toLowerCase().includes(searchLower)
      );
    }
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Global Notification Controls</h2>
          <p className="text-muted-foreground">Manage platform-wide notification settings and monitor delivery</p>
        </div>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview" className="gap-2">
            <Activity className="h-4 w-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="defaults" className="gap-2">
            <Settings2 className="h-4 w-4" />
            Defaults
          </TabsTrigger>
          <TabsTrigger value="audit" className="gap-2">
            <Bell className="h-4 w-4" />
            Audit Logs
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          {statsLoading ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-32" />
              ))}
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>Today's Notifications</CardDescription>
                  <CardTitle className="text-3xl">{stats?.today.total || 0}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-4 text-sm">
                    <span className="flex items-center gap-1 text-green-600">
                      <CheckCircle className="h-4 w-4" />
                      {stats?.today.sent || 0} sent
                    </span>
                    <span className="flex items-center gap-1 text-destructive">
                      <XCircle className="h-4 w-4" />
                      {stats?.today.failed || 0} failed
                    </span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>This Week</CardDescription>
                  <CardTitle className="text-3xl">{stats?.week.total || 0}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-4 text-sm">
                    <span className="flex items-center gap-1 text-green-600">
                      <CheckCircle className="h-4 w-4" />
                      {stats?.week.sent || 0} sent
                    </span>
                    <span className="flex items-center gap-1 text-destructive">
                      <XCircle className="h-4 w-4" />
                      {stats?.week.failed || 0} failed
                    </span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>Success Rate</CardDescription>
                  <CardTitle className="text-3xl">
                    {stats?.week.total
                      ? Math.round((stats.week.sent / stats.week.total) * 100)
                      : 100}%
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <TrendingUp className="h-4 w-4" />
                    Based on last 7 days
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>Active Types</CardDescription>
                  <CardTitle className="text-3xl">
                    {defaults?.filter((d) => d.is_available).length || 0}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-sm text-muted-foreground">
                    of {defaults?.length || 0} notification types
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Type Breakdown */}
          <Card>
            <CardHeader>
              <CardTitle>Notification Volume by Type</CardTitle>
              <CardDescription>Distribution of notifications sent this week</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {Object.entries(stats?.typeBreakdown || {}).map(([type, count]) => {
                  const typeMeta = NOTIFICATION_TYPES[type as NotificationTypeKey];
                  if (!typeMeta) return null;

                  const percentage = stats?.week.total
                    ? Math.round((count / stats.week.total) * 100)
                    : 0;

                  return (
                    <div key={type} className="flex items-center gap-4">
                      <div className="w-40 text-sm font-medium truncate">
                        {typeMeta.label}
                      </div>
                      <div className="flex-1">
                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary transition-all"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                      <div className="w-20 text-sm text-muted-foreground text-right">
                        {count} ({percentage}%)
                      </div>
                    </div>
                  );
                })}
                {Object.keys(stats?.typeBreakdown || {}).length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No notifications sent this week
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Defaults Tab */}
        <TabsContent value="defaults" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Notification Type Defaults</CardTitle>
              <CardDescription>
                Configure default behavior for each notification type. Changes apply to all businesses.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {defaultsLoading ? (
                <div className="space-y-4">
                  {[1, 2, 3, 4].map((i) => (
                    <Skeleton key={i} className="h-20" />
                  ))}
                </div>
              ) : (
                <div className="divide-y">
                  {defaults?.map((def) => {
                    const typeMeta = NOTIFICATION_TYPES[def.notification_type as NotificationTypeKey];
                    if (!typeMeta) return null;

                    return (
                      <div key={def.id} className="py-4 first:pt-0 last:pb-0">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <h4 className="font-medium">{typeMeta.label}</h4>
                              <Badge variant={def.is_available ? "default" : "secondary"}>
                                {def.is_available ? "Active" : "Disabled"}
                              </Badge>
                              {def.is_critical && (
                                <Badge variant="destructive">Critical</Badge>
                              )}
                              {def.is_enforced && (
                                <Badge variant="outline">Enforced</Badge>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground mt-1">
                              {typeMeta.description}
                            </p>
                          </div>

                          <div className="flex items-center gap-6">
                            <div className="flex items-center gap-2">
                              <Switch
                                id={`available-${def.id}`}
                                checked={def.is_available}
                                onCheckedChange={(checked) =>
                                  handleToggleAvailability(
                                    def.notification_type as NotificationTypeKey,
                                    checked
                                  )
                                }
                                disabled={updateDefault.isPending}
                              />
                              <Label htmlFor={`available-${def.id}`} className="text-sm">
                                Available
                              </Label>
                            </div>

                            <div className="flex items-center gap-2">
                              <Switch
                                id={`enforced-${def.id}`}
                                checked={def.is_enforced}
                                onCheckedChange={(checked) =>
                                  handleToggleEnforced(
                                    def.notification_type as NotificationTypeKey,
                                    checked
                                  )
                                }
                                disabled={updateDefault.isPending || !def.is_available}
                              />
                              <Label htmlFor={`enforced-${def.id}`} className="text-sm">
                                Enforced
                              </Label>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-4 mt-3 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Bell className="h-3 w-3" />
                            In-app: {def.default_in_app_enabled ? "On" : "Off"}
                          </span>
                          <span className="flex items-center gap-1">
                            <Mail className="h-3 w-3" />
                            Email: {def.default_email_enabled ? "On" : "Off"}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Audit Logs Tab */}
        <TabsContent value="audit" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <CardTitle>Notification Audit Logs</CardTitle>
                  <CardDescription>
                    Track all notification deliveries across the platform
                  </CardDescription>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => refetchLogs()}
                  disabled={logsLoading}
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${logsLoading ? "animate-spin" : ""}`} />
                  Refresh
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {/* Filters */}
              <div className="flex flex-col sm:flex-row gap-4 mb-6">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by email, subject, or business..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="sent">Sent</SelectItem>
                    <SelectItem value="delivered">Delivered</SelectItem>
                    <SelectItem value="failed">Failed</SelectItem>
                    <SelectItem value="retrying">Retrying</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    {Object.entries(NOTIFICATION_TYPES).map(([key, meta]) => (
                      <SelectItem key={key} value={key}>
                        {meta.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {logsLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Skeleton key={i} className="h-12" />
                  ))}
                </div>
              ) : (
                <div className="rounded-md border overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Time</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Business</TableHead>
                        <TableHead>Channel</TableHead>
                        <TableHead>Recipient</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredLogs?.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                            No notification logs found
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredLogs?.map((log) => (
                          <TableRow key={log.id}>
                            <TableCell className="whitespace-nowrap">
                              {format(new Date(log.queued_at), "MMM d, HH:mm")}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">
                                {NOTIFICATION_TYPES[log.notification_type as NotificationTypeKey]?.label || log.notification_type}
                              </Badge>
                            </TableCell>
                            <TableCell className="max-w-[150px] truncate">
                              {(log as any).businesses?.trading_name || "-"}
                            </TableCell>
                            <TableCell>
                              <Badge variant="secondary" className="capitalize">
                                {log.channel}
                              </Badge>
                            </TableCell>
                            <TableCell className="max-w-[180px] truncate">
                              {log.recipient_email || log.recipient_role || "-"}
                            </TableCell>
                            <TableCell>
                              <StatusBadge status={log.status} />
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};