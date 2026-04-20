import { useState } from "react";
import { useBusiness } from "@/hooks/useBusiness";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useSubscriptionPlans, fetchSubscriptionPlans, type SubscriptionPlan, type BillingPeriod } from "@/hooks/useSubscriptionPlans";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { format } from "date-fns";
import { 
  Loader2, 
  Check,
  AlertTriangle,
  CreditCard,
  Calendar,
  ArrowUpRight,
  Building2,
  Users
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export function SubscriptionSettings() {
  const { data: business, isLoading: businessLoading } = useBusiness();
  const queryClient = useQueryClient();
  const { data: plans = [], isLoading: plansLoading } = useSubscriptionPlans();
  const [isUpgrading, setIsUpgrading] = useState<string | null>(null);
  const [isCancelling, setIsCancelling] = useState(false);
  const [billingPeriod, setBillingPeriod] = useState<BillingPeriod>("monthly");

  const { data: subscription, isLoading: subscriptionLoading } = useQuery({
    queryKey: ["subscription", business?.id],
    queryFn: async () => {
      if (!business?.id) return null;
      
      const { data, error } = await supabase
        .from("subscriptions")
        .select("*")
        .eq("business_id", business.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!business?.id,
  });

  // Use plan directly - no more starter/free mapping needed
  const currentPlan = plans.find(p => p.id === subscription?.plan) || plans[0];
  const isActive = subscription?.status === "active";
  const isFree = currentPlan?.id === "free" || currentPlan?.monthlyPrice === 0;
  const isCancelled = subscription?.status === "cancelled";
  const isExpired = subscription?.status === "expired";

  // Check if within 24-hour grace period after cancellation expiry
  const getGracePeriodStatus = () => {
    if (!subscription?.end_date) return { inGracePeriod: false, hoursRemaining: 0 };
    
    const endDate = new Date(subscription.end_date);
    const now = new Date();
    const gracePeriodEnd = new Date(endDate.getTime() + 24 * 60 * 60 * 1000); // 24 hours after end_date
    
    if (now > endDate && now <= gracePeriodEnd) {
      const hoursRemaining = Math.ceil((gracePeriodEnd.getTime() - now.getTime()) / (1000 * 60 * 60));
      return { inGracePeriod: true, hoursRemaining };
    }
    
    return { inGracePeriod: false, hoursRemaining: 0 };
  };

  const gracePeriodStatus = getGracePeriodStatus();
  const canDowngrade = isExpired || (isCancelled && gracePeriodStatus.inGracePeriod);
  // Free plan users can ALWAYS upgrade - they may have no subscription record
  const canUpgrade = isFree || isExpired || isActive || (isCancelled && !gracePeriodStatus.inGracePeriod);

  const getPrice = (plan: SubscriptionPlan) => {
    return billingPeriod === "monthly" ? plan.monthlyPrice : plan.yearlyPrice;
  };

  const getPriceLabel = (plan: SubscriptionPlan) => {
    if (plan.monthlyPrice === 0) return "Free";
    const price = getPrice(plan);
    const period = billingPeriod === "monthly" ? "/mo" : "/yr";
    return `₦${price.toLocaleString()}${period}`;
  };

  const getYearlySavings = (plan: SubscriptionPlan) => {
    if (plan.monthlyPrice === 0) return 0;
    const monthlyTotal = plan.monthlyPrice * 12;
    return monthlyTotal - plan.yearlyPrice;
  };

  const handleUpgrade = async (plan: SubscriptionPlan) => {
    if (!business) {
      toast.error("Business not found");
      return;
    }

    if (plan.id === currentPlan?.id) {
      toast.info("You are already on this plan");
      return;
    }

    setIsUpgrading(plan.id);

    try {
      // Fetch real-time plan data from super admin
      const freshPlans = await fetchSubscriptionPlans();
      const freshPlan = freshPlans.find(p => p.id === plan.id);
      
      if (!freshPlan) {
        throw new Error("Plan not found. Please refresh and try again.");
      }

      const isDowngrade = (currentPlan?.monthlyPrice || 0) > freshPlan.monthlyPrice;

      // Validate based on subscription state
      if (isDowngrade) {
        if (!canDowngrade) {
          if (isCancelled && !gracePeriodStatus.inGracePeriod) {
            toast.error("Downgrade window has expired. You can only upgrade now.");
          } else {
            toast.error("Downgrade is not available for your current subscription status.");
          }
          return;
        }
      } else {
        if (!canUpgrade && !isDowngrade) {
          toast.error("Upgrade is not available at this time.");
          return;
        }
      }

      // Use fresh plan data for accurate pricing
      const amount = billingPeriod === "monthly" ? freshPlan.monthlyPrice : freshPlan.yearlyPrice;

      const { data, error } = await supabase.functions.invoke("paystack", {
        body: {
          action: "initialize",
          email: business.owner_email,
          amount: amount,
          plan: freshPlan.id,
          businessId: business.id,
          billingPeriod: billingPeriod,
          metadata: {
            monthly_price: freshPlan.monthlyPrice,
            yearly_price: freshPlan.yearlyPrice,
          },
        },
      });

      if (error) throw error;

      if (data?.data?.authorization_url) {
        window.location.href = data.data.authorization_url;
      } else {
        throw new Error("Failed to get payment URL");
      }
    } catch (error: any) {
      console.error("Upgrade error:", error);
      toast.error(error.message || "Failed to initiate upgrade");
    } finally {
      setIsUpgrading(null);
    }
  };

  const handleCancelSubscription = async () => {
    if (!business) return;

    setIsCancelling(true);

    try {
      const { data, error } = await supabase.functions.invoke("paystack", {
        body: {
          action: "cancel",
          businessId: business.id,
        },
      });

      if (error) throw error;

      toast.success(data.message || "Subscription cancelled");
      queryClient.invalidateQueries({ queryKey: ["subscription"] });
    } catch (error: any) {
      console.error("Cancel error:", error);
      toast.error(error.message || "Failed to cancel subscription");
    } finally {
      setIsCancelling(false);
    }
  };

  if (businessLoading || subscriptionLoading || plansLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Current Plan Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Current Subscription
          </CardTitle>
          <CardDescription>
            Manage your subscription and billing
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-lg bg-muted/50">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-full bg-primary/10 text-primary">
                {currentPlan?.icon}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-lg">{currentPlan?.name} Plan</h3>
                  {isFree && <Badge variant="secondary">Free</Badge>}
                  {isActive && !isFree && <Badge className="bg-green-500">Active</Badge>}
                  {isCancelled && <Badge variant="destructive">Cancelled</Badge>}
                </div>
                <p className="text-muted-foreground">
                  {currentPlan?.monthlyPrice === 0 
                    ? "Free for 30 days" 
                    : `₦${currentPlan?.monthlyPrice.toLocaleString()}/month`}
                </p>
              </div>
            </div>
            
            {subscription?.end_date && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Calendar className="h-4 w-4" />
                <span>
                  {isCancelled ? "Expires" : "Renews"}: {format(new Date(subscription.end_date), "MMM d, yyyy")}
                </span>
              </div>
            )}
          </div>

          {isCancelled && (
            <div className="flex items-center gap-2 p-4 rounded-lg bg-yellow-500/10 text-yellow-700 dark:text-yellow-400">
              <AlertTriangle className="h-5 w-5 shrink-0" />
              <p className="text-sm">
                Your subscription has been cancelled. 
                {gracePeriodStatus.inGracePeriod 
                  ? ` You have ${gracePeriodStatus.hoursRemaining} hour${gracePeriodStatus.hoursRemaining !== 1 ? 's' : ''} remaining to downgrade to a lower plan.`
                  : " You can now upgrade to a new plan."}
              </p>
            </div>
          )}

          {isExpired && (
            <div className="flex items-center gap-2 p-4 rounded-lg bg-red-500/10 text-red-700 dark:text-red-400">
              <AlertTriangle className="h-5 w-5 shrink-0" />
              <p className="text-sm">
                Your subscription has expired. You can upgrade or downgrade to any plan.
              </p>
            </div>
          )}

          {/* Current Plan Features */}
          <div>
            <h4 className="font-medium mb-2">Current Plan Features</h4>
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {currentPlan?.features.map((feature, index) => (
                <li key={index} className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Check className="h-4 w-4 text-green-500 shrink-0" />
                  {feature}
                </li>
              ))}
            </ul>
          </div>

          {/* Actions */}
          {isActive && !isCancelled && currentPlan?.monthlyPrice > 0 && (
            <div className="pt-4 border-t">
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" className="text-destructive hover:text-destructive">
                    Cancel Subscription
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Cancel Subscription?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Are you sure you want to cancel your subscription? You will retain access to your current features until the end of your billing period.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Keep Subscription</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleCancelSubscription}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      disabled={isCancelling}
                    >
                      {isCancelling ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Cancelling...
                        </>
                      ) : (
                        "Yes, Cancel"
                      )}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Upgrade Plans */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <CardTitle>Upgrade Your Plan</CardTitle>
              <CardDescription>
                Choose the plan that best fits your business needs
              </CardDescription>
            </div>
            
            {/* Billing Period Toggle */}
            <div className="flex items-center gap-2 p-1 bg-muted rounded-lg">
              <button
                onClick={() => setBillingPeriod("monthly")}
                className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                  billingPeriod === "monthly"
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Monthly
              </button>
              <button
                onClick={() => setBillingPeriod("yearly")}
                className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                  billingPeriod === "yearly"
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Yearly
                <Badge variant="secondary" className="ml-2 text-xs">Save up to 17%</Badge>
              </button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {plans.map((plan) => {
              const isCurrent = plan.id === currentPlan?.id;
              const isDowngrade = (currentPlan?.monthlyPrice || 0) > plan.monthlyPrice;
              const savings = getYearlySavings(plan);

              return (
                <div
                  key={plan.id}
                  className={`p-6 rounded-lg border transition-all ${
                    isCurrent 
                      ? "border-primary bg-primary/5 ring-2 ring-primary/20" 
                      : "border-border hover:border-primary/50"
                  }`}
                >
                  <div className="flex items-center gap-3 mb-4">
                    <div className={`p-2 rounded-full ${isCurrent ? "bg-primary/20 text-primary" : "bg-muted"}`}>
                      {plan.icon}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-semibold">{plan.name}</h4>
                        {isCurrent && <Badge variant="outline" className="text-xs">Current</Badge>}
                      </div>
                    </div>
                  </div>

                  <div className="mb-4">
                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl font-bold">
                        {plan.monthlyPrice === 0 ? "Free" : `₦${getPrice(plan).toLocaleString()}`}
                      </span>
                      {plan.monthlyPrice > 0 && (
                        <span className="text-muted-foreground text-sm">
                          /{billingPeriod === "monthly" ? "mo" : "yr"}
                        </span>
                      )}
                    </div>
                    {billingPeriod === "yearly" && savings > 0 && (
                      <p className="text-sm text-green-600 dark:text-green-400 mt-1">
                        Save ₦{savings.toLocaleString()} per year
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-4 mb-4 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Building2 className="h-4 w-4" />
                      {plan.maxBranches} branch{plan.maxBranches > 1 ? 'es' : ''}
                    </span>
                    <span className="flex items-center gap-1">
                      <Users className="h-4 w-4" />
                      {plan.maxStaff} staff
                    </span>
                  </div>

                  <ul className="space-y-2 mb-6">
                    {plan.features.map((feature, index) => (
                      <li key={index} className="flex items-start gap-2 text-sm">
                        <Check className="h-4 w-4 text-green-500 shrink-0 mt-0.5" />
                        <span className="text-muted-foreground">{feature}</span>
                      </li>
                    ))}
                  </ul>

                  <Button
                    variant={isCurrent ? "outline" : isDowngrade ? "secondary" : "default"}
                    className="w-full"
                    disabled={
                      isCurrent || 
                      isUpgrading !== null || 
                      (isDowngrade && !canDowngrade) ||
                      (!isDowngrade && !canUpgrade && !isCurrent)
                    }
                    onClick={() => handleUpgrade(plan)}
                  >
                    {isUpgrading === plan.id ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Processing...
                      </>
                    ) : isCurrent ? (
                      "Current Plan"
                    ) : isDowngrade ? (
                      canDowngrade ? (
                        "Downgrade"
                      ) : (
                        "Downgrade N/A"
                      )
                    ) : (
                      <>
                        Upgrade <ArrowUpRight className="ml-1 h-4 w-4" />
                      </>
                    )}
                  </Button>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
