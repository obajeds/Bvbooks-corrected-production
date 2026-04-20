import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Gift, Settings, TrendingUp, Users, ShieldX, Heart } from "lucide-react";
import { RewardsSettingsPanel } from "@/components/crm/RewardsSettingsPanel";
import { useCustomers } from "@/hooks/useCustomers";
import { useRewardsSettings } from "@/hooks/useRewardsSettings";
import { useBranchContext } from "@/contexts/BranchContext";
import { useBusinessPlan } from "@/hooks/useFeatureGating";
import { UpgradeRequired } from "@/components/subscription/UpgradeRequired";

const CustomerLoyalty = () => {
  const { data: customers = [], isLoading: customersLoading } = useCustomers();
  const { data: rewardsSettings, isLoading: rewardsLoading } = useRewardsSettings();
  const { isOwner, hasPermission, isLoading: branchLoading } = useBranchContext();
  const { data: planInfo, isLoading: planLoading } = useBusinessPlan();

  const hasCRMView = isOwner || hasPermission('crm.view' as any);
  const canManageRewards = isOwner || hasPermission('settings.rewards.manage' as any);

  // Calculate loyalty insights
  const loyaltyInsights = useMemo(() => {
    const customersWithPoints = customers.filter(c => (c.reward_points || 0) > 0);
    const totalPointsValue = customers.reduce((sum, c) => sum + (c.reward_points_value || 0), 0);
    const totalPoints = customers.reduce((sum, c) => sum + (c.reward_points || 0), 0);

    // Sort by points for top customers
    const topCustomers = [...customersWithPoints]
      .sort((a, b) => (b.reward_points || 0) - (a.reward_points || 0))
      .slice(0, 10);

    return {
      customersWithPoints: customersWithPoints.length,
      totalPointsValue,
      totalPoints,
      topCustomers,
      avgPointsPerCustomer: customersWithPoints.length > 0 
        ? Math.round(totalPoints / customersWithPoints.length) 
        : 0,
    };
  }, [customers]);

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", minimumFractionDigits: 0 }).format(amount);

  const isLoading = customersLoading || rewardsLoading || branchLoading || planLoading;

  if (isLoading) {
    return (
      <main className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-6 w-72" />
        <Skeleton className="h-96 w-full" />
      </main>
    );
  }

  // Gate for Free plan users
  if (planInfo?.effectivePlan === 'free') {
    return <UpgradeRequired featureKey="customers.rewards" requiredPlan="professional" />;
  }

  if (!hasCRMView) {
    return (
      <main className="flex-1 overflow-y-auto p-6">
        <Card className="border-destructive/50 bg-destructive/5">
          <CardContent className="flex flex-col items-center justify-center py-12 space-y-4">
            <ShieldX className="h-12 w-12 text-destructive" />
            <h2 className="text-xl font-semibold text-destructive">Access Restricted</h2>
            <p className="text-muted-foreground text-center max-w-md">
              You don't have permission to access Loyalty & Retention. Contact your administrator to request access.
            </p>
          </CardContent>
        </Card>
      </main>
    );
  }

  return (
    <main className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Rewards & Loyalty</h1>
          <p className="text-muted-foreground text-sm md:text-base">
            Build lasting customer relationships through strategic loyalty value
          </p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-50 dark:bg-purple-950/20">
                <Gift className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{loyaltyInsights.customersWithPoints}</p>
                <p className="text-sm text-muted-foreground">Rewarded Customers</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/20">
                <TrendingUp className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{formatCurrency(loyaltyInsights.totalPointsValue)}</p>
                <p className="text-sm text-muted-foreground">Total Loyalty Value</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-950/20">
                <Heart className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{loyaltyInsights.totalPoints.toLocaleString()}</p>
                <p className="text-sm text-muted-foreground">Total Points Earned</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-50 dark:bg-amber-950/20">
                <Users className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{loyaltyInsights.avgPointsPerCustomer.toLocaleString()}</p>
                <p className="text-sm text-muted-foreground">Avg Points/Customer</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="balances" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="balances" className="flex items-center gap-2">
            <Gift className="h-4 w-4" />
            <span className="hidden sm:inline">Loyalty Balances</span>
            <span className="sm:hidden">Balances</span>
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            <span className="hidden sm:inline">Earning Rules</span>
            <span className="sm:hidden">Rules</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="balances" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Heart className="h-5 w-5" />
                Top Rewarded Customers
              </CardTitle>
              <CardDescription>
                Customers with the highest loyalty value — your most engaged buyers
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loyaltyInsights.topCustomers.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Gift className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No customers have earned loyalty points yet.</p>
                  <p className="text-sm mt-2">Points are automatically earned on purchases.</p>
                </div>
              ) : (
                <>
                  {/* Desktop Table */}
                  <div className="hidden md:block">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Customer</TableHead>
                          <TableHead>Phone</TableHead>
                          <TableHead className="text-right">Loyalty Points</TableHead>
                          <TableHead className="text-right">Loyalty Value</TableHead>
                          <TableHead className="text-right">Total Spend</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {loyaltyInsights.topCustomers.map((customer, index) => (
                          <TableRow key={customer.id}>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                {index < 3 && (
                                  <Badge variant="outline" className="text-xs">
                                    #{index + 1}
                                  </Badge>
                                )}
                                <span className="font-medium">{customer.name}</span>
                              </div>
                            </TableCell>
                            <TableCell>{customer.phone || "-"}</TableCell>
                            <TableCell className="text-right font-medium">
                              {(customer.reward_points || 0).toLocaleString()}
                            </TableCell>
                            <TableCell className="text-right text-primary font-medium">
                              {formatCurrency(customer.reward_points_value || 0)}
                            </TableCell>
                            <TableCell className="text-right">
                              {formatCurrency(customer.total_purchases || 0)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>

                  {/* Mobile Cards */}
                  <div className="md:hidden divide-y">
                    {loyaltyInsights.topCustomers.map((customer, index) => (
                      <div key={customer.id} className="py-3 space-y-1">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {index < 3 && (
                              <Badge variant="outline" className="text-xs">
                                #{index + 1}
                              </Badge>
                            )}
                            <span className="font-medium">{customer.name}</span>
                          </div>
                          <span className="text-primary font-medium">
                            {formatCurrency(customer.reward_points_value || 0)}
                          </span>
                        </div>
                        <div className="flex justify-between text-sm text-muted-foreground">
                          <span>{(customer.reward_points || 0).toLocaleString()} points</span>
                          <span>Spent: {formatCurrency(customer.total_purchases || 0)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings">
          <RewardsSettingsPanel canManage={canManageRewards} />
        </TabsContent>
      </Tabs>
    </main>
  );
};

export default CustomerLoyalty;
