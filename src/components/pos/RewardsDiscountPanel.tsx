import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Gift, Percent, AlertTriangle, Check, Lock, Info, Send, Loader2, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { DISCOUNT_REASONS, DiscountReasonId, calculateRedemption } from "@/hooks/useRewardsRedemption";
import { DiscountPermissions } from "@/hooks/useDiscountLimit";
import { useNavigate } from "react-router-dom";

export type DiscountMode = "rewards" | "company" | "request" | "none";
export type DiscountInputType = "percent" | "amount";

export interface RewardsDiscountState {
  mode: DiscountMode;
  // Rewards mode
  rewardsAmount: number;
  // Company discount mode
  companyDiscountPercent: number;
  companyDiscountAmount: number;
  companyDiscountInputType: DiscountInputType;
  discountReason: DiscountReasonId | null;
  // Request discount mode (for cashiers)
  requestedDiscountPercent: number;
  requestedDiscountAmount: number;
  requestedDiscountInputType: DiscountInputType;
  requestedDiscountReason: DiscountReasonId | null;
}

interface RewardsDiscountPanelProps {
  // Customer info
  selectedCustomerId: string | null;
  customerVaultBalance: number;
  customerName: string | null;
  // Cart info
  cartSubtotal: number;
  // Permissions
  permissions: DiscountPermissions | null | undefined;
  // Rewards settings
  maxDiscountPercent: number;
  isRewardsEnabled: boolean;
  // State
  state: RewardsDiscountState;
  onStateChange: (state: RewardsDiscountState) => void;
  // Formatting
  formatCurrency: (amount: number) => string;
  // Layout
  isMobile?: boolean;
  // Discount approval request
  onRequestDiscountApproval?: (percent: number, amount: number, reason: DiscountReasonId) => Promise<void>;
  isRequestingApproval?: boolean;
}

