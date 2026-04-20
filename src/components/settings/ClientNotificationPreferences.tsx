import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Bell,
  Mail,
  Smartphone,
  Package,
  TrendingUp,
  Calendar,
  CheckCircle,
  Clock,
  AlertTriangle,
  ChevronDown,
  Lock,
  Crown,
  Settings2,
  Send,
  Loader2,
  Sparkles,
  Zap,
} from "lucide-react";
import {
  useUserNotificationPreferences,
  useNotificationDefaults,
  useUpdateNotificationPreference,
  NOTIFICATION_TYPES,
  type NotificationTypeKey,
} from "@/hooks/useNotificationPreferences";
import { useBusinessPlan } from "@/hooks/useFeatureGating";
import { useHasEmailAddon } from "@/hooks/useAddons";
import { useBranches } from "@/hooks/useBranches";
import { useBusiness } from "@/hooks/useBusiness";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  Package,
  TrendingUp,
  Calendar,
  CheckCircle,
  CheckCircle2: CheckCircle,
  Clock,
  Bell,
};

interface NotificationCardProps {
  notificationType: NotificationTypeKey;
  userPref?: {
    in_app_enabled: boolean;
    email_enabled: boolean;
    push_enabled: boolean;
    is_enabled: boolean;
    branch_ids: string[] | null;
    settings: Record<string, unknown>;
  };
  defaultPref?: {
    default_in_app_enabled: boolean;
    default_email_enabled: boolean;
    default_push_enabled: boolean;
    is_available: boolean;
    is_critical: boolean;
    is_enforced: boolean;
    default_settings: Record<string, unknown>;
  };
  branches: { id: string; name: string }[];
  onUpdate: (updates: Partial<{
    in_app_enabled: boolean;
    email_enabled: boolean;
    push_enabled: boolean;
    is_enabled: boolean;
    branch_ids: string[] | null;
    settings: Record<string, unknown>;
  }>) => void;
  isPending: boolean;
  isLocked?: boolean;
  lockMessage?: string;
  isEmailLocked?: boolean;
  onEmailLockedClick?: () => void;
  onSendTest?: () => void;
  isSendingTest?: boolean;
  hasEmailAddon?: boolean;
}

