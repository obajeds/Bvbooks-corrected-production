import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Bell, 
  AlertTriangle, 
  Info, 
  CheckCircle, 
  XCircle, 
  Check, 
  CheckCheck,
  Inbox,
  Filter
} from "lucide-react";
import { useBusinessNotifications, useMarkNotificationAsRead } from "@/hooks/useBusinessNotifications";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient, useMutation } from "@tanstack/react-query";
import { useBusiness } from "@/hooks/useBusiness";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const Notifications = () => {
  const { data: notifications = [], isLoading } = useBusinessNotifications();
  const { data: business } = useBusiness();
  const markAsRead = useMarkNotificationAsRead();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<"all" | "unread">("all");

  // Real-time subscription for notifications
  useEffect(() => {
    if (!business?.id) return;

    const channel = supabase
      .channel('notifications-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'business_notifications',
          filter: `business_id=eq.${business.id}`
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["business_notifications", business.id] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [business?.id, queryClient]);

  // Mark all as read mutation
  const markAllAsRead = useMutation({
    mutationFn: async () => {
      if (!business?.id) throw new Error("No business found");
      
      const { error } = await supabase
        .from("business_notifications")
        .update({ is_read: true })
        .eq("business_id", business.id)
        .eq("is_read", false);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["business_notifications"] });
      queryClient.invalidateQueries({ queryKey: ["unread_notification_count"] });
      toast.success("All notifications marked as read");
    },
    onError: () => {
      toast.error("Failed to mark notifications as read");
    }
  });

  const getIcon = (type: string) => {
    const iconClasses = "h-5 w-5 shrink-0";
    switch (type) {
      case "warning": return <AlertTriangle className={cn(iconClasses, "text-amber-500")} />;
      case "info": return <Info className={cn(iconClasses, "text-blue-500")} />;
      case "success": return <CheckCircle className={cn(iconClasses, "text-green-500")} />;
      case "error": return <XCircle className={cn(iconClasses, "text-destructive")} />;
      default: return <Bell className={cn(iconClasses, "text-muted-foreground")} />;
    }
  };

  const getTypeBadge = (type: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      warning: "secondary",
      info: "outline",
      success: "default",
      error: "destructive"
    };
    return (
      <Badge variant={variants[type] || "outline"} className="text-xs capitalize">
        {type}
      </Badge>
    );
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);

    if (minutes < 1) return "Just now";
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days === 1) return "Yesterday";
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
  };

  const handleMarkAsRead = async (id: string) => {
    await markAsRead.mutateAsync(id);
  };

  const unreadNotifications = notifications.filter((n: any) => !n.is_read);
  const filteredNotifications = activeTab === "unread" 
    ? unreadNotifications 
    : notifications;

  const unreadCount = unreadNotifications.length;

  // Loading skeleton
  if (isLoading) {
    return (
      <main className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <Skeleton className="h-8 w-48 mb-2" />
            <Skeleton className="h-4 w-64" />
          </div>
          <Skeleton className="h-10 w-32" />
        </div>
        <Skeleton className="h-10 w-64" />
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <div className="flex gap-4">
                  <Skeleton className="h-5 w-5 rounded-full shrink-0" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-5 w-3/4" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </main>
    );
  }

  return (
    <main className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Notifications</h1>
            {unreadCount > 0 && (
              <Badge variant="default" className="rounded-full">
                {unreadCount} new
              </Badge>
            )}
          </div>
          <p className="text-sm md:text-base text-muted-foreground mt-1">
            Stay updated with alerts and important updates
          </p>
        </div>
        
        {unreadCount > 0 && (
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => markAllAsRead.mutate()}
            disabled={markAllAsRead.isPending}
            className="w-full sm:w-auto"
          >
            <CheckCheck className="h-4 w-4 mr-2" />
            Mark all as read
          </Button>
        )}
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "all" | "unread")}>
        <TabsList className="w-full sm:w-auto grid grid-cols-2 sm:inline-flex">
          <TabsTrigger value="all" className="flex items-center gap-2">
            <Filter className="h-4 w-4" />
            All
            <Badge variant="secondary" className="ml-1 hidden sm:inline-flex">
              {notifications.length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="unread" className="flex items-center gap-2">
            <Bell className="h-4 w-4" />
            Unread
            {unreadCount > 0 && (
              <Badge variant="default" className="ml-1">
                {unreadCount}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-4">
          {filteredNotifications.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-12 px-4 text-center">
                <div className="rounded-full bg-muted p-4 mb-4">
                  <Inbox className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="font-semibold text-lg mb-1">
                  {activeTab === "unread" ? "You're all caught up!" : "No notifications yet"}
                </h3>
                <p className="text-sm text-muted-foreground max-w-sm">
                  {activeTab === "unread" 
                    ? "You've read all your notifications. Check back later for new updates."
                    : "Notifications will appear here when there are important updates about your business."}
                </p>
                {activeTab === "unread" && notifications.length > 0 && (
                  <Button 
                    variant="link" 
                    className="mt-4"
                    onClick={() => setActiveTab("all")}
                  >
                    View all notifications
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {filteredNotifications.map((notification: any) => (
                <Card 
                  key={notification.id} 
                  className={cn(
                    "transition-all duration-200 hover:shadow-md",
                    notification.is_read && "opacity-70 bg-muted/30"
                  )}
                >
                  <CardContent className="p-4">
                    <div className="flex gap-3 md:gap-4">
                      {/* Icon */}
                      <div className="mt-0.5">
                        {getIcon(notification.type)}
                      </div>
                      
                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 mb-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-semibold text-sm md:text-base truncate">
                              {notification.title}
                            </h3>
                            <span className="hidden sm:inline-block">
                              {getTypeBadge(notification.type)}
                            </span>
                            {!notification.is_read && (
                              <span className="h-2 w-2 rounded-full bg-primary shrink-0" />
                            )}
                          </div>
                          <span className="text-xs text-muted-foreground whitespace-nowrap">
                            {formatTime(notification.created_at)}
                          </span>
                        </div>
                        
                        <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                          {notification.message}
                        </p>
                        
                        {/* Mobile type badge + action */}
                        <div className="flex items-center justify-between gap-2 sm:justify-end">
                          <span className="sm:hidden">
                            {getTypeBadge(notification.type)}
                          </span>
                          {!notification.is_read && (
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => handleMarkAsRead(notification.id)}
                              disabled={markAsRead.isPending}
                              className="h-8 text-xs"
                            >
                              <Check className="h-3.5 w-3.5 mr-1" />
                              <span className="hidden xs:inline">Mark as </span>Read
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </main>
  );
};

export default Notifications;
