import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Building, Users, Shield, Receipt, Bell, Plug, ImageIcon, GitBranch, Ruler, Loader2, Mail, CreditCard, ShieldX, Barcode, Package, HelpCircle, Crown, Clock, Lock, Trash2, Monitor } from "lucide-react";
import { ExperienceSwitcher } from "@/components/settings/ExperienceSwitcher";
import { useBusinessPlan } from "@/hooks/useFeatureGating";
import { SystemRulesHelp } from "@/components/help/SystemRulesHelp";
import { BusinessLogoUpload } from "@/components/settings/BusinessLogoUpload";
import { RolePermissionsSettings } from "@/components/settings/RolePermissionsSettings";
import { BranchesSettings } from "@/components/settings/BranchesSettings";
import { MeasurementUnitsSettings } from "@/components/settings/MeasurementUnitsSettings";
import { SubscriptionSettings } from "@/components/settings/SubscriptionSettings";
import { BarcodeSettings } from "@/components/settings/BarcodeSettings";
import { AddonSettings } from "@/components/settings/AddonSettings";
import { BusinessHoursSettings } from "@/components/settings/BusinessHoursSettings";
import { ClientNotificationPreferences } from "@/components/settings/ClientNotificationPreferences";
import { AccountClosureSettings } from "@/components/settings/AccountClosureSettings";
import { PermissionGate, AccessDenied } from "@/components/auth/PermissionGate";
import { toast } from "sonner";
import { useBusiness, useUpdateBusiness } from "@/hooks/useBusiness";
import { Skeleton } from "@/components/ui/skeleton";
import { useUserRole } from "@/hooks/useUserRole";
import { useCurrentUserPermissions } from "@/hooks/usePermissions";
import { supabase } from "@/integrations/supabase/client";
import { useBranchContext } from "@/contexts/BranchContext";
import { ErrorBoundary } from "@/components/ErrorBoundary";

