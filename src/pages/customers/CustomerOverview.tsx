import { useMemo } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Users, UserCheck, Crown, Gift, UserMinus, ArrowRight, 
  TrendingUp, Heart, Sparkles, ShieldCheck
} from "lucide-react";
import { useCustomers } from "@/hooks/useCustomers";
import { useRewardsSettings } from "@/hooks/useRewardsSettings";
import { useBranchContext } from "@/contexts/BranchContext";
import { ShieldX } from "lucide-react";

const CustomerOverview = () => {
  const { data: customers = [], isLoading: customersLoading } = useCustomers();
  const { data: rewardsSettings, isLoading: rewardsLoading } = useRewardsSettings();
  const { isOwner, hasPermission, isLoading: branchLoading } = useBranchContext();

  const hasCRMView = isOwner || hasPermission('crm.view' as any);

  // Calculate insights from existing customer data
  const insights = useMemo(() => {
    if (!customers.length) {
      return {
        totalCustomers: 0,
        activeCustomers: 0,
        repeatCustomers: 0,
        highValueCustomers: 0,
        customersWithRewards: 0,
        inactiveCustomers: 0,
        totalRewardsValue: 0,
        avgSpendPerCustomer: 0,
      };
    }

    // Active customers: purchased in last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    const activeCustomers = customers.filter(c => {
      if (!c.last_purchase_at) return false;
      return new Date(c.last_purchase_at) >= thirtyDaysAgo;
    });

    // Repeat customers: more than 1 purchase (using total_purchases > average as proxy)
    const avgPurchase = customers.reduce((sum, c) => sum + (c.total_purchases || 0), 0) / (customers.length || 1);
    const repeatCustomers = customers.filter(c => (c.total_purchases || 0) > avgPurchase * 0.5 && c.last_purchase_at);

    // High-value customers: top 20% by total spend
    const sortedBySpend = [...customers].sort((a, b) => 
      (b.total_purchases || 0) - (a.total_purchases || 0)
    );
    const highValueThreshold = Math.ceil(customers.length * 0.2);
    const highValueCustomers = sortedBySpend.slice(0, highValueThreshold);

    // Customers with rewards balance
    const customersWithRewards = customers.filter(c => (c.reward_points || 0) > 0);

    // Inactive customers: no purchase in 90+ days but have purchased before
    const inactiveCustomers = customers.filter(c => {
      if (!c.last_purchase_at) return false;
      return new Date(c.last_purchase_at) < ninetyDaysAgo;
    });

    // Total rewards value
    const totalRewardsValue = customers.reduce((sum, c) => 
      sum + (c.reward_points_value || 0), 0
    );

    // Average spend
    const totalSpend = customers.reduce((sum, c) => 
      sum + (c.total_purchases || 0), 0
    );

    return {
      totalCustomers: customers.length,
      activeCustomers: activeCustomers.length,
      repeatCustomers: repeatCustomers.length,
      highValueCustomers: highValueCustomers.length,
      customersWithRewards: customersWithRewards.length,
      inactiveCustomers: inactiveCustomers.length,
      totalRewardsValue,
      avgSpendPerCustomer: customers.length > 0 ? totalSpend / customers.length : 0,
    };
  }, [customers]);

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", minimumFractionDigits: 0 }).format(amount);

  const isLoading = customersLoading || rewardsLoading || branchLoading;

  if (isLoading) {
    return (
      <main className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-6 w-96" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-40" />
          ))}
        </div>
      </main>
    );
  }

  if (!hasCRMView) {
    return (
      <main className="flex-1 overflow-y-auto p-6">
        <Card className="border-destructive/50 bg-destructive/5">
          <CardContent className="flex flex-col items-center justify-center py-12 space-y-4">
            <ShieldX className="h-12 w-12 text-destructive" />
            <h2 className="text-xl font-semibold text-destructive">Access Restricted</h2>
            <p className="text-muted-foreground text-center max-w-md">
              You don't have permission to access Customer Value & Retention. Contact your administrator to request access.
            </p>
          </CardContent>
        </Card>
      </main>
    );
  }

  const insightCards = [
    {
      title: "Active Customers",
      description: "Purchased in the last 30 days",
      value: insights.activeCustomers,
      icon: UserCheck,
      color: "text-emerald-600",
      bgColor: "bg-emerald-50 dark:bg-emerald-950/20",
      link: "/dashboard/customers/activity",
    },
    {
      title: "Repeat Customers",
      description: "Made more than one purchase",
      value: insights.repeatCustomers,
      icon: Heart,
      color: "text-rose-600",
      bgColor: "bg-rose-50 dark:bg-rose-950/20",
      link: "/dashboard/customers/activity",
      badge: insights.totalCustomers > 0 
        ? `${Math.round((insights.repeatCustomers / insights.totalCustomers) * 100)}%` 
        : null,
    },
    {
      title: "High-Value Customers",
      description: "Top 20% by lifetime spend",
      value: insights.highValueCustomers,
      icon: Crown,
      color: "text-amber-600",
      bgColor: "bg-amber-50 dark:bg-amber-950/20",
      link: "/dashboard/customers/activity",
    },
    {
      title: "Rewarded Customers",
      description: "Customers with loyalty balance",
      value: insights.customersWithRewards,
      icon: Gift,
      color: "text-purple-600",
      bgColor: "bg-purple-50 dark:bg-purple-950/20",
      link: "/dashboard/customers/loyalty",
      badge: formatCurrency(insights.totalRewardsValue),
    },
    {
      title: "At-Risk Customers",
      description: "No purchase in 90+ days",
      value: insights.inactiveCustomers,
      icon: UserMinus,
      color: "text-orange-600",
      bgColor: "bg-orange-50 dark:bg-orange-950/20",
      link: "/dashboard/customers/activity",
    },
    {
      title: "Total Customers",
      description: "All registered customers",
      value: insights.totalCustomers,
      icon: Users,
      color: "text-blue-600",
      bgColor: "bg-blue-50 dark:bg-blue-950/20",
      link: "/dashboard/customers/activity",
    },
  ];

  return (
    <main className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Customer Value & Retention</h1>
          <p className="text-muted-foreground text-sm md:text-base">
            Understand, nurture, and grow your customer relationships
          </p>
        </div>
        <Button asChild variant="outline">
          <Link to="/dashboard/customers/activity">
            View All Customers
            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
      </div>

      {/* Loyalty Status Card */}
      <Card className="border-primary/20 bg-gradient-to-r from-primary/5 to-transparent">
        <CardContent className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 py-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Sparkles className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold">Loyalty Program</h3>
              <p className="text-sm text-muted-foreground">
                {rewardsSettings?.is_enabled 
                  ? `Active • ${insights.customersWithRewards} customers earning loyalty value`
                  : "Enable your loyalty program to boost retention"
                }
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={rewardsSettings?.is_enabled ? "default" : "secondary"}>
              {rewardsSettings?.is_enabled ? "Active" : "Inactive"}
            </Badge>
            <Button asChild variant="ghost" size="sm">
              <Link to="/dashboard/customers/loyalty">
                Manage
                <ArrowRight className="ml-1 h-3 w-3" />
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Insight Cards Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {insightCards.map((card) => (
          <Link key={card.title} to={card.link}>
            <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div className={`p-2 rounded-lg ${card.bgColor}`}>
                    <card.icon className={`h-5 w-5 ${card.color}`} />
                  </div>
                  {card.badge && (
                    <Badge variant="secondary" className="text-xs">
                      {card.badge}
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-1">
                  <p className="text-3xl font-bold">{card.value.toLocaleString()}</p>
                  <h3 className="font-medium">{card.title}</h3>
                  <p className="text-sm text-muted-foreground">{card.description}</p>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Retention Actions
          </CardTitle>
          <CardDescription>
            Quick actions to improve customer value and loyalty
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Button asChild variant="outline" className="justify-start h-auto py-3">
              <Link to="/dashboard/customers/activity?action=add">
                <Users className="mr-2 h-4 w-4" />
                <div className="text-left">
                  <div className="font-medium">Add Customer</div>
                  <div className="text-xs text-muted-foreground">Register new customer</div>
                </div>
              </Link>
            </Button>
            <Button asChild variant="outline" className="justify-start h-auto py-3">
              <Link to="/dashboard/customers/groups">
                <ShieldCheck className="mr-2 h-4 w-4" />
                <div className="text-left">
                  <div className="font-medium">Manage Groups</div>
                  <div className="text-xs text-muted-foreground">Organize customers</div>
                </div>
              </Link>
            </Button>
            <Button asChild variant="outline" className="justify-start h-auto py-3">
              <Link to="/dashboard/customers/loyalty">
                <Gift className="mr-2 h-4 w-4" />
                <div className="text-left">
                  <div className="font-medium">Loyalty Settings</div>
                  <div className="text-xs text-muted-foreground">Configure earning rules</div>
                </div>
              </Link>
            </Button>
            <Button asChild variant="outline" className="justify-start h-auto py-3">
              <Link to="/dashboard/customers/activity">
                <Heart className="mr-2 h-4 w-4" />
                <div className="text-left">
                  <div className="font-medium">View Activity</div>
                  <div className="text-xs text-muted-foreground">Customer purchases</div>
                </div>
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </main>
  );
};

export default CustomerOverview;
