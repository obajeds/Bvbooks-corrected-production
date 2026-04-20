import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Gift, Percent, Settings, Loader2, AlertTriangle, Info, Shield } from "lucide-react";
import { toast } from "sonner";
import { RewardsPresetCard } from "./RewardsPresetCard";
import {
  useRewardsSettings,
  useUpsertRewardsSettings,
  REWARDS_PRESETS,
  REWARDS_LIMITS,
  validateRewardsSettings,
  calculateRewardsSummary,
  RewardsPreset,
} from "@/hooks/useRewardsSettings";

interface RewardsSettingsPanelProps {
  canManage: boolean;
}

export function RewardsSettingsPanel({ canManage }: RewardsSettingsPanelProps) {
  const { data: rewardsSettings, isLoading } = useRewardsSettings();
  const upsertRewards = useUpsertRewardsSettings();
  
  const [mode, setMode] = useState<"presets" | "custom">("presets");
  const [selectedPresetId, setSelectedPresetId] = useState<string>("standard");
  
  const [customForm, setCustomForm] = useState({
    is_enabled: true,
    points_per_naira: 1,
    naira_per_point: 0.01,
    min_points_to_redeem: 1000,
    max_discount_percent: 10,
  });

  // Determine current preset or custom based on settings
  useEffect(() => {
    if (rewardsSettings) {
      const matchingPreset = REWARDS_PRESETS.find(
        (p) =>
          p.is_enabled === rewardsSettings.is_enabled &&
          p.points_per_naira === rewardsSettings.points_per_naira &&
          Math.abs(p.naira_per_point - rewardsSettings.naira_per_point) < 0.001
      );

      if (matchingPreset) {
        setSelectedPresetId(matchingPreset.id);
        setMode("presets");
      } else {
        setMode("custom");
      }

      setCustomForm({
        is_enabled: rewardsSettings.is_enabled,
        points_per_naira: rewardsSettings.points_per_naira,
        naira_per_point: rewardsSettings.naira_per_point,
        min_points_to_redeem: rewardsSettings.min_points_to_redeem,
        max_discount_percent: rewardsSettings.max_discount_percent,
      });
    }
  }, [rewardsSettings]);

  const handleSelectPreset = (preset: RewardsPreset) => {
    setSelectedPresetId(preset.id);
    setCustomForm({
      is_enabled: preset.is_enabled,
      points_per_naira: preset.points_per_naira,
      naira_per_point: preset.naira_per_point,
      min_points_to_redeem: preset.min_points_to_redeem,
      max_discount_percent: preset.max_discount_percent,
    });
  };

  const handleSave = async () => {
    const validation = validateRewardsSettings(customForm);
    
    if (validation.errors.length > 0) {
      toast.error(validation.errors[0]);
      return;
    }

    if (validation.warnings.length > 0) {
      validation.warnings.forEach((w) => toast.warning(w));
    }

    try {
      await upsertRewards.mutateAsync(customForm);
      toast.success("Rewards settings saved successfully!");
    } catch (error: any) {
      toast.error(error.message || "Failed to save rewards settings");
    }
  };

  const validation = validateRewardsSettings(customForm);
  const summary = calculateRewardsSummary(customForm.points_per_naira, customForm.naira_per_point);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
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
              <Gift className="h-5 w-5" />
              Rewards Program
            </CardTitle>
            <CardDescription>
              Configure how customers earn and redeem reward points
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Label htmlFor="rewards-enabled" className="text-sm">
              Enable Rewards
            </Label>
            <Switch
              id="rewards-enabled"
              checked={customForm.is_enabled}
              disabled={!canManage}
              onCheckedChange={(checked) =>
                setCustomForm({ ...customForm, is_enabled: checked })
              }
            />
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        <Tabs value={mode} onValueChange={(v) => setMode(v as "presets" | "custom")}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="presets">
              <Gift className="h-4 w-4 mr-2" />
              Presets
            </TabsTrigger>
            <TabsTrigger value="custom">
              <Settings className="h-4 w-4 mr-2" />
              Custom
            </TabsTrigger>
          </TabsList>

          <TabsContent value="presets" className="space-y-4 mt-4">
            <div className="grid gap-4 md:grid-cols-3">
              {REWARDS_PRESETS.map((preset) => (
                <RewardsPresetCard
                  key={preset.id}
                  preset={preset}
                  isSelected={selectedPresetId === preset.id}
                  onSelect={() => handleSelectPreset(preset)}
                  disabled={!canManage}
                />
              ))}
            </div>
          </TabsContent>

          <TabsContent value="custom" className="space-y-4 mt-4">
            {/* Warnings */}
            {validation.warnings.length > 0 && (
              <Alert variant="destructive" className="bg-amber-50 border-amber-200 text-amber-800">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  {validation.warnings.map((w, i) => (
                    <p key={i}>{w}</p>
                  ))}
                </AlertDescription>
              </Alert>
            )}

            <div className="grid gap-6 sm:grid-cols-2">
              {/* Points Earning */}
              <Card className="border-dashed">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Percent className="h-4 w-4 text-primary" />
                    Points Earning
                  </CardTitle>
                  <CardDescription>
                    How many reward points a customer earns for every ₦1 spent
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <Label>Points per ₦1 spent</Label>
                    <Input
                      type="number"
                      min="0"
                      max={REWARDS_LIMITS.maxPointsPerNaira}
                      step="0.1"
                      value={customForm.points_per_naira}
                      disabled={!canManage}
                      onChange={(e) =>
                        setCustomForm({
                          ...customForm,
                          points_per_naira: Math.min(
                            parseFloat(e.target.value) || 0,
                            REWARDS_LIMITS.maxPointsPerNaira
                          ),
                        })
                      }
                    />
                    <p className="text-xs text-muted-foreground">
                      Max: {REWARDS_LIMITS.maxPointsPerNaira} points per ₦1
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Points Redemption */}
              <Card className="border-dashed">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Gift className="h-4 w-4 text-primary" />
                    Points Redemption
                  </CardTitle>
                  <CardDescription>
                    How much one reward point is worth as a discount
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <Label>Naira value per point</Label>
                    <Input
                      type="number"
                      min="0.001"
                      max={REWARDS_LIMITS.maxNairaPerPoint}
                      step="0.001"
                      value={customForm.naira_per_point}
                      disabled={!canManage}
                      onChange={(e) =>
                        setCustomForm({
                          ...customForm,
                          naira_per_point: Math.min(
                            parseFloat(e.target.value) || 0,
                            REWARDS_LIMITS.maxNairaPerPoint
                          ),
                        })
                      }
                    />
                    <p className="text-xs text-muted-foreground">
                      Max: ₦{REWARDS_LIMITS.maxNairaPerPoint} per point
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Safety Limits */}
            <Card className="border-dashed">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Shield className="h-4 w-4 text-primary" />
                  Safety Limits
                </CardTitle>
                <CardDescription>
                  Protect your margins with redemption limits
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Minimum points to redeem</Label>
                    <Input
                      type="number"
                      min="100"
                      step="100"
                      value={customForm.min_points_to_redeem}
                      disabled={!canManage}
                      onChange={(e) =>
                        setCustomForm({
                          ...customForm,
                          min_points_to_redeem: Math.max(
                            parseInt(e.target.value) || 100,
                            100
                          ),
                        })
                      }
                    />
                    <p className="text-xs text-muted-foreground">
                      Minimum: 100 points
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label>Max discount per sale (%)</Label>
                    <Input
                      type="number"
                      min="1"
                      max="50"
                      step="1"
                      value={customForm.max_discount_percent}
                      disabled={!canManage}
                      onChange={(e) =>
                        setCustomForm({
                          ...customForm,
                          max_discount_percent: Math.min(
                            Math.max(parseInt(e.target.value) || 1, 1),
                            50
                          ),
                        })
                      }
                    />
                    <p className="text-xs text-muted-foreground">
                      Recommended: 10%
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Summary */}
        {customForm.is_enabled && (
          <Card className="bg-muted/50">
            <CardContent className="pt-6">
              <h4 className="font-medium mb-3 flex items-center gap-2">
                <Info className="h-4 w-4" />
                Rewards Summary
              </h4>
              <div className="grid gap-4 sm:grid-cols-4 text-center">
                <div>
                  <p className="text-2xl font-bold text-primary">
                    {customForm.points_per_naira}
                  </p>
                  <p className="text-sm text-muted-foreground">Points per ₦1</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-primary">
                    ₦{customForm.naira_per_point}
                  </p>
                  <p className="text-sm text-muted-foreground">Value per point</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-primary">
                    {summary.pointsFor1NairaDiscount}
                  </p>
                  <p className="text-sm text-muted-foreground">Points for ₦1 discount</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-primary">
                    {summary.effectiveRewardPercent}%
                  </p>
                  <p className="text-sm text-muted-foreground">Effective reward</p>
                </div>
              </div>
              <div className="mt-4 p-3 rounded-md bg-background border text-center">
                <p className="text-sm font-medium">
                  {summary.pointsFor1NairaDiscount} points = ₦1 discount
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  100 points = ₦{summary.example100Points.toFixed(2)} discount
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Info Box */}
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription className="text-sm">
            <strong>How it works:</strong> On purchase, customers earn points based on
            amount spent. Points can be redeemed as discounts (up to{" "}
            {customForm.max_discount_percent}% of invoice). Points are non-transferable
            and non-cash.
          </AlertDescription>
        </Alert>

        {canManage && (
          <div className="flex justify-end">
            <Button onClick={handleSave} disabled={upsertRewards.isPending}>
              {upsertRewards.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Save Rewards Settings
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
