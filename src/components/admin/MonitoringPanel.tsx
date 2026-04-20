import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Loader2, AlertTriangle, RefreshCw, CheckCircle, Plus, Eye, Trash2, Activity, ShieldAlert, Clock, Bug } from "lucide-react";
import { format } from "date-fns";

interface ErrorEvent {
  id: string;
  business_id: string | null;
  source: string;
  severity: string;
  error_type: string;
  error_message: string;
  stack_trace: string | null;
  metadata: Record<string, unknown>;
  resolved_at: string | null;
  resolved_by: string | null;
  created_at: string;
}

interface AlertRule {
  id: string;
  name: string;
  condition_type: string;
  threshold: number;
  window_minutes: number;
  notify_channel: string;
  is_active: boolean;
  created_by: string | null;
  created_at: string;
}

const severityColors: Record<string, string> = {
  info: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
  warning: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
  error: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
  critical: "bg-red-200 text-red-900 dark:bg-red-950 dark:text-red-200",
};

export function MonitoringPanel() {
  const queryClient = useQueryClient();
  const [sourceFilter, setSourceFilter] = useState("all");
  const [severityFilter, setSeverityFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedError, setSelectedError] = useState<ErrorEvent | null>(null);
  const [ruleDialogOpen, setRuleDialogOpen] = useState(false);
  const [newRule, setNewRule] = useState({
    name: "",
    condition_type: "error_rate",
    threshold: 10,
    window_minutes: 5,
    notify_channel: "in_app",
  });

  // Fetch recent error events
  const { data: errorEvents = [], isLoading: eventsLoading, refetch: refetchEvents } = useQuery({
    queryKey: ["admin-error-events", sourceFilter, severityFilter, searchQuery],
    queryFn: async () => {
      let query = supabase
        .from("error_events")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);

      if (sourceFilter !== "all") query = query.eq("source", sourceFilter);
      if (severityFilter !== "all") query = query.eq("severity", severityFilter);
      if (searchQuery) query = query.ilike("error_message", `%${searchQuery}%`);

      const { data, error } = await query;
      if (error) throw error;
      return data as ErrorEvent[];
    },
    refetchInterval: 30000,
  });

  // Fetch alert rules
  const { data: alertRules = [], isLoading: rulesLoading, refetch: refetchRules } = useQuery({
    queryKey: ["admin-alert-rules"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("alert_rules")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as AlertRule[];
    },
  });

  // Metrics
  const errorsLastHour = errorEvents.filter(
    (e) => new Date(e.created_at) > new Date(Date.now() - 60 * 60 * 1000)
  ).length;
  const failedTransactionsToday = errorEvents.filter(
    (e) =>
      e.error_type === "failed_transaction" &&
      new Date(e.created_at).toDateString() === new Date().toDateString()
  ).length;
  const criticalCount = errorEvents.filter((e) => e.severity === "critical" && !e.resolved_at).length;

  // Resolve error
  const resolveError = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("error_events")
        .update({ resolved_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-error-events"] });
      toast.success("Error marked as resolved");
    },
  });

  // Create alert rule
  const createRule = useMutation({
    mutationFn: async (rule: typeof newRule) => {
      const { error } = await supabase.from("alert_rules").insert(rule);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-alert-rules"] });
      setRuleDialogOpen(false);
      setNewRule({ name: "", condition_type: "error_rate", threshold: 10, window_minutes: 5, notify_channel: "in_app" });
      toast.success("Alert rule created");
    },
  });

  // Toggle alert rule
  const toggleRule = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase.from("alert_rules").update({ is_active }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-alert-rules"] });
      toast.success("Alert rule updated");
    },
  });

  // Delete alert rule
  const deleteRule = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("alert_rules").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-alert-rules"] });
      toast.success("Alert rule deleted");
    },
  });

  return (
    <div className="space-y-6">
      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-red-100 dark:bg-red-900 p-2">
                <Bug className="h-5 w-5 text-red-600 dark:text-red-300" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Errors (Last Hour)</p>
                <p className="text-2xl font-bold">{errorsLastHour}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-orange-100 dark:bg-orange-900 p-2">
                <Activity className="h-5 w-5 text-orange-600 dark:text-orange-300" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Failed Transactions (Today)</p>
                <p className="text-2xl font-bold">{failedTransactionsToday}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-destructive/10 p-2">
                <ShieldAlert className="h-5 w-5 text-destructive" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Unresolved Critical</p>
                <p className="text-2xl font-bold">{criticalCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Error Log */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                Error Events
              </CardTitle>
              <CardDescription>Recent errors across all businesses (auto-refreshes every 30s)</CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={() => refetchEvents()}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
          <div className="flex flex-wrap gap-3 mt-3">
            <Input
              placeholder="Search errors..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-48"
            />
            <Select value={sourceFilter} onValueChange={setSourceFilter}>
              <SelectTrigger className="w-36">
                <SelectValue placeholder="Source" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Sources</SelectItem>
                <SelectItem value="client">Client</SelectItem>
                <SelectItem value="edge_function">Edge Function</SelectItem>
                <SelectItem value="database">Database</SelectItem>
              </SelectContent>
            </Select>
            <Select value={severityFilter} onValueChange={setSeverityFilter}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="Severity" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="info">Info</SelectItem>
                <SelectItem value="warning">Warning</SelectItem>
                <SelectItem value="error">Error</SelectItem>
                <SelectItem value="critical">Critical</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {eventsLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : errorEvents.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No error events found</p>
          ) : (
            <div className="overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Time</TableHead>
                    <TableHead>Severity</TableHead>
                    <TableHead>Source</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="max-w-[300px]">Message</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {errorEvents.map((event) => (
                    <TableRow key={event.id}>
                      <TableCell className="whitespace-nowrap text-xs">
                        {format(new Date(event.created_at), "MMM d, HH:mm:ss")}
                      </TableCell>
                      <TableCell>
                        <Badge className={severityColors[event.severity] || ""} variant="outline">
                          {event.severity}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs">{event.source}</TableCell>
                      <TableCell className="text-xs font-mono">{event.error_type}</TableCell>
                      <TableCell className="max-w-[300px] truncate text-xs">{event.error_message}</TableCell>
                      <TableCell>
                        {event.resolved_at ? (
                          <Badge variant="outline" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300">
                            Resolved
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300">
                            Open
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button size="icon" variant="ghost" onClick={() => setSelectedError(event)}>
                            <Eye className="h-4 w-4" />
                          </Button>
                          {!event.resolved_at && (
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => resolveError.mutate(event.id)}
                              disabled={resolveError.isPending}
                            >
                              <CheckCircle className="h-4 w-4 text-green-600" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Alert Rules */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Alert Rules
              </CardTitle>
              <CardDescription>Configurable thresholds for automated notifications</CardDescription>
            </div>
            <Button size="sm" onClick={() => setRuleDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Rule
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {rulesLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : alertRules.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No alert rules configured</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Condition</TableHead>
                  <TableHead>Threshold</TableHead>
                  <TableHead>Window</TableHead>
                  <TableHead>Channel</TableHead>
                  <TableHead>Active</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {alertRules.map((rule) => (
                  <TableRow key={rule.id}>
                    <TableCell className="font-medium text-sm">{rule.name}</TableCell>
                    <TableCell className="text-xs font-mono">{rule.condition_type}</TableCell>
                    <TableCell>{rule.threshold}</TableCell>
                    <TableCell>{rule.window_minutes} min</TableCell>
                    <TableCell>{rule.notify_channel}</TableCell>
                    <TableCell>
                      <Switch
                        checked={rule.is_active}
                        onCheckedChange={(checked) => toggleRule.mutate({ id: rule.id, is_active: checked })}
                      />
                    </TableCell>
                    <TableCell>
                      <Button size="icon" variant="ghost" onClick={() => deleteRule.mutate(rule.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Error Detail Dialog */}
      <Dialog open={!!selectedError} onOpenChange={() => setSelectedError(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Error Details</DialogTitle>
            <DialogDescription>
              {selectedError && format(new Date(selectedError.created_at), "PPpp")}
            </DialogDescription>
          </DialogHeader>
          {selectedError && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs text-muted-foreground">Source</Label>
                  <p className="text-sm font-medium">{selectedError.source}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Severity</Label>
                  <Badge className={severityColors[selectedError.severity] || ""} variant="outline">
                    {selectedError.severity}
                  </Badge>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Type</Label>
                  <p className="text-sm font-mono">{selectedError.error_type}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Status</Label>
                  <p className="text-sm">{selectedError.resolved_at ? "Resolved" : "Open"}</p>
                </div>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Message</Label>
                <p className="text-sm mt-1">{selectedError.error_message}</p>
              </div>
              {selectedError.stack_trace && (
                <div>
                  <Label className="text-xs text-muted-foreground">Stack Trace</Label>
                  <pre className="mt-1 p-3 rounded-md bg-muted text-xs overflow-auto max-h-40 whitespace-pre-wrap break-words">
                    {selectedError.stack_trace}
                  </pre>
                </div>
              )}
              {selectedError.metadata && Object.keys(selectedError.metadata).length > 0 && (
                <div>
                  <Label className="text-xs text-muted-foreground">Metadata</Label>
                  <pre className="mt-1 p-3 rounded-md bg-muted text-xs overflow-auto max-h-32">
                    {JSON.stringify(selectedError.metadata, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Create Alert Rule Dialog */}
      <Dialog open={ruleDialogOpen} onOpenChange={setRuleDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Alert Rule</DialogTitle>
            <DialogDescription>Set up automated monitoring thresholds</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Name</Label>
              <Input value={newRule.name} onChange={(e) => setNewRule({ ...newRule, name: e.target.value })} placeholder="e.g. High Error Rate" />
            </div>
            <div>
              <Label>Condition Type</Label>
              <Select value={newRule.condition_type} onValueChange={(v) => setNewRule({ ...newRule, condition_type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="error_rate">Error Rate</SelectItem>
                  <SelectItem value="slow_query">Slow Query</SelectItem>
                  <SelectItem value="failed_transaction">Failed Transaction</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Threshold (count)</Label>
                <Input type="number" value={newRule.threshold} onChange={(e) => setNewRule({ ...newRule, threshold: Number(e.target.value) })} />
              </div>
              <div>
                <Label>Window (minutes)</Label>
                <Input type="number" value={newRule.window_minutes} onChange={(e) => setNewRule({ ...newRule, window_minutes: Number(e.target.value) })} />
              </div>
            </div>
            <div>
              <Label>Notification Channel</Label>
              <Select value={newRule.notify_channel} onValueChange={(v) => setNewRule({ ...newRule, notify_channel: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="in_app">In-App</SelectItem>
                  <SelectItem value="email">Email</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => createRule.mutate(newRule)} disabled={!newRule.name || createRule.isPending}>
              {createRule.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Create Rule
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
