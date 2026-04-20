import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Loader2, Shield, Building2, ToggleLeft, Plus, Search, RefreshCw, Trash2, Copy, LayoutGrid, Check, X, Crown, MessageCircle, Puzzle, Edit, DollarSign, Activity } from "lucide-react";
import { SuperAdminSupportPanel } from "./SuperAdminSupportPanel";
import { MonitoringPanel } from "./MonitoringPanel";
import { PlanBadge } from "@/components/subscription/PlanBadge";
import { FEATURE_CATEGORIES, type BVBooksPlan } from "@/hooks/useFeatureGating";
import { format } from "date-fns";
import { PLAN_FEATURE_DETAILS, PLAN_SUMMARY, CATEGORY_ORDER } from "@/lib/planFeatures";
import { useAddonFeatures, useCreateAddonFeature, useUpdateAddonFeature, useDeleteAddonFeature, type AddonFeature } from "@/hooks/useAddons";
import type { Database } from "@/integrations/supabase/types";

type SubscriptionPlan = Database["public"]["Enums"]["subscription_plan"];

interface PlanFeature {
  id: string;
  plan: BVBooksPlan;
  feature_key: string;
  feature_name: string;
  category: string;
  is_enabled: boolean;
  limits: Record<string, unknown>;
  description: string | null;
}

interface BusinessOverride {
  id: string;
  business_id: string;
  feature_key: string;
  is_enabled: boolean;
  override_limits: Record<string, unknown>;
  reason: string | null;
  overridden_by: string | null;
  created_at: string;
  expires_at: string | null;
}

interface Business {
  id: string;
  trading_name: string;
  owner_email: string;
  current_plan: BVBooksPlan;
  trial_ends_at: string | null;
}

