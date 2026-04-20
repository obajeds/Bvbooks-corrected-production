import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Puzzle, Package, Info, ShoppingCart, AlertTriangle, Sparkles, Loader2, Calendar, Building2 } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { AddonStatusCard } from "./AddonStatusCard";
import { AddonExpiryBanner } from "./AddonExpiryBanner";
import { useAddonExpiry, type AddonExpiryInfo } from "@/hooks/useAddonExpiry";
import { useActiveAddonFeatures, useBusinessAddons, getAddonPrice, type BillingPeriod, BILLING_PERIOD_LABELS } from "@/hooks/useAddons";
import { useBusiness } from "@/hooks/useBusiness";
import { supabase } from "@/integrations/supabase/client";

interface AddonSubscriptionSectionProps {
  /** Whether the current user is the business owner */
  isOwner: boolean;
  /** Whether main subscription is active */
  isMainPlanActive: boolean;
  /** Main plan expiry date for alignment display */
  mainPlanExpiryDate: Date | null;
}

/**
 * AddonSubscriptionSection - Dedicated section for managing add-on subscriptions
 * 
 * Displays:
 * - Current active add-ons with full details (billing cycle, dates, status)
 * - Expired/Expiring add-on warnings
 * - Available add-ons for purchase
 * - Proper CTAs based on subscription state
 */
