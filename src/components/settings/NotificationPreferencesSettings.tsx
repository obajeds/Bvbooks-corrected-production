import React, { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
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
  Smartphone,
  Package,
  TrendingUp,
  Calendar,
  ShoppingCart,
  Loader2,
  Crown,
  Lock,
  CheckCircle,
  AlertTriangle,
  Sparkles,
  Zap,
} from "lucide-react";
import { useBusinessPlan } from "@/hooks/useFeatureGating";
import { useHasEmailAddon } from "@/hooks/useAddons";
import { useNotificationSettings, useUpdateNotificationSettings } from "@/hooks/useNotificationSettings";
import { useBusiness } from "@/hooks/useBusiness";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";

interface NotificationItemProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  inAppEnabled: boolean;
  emailEnabled: boolean;
  onInAppToggle: (enabled: boolean) => void;
  onEmailToggle: (enabled: boolean) => void;
  email?: string;
  onEmailChange?: (email: string) => void;
  onSendTest?: () => void;
  isSendingTest?: boolean;
  isEmailLocked?: boolean;
  onEmailLockedClick?: () => void;
  isPlanLocked?: boolean;
  lockMessage?: string;
  scheduleTime?: string;
  onScheduleTimeChange?: (time: string) => void;
  showSchedule?: boolean;
}