export function SuperAdminControls() {
  const queryClient = useQueryClient();
  const [selectedPlan, setSelectedPlan] = useState<BVBooksPlan>('free');
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedBusiness, setSelectedBusiness] = useState<Business | null>(null);
  const [overrideDialogOpen, setOverrideDialogOpen] = useState(false);
  const [createFeatureDialogOpen, setCreateFeatureDialogOpen] = useState(false);
  const [newOverride, setNewOverride] = useState({
    feature_key: "",
    is_enabled: true,
    reason: "",
    expires_at: "",
  });
  const [newFeature, setNewFeature] = useState({
    feature_key: "",
    feature_name: "",
    category: "Sales",
    description: "",
    plans: [] as BVBooksPlan[],
  });
  
  // Addon management state
  const [addonDialogOpen, setAddonDialogOpen] = useState(false);
  const [editingAddon, setEditingAddon] = useState<AddonFeature | null>(null);
  const [addonSearchQuery, setAddonSearchQuery] = useState("");
  const [newAddon, setNewAddon] = useState({
    feature_key: "",
    feature_name: "",
    description: "",
    price_per_unit: 0,
    price_quarterly: 0,
    price_yearly: 0,
    currency: "NGN",
    applicable_plans: ["professional", "enterprise"] as SubscriptionPlan[],
    is_active: true,
  });

  // Addon management hooks
  const { data: addonFeatures = [], isLoading: addonsLoading, refetch: refetchAddons } = useAddonFeatures();
  const createAddon = useCreateAddonFeature();
  const updateAddon = useUpdateAddonFeature();
  const deleteAddon = useDeleteAddonFeature();
  
  // Fetch all business addons (admin view)
  const { data: allBusinessAddons = [], isLoading: businessAddonsLoading } = useQuery({
    queryKey: ["admin-all-business-addons", addonSearchQuery],
    queryFn: async () => {
      let query = supabase
        .from("business_addons")
        .select(`
          *,
          addon_feature:addon_features(*),
          business:businesses(id, trading_name, owner_email, current_plan)
        `)
        .order("created_at", { ascending: false });
      
      const { data, error } = await query.limit(100);
      if (error) throw error;
      return data;
    },
  });

  // Fetch all plan features
  const { data: allFeatures = [], isLoading: featuresLoading, refetch: refetchFeatures } = useQuery({
    queryKey: ["admin-plan-features"],
    queryFn: async (): Promise<PlanFeature[]> => {
      const { data, error } = await supabase
        .from("plan_features")
        .select("*")
        .order("category")
        .order("feature_name");
      
      if (error) throw error;
      return data as PlanFeature[];
    },
  });

  // Fetch all businesses
  const { data: businesses = [], isLoading: businessesLoading } = useQuery({
    queryKey: ["admin-businesses", searchQuery],
    queryFn: async (): Promise<Business[]> => {
      let query = supabase
        .from("businesses")
        .select("id, trading_name, owner_email, current_plan, trial_ends_at")
        .order("trading_name");
      
      if (searchQuery) {
        query = query.or(`trading_name.ilike.%${searchQuery}%,owner_email.ilike.%${searchQuery}%`);
      }
      
      const { data, error } = await query.limit(50);
      if (error) throw error;
      return data as Business[];
    },
  });

  // Fetch overrides for selected business
  const { data: businessOverrides = [], isLoading: overridesLoading } = useQuery({
    queryKey: ["admin-business-overrides", selectedBusiness?.id],
    queryFn: async (): Promise<BusinessOverride[]> => {
      if (!selectedBusiness) return [];
      
      const { data, error } = await supabase
        .from("business_plan_overrides")
        .select("*")
        .eq("business_id", selectedBusiness.id);
      
      if (error) throw error;
      return data as BusinessOverride[];
    },
    enabled: !!selectedBusiness,
  });

  // Toggle plan feature mutation
  const toggleFeature = useMutation({
    mutationFn: async ({ id, is_enabled }: { id: string; is_enabled: boolean }) => {
      const { error } = await supabase
        .from("plan_features")
        .update({ is_enabled })
        .eq("id", id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-plan-features"] });
      toast.success("Feature updated successfully");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  // Create new feature mutation
  const createFeature = useMutation({
    mutationFn: async (feature: typeof newFeature) => {
      // Create the feature for selected plans
      const featuresToInsert = feature.plans.map(plan => ({
        plan: plan as "free" | "professional" | "enterprise",
        feature_key: feature.feature_key,
        feature_name: feature.feature_name,
        category: feature.category,
        description: feature.description || null,
        is_enabled: true,
      }));

      const { error } = await supabase
        .from("plan_features")
        .insert(featuresToInsert);
      
      if (error) throw error;

      // Log the change
      await supabase.from("feature_changelog").insert({
        feature_key: feature.feature_key,
        action: "feature_created",
        new_value: feature,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-plan-features"] });
      setCreateFeatureDialogOpen(false);
      setNewFeature({ feature_key: "", feature_name: "", category: "Sales", description: "", plans: [] });
      toast.success("Feature created successfully");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  // Delete feature mutation
  const deleteFeature = useMutation({
    mutationFn: async (featureKey: string) => {
      const { error } = await supabase
        .from("plan_features")
        .delete()
        .eq("feature_key", featureKey);
      
      if (error) throw error;

      // Log the change
      await supabase.from("feature_changelog").insert({
        feature_key: featureKey,
        action: "feature_deleted",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-plan-features"] });
      toast.success("Feature deleted from all plans");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  // Copy features to another plan mutation
  const copyFeaturesToPlan = useMutation({
    mutationFn: async ({ fromPlan, toPlan }: { fromPlan: BVBooksPlan; toPlan: BVBooksPlan }) => {
      const sourceFeatures = allFeatures.filter(f => f.plan === fromPlan);
      const targetFeatureKeys = allFeatures.filter(f => f.plan === toPlan).map(f => f.feature_key);
      
      const newFeatures = sourceFeatures
        .filter(f => !targetFeatureKeys.includes(f.feature_key))
        .map(f => ({
          plan: toPlan as "free" | "professional" | "enterprise",
          feature_key: f.feature_key,
          feature_name: f.feature_name,
          category: f.category,
          description: f.description,
          is_enabled: f.is_enabled,
        }));

      if (newFeatures.length === 0) {
        throw new Error("No new features to copy");
      }

      const { error } = await supabase
        .from("plan_features")
        .insert(newFeatures);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-plan-features"] });
      toast.success("Features copied successfully");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  // Create business override mutation
  const createOverride = useMutation({
    mutationFn: async (override: {
      business_id: string;
      feature_key: string;
      is_enabled: boolean;
      reason: string;
      expires_at: string | null;
    }) => {
      const { error } = await supabase
        .from("business_plan_overrides")
        .upsert({
          business_id: override.business_id,
          feature_key: override.feature_key,
          is_enabled: override.is_enabled,
          reason: override.reason || null,
          expires_at: override.expires_at || null,
        });
      
      if (error) throw error;

      // Log the change
      await supabase.from("feature_changelog").insert({
        business_id: override.business_id,
        feature_key: override.feature_key,
        action: "override_created",
        new_value: override,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-business-overrides"] });
      setOverrideDialogOpen(false);
      setNewOverride({ feature_key: "", is_enabled: true, reason: "", expires_at: "" });
      toast.success("Override created successfully");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  // Delete business override mutation
  const deleteOverride = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("business_plan_overrides")
        .delete()
        .eq("id", id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-business-overrides"] });
      toast.success("Override removed");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const filteredFeatures = allFeatures.filter(f => f.plan === selectedPlan);
  const groupedFeatures = FEATURE_CATEGORIES.map(category => ({
    category,
    features: filteredFeatures.filter(f => f.category === category),
  })).filter(g => g.features.length > 0);

  const uniqueFeatureKeys = [...new Set(allFeatures.map(f => f.feature_key))];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Shield className="h-6 w-6" />
            Super Admin Controls
          </h2>
          <p className="text-muted-foreground">
            Manage plan features, business overrides, and add-ons
          </p>
        </div>
        <Button variant="outline" onClick={() => { refetchFeatures(); refetchAddons(); }}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      <Tabs defaultValue="features" className="space-y-4">
        <TabsList className="flex-wrap">
          <TabsTrigger value="features" className="gap-2">
            <ToggleLeft className="h-4 w-4" />
            Plan Features
          </TabsTrigger>
          <TabsTrigger value="comparison" className="gap-2">
            <LayoutGrid className="h-4 w-4" />
            Plan Comparison
          </TabsTrigger>
          <TabsTrigger value="overrides" className="gap-2">
            <Building2 className="h-4 w-4" />
            Business Overrides
          </TabsTrigger>
          <TabsTrigger value="addons" className="gap-2">
            <Puzzle className="h-4 w-4" />
            Add-ons
          </TabsTrigger>
          <TabsTrigger value="support" className="gap-2">
            <MessageCircle className="h-4 w-4" />
            Support Tickets
          </TabsTrigger>
          <TabsTrigger value="monitoring" className="gap-2">
            <Activity className="h-4 w-4" />
            Monitoring
          </TabsTrigger>
        </TabsList>

        <TabsContent value="features" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                  <CardTitle>Feature Configuration</CardTitle>
                  <CardDescription>
                    Enable or disable features for each subscription plan
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <Button size="sm" onClick={() => setCreateFeatureDialogOpen(true)}>
                    <Plus className="h-4 w-4 mr-1" />
                    Add Feature
                  </Button>
                  <Select value={selectedPlan} onValueChange={(v) => setSelectedPlan(v as BVBooksPlan)}>
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="free">Free</SelectItem>
                      <SelectItem value="professional">Professional</SelectItem>
                      <SelectItem value="enterprise">Enterprise</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => {
                      const targetPlan = selectedPlan === 'enterprise' ? 'professional' : 'free';
                      copyFeaturesToPlan.mutate({ fromPlan: selectedPlan, toPlan: targetPlan as BVBooksPlan });
                    }}
                    disabled={copyFeaturesToPlan.isPending}
                  >
                    <Copy className="h-4 w-4 mr-1" />
                    Copy to Lower Plan
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {featuresLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              ) : groupedFeatures.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  No features configured for this plan. Add some features or copy from another plan.
                </p>
              ) : (
                <div className="space-y-6">
                  {groupedFeatures.map(group => (
                    <div key={group.category}>
                      <h3 className="font-semibold mb-3 text-sm text-muted-foreground uppercase tracking-wide">
                        {group.category}
                      </h3>
                      <div className="grid gap-3">
                        {group.features.map(feature => (
                          <div 
                            key={feature.id}
                            className="flex items-center justify-between p-3 rounded-lg border bg-card"
                          >
                            <div className="flex-1">
                              <p className="font-medium text-sm">{feature.feature_name}</p>
                              <p className="text-xs text-muted-foreground font-mono">{feature.feature_key}</p>
                              {feature.description && (
                                <p className="text-xs text-muted-foreground mt-1">{feature.description}</p>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              <Switch
                                checked={feature.is_enabled}
                                onCheckedChange={(checked) => 
                                  toggleFeature.mutate({ id: feature.id, is_enabled: checked })
                                }
                              />
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-destructive"
                                onClick={() => {
                                  if (confirm(`Delete "${feature.feature_name}" from ALL plans?`)) {
                                    deleteFeature.mutate(feature.feature_key);
                                  }
                                }}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="comparison" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Subscription Plan Comparison</CardTitle>
              <CardDescription>
                Compare features and limits across all subscription plans
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* Plan Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                {(['free', 'professional', 'enterprise'] as const).map((plan) => (
                  <div 
                    key={plan}
                    className={`p-4 rounded-lg border-2 ${
                      plan === 'enterprise' 
                        ? 'border-primary bg-primary/5' 
                        : plan === 'professional'
                          ? 'border-blue-500 bg-blue-500/5'
                          : 'border-muted bg-muted/30'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      {plan === 'enterprise' && <Crown className="h-5 w-5 text-primary" />}
                      <h3 className="font-bold text-lg capitalize">{plan}</h3>
                    </div>
                    <p className="text-sm text-muted-foreground mb-3">{PLAN_SUMMARY[plan].tagline}</p>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Branches:</span>
                        <span className="font-medium">{PLAN_SUMMARY[plan].branches}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Staff:</span>
                        <span className="font-medium">{PLAN_SUMMARY[plan].staff}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Price:</span>
                        <span className="font-medium">
                          {plan === 'free' ? 'Free' : plan === 'professional' ? '₦15,000/mo' : '₦35,000/mo'}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Feature Comparison Table */}
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[200px]">Category / Feature</TableHead>
                      <TableHead className="text-center">Free</TableHead>
                      <TableHead className="text-center">Professional</TableHead>
                      <TableHead className="text-center">Enterprise</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {CATEGORY_ORDER.map((categoryKey) => {
                      const freeCategory = PLAN_FEATURE_DETAILS.free[categoryKey];
                      const proCategory = PLAN_FEATURE_DETAILS.professional[categoryKey];
                      const entCategory = PLAN_FEATURE_DETAILS.enterprise[categoryKey];
                      
                      return (
                        <>
                          <TableRow key={categoryKey} className="bg-muted/50">
                            <TableCell className="font-semibold text-sm" colSpan={4}>
                              {freeCategory.title}
                            </TableCell>
                          </TableRow>
                          <TableRow key={`${categoryKey}-features`}>
                            <TableCell className="text-sm text-muted-foreground pl-6">
                              Features
                            </TableCell>
                            <TableCell className="text-center">
                              {freeCategory.available ? (
                                <div className="flex flex-col items-center gap-1">
                                  <Check className="h-4 w-4 text-green-500" />
                                  <span className="text-xs text-muted-foreground">
                                    {freeCategory.features.length} features
                                  </span>
                                </div>
                              ) : (
                                <X className="h-4 w-4 text-destructive mx-auto" />
                              )}
                            </TableCell>
                            <TableCell className="text-center">
                              {proCategory.available ? (
                                <div className="flex flex-col items-center gap-1">
                                  <Check className="h-4 w-4 text-green-500" />
                                  <span className="text-xs text-muted-foreground">
                                    {proCategory.features.length} features
                                  </span>
                                </div>
                              ) : (
                                <X className="h-4 w-4 text-destructive mx-auto" />
                              )}
                            </TableCell>
                            <TableCell className="text-center">
                              {entCategory.available ? (
                                <div className="flex flex-col items-center gap-1">
                                  <Check className="h-4 w-4 text-green-500" />
                                  <span className="text-xs text-muted-foreground">
                                    {entCategory.features.length} features
                                  </span>
                                </div>
                              ) : (
                                <X className="h-4 w-4 text-destructive mx-auto" />
                              )}
                            </TableCell>
                          </TableRow>
                        </>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              {/* Detailed Feature Lists */}
              <div className="mt-8 space-y-6">
                <h4 className="font-semibold text-lg">Detailed Feature Breakdown</h4>
                {CATEGORY_ORDER.map((categoryKey) => (
                  <div key={categoryKey} className="border rounded-lg p-4">
                    <h5 className="font-medium mb-3">{PLAN_FEATURE_DETAILS.free[categoryKey].title}</h5>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {(['free', 'professional', 'enterprise'] as const).map((plan) => {
                        const category = PLAN_FEATURE_DETAILS[plan][categoryKey];
                        return (
                          <div key={plan} className="space-y-2">
                            <Badge variant={plan === 'enterprise' ? 'default' : plan === 'professional' ? 'secondary' : 'outline'}>
                              {plan.charAt(0).toUpperCase() + plan.slice(1)}
                            </Badge>
                            {category.available ? (
                              <ul className="text-sm space-y-1">
                                {category.features.map((feature, idx) => (
                                  <li key={idx} className="flex items-start gap-2">
                                    <Check className="h-3 w-3 text-green-500 mt-1 shrink-0" />
                                    <span>{feature}</span>
                                  </li>
                                ))}
                                {category.unavailable?.map((feature, idx) => (
                                  <li key={`unavail-${idx}`} className="flex items-start gap-2 text-muted-foreground">
                                    <X className="h-3 w-3 text-destructive mt-1 shrink-0" />
                                    <span>{feature}</span>
                                  </li>
                                ))}
                              </ul>
                            ) : (
                              <p className="text-sm text-muted-foreground">Not available</p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="overrides" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Business List */}
            <Card className="lg:col-span-1">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Select Business</CardTitle>
                <div className="relative mt-2">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search businesses..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </CardHeader>
              <CardContent className="max-h-96 overflow-y-auto">
                {businessesLoading ? (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 className="h-4 w-4 animate-spin" />
                  </div>
                ) : businesses.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No businesses found
                  </p>
                ) : (
                  <div className="space-y-2">
                    {businesses.map(business => (
                      <button
                        key={business.id}
                        onClick={() => setSelectedBusiness(business)}
                        className={`w-full text-left p-3 rounded-lg border transition-colors ${
                          selectedBusiness?.id === business.id 
                            ? 'border-primary bg-primary/5' 
                            : 'hover:bg-muted'
                        }`}
                      >
                        <p className="font-medium text-sm truncate">{business.trading_name}</p>
                        <p className="text-xs text-muted-foreground truncate">{business.owner_email}</p>
                        <PlanBadge plan={(['free', 'professional', 'enterprise'].includes(business.current_plan || '') ? business.current_plan : 'free') as BVBooksPlan} size="sm" className="mt-1" />
                      </button>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Business Overrides */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base">
                      {selectedBusiness ? selectedBusiness.trading_name : 'Select a Business'}
                    </CardTitle>
                    <CardDescription>
                      {selectedBusiness 
                        ? `Override features for this specific business`
                        : 'Select a business to manage its feature overrides'
                      }
                    </CardDescription>
                  </div>
                  {selectedBusiness && (
                    <Button size="sm" onClick={() => setOverrideDialogOpen(true)}>
                      <Plus className="h-4 w-4 mr-1" />
                      Add Override
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {!selectedBusiness ? (
                  <p className="text-center text-muted-foreground py-8">
                    Select a business from the list to manage overrides
                  </p>
                ) : overridesLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin" />
                  </div>
                ) : businessOverrides.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    No overrides configured for this business
                  </p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Feature</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Expires</TableHead>
                        <TableHead>Reason</TableHead>
                        <TableHead></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {businessOverrides.map(override => (
                        <TableRow key={override.id}>
                          <TableCell className="font-mono text-sm">
                            {override.feature_key}
                          </TableCell>
                          <TableCell>
                            <Badge variant={override.is_enabled ? "default" : "secondary"}>
                              {override.is_enabled ? 'Enabled' : 'Disabled'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {override.expires_at 
                              ? format(new Date(override.expires_at), 'MMM d, yyyy')
                              : 'Never'
                            }
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">
                            {override.reason || '-'}
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => deleteOverride.mutate(override.id)}
                            >
                              Remove
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="addons" className="space-y-4">
          {/* Addon Features Management */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Puzzle className="h-5 w-5" />
                    Add-on Features
                  </CardTitle>
                  <CardDescription>
                    Manage purchasable add-on features for businesses
                  </CardDescription>
                </div>
                <Button size="sm" onClick={() => {
                  setEditingAddon(null);
                  setNewAddon({
                    feature_key: "",
                    feature_name: "",
                    description: "",
                    price_per_unit: 0,
                    price_quarterly: 0,
                    price_yearly: 0,
                    currency: "NGN",
                    applicable_plans: ["professional", "enterprise"],
                    is_active: true,
                  });
                  setAddonDialogOpen(true);
                }}>
                  <Plus className="h-4 w-4 mr-1" />
                  Add Addon
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {addonsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              ) : addonFeatures.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  No add-on features configured yet
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Feature</TableHead>
                      <TableHead>Key</TableHead>
                      <TableHead>Price (Monthly)</TableHead>
                      <TableHead>Plans</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {addonFeatures.map((addon) => (
                      <TableRow key={addon.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{addon.feature_name}</p>
                            {addon.description && (
                              <p className="text-xs text-muted-foreground">{addon.description}</p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="font-mono text-sm">{addon.feature_key}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <DollarSign className="h-3 w-3 text-muted-foreground" />
                            {addon.currency} {addon.price_per_unit.toLocaleString()}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1 flex-wrap">
                            {addon.applicable_plans.map((plan) => (
                              <Badge key={plan} variant="outline" className="text-xs">
                                {plan}
                              </Badge>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={addon.is_active ? "default" : "secondary"}>
                            {addon.is_active ? "Active" : "Inactive"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => {
                                setEditingAddon(addon);
                                setNewAddon({
                                  feature_key: addon.feature_key,
                                  feature_name: addon.feature_name,
                                  description: addon.description || "",
                                  price_per_unit: addon.price_per_unit,
                                  price_quarterly: addon.price_quarterly,
                                  price_yearly: addon.price_yearly,
                                  currency: addon.currency,
                                  applicable_plans: addon.applicable_plans,
                                  is_active: addon.is_active,
                                });
                                setAddonDialogOpen(true);
                              }}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive"
                              onClick={() => {
                                if (confirm(`Delete "${addon.feature_name}" add-on?`)) {
                                  deleteAddon.mutate(addon.id);
                                }
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {/* Business Addon Subscriptions */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                  <CardTitle>Business Addon Subscriptions</CardTitle>
                  <CardDescription>
                    View all active addon subscriptions across businesses
                  </CardDescription>
                </div>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search businesses..."
                    value={addonSearchQuery}
                    onChange={(e) => setAddonSearchQuery(e.target.value)}
                    className="pl-9 w-64"
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {businessAddonsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              ) : allBusinessAddons.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  No addon subscriptions found
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Business</TableHead>
                      <TableHead>Add-on</TableHead>
                      <TableHead>Quantity</TableHead>
                      <TableHead>Amount Paid</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Start Date</TableHead>
                      <TableHead>End Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {allBusinessAddons
                      .filter((ba: any) => 
                        !addonSearchQuery || 
                        ba.business?.trading_name?.toLowerCase().includes(addonSearchQuery.toLowerCase()) ||
                        ba.business?.owner_email?.toLowerCase().includes(addonSearchQuery.toLowerCase())
                      )
                      .map((ba: any) => (
                      <TableRow key={ba.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{ba.business?.trading_name || 'Unknown'}</p>
                            <p className="text-xs text-muted-foreground">{ba.business?.owner_email}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{ba.addon_feature?.feature_name || 'Unknown'}</p>
                            <p className="text-xs text-muted-foreground font-mono">{ba.addon_feature?.feature_key}</p>
                          </div>
                        </TableCell>
                        <TableCell>{ba.quantity}</TableCell>
                        <TableCell>
                          {ba.addon_feature?.currency || 'NGN'} {ba.amount_paid?.toLocaleString() || 0}
                        </TableCell>
                        <TableCell>
                          <Badge variant={ba.status === 'active' ? 'default' : 'secondary'}>
                            {ba.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {ba.start_date ? format(new Date(ba.start_date), 'MMM d, yyyy') : '-'}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {ba.end_date ? format(new Date(ba.end_date), 'MMM d, yyyy') : 'Never'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>


        <TabsContent value="support" className="space-y-4">
          <SuperAdminSupportPanel />
        </TabsContent>

        <TabsContent value="monitoring" className="space-y-4">
          <MonitoringPanel />
        </TabsContent>
      </Tabs>

      {/* Add Override Dialog */}
      <Dialog open={overrideDialogOpen} onOpenChange={setOverrideDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Feature Override</DialogTitle>
            <DialogDescription>
              Override a feature for {selectedBusiness?.trading_name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Feature</Label>
              <Select 
                value={newOverride.feature_key} 
                onValueChange={(v) => setNewOverride(o => ({ ...o, feature_key: v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select feature" />
                </SelectTrigger>
                <SelectContent>
                  {uniqueFeatureKeys.map(key => (
                    <SelectItem key={key} value={key}>{key}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between">
              <Label>Enable Feature</Label>
              <Switch
                checked={newOverride.is_enabled}
                onCheckedChange={(checked) => setNewOverride(o => ({ ...o, is_enabled: checked }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Expires (optional)</Label>
              <Input
                type="date"
                value={newOverride.expires_at}
                onChange={(e) => setNewOverride(o => ({ ...o, expires_at: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Reason</Label>
              <Textarea
                placeholder="Why is this override needed?"
                value={newOverride.reason}
                onChange={(e) => setNewOverride(o => ({ ...o, reason: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOverrideDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={() => selectedBusiness && createOverride.mutate({
                business_id: selectedBusiness.id,
                feature_key: newOverride.feature_key,
                is_enabled: newOverride.is_enabled,
                reason: newOverride.reason,
                expires_at: newOverride.expires_at || null,
              })}
              disabled={!newOverride.feature_key || createOverride.isPending}
            >
              {createOverride.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Add Override
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Feature Dialog */}
      <Dialog open={createFeatureDialogOpen} onOpenChange={setCreateFeatureDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Create New Feature</DialogTitle>
            <DialogDescription>
              Add a new feature that can be enabled for specific plans
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Feature Key (lowercase, underscores)</Label>
              <Input
                placeholder="e.g. sales.advanced_discounts"
                value={newFeature.feature_key}
                onChange={(e) => setNewFeature(f => ({ ...f, feature_key: e.target.value.toLowerCase().replace(/\s+/g, '_') }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Feature Name</Label>
              <Input
                placeholder="e.g. Advanced Discounts"
                value={newFeature.feature_name}
                onChange={(e) => setNewFeature(f => ({ ...f, feature_name: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Category</Label>
              <Select 
                value={newFeature.category} 
                onValueChange={(v) => setNewFeature(f => ({ ...f, category: v }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FEATURE_CATEGORIES.map(cat => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Description (optional)</Label>
              <Textarea
                placeholder="What does this feature do?"
                value={newFeature.description}
                onChange={(e) => setNewFeature(f => ({ ...f, description: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Enable for Plans</Label>
              <div className="flex flex-wrap gap-2">
                {(['free', 'professional', 'enterprise'] as BVBooksPlan[]).map(plan => (
                  <Button
                    key={plan}
                    type="button"
                    variant={newFeature.plans.includes(plan) ? "default" : "outline"}
                    size="sm"
                    onClick={() => {
                      setNewFeature(f => ({
                        ...f,
                        plans: f.plans.includes(plan) 
                          ? f.plans.filter(p => p !== plan)
                          : [...f.plans, plan]
                      }));
                    }}
                  >
                    {plan.charAt(0).toUpperCase() + plan.slice(1)}
                  </Button>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateFeatureDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={() => createFeature.mutate(newFeature)}
              disabled={!newFeature.feature_key || !newFeature.feature_name || newFeature.plans.length === 0 || createFeature.isPending}
            >
              {createFeature.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Create Feature
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create/Edit Addon Dialog */}
      <Dialog open={addonDialogOpen} onOpenChange={setAddonDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingAddon ? 'Edit Add-on' : 'Create New Add-on'}</DialogTitle>
            <DialogDescription>
              {editingAddon ? 'Update the add-on feature details' : 'Add a new purchasable add-on feature'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto">
            <div className="space-y-2">
              <Label>Feature Key (lowercase, underscores)</Label>
              <Input
                placeholder="e.g. ai_insights"
                value={newAddon.feature_key}
                onChange={(e) => setNewAddon(a => ({ ...a, feature_key: e.target.value.toLowerCase().replace(/\s+/g, '_') }))}
                disabled={!!editingAddon}
              />
            </div>
            <div className="space-y-2">
              <Label>Feature Name</Label>
              <Input
                placeholder="e.g. AI Sales Insights"
                value={newAddon.feature_name}
                onChange={(e) => setNewAddon(a => ({ ...a, feature_name: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                placeholder="What does this add-on provide?"
                value={newAddon.description}
                onChange={(e) => setNewAddon(a => ({ ...a, description: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-2">
                <Label>Monthly Price</Label>
                <Input
                  type="number"
                  placeholder="5000"
                  value={newAddon.price_per_unit || ""}
                  onChange={(e) => setNewAddon(a => ({ ...a, price_per_unit: parseFloat(e.target.value) || 0 }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Quarterly Price</Label>
                <Input
                  type="number"
                  placeholder="13500"
                  value={newAddon.price_quarterly || ""}
                  onChange={(e) => setNewAddon(a => ({ ...a, price_quarterly: parseFloat(e.target.value) || 0 }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Yearly Price</Label>
                <Input
                  type="number"
                  placeholder="48000"
                  value={newAddon.price_yearly || ""}
                  onChange={(e) => setNewAddon(a => ({ ...a, price_yearly: parseFloat(e.target.value) || 0 }))}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Currency</Label>
              <Select
                value={newAddon.currency}
                onValueChange={(v) => setNewAddon(a => ({ ...a, currency: v }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="NGN">NGN (₦)</SelectItem>
                  <SelectItem value="USD">USD ($)</SelectItem>
                  <SelectItem value="GBP">GBP (£)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Available for Plans</Label>
              <div className="flex flex-wrap gap-2">
                {(['starter', 'professional', 'enterprise'] as SubscriptionPlan[]).map(plan => (
                  <Button
                    key={plan}
                    type="button"
                    variant={newAddon.applicable_plans.includes(plan) ? "default" : "outline"}
                    size="sm"
                    onClick={() => {
                      setNewAddon(a => ({
                        ...a,
                        applicable_plans: a.applicable_plans.includes(plan)
                          ? a.applicable_plans.filter(p => p !== plan)
                          : [...a.applicable_plans, plan]
                      }));
                    }}
                  >
                    {plan.charAt(0).toUpperCase() + plan.slice(1)}
                  </Button>
                ))}
              </div>
            </div>
            <div className="flex items-center justify-between">
              <Label>Active</Label>
              <Switch
                checked={newAddon.is_active}
                onCheckedChange={(checked) => setNewAddon(a => ({ ...a, is_active: checked }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddonDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={() => {
                if (editingAddon) {
                  updateAddon.mutate({
                    id: editingAddon.id,
                    feature_name: newAddon.feature_name,
                    description: newAddon.description || null,
                    price_per_unit: newAddon.price_per_unit,
                    price_quarterly: newAddon.price_quarterly,
                    price_yearly: newAddon.price_yearly,
                    currency: newAddon.currency,
                    applicable_plans: newAddon.applicable_plans,
                    is_active: newAddon.is_active,
                  }, {
                    onSuccess: () => {
                      setAddonDialogOpen(false);
                      toast.success("Add-on updated successfully");
                    }
                  });
                } else {
                  createAddon.mutate({
                    feature_key: newAddon.feature_key,
                    feature_name: newAddon.feature_name,
                    description: newAddon.description || null,
                    price_per_unit: newAddon.price_per_unit,
                    currency: newAddon.currency,
                    applicable_plans: newAddon.applicable_plans,
                    is_active: newAddon.is_active,
                  }, {
                    onSuccess: () => {
                      setAddonDialogOpen(false);
                      toast.success("Add-on created successfully");
                    }
                  });
                }
              }}
              disabled={!newAddon.feature_key || !newAddon.feature_name || newAddon.applicable_plans.length === 0 || createAddon.isPending || updateAddon.isPending}
            >
              {(createAddon.isPending || updateAddon.isPending) && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {editingAddon ? 'Update Add-on' : 'Create Add-on'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