export function AddonSubscriptionSection({
  isOwner,
  isMainPlanActive,
  mainPlanExpiryDate,
}: AddonSubscriptionSectionProps) {
  const { data: business } = useBusiness();
  const { data: availableAddons = [] } = useActiveAddonFeatures();
  const { data: businessAddons = [] } = useBusinessAddons(business?.id);
  const { 
    addons: addonExpiryInfo, 
    expiredAddons, 
    expiringAddons, 
    misalignedAddons,
    isLoading 
  } = useAddonExpiry();
  
  const [selectedBillingPeriod, setSelectedBillingPeriod] = useState<BillingPeriod>("monthly");
  const [purchasingAddonId, setPurchasingAddonId] = useState<string | null>(null);

  // Get active addons for display
  const activeAddons = addonExpiryInfo.filter(a => a.status === "active" && !a.isExpired);
  const hasAddons = businessAddons.length > 0;
  
  // Handle add-on purchase
  const handlePurchaseAddon = async (addonFeatureId: string, addonName: string) => {
    if (!isOwner) {
      toast.error("Only the business owner can purchase add-ons.");
      return;
    }
    
    if (!isMainPlanActive) {
      toast.error("Please renew your main subscription before purchasing add-ons.");
      return;
    }
    
    if (!business) {
      toast.error("Business not found.");
      return;
    }

    const addon = availableAddons.find(a => a.id === addonFeatureId);
    if (!addon) {
      toast.error("Add-on not found.");
      return;
    }

    setPurchasingAddonId(addonFeatureId);

    try {
      const amount = getAddonPrice(addon, selectedBillingPeriod);
      
      const { data, error } = await supabase.functions.invoke("paystack", {
        body: {
          action: "initialize",
          email: business.owner_email,
          amount,
          plan: `addon_${addon.feature_key}_${selectedBillingPeriod}`,
          businessId: business.id,
          metadata: {
            addon_feature_id: addonFeatureId,
            addon_type: addon.feature_key,
            billing_period: selectedBillingPeriod,
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
      console.error("[AddonPurchase] Error:", error);
      toast.error(error.message || "Failed to initialize payment");
    } finally {
      setPurchasingAddonId(null);
    }
  };

  // Handle add-on renewal
  const handleRenewAddon = async (addonId: string) => {
    const addon = addonExpiryInfo.find(a => a.id === addonId);
    if (!addon) {
      toast.error("Add-on not found.");
      return;
    }
    
    // Find the corresponding addon feature for pricing
    const addonFeature = availableAddons.find(a => a.feature_key === addon.featureKey);
    if (!addonFeature) {
      toast.info("Add-on renewal will be available soon. Contact support for assistance.");
      return;
    }

    await handlePurchaseAddon(addonFeature.id, addon.featureName);
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Puzzle className="h-5 w-5" />
            Add-on Subscriptions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-3">
            <div className="h-4 bg-muted rounded w-1/2"></div>
            <div className="h-20 bg-muted rounded"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Puzzle className="h-5 w-5 text-primary" />
              Add-on Subscriptions
              {hasAddons && (
                <Badge variant="secondary" className="ml-2">
                  {businessAddons.length} active
                </Badge>
              )}
            </CardTitle>
            <CardDescription>
              Extend your plan with additional features and capacity
            </CardDescription>
          </div>
          {mainPlanExpiryDate && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
              <Calendar className="h-3.5 w-3.5" />
              <span>Main plan: {format(mainPlanExpiryDate, "dd MMM yyyy")}</span>
            </div>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Expiry Warnings Banner */}
        <AddonExpiryBanner
          expiringAddons={expiringAddons}
          expiredAddons={expiredAddons}
          isMainPlanActive={isMainPlanActive}
          canManage={isOwner}
          onRenewAddon={handleRenewAddon}
        />

        {/* Misaligned Add-ons Warning */}
        {misalignedAddons.length > 0 && isMainPlanActive && (
          <Alert className="bg-amber-50 border-amber-200">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            <AlertDescription className="text-amber-700 text-sm">
              <strong>{misalignedAddons.length} add-on{misalignedAddons.length > 1 ? "s" : ""}</strong> will expire 
              before your main plan. Consider extending them to align with your subscription.
            </AlertDescription>
          </Alert>
        )}

        <Tabs defaultValue={hasAddons ? "active" : "available"} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="active" className="gap-1.5">
              <Package className="h-4 w-4" />
              Your Add-ons
              {hasAddons && (
                <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
                  {businessAddons.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="available" className="gap-1.5">
              <ShoppingCart className="h-4 w-4" />
              Available
            </TabsTrigger>
          </TabsList>

          {/* Active Add-ons Tab */}
          <TabsContent value="active" className="mt-4 space-y-4">
            {hasAddons ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                {businessAddons.map((addon) => {
                  const expiryInfo = addonExpiryInfo.find(a => a.id === addon.id);
                  return (
                    <AddonStatusCard
                      key={addon.id}
                      addon={{
                        id: addon.id,
                        addon_feature: addon.addon_feature ? {
                          feature_name: addon.addon_feature.feature_name,
                          feature_key: addon.addon_feature.feature_key,
                          description: addon.addon_feature.description,
                        } : null,
                        quantity: addon.quantity,
                        status: addon.status,
                        start_date: addon.start_date,
                        end_date: addon.end_date,
                        branch_id: addon.branch_id,
                        billing_period: addon.billing_period,
                      }}
                      mainPlanExpiryDate={mainPlanExpiryDate}
                      isMainPlanActive={isMainPlanActive}
                      canManage={isOwner}
                      onRenewAddon={handleRenewAddon}
                    />
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Package className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p className="text-sm">No add-ons purchased yet</p>
                <p className="text-xs mt-1">Browse available add-ons to extend your plan</p>
              </div>
            )}
            
            {/* Add-on Info */}
            {hasAddons && (
              <div className="flex items-start gap-2 p-3 rounded-lg bg-muted/50 text-xs text-muted-foreground">
                <Info className="h-4 w-4 shrink-0 mt-0.5" />
                <div>
                  <p>Add-ons are billed separately from your main plan.</p>
                  <p className="mt-0.5">Each add-on has its own billing cycle and expiry date.</p>
                </div>
              </div>
            )}
          </TabsContent>

          {/* Available Add-ons Tab */}
          <TabsContent value="available" className="mt-4 space-y-4">
            {/* Billing Period Selector */}
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">Choose billing cycle:</p>
              <Tabs 
                value={selectedBillingPeriod} 
                onValueChange={(v) => setSelectedBillingPeriod(v as BillingPeriod)}
                className="w-fit"
              >
                <TabsList className="h-8">
                  <TabsTrigger value="monthly" className="text-xs px-2 h-6 data-[state=active]:bg-orange-500 data-[state=active]:text-white">
                    Monthly
                  </TabsTrigger>
                  <TabsTrigger value="quarterly" className="text-xs px-2 h-6 relative data-[state=active]:bg-orange-500 data-[state=active]:text-white">
                    Quarterly
                    <Badge className="absolute -top-2 -right-2 text-[8px] px-1 h-3.5 bg-amber-500">
                      10%
                    </Badge>
                  </TabsTrigger>
                  <TabsTrigger value="yearly" className="text-xs px-2 h-6 relative data-[state=active]:bg-orange-500 data-[state=active]:text-white">
                    Yearly
                    <Badge className="absolute -top-2 -right-2 text-[8px] px-1 h-3.5 bg-green-500">
                      20%
                    </Badge>
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>

            {/* Main plan not active warning */}
            {!isMainPlanActive && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  Renew your main subscription before purchasing add-ons.
                </AlertDescription>
              </Alert>
            )}

            {availableAddons.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {availableAddons.map((addon) => {
                  const isOwned = businessAddons.some(
                    ba => ba.addon_feature_id === addon.id && ba.status === "active"
                  );
                  const price = getAddonPrice(addon, selectedBillingPeriod);
                  
                  return (
                    <Card key={addon.id} className={`transition-all ${isOwned ? "border-green-500/30 bg-green-50/30" : ""}`}>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <h4 className="font-medium text-sm">{addon.feature_name}</h4>
                              {isOwned && (
                                <Badge variant="outline" className="text-xs bg-green-100 text-green-700 border-green-300">
                                  Owned
                                </Badge>
                              )}
                            </div>
                            {addon.description && (
                              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                                {addon.description}
                              </p>
                            )}
                            <div className="mt-2 flex items-baseline gap-1">
                              <span className="text-lg font-bold">
                                ₦{price.toLocaleString()}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                /{selectedBillingPeriod === "yearly" ? "year" : 
                                  selectedBillingPeriod === "quarterly" ? "quarter" : "month"}
                              </span>
                            </div>
                          </div>
                          <Button
                            size="sm"
                            variant={isOwned ? "outline" : "default"}
                            disabled={!isOwner || !isMainPlanActive || purchasingAddonId === addon.id}
                            onClick={() => handlePurchaseAddon(addon.id, addon.feature_name)}
                            className="shrink-0"
                          >
                            {purchasingAddonId === addon.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : isOwned ? (
                              <>
                                <Sparkles className="h-3.5 w-3.5 mr-1" />
                                Add More
                              </>
                            ) : (
                              <>
                                <ShoppingCart className="h-3.5 w-3.5 mr-1" />
                                Purchase
                              </>
                            )}
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <ShoppingCart className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p className="text-sm">No add-ons available for your current plan</p>
                <p className="text-xs mt-1">Upgrade to Professional or Enterprise for add-on access</p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