const NotificationCard = ({
  notificationType,
  userPref,
  defaultPref,
  branches,
  onUpdate,
  isPending,
  isLocked,
  lockMessage,
  isEmailLocked,
  onEmailLockedClick,
  onSendTest,
  isSendingTest,
  hasEmailAddon,
}: NotificationCardProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const meta = NOTIFICATION_TYPES[notificationType];
  const Icon = ICON_MAP[meta.icon] || Bell;

  // Use user preference if exists, otherwise use defaults
  const inAppEnabled = userPref?.in_app_enabled ?? defaultPref?.default_in_app_enabled ?? true;
  const emailEnabled = userPref?.email_enabled ?? defaultPref?.default_email_enabled ?? false;
  const pushEnabled = userPref?.push_enabled ?? defaultPref?.default_push_enabled ?? false;
  const isEnabled = userPref?.is_enabled ?? true;
  const settings = userPref?.settings ?? defaultPref?.default_settings ?? {};

  const isCritical = defaultPref?.is_critical ?? false;
  const isEnforced = defaultPref?.is_enforced ?? false;

  if (!defaultPref?.is_available) return null;

  return (
    <Card className={cn(
      "transition-all duration-200",
      isLocked && "opacity-60",
      isEnabled && !isLocked && "ring-1 ring-primary/20 border-primary/30"
    )}>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <div className="p-4 sm:p-5">
          {/* Header Row */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-start gap-3 flex-1 min-w-0">
              <div className={cn(
                "h-10 w-10 rounded-lg flex items-center justify-center shrink-0",
                isEnabled && !isLocked ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
              )}>
                <Icon className="h-5 w-5" />
              </div>
              <div className="space-y-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h4 className="font-medium leading-none">{meta.label}</h4>
                  {isLocked && <Lock className="h-3.5 w-3.5 text-muted-foreground" />}
                  {isCritical && (
                    <Badge variant="outline" className="text-xs text-amber-600 border-amber-500/30">
                      <AlertTriangle className="h-3 w-3 mr-1" />
                      Critical
                    </Badge>
                  )}
                  {isEnforced && (
                    <Badge variant="secondary" className="text-xs">
                      Enforced
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">{meta.description}</p>
                {isLocked && lockMessage && (
                  <p className="text-sm text-amber-600 dark:text-amber-400 flex items-center gap-1 mt-2">
                    <Crown className="h-3.5 w-3.5" />
                    {lockMessage}
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={isEnabled}
                onCheckedChange={(checked) => onUpdate({ is_enabled: checked })}
                disabled={isLocked || isCritical || isEnforced || isPending}
                className="shrink-0"
              />
              {!isLocked && (
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <ChevronDown className={cn(
                      "h-4 w-4 transition-transform",
                      isOpen && "rotate-180"
                    )} />
                  </Button>
                </CollapsibleTrigger>
              )}
            </div>
          </div>

          {/* Quick Channel Indicators */}
          {isEnabled && (
            <div className={cn("flex gap-2 mt-3 pt-3 border-t", isLocked && "opacity-50")}>
              <Badge 
                variant={inAppEnabled ? "default" : "outline"} 
                className={cn(
                  "text-xs cursor-pointer",
                  inAppEnabled ? "bg-green-500/10 text-green-600 border-green-500/20 hover:bg-green-500/20" : "hover:bg-muted"
                )}
                onClick={() => !isCritical && onUpdate({ in_app_enabled: !inAppEnabled })}
              >
                <Smartphone className="h-3 w-3 mr-1" />
                In-app
              </Badge>
              <Badge 
                variant={isEmailLocked ? "outline" : emailEnabled ? "default" : "outline"} 
                className={cn(
                  "text-xs",
                  isEmailLocked
                    ? "cursor-pointer bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400 border-amber-300 dark:border-amber-700 hover:bg-amber-100 dark:hover:bg-amber-950/50"
                    : emailEnabled 
                      ? "cursor-pointer bg-blue-500/10 text-blue-600 border-blue-500/20 hover:bg-blue-500/20" 
                      : "cursor-pointer hover:bg-muted"
                )}
                onClick={() => {
                  if (isEmailLocked) {
                    onEmailLockedClick?.();
                  } else {
                    onUpdate({ email_enabled: !emailEnabled });
                  }
                }}
              >
                {isEmailLocked ? <Lock className="h-3 w-3 mr-1" /> : <Mail className="h-3 w-3 mr-1" />}
                Email
                {isEmailLocked && <Sparkles className="h-3 w-3 ml-1" />}
              </Badge>
              {/* Push badge - future ready */}
              <Badge 
                variant="outline" 
                className="text-xs opacity-50 cursor-not-allowed"
              >
                <Bell className="h-3 w-3 mr-1" />
                Push (soon)
              </Badge>
            </div>
          )}
        </div>

        {/* Expanded Settings */}
        <CollapsibleContent>
          <div className="px-4 sm:px-5 pb-4 sm:pb-5 space-y-4 border-t pt-4">
            {/* Channel Configuration */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-2">
                  <Smartphone className="h-4 w-4 text-muted-foreground" />
                  <Label htmlFor={`${notificationType}-in-app`}>In-app notifications</Label>
                </div>
                <Switch
                  id={`${notificationType}-in-app`}
                  checked={inAppEnabled}
                  onCheckedChange={(checked) => onUpdate({ in_app_enabled: checked })}
                  disabled={isCritical || isPending}
                />
              </div>
              <div 
                className={cn(
                  "flex items-center justify-between p-3 rounded-lg",
                  isEmailLocked 
                    ? "bg-amber-50/50 dark:bg-amber-950/20 border border-dashed border-amber-300 dark:border-amber-700 cursor-pointer"
                    : "bg-muted/50"
                )}
                onClick={() => {
                  if (isEmailLocked) {
                    onEmailLockedClick?.();
                  }
                }}
              >
                <div className="flex items-center gap-2">
                  {isEmailLocked ? (
                    <Lock className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                  ) : (
                    <Mail className="h-4 w-4 text-muted-foreground" />
                  )}
                  <Label htmlFor={`${notificationType}-email`} className={isEmailLocked ? "text-amber-700 dark:text-amber-400" : ""}>
                    Email notifications
                    {isEmailLocked && (
                      <span className="ml-2 text-xs font-normal text-amber-600 dark:text-amber-400">(Requires Add-on)</span>
                    )}
                  </Label>
                </div>
                {isEmailLocked ? (
                  <Badge variant="outline" className="text-xs bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border-amber-300 dark:border-amber-700">
                    <Sparkles className="h-3 w-3 mr-1" />
                    Get Add-on
                  </Badge>
                ) : (
                  <Switch
                    id={`${notificationType}-email`}
                    checked={emailEnabled}
                    onCheckedChange={(checked) => onUpdate({ email_enabled: checked })}
                    disabled={isPending}
                  />
                )}
              </div>
            </div>

            {/* Type-specific settings */}
            {notificationType === "daily_sales_summary" && (
              <div className="space-y-3">
                <Label>Delivery Time</Label>
                <Select
                  value={(settings.delivery_time as string) || "23:59"}
                  onValueChange={(value) => onUpdate({ settings: { ...settings, delivery_time: value } })}
                >
                  <SelectTrigger className="w-full sm:w-[200px]">
                    <SelectValue placeholder="Select time" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="18:00">6:00 PM</SelectItem>
                    <SelectItem value="20:00">8:00 PM</SelectItem>
                    <SelectItem value="21:00">9:00 PM</SelectItem>
                    <SelectItem value="22:00">10:00 PM</SelectItem>
                    <SelectItem value="23:00">11:00 PM</SelectItem>
                    <SelectItem value="23:59">11:59 PM (End of day)</SelectItem>
                  </SelectContent>
                </Select>
                <div className="flex items-center gap-2">
                  <Switch
                    id={`${notificationType}-skip-zero`}
                    checked={(settings.skip_zero_days as boolean) || false}
                    onCheckedChange={(checked) => onUpdate({ settings: { ...settings, skip_zero_days: checked } })}
                  />
                  <Label htmlFor={`${notificationType}-skip-zero`}>Skip days with no sales</Label>
                </div>
              </div>
            )}

            {notificationType === "weekly_sales_report" && (
              <div className="space-y-3">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Delivery Day</Label>
                    <Select
                      value={(settings.delivery_day as string) || "monday"}
                      onValueChange={(value) => onUpdate({ settings: { ...settings, delivery_day: value } })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="monday">Monday</SelectItem>
                        <SelectItem value="tuesday">Tuesday</SelectItem>
                        <SelectItem value="wednesday">Wednesday</SelectItem>
                        <SelectItem value="thursday">Thursday</SelectItem>
                        <SelectItem value="friday">Friday</SelectItem>
                        <SelectItem value="saturday">Saturday</SelectItem>
                        <SelectItem value="sunday">Sunday</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Delivery Time</Label>
                    <Select
                      value={(settings.delivery_time as string) || "08:00"}
                      onValueChange={(value) => onUpdate({ settings: { ...settings, delivery_time: value } })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="06:00">6:00 AM</SelectItem>
                        <SelectItem value="07:00">7:00 AM</SelectItem>
                        <SelectItem value="08:00">8:00 AM</SelectItem>
                        <SelectItem value="09:00">9:00 AM</SelectItem>
                        <SelectItem value="10:00">10:00 AM</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            )}


            {/* Branch Scope */}
            {branches.length > 1 && (
              <div className="space-y-3">
                <Label>Monitored Branches</Label>
                <Select
                  value={userPref?.branch_ids === null ? "all" : "selected"}
                  onValueChange={(value) => onUpdate({ 
                    branch_ids: value === "all" ? null : branches.map(b => b.id)
                  })}
                >
                  <SelectTrigger className="w-full sm:w-[250px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All branches</SelectItem>
                    <SelectItem value="selected">Selected branches only</SelectItem>
                  </SelectContent>
                </Select>
                {userPref?.branch_ids !== null && (
                  <div className="flex flex-wrap gap-2">
                    {branches.map((branch) => (
                      <Badge
                        key={branch.id}
                        variant={userPref?.branch_ids?.includes(branch.id) ? "default" : "outline"}
                        className="cursor-pointer"
                        onClick={() => {
                          const currentIds = userPref?.branch_ids || [];
                          const newIds = currentIds.includes(branch.id)
                            ? currentIds.filter(id => id !== branch.id)
                            : [...currentIds, branch.id];
                          onUpdate({ branch_ids: newIds.length > 0 ? newIds : null });
                        }}
                      >
                        {branch.name}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Send Test Email Button */}
            {hasEmailAddon && !isLocked && onSendTest && (
              <div className="pt-3 border-t">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onSendTest}
                  disabled={isSendingTest}
                  className="w-full sm:w-auto"
                >
                  {isSendingTest ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4 mr-2" />
                      Send Test Email
                    </>
                  )}
                </Button>
              </div>
            )}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
};

export const ClientNotificationPreferences = () => {
  const navigate = useNavigate();
  const { data: business } = useBusiness();
  const { data: userPrefs, isLoading: prefsLoading } = useUserNotificationPreferences();
  const { data: defaults, isLoading: defaultsLoading } = useNotificationDefaults();
  const updatePref = useUpdateNotificationPreference();
  const { data: branches = [] } = useBranches(business?.id);
  const { data: planInfo } = useBusinessPlan();
  const { hasEmailAddon, isLoading: addonLoading } = useHasEmailAddon();
  
  // Email addon prompt dialog state
  const [showEmailAddonPrompt, setShowEmailAddonPrompt] = useState(false);
  const [sendingTestType, setSendingTestType] = useState<string | null>(null);

  const isFreePlan = planInfo?.effectivePlan === "free";
  const isProfessionalPlan = planInfo?.effectivePlan === "professional";
  const isEnterprisePlan = planInfo?.effectivePlan === "enterprise";

  // Locked notification types by plan - Weekly and Monthly reports are Enterprise only
  const lockedTypes: NotificationTypeKey[] = isEnterprisePlan 
    ? [] 
    : ["weekly_sales_report", "monthly_sales_report"];

  const isLoading = prefsLoading || defaultsLoading || addonLoading;

  const getUserPref = (type: NotificationTypeKey) => {
    const pref = userPrefs?.find(p => p.notification_type === type);
    return pref ? {
      in_app_enabled: pref.in_app_enabled,
      email_enabled: hasEmailAddon ? pref.email_enabled : false,
      push_enabled: pref.push_enabled,
      is_enabled: pref.is_enabled,
      branch_ids: pref.branch_ids,
      settings: pref.settings as Record<string, unknown>,
    } : undefined;
  };

  const getDefaultPref = (type: NotificationTypeKey) => {
    const def = defaults?.find(d => d.notification_type === type);
    return def ? {
      default_in_app_enabled: def.default_in_app_enabled,
      default_email_enabled: hasEmailAddon ? def.default_email_enabled : false,
      default_push_enabled: def.default_push_enabled,
      is_available: def.is_available,
      is_critical: def.is_critical,
      is_enforced: def.is_enforced,
      default_settings: def.default_settings as Record<string, unknown>,
    } : undefined;
  };

  const handleUpdate = (type: NotificationTypeKey) => (updates: Record<string, unknown>) => {
    // Block email updates if addon not purchased
    if ('email_enabled' in updates && !hasEmailAddon) {
      setShowEmailAddonPrompt(true);
      return;
    }
    updatePref.mutate({
      notification_type: type,
      ...updates,
    } as Parameters<typeof updatePref.mutate>[0]);
  };
  
  const handleEmailLockedClick = () => {
    setShowEmailAddonPrompt(true);
  };

  const handleSendTestEmail = async (notificationType: NotificationTypeKey) => {
    if (!hasEmailAddon) {
      toast.error("Email notifications require the Email Add-on");
      return;
    }
    if (!business?.owner_email) {
      toast.error("Business owner email not found");
      return;
    }

    // Map notification types to test email types
    const typeMap: Record<string, "daily_sales" | "weekly_report" | "low_stock"> = {
      "daily_sales_summary": "daily_sales",
      "weekly_sales_report": "weekly_report",
      "monthly_sales_report": "weekly_report", // Use weekly report template for monthly
      "low_stock_alert": "low_stock",
    };

    const testType = typeMap[notificationType];
    if (!testType) {
      toast.error("Test not available for this notification type");
      return;
    }

    setSendingTestType(notificationType);
    try {
      const { error } = await supabase.functions.invoke("send-notification-test", {
        body: {
          type: testType,
          email: business.owner_email,
          businessName: business.trading_name || "Your Business",
        },
      });
      if (error) throw error;
      toast.success(`Test email sent to ${business.owner_email}! Check your inbox.`);
    } catch (error: any) {
      console.error("Failed to send test email:", error);
      toast.error(error.message || "Failed to send test email");
    } finally {
      setSendingTestType(null);
    }
  };

  const branchList = branches.map(b => ({ id: b.id, name: b.name }));

  const inventoryTypes: NotificationTypeKey[] = ["low_stock_alert"];
  const salesTypes: NotificationTypeKey[] = ["daily_sales_summary", "weekly_sales_report", "monthly_sales_report"];

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-72" />
        </CardHeader>
        <CardContent className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Settings2 className="h-5 w-5" />
                  Notification Preferences
                </CardTitle>
                <CardDescription>
                  Configure how and when you receive alerts and reports. Changes save automatically.
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                {hasEmailAddon ? (
                  <Badge variant="default" className="bg-green-500/10 text-green-600 border-green-500/20">
                    <Mail className="h-3 w-3 mr-1" />
                    Email Add-on Active
                  </Badge>
                ) : (
                  <Badge 
                    variant="outline" 
                    className="text-amber-600 border-amber-300 cursor-pointer hover:bg-amber-50 dark:hover:bg-amber-950/30" 
                    onClick={() => setShowEmailAddonPrompt(true)}
                  >
                    <Lock className="h-3 w-3 mr-1" />
                    Email Add-on Required
                  </Badge>
                )}
              </div>
            </div>
          </CardHeader>
        </Card>

        <Tabs defaultValue="inventory" className="space-y-4">
          <TabsList className="grid grid-cols-2 gap-1 h-auto p-1">
            <TabsTrigger value="inventory" className="gap-2 py-2">
              <Package className="h-4 w-4" />
              <span className="hidden sm:inline">Inventory</span>
            </TabsTrigger>
            <TabsTrigger value="sales" className="gap-2 py-2">
              <TrendingUp className="h-4 w-4" />
              <span className="hidden sm:inline">Sales</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="inventory" className="space-y-4">
            {inventoryTypes.map((type) => (
              <NotificationCard
                key={type}
                notificationType={type}
                userPref={getUserPref(type)}
                defaultPref={getDefaultPref(type)}
                branches={branchList}
                onUpdate={handleUpdate(type)}
                isPending={updatePref.isPending}
                isLocked={lockedTypes.includes(type)}
                lockMessage={isFreePlan ? "Upgrade to Professional or Enterprise" : undefined}
                isEmailLocked={!hasEmailAddon}
                onEmailLockedClick={handleEmailLockedClick}
                onSendTest={() => handleSendTestEmail(type)}
                isSendingTest={sendingTestType === type}
                hasEmailAddon={hasEmailAddon}
              />
            ))}
          </TabsContent>

          <TabsContent value="sales" className="space-y-4">
            {salesTypes.map((type) => (
              <NotificationCard
                key={type}
                notificationType={type}
                userPref={getUserPref(type)}
                defaultPref={getDefaultPref(type)}
                branches={branchList}
                onUpdate={handleUpdate(type)}
                isPending={updatePref.isPending}
                isLocked={lockedTypes.includes(type)}
                lockMessage={!isEnterprisePlan && lockedTypes.includes(type) ? "Upgrade to Enterprise" : undefined}
                isEmailLocked={!hasEmailAddon}
                onEmailLockedClick={handleEmailLockedClick}
                onSendTest={() => handleSendTestEmail(type)}
                isSendingTest={sendingTestType === type}
                hasEmailAddon={hasEmailAddon}
              />
            ))}
          </TabsContent>
        </Tabs>
      </div>

      {/* Email Addon Purchase Prompt Dialog */}
      <Dialog open={showEmailAddonPrompt} onOpenChange={setShowEmailAddonPrompt}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="mx-auto mb-4 h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center">
              <Mail className="h-7 w-7 text-primary" />
            </div>
            <DialogTitle className="text-center text-xl">
              Unlock Email Notifications
            </DialogTitle>
            <DialogDescription className="text-center">
              Get sales reports, low stock alerts, and business updates delivered directly to your inbox.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-3 py-4">
            <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
              <Zap className="h-5 w-5 text-primary mt-0.5 shrink-0" />
              <div>
                <p className="font-medium text-sm">Daily, Weekly & Monthly Sales Reports</p>
                <p className="text-xs text-muted-foreground">Automated summaries sent to your email</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
              <Package className="h-5 w-5 text-primary mt-0.5 shrink-0" />
              <div>
                <p className="font-medium text-sm">Low Stock Alerts</p>
                <p className="text-xs text-muted-foreground">Never run out of inventory again</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
              <TrendingUp className="h-5 w-5 text-primary mt-0.5 shrink-0" />
              <div>
                <p className="font-medium text-sm">Business Insights</p>
                <p className="text-xs text-muted-foreground">Stay informed even when offline</p>
              </div>
            </div>
          </div>

          <div className="text-center py-2">
            <p className="text-2xl font-bold text-primary">₦2,000<span className="text-sm font-normal text-muted-foreground">/month</span></p>
          </div>

          <DialogFooter className="flex flex-col gap-2 sm:flex-col">
            <Button 
              className="w-full" 
              onClick={() => {
                setShowEmailAddonPrompt(false);
                navigate("/dashboard/settings?tab=addons");
              }}
            >
              <Sparkles className="h-4 w-4 mr-2" />
              Get Email Add-on
            </Button>
            <Button 
              variant="ghost" 
              className="w-full" 
              onClick={() => setShowEmailAddonPrompt(false)}
            >
              Maybe Later
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