export function RewardsDiscountPanel({
  selectedCustomerId,
  customerVaultBalance,
  customerName,
  cartSubtotal,
  permissions,
  maxDiscountPercent,
  isRewardsEnabled,
  state,
  onStateChange,
  formatCurrency,
  isMobile = false,
  onRequestDiscountApproval,
  isRequestingApproval = false,
}: RewardsDiscountPanelProps) {
  const navigate = useNavigate();
  const canRedeemRewards = permissions?.canRedeemRewards ?? false;
  const canApplyCompanyDiscount = permissions?.canApplyCompanyDiscount ?? false;
  const companyDiscountLimit = permissions?.companyDiscountLimit ?? 0;
  const userRole = permissions?.role ?? "cashier";
  const isFreePlan = permissions?.isFreePlan ?? false;
  const requiresUpgrade = permissions?.requiresUpgrade ?? false;

  // Calculate rewards redemption
  const redemption = calculateRedemption(
    cartSubtotal,
    customerVaultBalance,
    maxDiscountPercent
  );

  // Update state when customer changes - only reset rewards mode, keep request mode
  useEffect(() => {
    if (!selectedCustomerId) {
      // Only reset if we were in rewards mode
      if (state.mode === "rewards") {
        onStateChange({
          ...state,
          mode: "none",
          rewardsAmount: 0,
        });
      }
    }
  }, [selectedCustomerId]);

  const handleModeChange = (newMode: DiscountMode) => {
    if (newMode === "rewards" && !selectedCustomerId) {
      return; // Can't switch to rewards without a customer
    }
    if (newMode === "company" && !canApplyCompanyDiscount) {
      return; // No permission for company discounts
    }

    onStateChange({
      ...state,
      mode: newMode,
      rewardsAmount: newMode === "rewards" ? redemption.applicableAmount : 0,
      companyDiscountPercent: newMode === "company" ? state.companyDiscountPercent : 0,
      companyDiscountAmount: 0,
      companyDiscountInputType: newMode === "company" ? (state.companyDiscountInputType || "percent") : "percent",
      discountReason: newMode === "company" ? state.discountReason : null,
      // Preserve request mode state when switching to request
      requestedDiscountPercent: newMode === "request" ? state.requestedDiscountPercent : 0,
      requestedDiscountAmount: newMode === "request" ? state.requestedDiscountAmount : 0,
      requestedDiscountInputType: newMode === "request" ? (state.requestedDiscountInputType || "percent") : "percent",
      requestedDiscountReason: newMode === "request" ? state.requestedDiscountReason : null,
    });
  };

  const handleApplyRewards = () => {
    if (!selectedCustomerId || !redemption.isEligible) return;
    
    onStateChange({
      ...state,
      mode: "rewards",
      rewardsAmount: redemption.applicableAmount,
      companyDiscountPercent: 0,
      companyDiscountAmount: 0,
      discountReason: null,
    });
  };

  const handleCompanyDiscountChange = (value: string, inputType: DiscountInputType) => {
    const num = parseFloat(value) || 0;
    let percent: number;
    let amount: number;

    if (inputType === "percent") {
      percent = Math.min(num, companyDiscountLimit);
      amount = (cartSubtotal * percent) / 100;
    } else {
      amount = Math.min(num, cartSubtotal);
      percent = cartSubtotal > 0 ? (amount / cartSubtotal) * 100 : 0;
      // Clamp to limit
      if (percent > companyDiscountLimit) {
        percent = companyDiscountLimit;
        amount = (cartSubtotal * percent) / 100;
      }
    }

    onStateChange({
      ...state,
      mode: "company",
      companyDiscountPercent: percent,
      companyDiscountAmount: amount,
      companyDiscountInputType: inputType,
      rewardsAmount: 0,
    });
  };

  const handleReasonChange = (reason: DiscountReasonId) => {
    onStateChange({
      ...state,
      discountReason: reason,
    });
  };

  const clearDiscount = () => {
    onStateChange({
      mode: "none",
      rewardsAmount: 0,
      companyDiscountPercent: 0,
      companyDiscountAmount: 0,
      companyDiscountInputType: "percent",
      discountReason: null,
      requestedDiscountPercent: 0,
      requestedDiscountAmount: 0,
      requestedDiscountInputType: "percent",
      requestedDiscountReason: null,
    });
  };

  const handleRequestDiscountChange = (value: string, inputType: DiscountInputType) => {
    const num = parseFloat(value) || 0;
    let percent: number;
    let amount: number;

    if (inputType === "percent") {
      percent = Math.min(num, 100);
      amount = (cartSubtotal * percent) / 100;
    } else {
      amount = Math.min(num, cartSubtotal);
      percent = cartSubtotal > 0 ? (amount / cartSubtotal) * 100 : 0;
    }

    onStateChange({
      ...state,
      mode: "request",
      requestedDiscountPercent: percent,
      requestedDiscountAmount: amount,
      requestedDiscountInputType: inputType,
      rewardsAmount: 0,
      companyDiscountPercent: 0,
      companyDiscountAmount: 0,
    });
  };

  const handleRequestReasonChange = (reason: DiscountReasonId) => {
    onStateChange({
      ...state,
      requestedDiscountReason: reason,
    });
  };

  const handleSubmitDiscountRequest = async () => {
    if (
      !onRequestDiscountApproval ||
      state.requestedDiscountPercent <= 0 ||
      !state.requestedDiscountReason
    ) {
      return;
    }

    await onRequestDiscountApproval(
      state.requestedDiscountPercent,
      state.requestedDiscountAmount,
      state.requestedDiscountReason
    );

    // Clear the request state after submission
    clearDiscount();
  };

  // Show panel for: customers with rewards, users with discount permission, or users who can request discounts
  const canRequestDiscount = !canApplyCompanyDiscount && onRequestDiscountApproval;
  
  if (!selectedCustomerId && !canApplyCompanyDiscount && !canRequestDiscount) {
    return null;
  }

  return (
    <Card className={cn("border-dashed", isMobile && "shadow-none border-0 bg-muted/30")}>
      <CardContent className={cn("p-3 space-y-3", isMobile && "px-0")}>
        {/* Mode Toggle */}
        <div className="flex items-center gap-2">
          <TooltipProvider>
            {/* Rewards Mode Button */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={state.mode === "rewards" ? "default" : "outline"}
                  size="sm"
                  className={cn(
                    "flex-1 gap-1.5",
                    !selectedCustomerId && "opacity-50"
                  )}
                  onClick={() => handleModeChange("rewards")}
                  disabled={!selectedCustomerId || !isRewardsEnabled}
                >
                  <Gift className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Redeem Rewards</span>
                  <span className="sm:hidden">Rewards</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                {!selectedCustomerId
                  ? "Select a customer to redeem rewards"
                  : !isRewardsEnabled
                  ? "Rewards program is disabled"
                  : "Apply customer reward points"}
              </TooltipContent>
            </Tooltip>

            {/* Company Discount Button - Upgrade CTA for Free plan */}
            {isFreePlan && !canApplyCompanyDiscount ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 gap-1.5 border-primary/50 text-primary hover:bg-primary/10"
                    onClick={() => navigate("/subscription")}
                  >
                    <Lock className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">Discount</span>
                    <span className="sm:hidden">
                      <TrendingUp className="h-3.5 w-3.5" />
                    </span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="font-medium">Company Discounts require Professional plan</p>
                  <p className="text-xs text-muted-foreground">Click to upgrade and unlock discount features</p>
                </TooltipContent>
              </Tooltip>
            ) : canApplyCompanyDiscount ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant={state.mode === "company" ? "default" : "outline"}
                    size="sm"
                    className="flex-1 gap-1.5"
                    onClick={() => handleModeChange("company")}
                  >
                    <Percent className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">Company Discount</span>
                    <span className="sm:hidden">Discount</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  Apply business-funded discount (max {companyDiscountLimit}%)
                </TooltipContent>
              </Tooltip>
            ) : null}

            {/* Request Discount Button - for cashiers without direct permission (paid plans only) */}
            {!isFreePlan && canRequestDiscount && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant={state.mode === "request" ? "default" : "outline"}
                    size="sm"
                    className="flex-1 gap-1.5"
                    onClick={() => onStateChange({ ...state, mode: "request" })}
                  >
                    <Send className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">Request Discount</span>
                    <span className="sm:hidden">Request</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  Request manager approval for a discount
                </TooltipContent>
              </Tooltip>
            )}
          </TooltipProvider>

          {/* Clear Button */}
          {state.mode !== "none" && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearDiscount}
              className="px-2"
            >
              ✕
            </Button>
          )}
        </div>

        <Separator />

        {/* Rewards Mode Content */}
        {state.mode === "rewards" && selectedCustomerId && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Customer Vault</span>
              <span className="font-medium">{formatCurrency(customerVaultBalance)}</span>
            </div>
            
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Max Redeemable ({maxDiscountPercent}% cap)</span>
              <span className="font-medium">{formatCurrency(redemption.maxRedeemable)}</span>
            </div>

            <Separator className="my-2" />

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Gift className="h-4 w-4 text-primary" />
                <span className="font-medium">Applying</span>
              </div>
              <Badge variant="secondary" className="text-base font-bold">
                {formatCurrency(redemption.applicableAmount)}
              </Badge>
            </div>

            {redemption.applicableAmount > 0 && (
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Check className="h-3 w-3 text-green-500" />
                {redemption.message}
              </p>
            )}

            {!redemption.isEligible && (
              <p className="text-xs text-destructive flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" />
                No rewards available to redeem
              </p>
            )}
          </div>
        )}

        {/* Company Discount Mode Content */}
        {state.mode === "company" && (
          <div className="space-y-3">
            {/* Input Type Toggle */}
            <RadioGroup
              value={state.companyDiscountInputType || "percent"}
              onValueChange={(val) => {
                const inputType = val as DiscountInputType;
                onStateChange({ ...state, companyDiscountInputType: inputType, companyDiscountPercent: 0, companyDiscountAmount: 0 });
              }}
              className="flex gap-4"
            >
              <div className="flex items-center gap-1.5">
                <RadioGroupItem value="percent" id="company-percent" />
                <Label htmlFor="company-percent" className="text-xs cursor-pointer">By %</Label>
              </div>
              <div className="flex items-center gap-1.5">
                <RadioGroupItem value="amount" id="company-amount" />
                <Label htmlFor="company-amount" className="text-xs cursor-pointer">By Amount</Label>
              </div>
            </RadioGroup>

            <div className="flex items-center gap-2">
              {(state.companyDiscountInputType || "percent") === "percent" ? (
                <>
                  <div className="flex-1">
                    <Label className="text-xs text-muted-foreground mb-1 block">
                      Discount % (max {companyDiscountLimit}%)
                    </Label>
                    <Input
                      type="number"
                      value={state.companyDiscountPercent || ""}
                      onChange={(e) => handleCompanyDiscountChange(e.target.value, "percent")}
                      placeholder="0"
                      min="0"
                      max={companyDiscountLimit}
                      step="0.5"
                      className="h-9"
                    />
                  </div>
                  <div className="flex-1">
                    <Label className="text-xs text-muted-foreground mb-1 block">Amount</Label>
                    <div className="h-9 px-3 flex items-center bg-muted rounded-md font-medium text-sm">
                      {formatCurrency(state.companyDiscountAmount)}
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex-1">
                    <Label className="text-xs text-muted-foreground mb-1 block">
                      Discount Amount
                    </Label>
                    <Input
                      type="number"
                      value={state.companyDiscountAmount || ""}
                      onChange={(e) => handleCompanyDiscountChange(e.target.value, "amount")}
                      placeholder="0"
                      min="0"
                      max={cartSubtotal}
                      step="1"
                      className="h-9"
                    />
                  </div>
                  <div className="flex-1">
                    <Label className="text-xs text-muted-foreground mb-1 block">Equivalent %</Label>
                    <div className="h-9 px-3 flex items-center bg-muted rounded-md font-medium text-sm">
                      {state.companyDiscountPercent.toFixed(1)}%
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Reason Selection (Required) */}
            <div>
              <Label className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                Reason <span className="text-destructive">*</span>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger>
                      <Info className="h-3 w-3" />
                    </TooltipTrigger>
                    <TooltipContent>
                      Required for audit trail
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </Label>
              <Select
                value={state.discountReason || ""}
                onValueChange={(val) => handleReasonChange(val as DiscountReasonId)}
              >
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Select a reason..." />
                </SelectTrigger>
                <SelectContent>
                  {DISCOUNT_REASONS.map((reason) => (
                    <SelectItem key={reason.id} value={reason.id}>
                      {reason.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {state.companyDiscountPercent > 0 && !state.discountReason && (
              <p className="text-xs text-warning flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" />
                Please select a discount reason to proceed
              </p>
            )}

            {state.companyDiscountAmount > 0 && state.discountReason && (
              <div className="flex items-center justify-between p-2 bg-muted/50 rounded-md">
                <span className="text-sm">
                  <Badge variant="outline" className="mr-2">{userRole.toUpperCase()}</Badge>
                  Company Discount
                </span>
                <Badge variant="secondary" className="text-base font-bold">
                  -{formatCurrency(state.companyDiscountAmount)}
                </Badge>
              </div>
            )}
          </div>
        )}

        {/* Request Discount Mode Content */}
        {state.mode === "request" && (
          <div className="space-y-3">
            {/* Input Type Toggle */}
            <RadioGroup
              value={state.requestedDiscountInputType || "percent"}
              onValueChange={(val) => {
                const inputType = val as DiscountInputType;
                onStateChange({ ...state, requestedDiscountInputType: inputType, requestedDiscountPercent: 0, requestedDiscountAmount: 0 });
              }}
              className="flex gap-4"
            >
              <div className="flex items-center gap-1.5">
                <RadioGroupItem value="percent" id="request-percent" />
                <Label htmlFor="request-percent" className="text-xs cursor-pointer">By %</Label>
              </div>
              <div className="flex items-center gap-1.5">
                <RadioGroupItem value="amount" id="request-amount" />
                <Label htmlFor="request-amount" className="text-xs cursor-pointer">By Amount</Label>
              </div>
            </RadioGroup>

            <div className="flex items-center gap-2">
              {(state.requestedDiscountInputType || "percent") === "percent" ? (
                <>
                  <div className="flex-1">
                    <Label className="text-xs text-muted-foreground mb-1 block">
                      Discount %
                    </Label>
                    <Input
                      type="number"
                      value={state.requestedDiscountPercent || ""}
                      onChange={(e) => handleRequestDiscountChange(e.target.value, "percent")}
                      placeholder="0"
                      min="0"
                      max="100"
                      step="0.5"
                      className="h-9"
                    />
                  </div>
                  <div className="flex-1">
                    <Label className="text-xs text-muted-foreground mb-1 block">Amount</Label>
                    <div className="h-9 px-3 flex items-center bg-muted rounded-md font-medium text-sm">
                      {formatCurrency(state.requestedDiscountAmount)}
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex-1">
                    <Label className="text-xs text-muted-foreground mb-1 block">
                      Discount Amount
                    </Label>
                    <Input
                      type="number"
                      value={state.requestedDiscountAmount || ""}
                      onChange={(e) => handleRequestDiscountChange(e.target.value, "amount")}
                      placeholder="0"
                      min="0"
                      max={cartSubtotal}
                      step="1"
                      className="h-9"
                    />
                  </div>
                  <div className="flex-1">
                    <Label className="text-xs text-muted-foreground mb-1 block">Equivalent %</Label>
                    <div className="h-9 px-3 flex items-center bg-muted rounded-md font-medium text-sm">
                      {state.requestedDiscountPercent.toFixed(1)}%
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Reason Selection (Required) */}
            <div>
              <Label className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                Reason <span className="text-destructive">*</span>
              </Label>
              <Select
                value={state.requestedDiscountReason || ""}
                onValueChange={(val) => handleRequestReasonChange(val as DiscountReasonId)}
              >
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Select a reason..." />
                </SelectTrigger>
                <SelectContent>
                  {DISCOUNT_REASONS.map((reason) => (
                    <SelectItem key={reason.id} value={reason.id}>
                      {reason.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {state.requestedDiscountPercent > 0 && !state.requestedDiscountReason && (
              <p className="text-xs text-warning flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" />
                Please select a discount reason to proceed
              </p>
            )}

            {state.requestedDiscountPercent > 0 && state.requestedDiscountReason && (
              <Button
                onClick={handleSubmitDiscountRequest}
                disabled={isRequestingApproval}
                className="w-full gap-2"
                size="sm"
              >
                {isRequestingApproval ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4" />
                    Request {state.requestedDiscountPercent.toFixed(1)}% ({formatCurrency(state.requestedDiscountAmount)}) Discount Approval
                  </>
                )}
              </Button>
            )}

            <p className="text-xs text-muted-foreground text-center">
              This will send a request to your manager for approval
            </p>
          </div>
        )}

        {/* No Mode Selected - Show Prompt */}
        {state.mode === "none" && (
          <div className="text-center py-2 text-sm text-muted-foreground">
            {selectedCustomerId && isRewardsEnabled && customerVaultBalance > 0 ? (
              <Button
                variant="outline"
                size="sm"
                onClick={handleApplyRewards}
                className="gap-2"
              >
                <Gift className="h-4 w-4" />
                Apply {formatCurrency(redemption.applicableAmount)} Rewards
              </Button>
            ) : (
              <span>No discount applied</span>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Default state factory
export function createDefaultRewardsDiscountState(): RewardsDiscountState {
  return {
    mode: "none",
    rewardsAmount: 0,
    companyDiscountPercent: 0,
    companyDiscountAmount: 0,
    companyDiscountInputType: "percent",
    discountReason: null,
    requestedDiscountPercent: 0,
    requestedDiscountAmount: 0,
    requestedDiscountInputType: "percent",
    requestedDiscountReason: null,
  };
}

// Validation helper
export function validateDiscountState(state: RewardsDiscountState): {
  isValid: boolean;
  error: string | null;
} {
  if (state.mode === "company") {
    if (state.companyDiscountPercent > 0 && !state.discountReason) {
      return { isValid: false, error: "Please select a discount reason" };
    }
  }
  if (state.mode === "request") {
    if (state.requestedDiscountPercent > 0 && !state.requestedDiscountReason) {
      return { isValid: false, error: "Please select a discount reason" };
    }
  }
  return { isValid: true, error: null };
}

// Get the actual discount amount to apply
export function getDiscountAmount(state: RewardsDiscountState): number {
  if (state.mode === "rewards") {
    return state.rewardsAmount;
  }
  if (state.mode === "company") {
    return state.companyDiscountAmount;
  }
  return 0;
}