const NotificationItem = ({
  icon,
  title,
  description,
  inAppEnabled,
  emailEnabled,
  onInAppToggle,
  onEmailToggle,
  email,
  onEmailChange,
  onSendTest,
  isSendingTest,
  isEmailLocked,
  onEmailLockedClick,
  isPlanLocked,
  lockMessage,
  scheduleTime,
  onScheduleTimeChange,
  showSchedule = false,
}: NotificationItemProps) => {
  const isAnyEnabled = inAppEnabled || (emailEnabled && !isEmailLocked);

  return (
    <div className={cn(
      "rounded-lg border bg-card transition-all duration-200",
      isPlanLocked && "opacity-60",
      isAnyEnabled && !isPlanLocked && "ring-1 ring-primary/20 border-primary/30"
    )}>
      <div className="p-4 sm:p-5">
        {/* Header Row */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <div className={cn(
              "h-10 w-10 rounded-lg flex items-center justify-center shrink-0",
              isAnyEnabled && !isPlanLocked ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
            )}>
              {icon}
            </div>
            <div className="space-y-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h4 className="font-medium leading-none">{title}</h4>
                {isPlanLocked && <Lock className="h-3.5 w-3.5 text-muted-foreground" />}
                {isAnyEnabled && !isPlanLocked && (
                  <Badge variant="default" className="text-xs bg-green-500/10 text-green-600 border-green-500/20">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Active
                  </Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground">{description}</p>
              {isPlanLocked && lockMessage && (
                <p className="text-sm text-amber-600 dark:text-amber-400 flex items-center gap-1 mt-2">
                  <Crown className="h-3.5 w-3.5" />
                  {lockMessage}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Channel Selection */}
        {!isPlanLocked && (
          <div className="mt-4 pt-4 border-t">
            <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3 block">
              Notification Channels
            </Label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* In-App Channel Card */}
              <button
                type="button"
                onClick={() => onInAppToggle(!inAppEnabled)}
                className={cn(
                  "relative flex items-center gap-3 p-4 rounded-xl border-2 transition-all duration-200 text-left",
                  inAppEnabled
                    ? "border-primary bg-primary/5 shadow-sm"
                    : "border-border bg-card hover:border-muted-foreground/50"
                )}
              >
                <div className={cn(
                  "h-10 w-10 rounded-lg flex items-center justify-center shrink-0 transition-colors",
                  inAppEnabled ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                )}>
                  <Smartphone className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm">In-App</div>
                  <div className="text-xs text-muted-foreground">Push notifications</div>
                </div>
                <div className={cn(
                  "h-6 w-6 rounded-full border-2 flex items-center justify-center transition-all",
                  inAppEnabled
                    ? "border-primary bg-primary"
                    : "border-muted-foreground/40"
                )}>
                  {inAppEnabled && <CheckCircle className="h-4 w-4 text-primary-foreground" />}
                </div>
              </button>

              {/* Email Channel Card */}
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      onClick={() => {
                        if (isEmailLocked) {
                          onEmailLockedClick?.();
                        } else {
                          onEmailToggle(!emailEnabled);
                        }
                      }}
                      className={cn(
                        "relative flex items-center gap-3 p-4 rounded-xl border-2 transition-all duration-200 text-left group",
                        isEmailLocked
                          ? "border-dashed border-amber-500/40 bg-amber-50/50 dark:bg-amber-950/20 cursor-pointer hover:border-amber-500/60 hover:bg-amber-50 dark:hover:bg-amber-950/30"
                          : emailEnabled
                            ? "border-primary bg-primary/5 shadow-sm"
                            : "border-border bg-card hover:border-muted-foreground/50"
                      )}
                    >
                      {/* Locked overlay effect */}
                      {isEmailLocked && (
                        <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-transparent via-amber-500/5 to-transparent pointer-events-none" />
                      )}
                      
                      <div className={cn(
                        "h-10 w-10 rounded-lg flex items-center justify-center shrink-0 transition-colors relative",
                        isEmailLocked
                          ? "bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400"
                          : emailEnabled
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted text-muted-foreground"
                      )}>
                        {isEmailLocked ? (
                          <Lock className="h-5 w-5" />
                        ) : (
                          <Mail className="h-5 w-5" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm flex items-center gap-1.5">
                          Email
                          {isEmailLocked && (
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border-amber-300 dark:border-amber-700">
                              PRO
                            </Badge>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {isEmailLocked ? "Click to unlock" : "Email reports"}
                        </div>
                      </div>
                      <div className={cn(
                        "flex items-center justify-center transition-all",
                        isEmailLocked
                          ? "text-amber-600 dark:text-amber-400"
                          : emailEnabled
                            ? ""
                            : ""
                      )}>
                        {isEmailLocked ? (
                          <div className="flex items-center gap-1 text-xs font-medium text-amber-600 dark:text-amber-400 group-hover:underline">
                            <Sparkles className="h-4 w-4" />
                            <span className="hidden sm:inline">Get Add-on</span>
                          </div>
                        ) : (
                          <div className={cn(
                            "h-6 w-6 rounded-full border-2 flex items-center justify-center",
                            emailEnabled
                              ? "border-primary bg-primary"
                              : "border-muted-foreground/40"
                          )}>
                            {emailEnabled && <CheckCircle className="h-4 w-4 text-primary-foreground" />}
                          </div>
                        )}
                      </div>
                    </button>
                  </TooltipTrigger>
                  {isEmailLocked && (
                    <TooltipContent side="top">
                      <p>Purchase Email Add-on to enable</p>
                    </TooltipContent>
                  )}
                </Tooltip>
              </TooltipProvider>
            </div>

            {/* Email Settings (only when email is enabled and not locked) */}
            {emailEnabled && !isEmailLocked && (
              <div className="mt-4 space-y-4">
                {/* Email Input */}
                {onEmailChange && (
                  <div className="grid gap-2">
                    <Label htmlFor={`${title}-email`} className="text-sm font-medium">
                      Email Address
                    </Label>
                    <div className="flex flex-col sm:flex-row gap-2">
                      <Input
                        id={`${title}-email`}
                        type="email"
                        value={email}
                        onChange={(e) => onEmailChange(e.target.value)}
                        placeholder="Enter email address"
                        className="flex-1"
                      />
                      {onSendTest && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={onSendTest}
                          disabled={isSendingTest || !email}
                          className="w-full sm:w-auto shrink-0"
                        >
                          {isSendingTest ? (
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          ) : (
                            <Mail className="h-4 w-4 mr-2" />
                          )}
                          Send Test
                        </Button>
                      )}
                    </div>
                  </div>
                )}

                {/* Schedule Time */}
                {showSchedule && onScheduleTimeChange && (
                  <div className="grid gap-2">
                    <Label className="text-sm font-medium">Delivery Time</Label>
                    <Select value={scheduleTime} onValueChange={onScheduleTimeChange}>
                      <SelectTrigger className="w-full sm:w-[200px]">
                        <SelectValue placeholder="Select time" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="06:00">6:00 AM</SelectItem>
                        <SelectItem value="07:00">7:00 AM</SelectItem>
                        <SelectItem value="08:00">8:00 AM</SelectItem>
                        <SelectItem value="09:00">9:00 AM</SelectItem>
                        <SelectItem value="18:00">6:00 PM</SelectItem>
                        <SelectItem value="20:00">8:00 PM</SelectItem>
                        <SelectItem value="21:00">9:00 PM</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      Reports will be sent at this time daily
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export const NotificationPreferencesSettings = () => {
  const navigate = useNavigate();
  const { data: business } = useBusiness();
  const { data: notificationData, isLoading } = useNotificationSettings();
  const updateSettings = useUpdateNotificationSettings();
  const { data: planInfo } = useBusinessPlan();
  const { hasEmailAddon, isLoading: isLoadingAddon } = useHasEmailAddon();

  const isFreePlan = planInfo?.effectivePlan === "free";
  
  // Email addon prompt dialog state
  const [showEmailAddonPrompt, setShowEmailAddonPrompt] = useState(false);
  
  // Local state for form
  const [settings, setSettings] = useState({
    low_stock_alerts_enabled: false,
    low_stock_alerts_email_enabled: false,
    low_stock_alerts_email: "",
    daily_sales_summary_enabled: false,
    daily_sales_summary_email_enabled: false,
    daily_sales_summary_email: "",
    daily_sales_summary_time: "08:00",
    weekly_sales_summary_enabled: false,
    weekly_sales_summary_email_enabled: false,
    weekly_sales_summary_email: "",
    monthly_sales_summary_enabled: false,
    monthly_sales_summary_email_enabled: false,
    monthly_sales_summary_email: "",
    new_order_notifications: true,
    new_order_email_enabled: false,
  });

  const [sendingTest, setSendingTest] = useState<string | null>(null);
  
  const handleEmailLockedClick = () => {
    setShowEmailAddonPrompt(true);
  };

  const skipSyncRef = useRef(false);

  // Sync settings from database, skipping one cycle after a save
  useEffect(() => {
    if (!notificationData || isLoadingAddon) return;
    if (skipSyncRef.current) {
      skipSyncRef.current = false;
      return;
    }
    setSettings({
        low_stock_alerts_enabled: notificationData.low_stock_alerts_enabled,
        low_stock_alerts_email_enabled: hasEmailAddon && !!notificationData.low_stock_alerts_email,
        low_stock_alerts_email: notificationData.low_stock_alerts_email || business?.owner_email || "",
        daily_sales_summary_enabled: notificationData.daily_sales_summary_enabled,
        daily_sales_summary_email_enabled: hasEmailAddon && !!notificationData.daily_sales_summary_email,
        daily_sales_summary_email: notificationData.daily_sales_summary_email || business?.owner_email || "",
        daily_sales_summary_time: "08:00",
        weekly_sales_summary_enabled: notificationData.weekly_sales_summary_enabled,
        weekly_sales_summary_email_enabled: hasEmailAddon && !!notificationData.weekly_sales_summary_email,
        weekly_sales_summary_email: notificationData.weekly_sales_summary_email || business?.owner_email || "",
        monthly_sales_summary_enabled: false,
        monthly_sales_summary_email_enabled: false,
        monthly_sales_summary_email: business?.owner_email || "",
        new_order_notifications: notificationData.new_order_notifications,
        new_order_email_enabled: false,
    });
  }, [notificationData, isLoadingAddon]);

  const saveImmediately = (newSettings: typeof settings) => {
    skipSyncRef.current = true;
    updateSettings.mutate({
      low_stock_alerts_enabled: newSettings.low_stock_alerts_enabled || newSettings.low_stock_alerts_email_enabled,
      low_stock_alerts_email: newSettings.low_stock_alerts_email_enabled ? newSettings.low_stock_alerts_email : null,
      daily_sales_summary_enabled: newSettings.daily_sales_summary_enabled || newSettings.daily_sales_summary_email_enabled,
      daily_sales_summary_email: newSettings.daily_sales_summary_email_enabled ? newSettings.daily_sales_summary_email : null,
      weekly_sales_summary_enabled: newSettings.weekly_sales_summary_enabled || newSettings.weekly_sales_summary_email_enabled,
      weekly_sales_summary_email: newSettings.weekly_sales_summary_email_enabled ? newSettings.weekly_sales_summary_email : null,
      new_order_notifications: newSettings.new_order_notifications,
    });
  };

  const handleEmailToggle = (key: keyof typeof settings, value: boolean) => {
    if (!hasEmailAddon) {
      setShowEmailAddonPrompt(true);
      return;
    }
    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);
    saveImmediately(newSettings);
  };

  const handleUpdateSetting = <K extends keyof typeof settings>(key: K, value: typeof settings[K]) => {
    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);
    saveImmediately(newSettings);
  };

  const handleSendTestEmail = async (type: "daily_sales" | "weekly_report" | "low_stock", email: string) => {
    if (!email) {
      toast.error("Please enter an email address first");
      return;
    }
    if (!hasEmailAddon) {
      toast.error("Email notifications require the Email Add-on");
      return;
    }
    setSendingTest(type);
    try {
      const { error } = await supabase.functions.invoke("send-notification-test", {
        body: {
          type,
          email,
          businessName: business?.trading_name || "Your Business",
        },
      });
      if (error) throw error;
      toast.success("Test email sent! Check your inbox.");
    } catch (error: any) {
      console.error("Failed to send test email:", error);
      toast.error(error.message || "Failed to send test email");
    } finally {
      setSendingTest(null);
    }
  };

  if (isLoading || isLoadingAddon) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Notification Preferences
            </CardTitle>
            <CardDescription>
              Configure how and when you receive alerts and reports
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            {hasEmailAddon ? (
              <Badge variant="default" className="bg-green-500/10 text-green-600 border-green-500/20">
                <Mail className="h-3 w-3 mr-1" />
                Email Add-on Active
              </Badge>
            ) : (
              <Badge variant="outline" className="text-muted-foreground cursor-pointer" onClick={() => navigate("/dashboard/settings?tab=addons")}>
                <Lock className="h-3 w-3 mr-1" />
                Email Add-on Not Active
              </Badge>
            )}
            {updateSettings.isPending && (
              <Badge variant="outline" className="text-primary border-primary/50">
                <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                Saving
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Inventory Alerts Section */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            Inventory Alerts
          </h3>
          <NotificationItem
            icon={<Package className="h-5 w-5" />}
            title="Low Stock Alerts"
            description="Get notified when inventory items fall below their reorder threshold"
            inAppEnabled={settings.low_stock_alerts_enabled}
            emailEnabled={settings.low_stock_alerts_email_enabled}
            onInAppToggle={(checked) => handleUpdateSetting("low_stock_alerts_enabled", checked)}
            onEmailToggle={(checked) => handleEmailToggle("low_stock_alerts_email_enabled", checked)}
            email={settings.low_stock_alerts_email}
            onEmailChange={(email) => handleUpdateSetting("low_stock_alerts_email", email)}
            onSendTest={() => handleSendTestEmail("low_stock", settings.low_stock_alerts_email)}
            isSendingTest={sendingTest === "low_stock"}
            isEmailLocked={!hasEmailAddon}
            onEmailLockedClick={handleEmailLockedClick}
            isPlanLocked={isFreePlan}
            lockMessage={isFreePlan ? "Upgrade to a paid plan to unlock" : undefined}
          />
        </div>

        <Separator />

        {/* Sales Reports Section */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            Sales Reports
          </h3>
          
          <NotificationItem
            icon={<TrendingUp className="h-5 w-5" />}
            title="Daily Sales Summary"
            description="Receive a comprehensive daily sales report with totals and trends"
            inAppEnabled={settings.daily_sales_summary_enabled}
            emailEnabled={settings.daily_sales_summary_email_enabled}
            onInAppToggle={(checked) => handleUpdateSetting("daily_sales_summary_enabled", checked)}
            onEmailToggle={(checked) => handleEmailToggle("daily_sales_summary_email_enabled", checked)}
            email={settings.daily_sales_summary_email}
            onEmailChange={(email) => handleUpdateSetting("daily_sales_summary_email", email)}
            onSendTest={() => handleSendTestEmail("daily_sales", settings.daily_sales_summary_email)}
            isSendingTest={sendingTest === "daily_sales"}
            isEmailLocked={!hasEmailAddon}
            onEmailLockedClick={handleEmailLockedClick}
            isPlanLocked={isFreePlan}
            lockMessage={isFreePlan ? "Upgrade to a paid plan to unlock" : undefined}
            scheduleTime={settings.daily_sales_summary_time}
            onScheduleTimeChange={(time) => handleUpdateSetting("daily_sales_summary_time", time)}
            showSchedule
          />

          <NotificationItem
            icon={<Calendar className="h-5 w-5" />}
            title="Weekly Sales Report"
            description="Receive a detailed weekly summary every Monday morning"
            inAppEnabled={settings.weekly_sales_summary_enabled}
            emailEnabled={settings.weekly_sales_summary_email_enabled}
            onInAppToggle={(checked) => handleUpdateSetting("weekly_sales_summary_enabled", checked)}
            onEmailToggle={(checked) => handleEmailToggle("weekly_sales_summary_email_enabled", checked)}
            email={settings.weekly_sales_summary_email}
            onEmailChange={(email) => handleUpdateSetting("weekly_sales_summary_email", email)}
            onSendTest={() => handleSendTestEmail("weekly_report", settings.weekly_sales_summary_email)}
            isSendingTest={sendingTest === "weekly_report"}
            isEmailLocked={!hasEmailAddon}
            onEmailLockedClick={handleEmailLockedClick}
            isPlanLocked={isFreePlan}
            lockMessage={isFreePlan ? "Upgrade to a paid plan to unlock" : undefined}
          />

          <NotificationItem
            icon={<Calendar className="h-5 w-5" />}
            title="Monthly Sales Report"
            description="Receive a comprehensive monthly summary on the 1st of each month"
            inAppEnabled={settings.monthly_sales_summary_enabled}
            emailEnabled={settings.monthly_sales_summary_email_enabled}
            onInAppToggle={(checked) => handleUpdateSetting("monthly_sales_summary_enabled", checked)}
            onEmailToggle={(checked) => handleEmailToggle("monthly_sales_summary_email_enabled", checked)}
            email={settings.monthly_sales_summary_email}
            onEmailChange={(email) => handleUpdateSetting("monthly_sales_summary_email", email)}
            isEmailLocked={!hasEmailAddon}
            onEmailLockedClick={handleEmailLockedClick}
            isPlanLocked={isFreePlan}
            lockMessage={isFreePlan ? "Upgrade to a paid plan to unlock" : undefined}
          />
        </div>

        <Separator />

        {/* Real-time Notifications Section */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            Real-time Notifications
          </h3>
          
          <NotificationItem
            icon={<ShoppingCart className="h-5 w-5" />}
            title="New Order Notifications"
            description="Receive alerts for each new sale transaction"
            inAppEnabled={settings.new_order_notifications}
            emailEnabled={settings.new_order_email_enabled}
            onInAppToggle={(checked) => handleUpdateSetting("new_order_notifications", checked)}
            onEmailToggle={(checked) => handleEmailToggle("new_order_email_enabled", checked)}
            isEmailLocked={!hasEmailAddon}
            onEmailLockedClick={handleEmailLockedClick}
            isPlanLocked={isFreePlan}
            lockMessage={isFreePlan ? "Upgrade to a paid plan to unlock" : undefined}
          />
        </div>

        {/* Auto-save status */}
        <div className="pt-4 border-t flex items-center justify-center gap-2">
          <p className="text-sm text-muted-foreground">
            {updateSettings.isPending ? "Saving changes..." : "Changes are saved automatically"}
          </p>
        </div>
      </CardContent>

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
                <p className="font-medium text-sm">Daily & Weekly Sales Reports</p>
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
    </Card>
  );
};