const Settings = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { data: business, isLoading: businessLoading } = useBusiness();
  const updateBusiness = useUpdateBusiness();
  const { data: roleData, isLoading: roleLoading } = useUserRole();
  const { data: permData, isLoading: permLoading } = useCurrentUserPermissions();
  const { isOwner: branchIsOwner, isLoading: branchLoading } = useBranchContext();
  const { data: planInfo } = useBusinessPlan();
  const [isSaving, setIsSaving] = useState(false);
  
  // Read tab from URL params, default to "business"
  const activeTab = searchParams.get("tab") || "business";
  
  const handleTabChange = (value: string) => {
    setSearchParams({ tab: value });
  };
  
  const isFreePlan = planInfo?.effectivePlan === 'free';
  const isEnterprisePlan = planInfo?.effectivePlan === 'enterprise';
  const canAccessAdvancedSettings = isEnterprisePlan; // Barcode, Integrations, Hours are Enterprise-only

  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    email: "",
    address: "",
    currency: "NGN",
  });

  // Populate form with real business data
  useEffect(() => {
    if (business) {
      setFormData({
        name: business.trading_name || "",
        phone: business.phone || "",
        email: business.owner_email || "",
        address: business.address || "",
        currency: business.currency || "NGN",
      });
    }
  }, [business]);

  const [receiptSettings, setReceiptSettings] = useState({
    receipt_footer: "Thank you for your patronage!",
    show_receipt_logo: true,
    show_receipt_tax: true,
    receipt_paper_size: "80mm",
  });

  const [taxSettings, setTaxSettings] = useState({
    enabled: false,
    name: "VAT",
    rate: "7.5",
  });

  // Load saved tax settings when business ID becomes available
  useEffect(() => {
    if (business?.id) {
      try {
        const saved = localStorage.getItem(`tax_settings_${business.id}`);
        if (saved) {
          const parsed = JSON.parse(saved);
          setTaxSettings(parsed);
        }
      } catch {}
    }
  }, [business?.id]);

  const handleSaveChanges = async () => {
    if (!business?.id) {
      toast.error("No business found");
      return;
    }
    setIsSaving(true);
    try {
      await updateBusiness.mutateAsync({
        id: business.id,
        trading_name: formData.name,
        phone: formData.phone || null,
        address: formData.address || null,
        currency: formData.currency,
      });
      toast.success("Business information updated successfully");
    } catch (error) {
      toast.error("Failed to update business information");
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveReceiptSettings = async () => {
    setIsSaving(true);
    setTimeout(() => {
      toast.success("Receipt settings updated successfully");
      setIsSaving(false);
    }, 500);
  };

  const handleSaveTaxSettings = async () => {
    if (!business?.id) {
      toast.error("No business found");
      return;
    }
    setIsSaving(true);
    try {
      localStorage.setItem(`tax_settings_${business.id}`, JSON.stringify(taxSettings));
      toast.success("Tax settings updated successfully");
    } catch {
      toast.error("Failed to save tax settings");
    } finally {
      setIsSaving(false);
    }
  };

  const isOwner = branchIsOwner || (roleData?.isOwner ?? false);
  const hasSettingsAccess = isOwner || permData?.permissions?.includes('settings.view') || permData?.permissions?.includes('settings.manage');

  // Loading state - wait for ALL ownership signals before rendering access denied
  if (roleLoading || permLoading || branchLoading) {
    return (
      <main className="flex-1 overflow-y-auto p-6 space-y-6">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-6 w-72" />
        <Skeleton className="h-96 w-full" />
      </main>
    );
  }

  // Access denied for staff without settings permission
  if (!hasSettingsAccess) {
    return (
      <main className="flex-1 overflow-y-auto p-6">
        <Card className="border-destructive/50 bg-destructive/5">
          <CardContent className="flex flex-col items-center justify-center py-12 space-y-4">
            <ShieldX className="h-12 w-12 text-destructive" />
            <h2 className="text-xl font-semibold text-destructive">Access Restricted</h2>
            <p className="text-muted-foreground text-center max-w-md">
              You don't have permission to access Settings. Contact your administrator to request access.
            </p>
          </CardContent>
        </Card>
      </main>
    );
  }

  return (
    <main className="flex-1 overflow-y-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">Manage your business and system settings</p>
      </div>

      <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="business" className="gap-2">
            <Building className="h-4 w-4" />
            <span className="hidden sm:inline">Business</span>
          </TabsTrigger>
          <TabsTrigger value="branding" className="gap-2">
            <ImageIcon className="h-4 w-4" />
            <span className="hidden sm:inline">Branding</span>
          </TabsTrigger>
          <TabsTrigger value="branches" className="gap-2">
            <GitBranch className="h-4 w-4" />
            <span className="hidden sm:inline">Branches</span>
          </TabsTrigger>
          <TabsTrigger value="permissions" className="gap-2">
            <Shield className="h-4 w-4" />
            <span className="hidden sm:inline">Permissions</span>
          </TabsTrigger>
          <TabsTrigger value="units" className="gap-2">
            <Ruler className="h-4 w-4" />
            <span className="hidden sm:inline">Units</span>
          </TabsTrigger>
          <TabsTrigger value="receipt" className="gap-2">
            <Receipt className="h-4 w-4" />
            <span className="hidden sm:inline">Receipt</span>
          </TabsTrigger>
          <TabsTrigger value="taxes" className="gap-2">
            <Receipt className="h-4 w-4" />
            <span className="hidden sm:inline">Taxes</span>
          </TabsTrigger>
          <TabsTrigger value="notifications" className="gap-2">
            <Bell className="h-4 w-4" />
            <span className="hidden sm:inline">Notifications</span>
          </TabsTrigger>
          <TabsTrigger value="subscription" className="gap-2">
            <CreditCard className="h-4 w-4" />
            <span className="hidden sm:inline">Subscription</span>
          </TabsTrigger>
          <TabsTrigger value="integrations" className="gap-2">
            <Plug className="h-4 w-4" />
            <span className="hidden sm:inline">Integrations</span>
          </TabsTrigger>
          <TabsTrigger value="barcode" className="gap-2">
            <Barcode className="h-4 w-4" />
            <span className="hidden sm:inline">Barcode</span>
          </TabsTrigger>
          {isOwner && (
            <TabsTrigger value="addons" className="gap-2">
              <Package className="h-4 w-4" />
              <span className="hidden sm:inline">Add-ons</span>
            </TabsTrigger>
          )}
          <TabsTrigger value="help" className="gap-2">
            <HelpCircle className="h-4 w-4" />
            <span className="hidden sm:inline">Help</span>
          </TabsTrigger>
          <TabsTrigger value="hours" className="gap-2">
            <Clock className="h-4 w-4" />
            <span className="hidden sm:inline">Hours</span>
          </TabsTrigger>
          <TabsTrigger value="view" className="gap-2">
            <Monitor className="h-4 w-4" />
            <span className="hidden sm:inline">View</span>
          </TabsTrigger>
          <TabsTrigger value="account-closure" className="gap-2 text-destructive data-[state=active]:text-destructive">
            <Trash2 className="h-4 w-4" />
            <span className="hidden sm:inline">Close Account</span>
          </TabsTrigger>
        </TabsList>

        {/* View Mode Settings */}
        <TabsContent value="view">
          <ExperienceSwitcher />
        </TabsContent>

        <TabsContent value="business">
          <PermissionGate permissions="settings.manage" fallback={<AccessDenied message="You need permission to manage business settings." />}>
            <Card>
              <CardHeader>
                <CardTitle>Business Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {businessLoading ? (
                  <div className="space-y-4">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <Skeleton className="h-10 w-full" />
                      <Skeleton className="h-10 w-full" />
                      <Skeleton className="h-10 w-full" />
                      <Skeleton className="h-10 w-full" />
                    </div>
                    <Skeleton className="h-20 w-full" />
                  </div>
                ) : (
                  <>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label>Business Name</Label>
                        <Input
                          value={formData.name}
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                          placeholder="Enter business name"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Phone Number</Label>
                        <Input
                          value={formData.phone}
                          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                          placeholder="+234..."
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Email Address</Label>
                        <Input
                          value={formData.email}
                          readOnly
                          className="bg-muted"
                          placeholder="email@business.com"
                        />
                        <p className="text-xs text-muted-foreground">Email is linked to your account</p>
                      </div>
                      <div className="space-y-2">
                        <Label>Currency</Label>
                        <Select 
                          value={formData.currency} 
                          onValueChange={(value) => setFormData({ ...formData, currency: value })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="NGN">Nigerian Naira (₦)</SelectItem>
                            <SelectItem value="USD">US Dollar ($)</SelectItem>
                            <SelectItem value="GBP">British Pound (£)</SelectItem>
                            <SelectItem value="EUR">Euro (€)</SelectItem>
                            <SelectItem value="GHS">Ghanaian Cedi (₵)</SelectItem>
                            <SelectItem value="KES">Kenyan Shilling (KSh)</SelectItem>
                            <SelectItem value="ZAR">South African Rand (R)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Business Address</Label>
                      <Textarea
                        value={formData.address}
                        onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                        placeholder="Enter business address"
                      />
                    </div>
                    <Button onClick={handleSaveChanges} disabled={isSaving}>
                      {isSaving ? "Saving..." : "Save Changes"}
                    </Button>
                  </>
                )}
              </CardContent>
            </Card>
          </PermissionGate>
        </TabsContent>

        <TabsContent value="branding">
          <PermissionGate permissions="settings.manage" fallback={<AccessDenied message="You need permission to manage branding settings." />}>
            <BusinessLogoUpload />
          </PermissionGate>
        </TabsContent>

        <TabsContent value="branches">
          <PermissionGate permissions="settings.branches.manage" fallback={<AccessDenied message="You need permission to manage branches." />}>
            <BranchesSettings />
          </PermissionGate>
        </TabsContent>

        <TabsContent value="permissions">
          {isOwner ? (
            <ErrorBoundary fallbackTitle="Permissions failed to load">
              <RolePermissionsSettings />
            </ErrorBoundary>
          ) : (
            <AccessDenied message="Only the business owner can manage staff roles and permissions." />
          )}
        </TabsContent>

        <TabsContent value="units">
          <PermissionGate permissions="settings.manage" fallback={<AccessDenied message="You need permission to manage measurement units." />}>
            <MeasurementUnitsSettings />
          </PermissionGate>
        </TabsContent>

        <TabsContent value="receipt">
          <PermissionGate permissions="settings.manage" fallback={<AccessDenied message="You need permission to manage receipt settings." />}>
            <Card>
              <CardHeader>
                <CardTitle>Receipt Settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Show Business Logo</p>
                    <p className="text-sm text-muted-foreground">Display your business logo on receipts</p>
                  </div>
                  <Switch
                    checked={receiptSettings.show_receipt_logo}
                    onCheckedChange={(checked) =>
                      setReceiptSettings({ ...receiptSettings, show_receipt_logo: checked })
                    }
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Show Tax Breakdown</p>
                    <p className="text-sm text-muted-foreground">Display tax details on receipts</p>
                  </div>
                  <Switch
                    checked={receiptSettings.show_receipt_tax}
                    onCheckedChange={(checked) =>
                      setReceiptSettings({ ...receiptSettings, show_receipt_tax: checked })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Paper Size</Label>
                  <Select
                    value={receiptSettings.receipt_paper_size}
                    onValueChange={(value) =>
                      setReceiptSettings({ ...receiptSettings, receipt_paper_size: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="80mm">80mm Thermal (POS)</SelectItem>
                      <SelectItem value="58mm">58mm Thermal (Mini)</SelectItem>
                      <SelectItem value="A4">A4 Paper</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">Choose the paper size for your receipt printer</p>
                </div>
                <div className="space-y-2">
                  <Label>Custom Footer Message</Label>
                  <Textarea
                    value={receiptSettings.receipt_footer}
                    onChange={(e) =>
                      setReceiptSettings({ ...receiptSettings, receipt_footer: e.target.value })
                    }
                    placeholder="Thank you for your patronage!"
                    rows={3}
                  />
                  <p className="text-xs text-muted-foreground">
                    This message will appear at the bottom of all receipts
                  </p>
                </div>
                <Button onClick={handleSaveReceiptSettings} disabled={isSaving}>
                  {isSaving ? "Saving..." : "Save Receipt Settings"}
                </Button>
              </CardContent>
            </Card>
          </PermissionGate>
        </TabsContent>

        <TabsContent value="taxes">
          <PermissionGate permissions="settings.manage" fallback={<AccessDenied message="You need permission to manage tax settings." />}>
            {isFreePlan ? (
              <Card className="border shadow-sm bg-muted/30">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Lock className="h-4 w-4 text-muted-foreground" />
                    Tax Settings
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-8">
                    <Receipt className="h-12 w-12 mx-auto mb-3 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground mb-4">
                      Tax settings are available on Professional or Enterprise plans.
                    </p>
                    <Button asChild variant="default" size="sm">
                      <a href="/subscription">Upgrade to Professional</a>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle>Tax Settings</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Enable Tax</p>
                      <p className="text-sm text-muted-foreground">Apply tax to sales transactions</p>
                    </div>
                    <Switch
                      checked={taxSettings.enabled}
                      onCheckedChange={(checked) => setTaxSettings({ ...taxSettings, enabled: checked })}
                    />
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Tax Name</Label>
                      <Input
                        value={taxSettings.name}
                        onChange={(e) => setTaxSettings({ ...taxSettings, name: e.target.value })}
                        placeholder="VAT"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Tax Rate (%)</Label>
                      <Input
                        value={taxSettings.rate}
                        onChange={(e) => setTaxSettings({ ...taxSettings, rate: e.target.value })}
                        placeholder="7.5"
                        type="number"
                      />
                    </div>
                  </div>
                  <Button onClick={handleSaveTaxSettings} disabled={isSaving}>
                    {isSaving ? "Saving..." : "Save Tax Settings"}
                  </Button>
                </CardContent>
              </Card>
            )}
          </PermissionGate>
        </TabsContent>

        <TabsContent value="notifications">
          <PermissionGate permissions="settings.manage" fallback={<AccessDenied message="You need permission to manage notification settings." />}>
            <ClientNotificationPreferences />
          </PermissionGate>
        </TabsContent>

        <TabsContent value="subscription">
          <PermissionGate permissions="settings.manage" fallback={<AccessDenied message="You need permission to view subscription settings." />}>
            <SubscriptionSettings />
          </PermissionGate>
        </TabsContent>

        <TabsContent value="integrations">
          <PermissionGate permissions="settings.manage" fallback={<AccessDenied message="You need permission to manage integrations." />}>
            {!canAccessAdvancedSettings ? (
              <Card className="border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/20">
                <CardContent className="flex flex-col items-center justify-center py-12 space-y-4">
                  <div className="h-12 w-12 rounded-full bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center">
                    <Lock className="h-6 w-6 text-amber-600 dark:text-amber-400" />
                  </div>
                  <h2 className="text-xl font-semibold">Integrations Locked</h2>
                  <p className="text-muted-foreground text-center max-w-md">
                    Connect payment gateways and third-party services by upgrading to Enterprise plan.
                  </p>
                  <Button onClick={() => document.querySelector('[value="subscription"]')?.dispatchEvent(new MouseEvent('click', { bubbles: true }))}>
                    <Crown className="h-4 w-4 mr-2" />
                    Upgrade to Enterprise
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle>Integrations</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-4">
                      <div className="h-10 w-10 rounded-lg bg-green-100 flex items-center justify-center text-green-600 font-bold">
                        P
                      </div>
                      <div>
                        <p className="font-medium">Paystack</p>
                        <p className="text-sm text-muted-foreground">Accept online payments</p>
                      </div>
                    </div>
                    <Button variant="outline">Connect</Button>
                  </div>
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-4">
                      <div className="h-10 w-10 rounded-lg bg-orange-100 flex items-center justify-center text-orange-600 font-bold">
                        F
                      </div>
                      <div>
                        <p className="font-medium">Flutterwave</p>
                        <p className="text-sm text-muted-foreground">Payment gateway integration</p>
                      </div>
                    </div>
                    <Button variant="outline">Connect</Button>
                  </div>
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-4">
                      <div className="h-10 w-10 rounded-lg bg-green-100 flex items-center justify-center text-green-600 font-bold">
                        W
                      </div>
                      <div>
                        <p className="font-medium">WhatsApp Business</p>
                        <p className="text-sm text-muted-foreground">Send receipts via WhatsApp</p>
                      </div>
                    </div>
                    <Button variant="secondary">Connected</Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </PermissionGate>
        </TabsContent>

        <TabsContent value="barcode">
          <PermissionGate permissions="settings.manage" fallback={<AccessDenied message="You need permission to manage barcode settings." />}>
            {!canAccessAdvancedSettings ? (
              <Card className="border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/20">
                <CardContent className="flex flex-col items-center justify-center py-12 space-y-4">
                  <div className="h-12 w-12 rounded-full bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center">
                    <Lock className="h-6 w-6 text-amber-600 dark:text-amber-400" />
                  </div>
                  <h2 className="text-xl font-semibold">Barcode System Locked</h2>
                  <p className="text-muted-foreground text-center max-w-md">
                    Unlock barcode scanning and label printing features by upgrading to Enterprise plan.
                  </p>
                  <Button onClick={() => document.querySelector('[value="subscription"]')?.dispatchEvent(new MouseEvent('click', { bubbles: true }))}>
                    <Crown className="h-4 w-4 mr-2" />
                    Upgrade to Enterprise
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <BarcodeSettings />
            )}
          </PermissionGate>
        </TabsContent>

        <TabsContent value="addons">
          <PermissionGate permissions="settings.view" fallback={<AccessDenied message="Only the business owner can manage add-on services." />}>
            {isOwner ? (
              <AddonSettings />
            ) : (
              <AccessDenied message="Only the business owner can manage add-on services." />
            )}
          </PermissionGate>
        </TabsContent>

        <TabsContent value="help">
          <SystemRulesHelp />
        </TabsContent>

        <TabsContent value="hours">
          <PermissionGate permissions="settings.manage" fallback={<AccessDenied message="You need permission to manage business hours." />}>
            {!canAccessAdvancedSettings ? (
              <Card className="border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/20">
                <CardContent className="flex flex-col items-center justify-center py-12 space-y-4">
                  <div className="h-12 w-12 rounded-full bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center">
                    <Lock className="h-6 w-6 text-amber-600 dark:text-amber-400" />
                  </div>
                  <h2 className="text-xl font-semibold">Business Hours Locked</h2>
                  <p className="text-muted-foreground text-center max-w-md">
                    Configure custom business hours and schedules by upgrading to Enterprise plan.
                  </p>
                  <Button onClick={() => document.querySelector('[value="subscription"]')?.dispatchEvent(new MouseEvent('click', { bubbles: true }))}>
                    <Crown className="h-4 w-4 mr-2" />
                    Upgrade to Enterprise
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <BusinessHoursSettings />
            )}
          </PermissionGate>
        </TabsContent>

        <TabsContent value="account-closure">
          <PermissionGate permissions="settings.manage" fallback={<AccessDenied message="Only business owners can close accounts." />}>
            <AccountClosureSettings />
          </PermissionGate>
        </TabsContent>
      </Tabs>
    </main>
  );
};

export default Settings;
