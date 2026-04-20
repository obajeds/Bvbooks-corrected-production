import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Check, AlertTriangle, Star, Gift, XCircle } from "lucide-react";
import { RewardsPreset } from "@/hooks/useRewardsSettings";
import { cn } from "@/lib/utils";

interface RewardsPresetCardProps {
  preset: RewardsPreset;
  isSelected: boolean;
  onSelect: () => void;
  disabled?: boolean;
}

export function RewardsPresetCard({ preset, isSelected, onSelect, disabled }: RewardsPresetCardProps) {
  const getPresetIcon = () => {
    switch (preset.id) {
      case "standard":
        return <Star className="h-5 w-5 text-primary" />;
      case "generous":
        return <Gift className="h-5 w-5 text-amber-500" />;
      case "disabled":
        return <XCircle className="h-5 w-5 text-muted-foreground" />;
    }
  };

  return (
    <Card
      className={cn(
        "relative cursor-pointer transition-all hover:shadow-md",
        isSelected && "ring-2 ring-primary border-primary",
        disabled && "opacity-50 cursor-not-allowed"
      )}
      onClick={() => !disabled && onSelect()}
    >
      {isSelected && (
        <div className="absolute -top-2 -right-2 bg-primary text-primary-foreground rounded-full p-1">
          <Check className="h-4 w-4" />
        </div>
      )}
      
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            {getPresetIcon()}
            <CardTitle className="text-base">{preset.name}</CardTitle>
          </div>
          <div className="flex gap-1">
            {preset.recommended && (
              <Badge variant="default" className="text-xs">
                Recommended
              </Badge>
            )}
            {preset.warning && (
              <Badge variant="outline" className="text-xs text-amber-600 border-amber-300 bg-amber-50">
                <AlertTriangle className="h-3 w-3 mr-1" />
                Caution
              </Badge>
            )}
          </div>
        </div>
        <CardDescription className="text-sm">
          {preset.description}
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-3">
        {preset.is_enabled ? (
          <>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <p className="text-muted-foreground">Points per ₦1</p>
                <p className="font-semibold">{preset.points_per_naira}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Value per point</p>
                <p className="font-semibold">₦{preset.naira_per_point}</p>
              </div>
            </div>
            
            <div className="flex items-center justify-between pt-2 border-t">
              <span className="text-sm text-muted-foreground">Effective reward</span>
              <Badge variant="secondary" className="font-semibold">
                {preset.effectiveReward}
              </Badge>
            </div>
            
            <p className="text-xs text-muted-foreground">
              {Math.round(1 / preset.naira_per_point)} points = ₦1 discount
            </p>
          </>
        ) : (
          <div className="text-center py-2 text-muted-foreground">
            <p className="text-sm">No points earned</p>
            <p className="text-sm">No redemption</p>
          </div>
        )}
        
        {preset.warning && (
          <div className="flex items-start gap-2 p-2 rounded-md bg-amber-50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-400 text-xs">
            <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
            <span>{preset.warning}</span>
          </div>
        )}
        
        <Button
          variant={isSelected ? "default" : "outline"}
          size="sm"
          className="w-full mt-2"
          disabled={disabled}
        >
          {isSelected ? "Selected" : "Select"}
        </Button>
      </CardContent>
    </Card>
  );
}
