import { useMemo } from "react";
import { format, differenceInDays, isBefore, isAfter, isSameDay } from "date-fns";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, AlertTriangle, Check, Package, Building2, Users, RefreshCw } from "lucide-react";

interface AddonStatusCardProps {
  addon: {
    id: string;
    addon_feature?: {
      feature_name: string;
      feature_key: string;
      description?: string | null;
    } | null;
    quantity: number;
    status: string;
    start_date: string;
    end_date: string | null;
    branch_id?: string | null;
    billing_period?: string | null;
  };
  mainPlanExpiryDate: Date | null;
  /** Whether main plan is active - if false, addon is inactive */
  isMainPlanActive?: boolean;
  branchName?: string;
  onRenewAddon?: (addonId: string) => void;
  canManage?: boolean;
}

type AlignmentStatus = "aligned" | "expires_before" | "expires_after" | "expired" | "no_expiry" | "inactive";

/**
 * AddonStatusCard - Displays add-on status with main plan alignment messaging
 * 
 * Shows:
 * - Add-on feature details (name, quantity, branch)
 * - Expiry status relative to main plan
 * - Clear alignment messaging (aligned, expires before/after main plan)
 * - Renewal CTA when expired or misaligned
 */
export function AddonStatusCard({
  addon,
  mainPlanExpiryDate,
  isMainPlanActive = true,
  branchName,
  onRenewAddon,
  canManage = true,
}: AddonStatusCardProps) {
  const now = new Date();
  const addonEndDate = addon.end_date ? new Date(addon.end_date) : null;
  const addonStartDate = new Date(addon.start_date);
  
  // Format billing period for display
  const billingPeriodLabel = addon.billing_period 
    ? addon.billing_period.charAt(0).toUpperCase() + addon.billing_period.slice(1)
    : null;
  
  // Calculate alignment status
  const alignmentInfo = useMemo(() => {
    const isExpired = addonEndDate ? isBefore(addonEndDate, now) : false;
    
    // If main plan is expired, addon is inactive
    if (!isMainPlanActive) {
      return {
        status: "inactive" as AlignmentStatus,
        message: "Inactive (Main plan expired)",
        variant: "destructive" as const,
        icon: AlertTriangle,
      };
    }
    
    if (isExpired) {
      return {
        status: "expired" as AlignmentStatus,
        message: `Expired on ${format(addonEndDate!, "dd MMM yyyy")}`,
        variant: "destructive" as const,
        icon: AlertTriangle,
      };
    }
    
    if (!addonEndDate) {
      return {
        status: "no_expiry" as AlignmentStatus,
        message: "No expiry date set",
        variant: "secondary" as const,
        icon: Check,
      };
    }
    
    if (!mainPlanExpiryDate) {
      return {
        status: "no_expiry" as AlignmentStatus,
        message: `Expires ${format(addonEndDate, "dd MMM yyyy")}`,
        variant: "outline" as const,
        icon: Calendar,
      };
    }
    
    // Check alignment with main plan
    const isAligned = isSameDay(addonEndDate, mainPlanExpiryDate);
    const expiresBefore = isBefore(addonEndDate, mainPlanExpiryDate);
    const daysUntilExpiry = differenceInDays(addonEndDate, now);
    const daysDifference = Math.abs(differenceInDays(addonEndDate, mainPlanExpiryDate));
    
    if (isAligned) {
      return {
        status: "aligned" as AlignmentStatus,
        message: `Aligned with main plan (${format(addonEndDate, "dd MMM yyyy")})`,
        variant: "default" as const,
        icon: Check,
        daysUntilExpiry,
      };
    }
    
    if (expiresBefore) {
      return {
        status: "expires_before" as AlignmentStatus,
        message: `Expires ${daysDifference} days before main plan`,
        subMessage: `Add-on expires: ${format(addonEndDate, "dd MMM yyyy")}`,
        variant: "warning" as const,
        icon: AlertTriangle,
        daysUntilExpiry,
      };
    }
    
    return {
      status: "expires_after" as AlignmentStatus,
      message: `Extends ${daysDifference} days beyond main plan`,
      subMessage: `Add-on expires: ${format(addonEndDate, "dd MMM yyyy")}`,
      variant: "outline" as const,
      icon: Calendar,
      daysUntilExpiry,
    };
  }, [addonEndDate, mainPlanExpiryDate, now, isMainPlanActive]);
  
  // Feature icon based on feature key
  const getFeatureIcon = () => {
    const featureKey = addon.addon_feature?.feature_key || "";
    if (featureKey.includes("branch")) return <Building2 className="h-4 w-4" />;
    if (featureKey.includes("staff")) return <Users className="h-4 w-4" />;
    return <Package className="h-4 w-4" />;
  };
  
  // Determine card styling based on status
  const getCardStyles = () => {
    switch (alignmentInfo.status) {
      case "expired":
      case "inactive":
        return "border-destructive/50 bg-destructive/5";
      case "expires_before":
        return "border-amber-500/50 bg-amber-50/50";
      case "aligned":
        return "border-green-500/30 bg-green-50/30";
      default:
        return "border-border";
    }
  };
  
  const IconComponent = alignmentInfo.icon;
  
  return (
    <Card className={`transition-all ${getCardStyles()}`}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          {/* Left: Add-on Details */}
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <div className={`p-2 rounded-lg ${
              alignmentInfo.status === "expired" || alignmentInfo.status === "inactive" 
                ? "bg-destructive/10 text-destructive" :
              alignmentInfo.status === "expires_before" ? "bg-amber-500/10 text-amber-600" :
              alignmentInfo.status === "aligned" ? "bg-green-500/10 text-green-600" :
              "bg-muted text-muted-foreground"
            }`}>
              {getFeatureIcon()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h4 className="font-medium text-sm truncate">
                  {addon.addon_feature?.feature_name || "Add-on"}
                </h4>
                {addon.quantity > 1 && (
                  <Badge variant="secondary" className="text-xs">
                    {addon.quantity}x
                  </Badge>
                )}
                {billingPeriodLabel && (
                  <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
                    {billingPeriodLabel}
                  </Badge>
                )}
                {branchName && (
                  <Badge variant="outline" className="text-xs">
                    {branchName}
                  </Badge>
                )}
              </div>
              
              {/* Description */}
              {addon.addon_feature?.description && (
                <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                  {addon.addon_feature.description}
                </p>
              )}
              
              {/* Alignment Status */}
              <div className="flex items-center gap-1.5 mt-2">
                <IconComponent className={`h-3.5 w-3.5 ${
                  alignmentInfo.status === "expired" || alignmentInfo.status === "inactive" 
                    ? "text-destructive" :
                  alignmentInfo.status === "expires_before" ? "text-amber-600" :
                  alignmentInfo.status === "aligned" ? "text-green-600" :
                  "text-muted-foreground"
                }`} />
                <span className={`text-xs font-medium ${
                  alignmentInfo.status === "expired" || alignmentInfo.status === "inactive" 
                    ? "text-destructive" :
                  alignmentInfo.status === "expires_before" ? "text-amber-700" :
                  alignmentInfo.status === "aligned" ? "text-green-700" :
                  "text-muted-foreground"
                }`}>
                  {alignmentInfo.message}
                </span>
              </div>
              
              {/* Sub-message for misaligned add-ons */}
              {alignmentInfo.subMessage && (
                <p className="text-xs text-muted-foreground mt-0.5">
                  {alignmentInfo.subMessage}
                </p>
              )}
              
              {/* Start/End dates for clarity */}
              {addonEndDate && (
                <p className="text-xs text-muted-foreground mt-1">
                  {format(addonStartDate, "dd MMM yyyy")} → {format(addonEndDate, "dd MMM yyyy")}
                </p>
              )}
            </div>
          </div>
          
          {/* Right: Status Badge & CTA */}
          <div className="flex flex-col items-end gap-2 shrink-0">
            <Badge 
              variant={
                alignmentInfo.status === "expired" || alignmentInfo.status === "inactive" 
                  ? "destructive" :
                alignmentInfo.status === "expires_before" ? "outline" :
                addon.status === "active" ? "default" : "secondary"
              }
              className={
                alignmentInfo.status === "expires_before" 
                  ? "bg-amber-100 text-amber-800 border-amber-300" 
                  : ""
              }
            >
              {alignmentInfo.status === "expired" ? "Expired" : 
               alignmentInfo.status === "inactive" ? "Inactive" : 
               addon.status}
            </Badge>
            
            {/* Renewal CTA for expired or misaligned add-ons */}
            {(alignmentInfo.status === "expired" || alignmentInfo.status === "expires_before") && 
             onRenewAddon && canManage && (
              <Button
                size="sm"
                variant={alignmentInfo.status === "expired" ? "destructive" : "outline"}
                className="text-xs h-7 gap-1"
                onClick={() => onRenewAddon(addon.id)}
              >
                <RefreshCw className="h-3 w-3" />
                {alignmentInfo.status === "expired" ? "Renew" : "Extend"}
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Utility to get alignment recommendation message
 */
export function getAddonAlignmentRecommendation(
  addonEndDate: Date | null,
  mainPlanExpiryDate: Date | null
): string | null {
  if (!addonEndDate || !mainPlanExpiryDate) return null;
  
  const now = new Date();
  if (isBefore(addonEndDate, now)) {
    return "This add-on has expired. Renew to restore access.";
  }
  
  if (isSameDay(addonEndDate, mainPlanExpiryDate)) {
    return null; // Aligned, no recommendation needed
  }
  
  if (isBefore(addonEndDate, mainPlanExpiryDate)) {
    return "Consider extending this add-on to align with your main subscription.";
  }
  
  return "This add-on extends beyond your main subscription. It will continue working until its expiry date.";
}
