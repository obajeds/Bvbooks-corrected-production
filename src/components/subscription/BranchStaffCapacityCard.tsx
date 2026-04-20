import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Users, AlertTriangle, AlertCircle, Sparkles, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { BranchCapacityInfo } from "@/lib/subscriptionCapacity";
import { useSubscriptionNavigation } from "@/hooks/useSubscriptionNavigation";

interface BranchStaffCapacityCardProps {
  capacity: BranchCapacityInfo;
  showActions?: boolean;
  compact?: boolean;
  className?: string;
}

/**
 * Display staff capacity for a specific branch
 */
export function BranchStaffCapacityCard({
  capacity,
  showActions = true,
  compact = false,
  className,
}: BranchStaffCapacityCardProps) {
  const { navigateToUpgrade, isNavigating } = useSubscriptionNavigation();
  
  const handleBuyAddon = () => {
    navigateToUpgrade();
  };

  if (compact) {
    return (
      <div className={cn("flex items-center gap-2 text-sm", className)}>
        {capacity.isBlocked ? (
          <AlertCircle className="h-4 w-4 text-destructive shrink-0" />
        ) : capacity.isWarning ? (
          <AlertTriangle className="h-4 w-4 text-warning shrink-0" />
        ) : (
          <Users className="h-4 w-4 text-muted-foreground shrink-0" />
        )}
        <span className={cn(
          capacity.isBlocked && "text-destructive",
          capacity.isWarning && "text-warning"
        )}>
          {capacity.branchName}: {capacity.currentStaff}/{capacity.totalCapacity}
        </span>
        {capacity.hasAddon && (
          <Badge variant="secondary" className="text-xs">+addon</Badge>
        )}
      </div>
    );
  }

  return (
    <Card className={cn(
      capacity.isBlocked && "border-destructive/50",
      capacity.isWarning && "border-warning/50",
      className
    )}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            {capacity.branchName}
          </span>
          {capacity.hasAddon && (
            <Badge variant="secondary" className="text-xs">
              <Sparkles className="h-3 w-3 mr-1" />
              Add-on
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Staff capacity</span>
          <span className={cn(
            "font-medium",
            capacity.isBlocked && "text-destructive",
            capacity.isWarning && "text-warning"
          )}>
            {capacity.currentStaff} / {capacity.totalCapacity}
          </span>
        </div>
        
        <Progress 
          value={capacity.usagePercent} 
          className={cn(
            "h-2",
            capacity.isBlocked && "[&>div]:bg-destructive",
            capacity.isWarning && "[&>div]:bg-warning"
          )}
        />

        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>Base: {capacity.baseStaff}</span>
          {capacity.hasAddon && (
            <span>+ Add-on: {capacity.addonStaff}</span>
          )}
        </div>

        {capacity.isBlocked && showActions && !capacity.hasAddon && (
          <Button 
            size="sm" 
            variant="outline" 
            className="w-full mt-2"
            onClick={handleBuyAddon}
            disabled={isNavigating}
          >
            {isNavigating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
            Buy add-on for this branch
          </Button>
        )}

        {capacity.isBlocked && capacity.hasAddon && (
          <p className="text-xs text-destructive">
            This branch has reached its maximum capacity.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * Grid of all branch capacities
 */
export function BranchCapacityGrid({
  capacities,
  className,
}: {
  capacities: BranchCapacityInfo[];
  className?: string;
}) {
  if (capacities.length === 0) {
    return null;
  }

  return (
    <div className={cn("grid gap-4 sm:grid-cols-2 lg:grid-cols-3", className)}>
      {capacities.map((capacity) => (
        <BranchStaffCapacityCard key={capacity.branchId} capacity={capacity} />
      ))}
    </div>
  );
}

/**
 * Summary row showing all branch capacities inline
 */
export function BranchCapacitySummary({
  capacities,
  className,
}: {
  capacities: BranchCapacityInfo[];
  className?: string;
}) {
  if (capacities.length === 0) {
    return null;
  }

  return (
    <div className={cn("flex flex-wrap gap-4", className)}>
      {capacities.map((capacity) => (
        <BranchStaffCapacityCard 
          key={capacity.branchId} 
          capacity={capacity} 
          compact 
        />
      ))}
    </div>
  );
}
