import { useState } from "react";
import { useBusiness } from "@/hooks/useBusiness";
import { useBusinessPlan } from "@/hooks/useFeatureGating";
import { 
  useActiveAddonFeatures, 
  useBusinessAddons, 
  usePurchaseAddon, 
  type BillingPeriod,
  type AddonFeature,
  BILLING_PERIOD_LABELS,
  getAddonPrice 
} from "@/hooks/useAddons";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Loader2, Plus, Package, Check, Lock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function AddonSettings() {
  const { data: business, isLoading: businessLoading } = useBusiness();
  const { data: planInfo, isLoading: planLoading } = useBusinessPlan();
  const { data: addons, isLoading: addonsLoading } = useActiveAddonFeatures();
  const { data: businessAddons, isLoading: businessAddonsLoading } = useBusinessAddons(business?.id);
  const purchaseAddon = usePurchaseAddon();
  const [processingAddon, setProcessingAddon] = useState<string | null>(null);
  const [selectedPeriods, setSelectedPeriods] = useState<Record<string, BillingPeriod>>({});

  const isLoading = businessLoading || addonsLoading || businessAddonsLoading || planLoading;
  // Free tier cannot purchase addons - use the new plan system
  const isFreeTier = planInfo?.effectivePlan === 'free';
  
  // Check if main subscription is expired (prevents addon purchase)
  const expiryDate = business?.plan_expires_at ? new Date(business.plan_expires_at) : null;
  const isMainPlanExpired = expiryDate ? expiryDate < new Date() : false;

  const getBusinessAddon = (addonId: string) => {
    return businessAddons?.find(ba => ba.addon_feature_id === addonId);
  };

  const getSelectedPeriod = (addonId: string): BillingPeriod => {
    return selectedPeriods[addonId] || 'monthly';
  };

  const handlePeriodChange = (addonId: string, period: BillingPeriod) => {
    setSelectedPeriods(prev => ({ ...prev, [addonId]: period }));
  };

  const handlePurchaseAddon = async (addon: AddonFeature) => {
    if (!business) {
      toast.error("Business not found");
      return;
    }

    if (isFreeTier) {
      toast.error("Upgrade to Professional or Enterprise to purchase add-ons");
      return;
    }
    
    // Block addon purchase if main plan is expired
    if (isMainPlanExpired) {
      toast.error("Renew your main subscription before purchasing add-ons");
      return;
    }

    const billingPeriod = getSelectedPeriod(addon.id);
    const amount = getAddonPrice(addon, billingPeriod);

    setProcessingAddon(addon.id);

    try {
      const { data, error } = await supabase.functions.invoke("paystack", {
        body: {
          action: "initialize",
          email: business.owner_email,
          amount: amount,
          plan: `addon_${addon.feature_key}_${billingPeriod}`,
          businessId: business.id,
          metadata: {
            addon_feature_id: addon.id,
            addon_type: addon.feature_key,
            billing_period: billingPeriod,
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
      console.error("Addon purchase error:", error);
      toast.error(error.message || "Failed to purchase add-on");
    } finally {
      setProcessingAddon(null);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-4 w-64" />
        </CardHeader>
        <CardContent className="space-y-4">
          {[1, 2].map((i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Package className="h-5 w-5" />
          Add-on Services
        </CardTitle>
        <CardDescription>
          Extend your plan with additional features and capacity
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isFreeTier ? (
          <div className="text-center py-8 space-y-3">
            <Lock className="h-10 w-10 mx-auto text-muted-foreground" />
            <p className="text-muted-foreground">
              Add-ons are available on Professional and Enterprise plans only.
            </p>
            <Button variant="default" size="sm" asChild>
              <a href="/subscription">Upgrade Your Plan</a>
            </Button>
          </div>
        ) : isMainPlanExpired ? (
          <div className="text-center py-8 space-y-3">
            <Lock className="h-10 w-10 mx-auto text-destructive" />
            <p className="text-destructive font-medium">
              Your subscription has expired
            </p>
            <p className="text-muted-foreground text-sm">
              Renew your main subscription to purchase or manage add-ons.
            </p>
            <Button variant="destructive" size="sm" asChild>
              <a href="/subscription">Renew Subscription</a>
            </Button>
          </div>
        ) : !addons || addons.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No add-ons available at this time.
          </div>
        ) : (
          <div className="grid gap-4">
            {addons.map((addon) => {
              const existingAddon = getBusinessAddon(addon.id);
              const quantity = existingAddon?.quantity || 0;
              const selectedPeriod = getSelectedPeriod(addon.id);
              const price = getAddonPrice(addon, selectedPeriod);

              return (
                <div
                  key={addon.id}
                  className="flex flex-col gap-4 p-4 rounded-lg border bg-card"
                >
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="font-medium">{addon.feature_name}</h4>
                        {quantity > 0 && (
                          <Badge variant="secondary" className="text-xs">
                            <Check className="h-3 w-3 mr-1" />
                            {quantity} active
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">{addon.description}</p>
                    </div>
                  </div>
                  
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t">
                    <div className="flex items-center gap-3">
                      <Select
                        value={selectedPeriod}
                        onValueChange={(value) => handlePeriodChange(addon.id, value as BillingPeriod)}
                      >
                        <SelectTrigger className="w-[180px]">
                          <SelectValue placeholder="Billing period" />
                        </SelectTrigger>
                        <SelectContent>
                          {(Object.keys(BILLING_PERIOD_LABELS) as BillingPeriod[]).map((period) => (
                            <SelectItem key={period} value={period}>
                              {BILLING_PERIOD_LABELS[period]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <p className="text-lg font-semibold text-primary">
                        ₦{price.toLocaleString()}
                      </p>
                    </div>
                    
                    <Button
                      variant={quantity > 0 ? "outline" : "default"}
                      size="sm"
                      onClick={() => handlePurchaseAddon(addon)}
                      disabled={processingAddon === addon.id}
                      className="shrink-0"
                    >
                      {processingAddon === addon.id ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Processing...
                        </>
                      ) : (
                        <>
                          <Plus className="h-4 w-4 mr-2" />
                          {quantity > 0 ? "Add Another" : "Purchase"}
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {businessAddons && businessAddons.length > 0 && (
          <div className="pt-4 border-t">
            <h4 className="font-medium mb-3">Your Active Add-ons</h4>
            <div className="space-y-2">
              {businessAddons.map((ba) => (
                <div key={ba.id} className="flex items-center justify-between text-sm p-2 rounded bg-muted/50">
                  <span>{ba.addon_feature?.feature_name}</span>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{ba.quantity}x</Badge>
                    <span className="text-muted-foreground">
                      ₦{ba.amount_paid.toLocaleString()} paid
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
