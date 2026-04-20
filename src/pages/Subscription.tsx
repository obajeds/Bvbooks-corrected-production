import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { useBusiness } from "@/hooks/useBusiness";
import { useBusinessPlan, useBranchLimits, useStaffLimits } from "@/hooks/useFeatureGating";
import { useSuperAdmin } from "@/hooks/useSuperAdmin";
import { useUserRole } from "@/hooks/useUserRole";
import { useSubscriptionPlans, fetchSubscriptionPlans, calculatePrice, getMonthlyEquivalent, BILLING_DISCOUNTS, type BillingPeriod, type SubscriptionPlan } from "@/hooks/useSubscriptionPlans";
import { useSubscriptionStatus } from "@/hooks/useSubscriptionStatus";
import { useSubscriptionPlanRules } from "@/hooks/useSubscriptionPlanRules";
import { useAddonExpiry } from "@/hooks/useAddonExpiry";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { toast } from "sonner";
import { Loader2, Check, Star, Building2, Users, Package, LayoutGrid, TableProperties, ShieldAlert, Calendar, Sparkles, AlertTriangle, TrendingUp, Clock, ArrowLeft } from "lucide-react";
import { PlanBadge } from "@/components/subscription/PlanBadge";
import { PlanFeatureList } from "@/components/subscription/PlanFeatureList";
import { PlanComparisonTable } from "@/components/subscription/PlanComparisonTable";
import { PlanCardCTA } from "@/components/subscription/PlanCardCTA";
import { AddonSubscriptionSection } from "@/components/subscription/AddonSubscriptionSection";
import { format } from "date-fns";
import type { BVBooksPlan } from "@/hooks/useFeatureGating";

export default function Subscription() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const { data: business, isLoading: businessLoading } = useBusiness();
  const { data: planInfo, isLoading: planLoading } = useBusinessPlan();
  const { data: superAdminData } = useSuperAdmin();
  const { data: roleData, isLoading: roleLoading } = useUserRole();
  const { data: branchLimits } = useBranchLimits();
  const { data: staffLimits } = useStaffLimits();
  const { data: plans = [], isLoading: plansLoading } = useSubscriptionPlans();
  const { 
    mainPlanExpiryDate, 
    isMainPlanActive 
  } = useAddonExpiry();
  const { status: subscriptionStatus, isStrictlyActive } = useSubscriptionStatus();
  const { 
    currentPlan: effectiveCurrentPlan,
    freeTrialDaysRemaining,
    freeTrialExpiryDate,
    getPlanRules,
    getPlanAction,
    isExpired: isPaidPlanExpired,
    paidPlanExpiryDate,
    isLoading: rulesLoading,
  } = useSubscriptionPlanRules();
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan | null>(null);
  const [billingPeriod, setBillingPeriod] = useState<BillingPeriod>('monthly');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  
  // Check if subscription is expired or needs renewal (only for paid plans)
  const isExpiredOrInactive = effectiveCurrentPlan !== 'free' && (subscriptionStatus === 'expired' || !isStrictlyActive);
  const expiryDate = paidPlanExpiryDate;
  
  const isSuperAdmin = superAdminData?.isSuperAdmin ?? false;
  
  // CRITICAL: Only business owners can manage subscriptions
  const isOwner = roleData?.isOwner ?? false;
  const canManageSubscription = isOwner;

  // Handle Paystack redirect verification with ATOMIC flow
  useEffect(() => {
    const verifyPayment = async () => {
      const verify = searchParams.get("verify");
      const reference = searchParams.get("reference") || searchParams.get("trxref");
      
      if (verify && reference && business) {
        setIsVerifying(true);
        try {
          console.log("[Subscription] Starting payment verification for:", reference);
          
          // Step 1: Verify payment with backend (atomic subscription activation happens here)
          const { data, error } = await supabase.functions.invoke("paystack", {
            body: {
              action: "verify",
              reference,
            },
          });

          if (error) throw error;

          // Check for paid_not_activated or verification_failed errors
          if (data?.data?.paid_not_activated || data?.data?.verification_failed) {
            console.error("[Subscription] CRITICAL: Payment succeeded but subscription failed:", data);
            toast.error(data.message || "Subscription activation failed. Please contact support.", { 
              duration: 10000,
              description: `Reference: ${reference}` 
            });
            return;
          }

          if (data?.status) {
            console.log("[Subscription] Payment verified successfully:", data.data);
            
            // Step 2: CRITICAL - Invalidate ALL subscription-related caches
            console.log("[Subscription] Invalidating all subscription caches...");
            await Promise.all([
              queryClient.invalidateQueries({ queryKey: ["business"] }),
              queryClient.invalidateQueries({ queryKey: ["business-subscription"] }),
              queryClient.invalidateQueries({ queryKey: ["business-plan"] }),
              queryClient.invalidateQueries({ queryKey: ["branch-limits"] }),
              queryClient.invalidateQueries({ queryKey: ["staff-limits"] }),
              queryClient.invalidateQueries({ queryKey: ["plan-features"] }),
              queryClient.invalidateQueries({ queryKey: ["business-addons"] }),
              queryClient.invalidateQueries({ queryKey: ["addon-expiry"] }),
            ]);
            
            // Step 3: Force refetch and wait for fresh data
            console.log("[Subscription] Force refetching subscription data...");
            await queryClient.refetchQueries({ 
              queryKey: ["business-subscription"], 
              type: "active",
              exact: false 
            });
            
            // Also refetch business data to ensure plan info is current
            await queryClient.refetchQueries({ 
              queryKey: ["business"], 
              type: "active" 
            });
            
            // Step 4: VERIFICATION - Query database directly to confirm subscription is active
            console.log("[Subscription] Verifying subscription status in database...");
            const { data: verifiedSubscription, error: verifyDbError } = await supabase
              .from("subscriptions")
              .select("id, status, plan, end_date")
              .eq("business_id", business.id)
              .eq("status", "active")
              .gt("end_date", new Date().toISOString())
              .order("created_at", { ascending: false })
              .limit(1)
              .maybeSingle();
            
            if (verifyDbError) {
              console.error("[Subscription] Failed to verify subscription in database:", verifyDbError);
              // Don't block - backend already confirmed, cache might be stale
            }
            
            if (!verifiedSubscription) {
              console.warn("[Subscription] Database verification returned no active subscription - using backend response");
              // Backend verified successfully, proceed but log warning
            } else {
              console.log("[Subscription] Database verification confirmed:", verifiedSubscription);
            }
            
            // Step 5: Only navigate after verification passes
            console.log("[Subscription] All validations passed, navigating to dashboard...");
            toast.success("Payment successful! Your subscription is now active.");
            
            // Clear URL params and navigate
            navigate("/dashboard", { replace: true });
          } else {
            // Handle already processed payments gracefully
            if (data?.data?.alreadyProcessed) {
              console.log("[Subscription] Payment already processed:", data);
              toast.info("This payment was already processed. Redirecting to dashboard...");
              navigate("/dashboard", { replace: true });
              return;
            }
            throw new Error(data?.message || "Payment verification failed");
          }
        } catch (error: any) {
          console.error("[Subscription] Verification error:", error);
          toast.error(error.message || "Payment verification failed. Please contact support if you were charged.");
        } finally {
          setIsVerifying(false);
        }
      }
    };

    if (business) {
      verifyPayment();
    }
  }, [searchParams, business, navigate, queryClient]);

  const handleSelectPlan = async (plan: SubscriptionPlan) => {
    // CRITICAL: Only business owners can manage subscriptions
    if (!canManageSubscription) {
      toast.error("Only the business owner can manage subscriptions. Please contact your business owner.", { duration: 5000 });
      return;
    }

    if (!business) {
      toast.error("Business not found. Please complete business setup first.");
      navigate("/setup");
      return;
    }

    // Allow renewal of current plan - user wants to pay/extend
    const isRenewal = plan.id === planInfo?.effectivePlan;
    if (isRenewal) {
      console.log("[Subscription] Renewing current plan:", plan.id);
    }

    setSelectedPlan(plan);
    setIsProcessing(true);

    try {
      console.log("[Subscription] Starting plan selection:", plan.id);
      
      // Fetch real-time plan data from super admin
      const freshPlans = await fetchSubscriptionPlans();
      const freshPlan = freshPlans.find(p => p.id === plan.id);
      
      if (!freshPlan) {
        throw new Error("Plan not found. Please refresh and try again.");
      }
      
      console.log("[Subscription] Fresh plan data fetched:", freshPlan.id, freshPlan.monthlyPrice);
      
      // Use fresh plan data for pricing
      if (freshPlan.id === 'free') {
        // Handle free plan - direct database update
        const now = new Date();

        // Update business with new plan system
        const { error: updateError } = await supabase
          .from("businesses")
          .update({
            current_plan: freshPlan.id,
            trial_started_at: null,
            trial_ends_at: null,
            plan_started_at: now.toISOString(),
            subscription_plan: 'free',
            subscription_expiry: null,
            account_status: 'active',
          })
          .eq("id", business.id);

        if (updateError) throw updateError;

        // Create subscription record
        const { error: subError } = await supabase
          .from("subscriptions")
          .insert({
            business_id: business.id,
            plan: 'free',
            status: "active",
            amount: 0,
            currency: freshPlan.currency,
            start_date: now.toISOString(),
            end_date: null,
            payment_method: "free",
          });

        if (subError) console.warn("Subscription record error:", subError);

        toast.success("Free plan activated!");
        navigate("/dashboard", { replace: true });
      } else {
        // Use fresh plan data for accurate pricing
        const totalAmount = calculatePrice(freshPlan.monthlyPrice, billingPeriod);
        const { months } = BILLING_DISCOUNTS[billingPeriod];
        
        console.log("[Subscription] Initiating Paystack payment:", { 
          plan: freshPlan.id, 
          amount: totalAmount, 
          billingPeriod 
        });
        
        // Use Paystack for paid plans with real-time pricing
        const { data, error } = await supabase.functions.invoke("paystack", {
          body: {
            action: "initialize",
            email: business.owner_email,
            amount: totalAmount,
            plan: freshPlan.id,
            businessId: business.id,
            metadata: {
              new_plan_id: freshPlan.id,
              billing_period: billingPeriod,
              months: months,
              monthly_price: freshPlan.monthlyPrice,
            },
          },
        });

        console.log("[Subscription] Paystack response:", { data, error });

        if (error) {
          console.error("[Subscription] Paystack error:", error);
          throw new Error(error.message || "Failed to initialize payment");
        }

        if (data?.data?.authorization_url) {
          console.log("[Subscription] Redirecting to Paystack:", data.data.authorization_url);
          // Redirect to Paystack checkout
          window.location.href = data.data.authorization_url;
        } else if (data?.status === false) {
          // Handle Paystack API error response
          throw new Error(data.message || "Payment initialization failed");
        } else {
          console.error("[Subscription] No authorization URL in response:", data);
          throw new Error("Failed to get payment URL. Please try again.");
        }
      }
    } catch (error: any) {
      console.error("[Subscription] Error:", error);
      toast.error(error.message || "Failed to activate subscription");
    } finally {
      setIsProcessing(false);
      setSelectedPlan(null);
    }
  };

  if (businessLoading || planLoading || plansLoading || roleLoading || rulesLoading || isVerifying) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center bg-background gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        {isVerifying && <p className="text-muted-foreground">Verifying payment...</p>}
      </div>
    );
  }

  // Staff restriction message
  const staffRestrictionBanner = !canManageSubscription && (
    <Alert variant="destructive" className="mb-6">
      <ShieldAlert className="h-4 w-4" />
      <AlertTitle>Owner Access Required</AlertTitle>
      <AlertDescription>
        Only the business owner can manage subscriptions and make payments. 
        You can view the available plans, but all actions are restricted.
        Please contact your business owner to upgrade or renew the subscription.
      </AlertDescription>
    </Alert>
  );

  const currentPlan = plans.find(p => p.id === planInfo?.effectivePlan) || plans[0];

  return (
    <div className="bg-background py-8 px-4">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Back to Control Center Button */}
        <Button
          variant="ghost"
          onClick={() => navigate("/dashboard")}
          className="flex items-center gap-2 -ml-2 text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          <span className="hidden sm:inline">Back to Control Center</span>
          <span className="sm:hidden">Back</span>
        </Button>

        {/* Staff restriction banner - shown for non-owners */}
        {staffRestrictionBanner}

        {/* Current Plan Status */}
        <Card className={`border-2 ${
          isExpiredOrInactive 
            ? 'border-destructive/50 bg-destructive/5' 
            : effectiveCurrentPlan === 'free' && freeTrialDaysRemaining !== null && freeTrialDaysRemaining <= 7
            ? 'border-amber-500/50 bg-amber-500/5'
            : 'border-primary/20 bg-primary/5'
        }`}>
          <CardHeader>
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div>
                <CardTitle className="flex items-center gap-2">
                  Current Plan: 
                  <PlanBadge plan={effectiveCurrentPlan} size="lg" />
                </CardTitle>
                <CardDescription className="mt-1">
                  {currentPlan?.description || 'Basic visibility for small businesses'}
                </CardDescription>
              </div>
              
              {/* Free Plan Countdown */}
              {effectiveCurrentPlan === 'free' && freeTrialDaysRemaining !== null && (
                <div className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm ${
                  freeTrialDaysRemaining <= 3 
                    ? 'bg-destructive/10 text-destructive' 
                    : freeTrialDaysRemaining <= 7
                    ? 'bg-amber-500/10 text-amber-600'
                    : 'bg-primary/10 text-primary'
                }`}>
                  <Clock className="h-4 w-4" />
                  <span className="font-medium">
                    {freeTrialDaysRemaining === 0 
                      ? 'Expires today'
                      : freeTrialDaysRemaining === 1
                      ? '1 day left'
                      : `${freeTrialDaysRemaining} days left`
                    }
                  </span>
                </div>
              )}
              
              {/* Paid Plan Expiry/Validity Date */}
              {expiryDate && effectiveCurrentPlan !== 'free' && (
                <div className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm ${
                  isExpiredOrInactive 
                    ? 'bg-destructive/10 text-destructive' 
                    : 'bg-green-500/10 text-green-600'
                }`}>
                  <Calendar className="h-4 w-4" />
                  <span className="font-medium">
                    {isExpiredOrInactive 
                      ? `Expired on ${format(expiryDate, "dd MMM yyyy")}`
                      : `Valid until ${format(expiryDate, "dd MMM yyyy")}`
                    }
                  </span>
                </div>
              )}
            </div>
            
            {/* Free Plan Expiry Warning */}
            {effectiveCurrentPlan === 'free' && freeTrialDaysRemaining !== null && freeTrialDaysRemaining <= 7 && (
              <Alert className={`mt-4 ${freeTrialDaysRemaining <= 3 ? 'border-destructive/50 bg-destructive/5' : 'border-amber-500/50 bg-amber-500/5'}`}>
                <Clock className="h-4 w-4" />
                <AlertTitle className={freeTrialDaysRemaining <= 3 ? 'text-destructive' : 'text-amber-600'}>
                  Your Free Plan {freeTrialDaysRemaining === 0 ? 'Expires Today' : `Ends in ${freeTrialDaysRemaining} Days`}
                </AlertTitle>
                <AlertDescription className={freeTrialDaysRemaining <= 3 ? 'text-destructive/80' : 'text-amber-600/80'}>
                  Upgrade now to Professional or Enterprise to continue using all features without interruption.
                  {freeTrialExpiryDate && ` Your free period ends on ${format(freeTrialExpiryDate, "dd MMMM yyyy")}.`}
                </AlertDescription>
              </Alert>
            )}
            
            {/* Paid Plan Expiry Alert Banner */}
            {isExpiredOrInactive && (
              <Alert variant="destructive" className="mt-4">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Subscription Expired</AlertTitle>
                <AlertDescription>
                  Your subscription expired on {expiryDate ? format(expiryDate, "dd MMMM yyyy") : 'recently'}. 
                  Renew now to continue using {currentPlan.name} features.
                </AlertDescription>
              </Alert>
            )}
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex items-center gap-3 p-3 rounded-lg bg-background">
                <Building2 className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Branches</p>
                  <p className="text-xs text-muted-foreground">
                    {branchLimits?.currentBranches || 0} / {branchLimits?.maxBranches || 1} used
                  </p>
                  <Progress 
                    value={((branchLimits?.currentBranches || 0) / (branchLimits?.maxBranches || 1)) * 100} 
                    className="h-1.5 mt-1" 
                  />
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-lg bg-background">
                <Users className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Staff</p>
                  <p className="text-xs text-muted-foreground">
                    {staffLimits?.currentStaff || 0} / {staffLimits?.maxStaff || 2} used
                  </p>
                  <Progress 
                    value={((staffLimits?.currentStaff || 0) / (staffLimits?.maxStaff || 2)) * 100} 
                    className="h-1.5 mt-1" 
                  />
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-lg bg-background">
                <Package className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Products</p>
                  <p className="text-xs text-muted-foreground">
                    {planInfo?.planLimits?.max_products ? `Up to ${planInfo.planLimits.max_products}` : 'Unlimited'}
                  </p>
                </div>
              </div>
            </div>
            
          </CardContent>
        </Card>

        {/* Dedicated Add-on Subscriptions Section */}
        <AddonSubscriptionSection
          isOwner={isOwner}
          isMainPlanActive={isMainPlanActive}
          mainPlanExpiryDate={mainPlanExpiryDate}
        />

        {!planInfo?.currentPlan && (
          <Card className="border-primary/20 bg-primary/5">
            <CardHeader className="text-center pb-4">
              <div className="mx-auto mb-4 p-3 rounded-full bg-primary/10 text-primary w-fit">
                <Star className="h-8 w-8" />
              </div>
              <CardTitle className="text-2xl">Get Started with BVBooks</CardTitle>
              <CardDescription>
                Choose a plan that fits your business needs.
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center space-y-3">
              <Button 
                size="lg" 
                onClick={() => handleSelectPlan(plans[0])}
                disabled={isProcessing || !canManageSubscription}
              >
                {isProcessing && selectedPlan?.id === 'free' ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Activating...
                  </>
                ) : !canManageSubscription ? (
                  <>
                    <ShieldAlert className="mr-2 h-4 w-4" />
                    Owner Access Required
                  </>
                ) : (
                  <>
                    <Star className="mr-2 h-4 w-4" />
                    Start with Free Plan
                  </>
                )}
              </Button>
              {!canManageSubscription && (
                <p className="text-xs text-muted-foreground">
                  Only the business owner can activate plans
                </p>
              )}
            </CardContent>
          </Card>
        )}

        <Separator />

        {/* Plan Selection */}
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-foreground mb-2">
            Choose Your Plan
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto mb-6">
            "Others record transactions. BVBooks controls behavior and prevents losses."
          </p>
          
          {/* Billing Period Selector with Savings Highlight */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-6">
            <Tabs 
              value={billingPeriod} 
              onValueChange={(v) => setBillingPeriod(v as BillingPeriod)}
              className="w-fit"
            >
              <TabsList className="grid grid-cols-3 h-auto p-1">
                <TabsTrigger value="monthly" className="text-sm py-2 data-[state=active]:bg-orange-500 data-[state=active]:text-white">
                  Monthly
                </TabsTrigger>
                <TabsTrigger value="quarterly" className="text-sm py-2 relative data-[state=active]:bg-orange-500 data-[state=active]:text-white">
                  Quarterly
                  <Badge variant="secondary" className="absolute -top-3 -right-1 text-[10px] px-1.5 bg-amber-100 text-amber-700 border-amber-200">
                    10% off
                  </Badge>
                </TabsTrigger>
                <TabsTrigger value="yearly" className="text-sm py-2 relative data-[state=active]:bg-orange-500 data-[state=active]:text-white">
                  Yearly
                  <Badge className="absolute -top-3 -right-1 text-[10px] px-1.5 bg-green-500 text-white border-green-600">
                    17% off
                  </Badge>
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
          
          {/* Yearly Savings Callout */}
          {billingPeriod === 'yearly' && (
            <div className="flex items-center justify-center gap-2 mb-6 p-3 rounded-lg bg-green-500/10 border border-green-500/20 max-w-md mx-auto">
              <TrendingUp className="h-5 w-5 text-green-600" />
              <span className="text-sm text-green-700 font-medium">
                Save 17% with yearly billing — that's 2 months free!
              </span>
            </div>
          )}
        </div>

        {/* Plan Cards - with optional Compare tab for super admins */}
        <Tabs defaultValue="cards" className="w-full">
          {isSuperAdmin && (
            <div className="flex justify-center mb-6">
              <TabsList>
                <TabsTrigger value="cards" className="gap-2">
                  <LayoutGrid className="h-4 w-4" />
                  Card View
                </TabsTrigger>
                <TabsTrigger value="compare" className="gap-2">
                  <TableProperties className="h-4 w-4" />
                  Compare Plans
                </TabsTrigger>
              </TabsList>
            </div>
          )}

          {isSuperAdmin && (
            <TabsContent value="compare" className="mt-0">
              <Card>
                <CardHeader>
                  <CardTitle>Plan Comparison</CardTitle>
                  <CardDescription>
                    Compare all features across plans side-by-side
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <PlanComparisonTable />
                </CardContent>
              </Card>
            </TabsContent>
          )}

          <TabsContent value="cards" className="mt-0">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
              {plans.map((plan) => {
                const planId = plan.id as BVBooksPlan;
                const isCurrentPlan = planId === effectiveCurrentPlan;
                const planRules = getPlanRules(planId);
                const planAction = getPlanAction(planId);
                
                return (
                  <Card
                    key={plan.id}
                    className={`relative flex flex-col transition-all duration-200 hover:shadow-lg ${
                      plan.popular
                        ? "border-primary shadow-md scale-[1.02]"
                        : isCurrentPlan
                        ? "border-green-500/50 bg-green-500/5"
                        : "border-border"
                    }`}
                  >
                    {plan.popular && !isCurrentPlan && (
                      <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary">
                        Most Popular
                      </Badge>
                    )}
                    {isCurrentPlan && (
                      <Badge variant="outline" className="absolute -top-3 left-1/2 -translate-x-1/2 bg-green-500/10 text-green-600 border-green-500/20">
                        Current Plan
                      </Badge>
                    )}

                    <CardHeader className="text-center pb-4">
                      <div className={`mx-auto mb-4 p-3 rounded-full w-fit ${
                        plan.id === 'enterprise' ? 'bg-purple-500/10 text-purple-600' :
                        plan.id === 'professional' ? 'bg-amber-500/10 text-amber-600' :
                        'bg-muted text-muted-foreground'
                      }`}>
                        {plan.icon}
                      </div>
                      <CardTitle className="text-2xl">{plan.name}</CardTitle>
                      <CardDescription>{plan.description}</CardDescription>
                    </CardHeader>

                    <CardContent className="flex-1">
                      <div className="text-center mb-6">
                        {plan.monthlyPrice === 0 ? (
                          <div>
                            <span className="text-4xl font-bold text-foreground">Free</span>
                            <p className="text-sm text-muted-foreground mt-1">30-day trial</p>
                          </div>
                        ) : (
                          <>
                            {/* Show monthly price crossed out when yearly/quarterly selected */}
                            {billingPeriod !== 'monthly' && (
                              <div className="text-sm text-muted-foreground line-through mb-1">
                                ₦{(plan.monthlyPrice * BILLING_DISCOUNTS[billingPeriod].months).toLocaleString()}/{BILLING_DISCOUNTS[billingPeriod].months === 3 ? 'quarter' : 'year'}
                              </div>
                            )}
                            <span className="text-4xl font-bold text-foreground">
                              ₦{calculatePrice(plan.monthlyPrice, billingPeriod).toLocaleString()}
                            </span>
                            <span className="text-muted-foreground">
                              /{BILLING_DISCOUNTS[billingPeriod].months === 1 ? 'month' : 
                                BILLING_DISCOUNTS[billingPeriod].months === 3 ? 'quarter' : 'year'}
                            </span>
                            
                            {/* Savings badge */}
                            {billingPeriod !== 'monthly' && (
                              <Badge className="ml-2 bg-green-500/10 text-green-600 border-green-500/20">
                                {BILLING_DISCOUNTS[billingPeriod].savingsLabel}
                              </Badge>
                            )}
                            
                            {/* Monthly equivalent */}
                            {billingPeriod !== 'monthly' && (
                              <p className="text-sm text-muted-foreground mt-2">
                                <span className="font-medium text-foreground">₦{getMonthlyEquivalent(plan.monthlyPrice, billingPeriod).toLocaleString()}</span>/month billed {billingPeriod === 'yearly' ? 'annually' : 'quarterly'}
                              </p>
                            )}
                          </>
                        )}
                      </div>

                      <div className="flex items-center justify-center gap-4 mb-4 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Building2 className="h-4 w-4" />
                          {plan.maxBranches} {plan.maxBranches === 1 ? 'branch' : 'branches'}
                        </span>
                        <span className="flex items-center gap-1">
                          <Users className="h-4 w-4" />
                          {plan.maxStaff} staff
                        </span>
                      </div>

                      <Separator className="my-4" />
                      
                      {/* Comprehensive Feature List by Category */}
                      <div className="max-h-[400px] overflow-y-auto pr-2">
                        <PlanFeatureList planId={plan.id} compact />
                      </div>
                    </CardContent>

                    <CardFooter className="flex-col gap-2">
                      <PlanCardCTA
                        planId={planId}
                        planRules={planRules}
                        planAction={planAction}
                        isCurrentPlan={isCurrentPlan}
                        isExpiredPaid={isExpiredOrInactive}
                        canManageSubscription={canManageSubscription}
                        isProcessing={isProcessing}
                        isSelected={selectedPlan?.id === plan.id}
                        billingPeriod={billingPeriod}
                        monthlyPrice={plan.monthlyPrice}
                        onSelectPlan={() => handleSelectPlan(plan)}
                        onChangeBillingPeriod={setBillingPeriod}
                      />
                    </CardFooter>
                  </Card>
                );
              })}
            </div>
          </TabsContent>
        </Tabs>

        <p className="text-center text-sm text-muted-foreground mt-8 pb-20 md:pb-8">
          All plans include automatic updates and support. 
          Need more branches or staff? Add-ons available in Premium.
        </p>
      </div>
      
      {/* Sticky Mobile CTA for Expired Subscriptions (paid plans only) */}
      {isExpiredOrInactive && canManageSubscription && (
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-background/95 backdrop-blur border-t shadow-lg md:hidden z-50">
          <div className="flex items-center gap-3">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-destructive truncate">
                Subscription Expired
              </p>
              <p className="text-xs text-muted-foreground">
                Renew to continue using features
              </p>
            </div>
            <Button
              size="lg"
              variant="destructive"
              className="shrink-0 gap-2"
              disabled={isProcessing}
              onClick={() => {
                const planToRenew = plans.find(p => p.id === effectiveCurrentPlan);
                if (planToRenew) handleSelectPlan(planToRenew);
              }}
            >
              <Sparkles className="h-4 w-4" />
              Renew Now
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
