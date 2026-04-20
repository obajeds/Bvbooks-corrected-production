import { useState } from "react";
import { Check, X, ChevronDown, ChevronUp, Ban, ShoppingCart, Package, Users, UserCog, Receipt, Calculator, TrendingUp, CheckSquare, Bell, FileText, Settings } from "lucide-react";
import { cn } from "@/lib/utils";
import { 
  PLAN_FEATURE_DETAILS, 
  CATEGORY_ORDER, 
  type BVBooksPlan, 
  type CategoryFeatures 
} from "@/lib/planFeatures";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Badge } from "@/components/ui/badge";

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  ShoppingCart,
  Package,
  Users,
  UserCog,
  Receipt,
  Calculator,
  TrendingUp,
  CheckSquare,
  Bell,
  FileText,
  Settings,
};

interface PlanFeatureListProps {
  planId: BVBooksPlan;
  compact?: boolean;
}

function CategorySection({ 
  category, 
  isCompact 
}: { 
  category: CategoryFeatures; 
  isCompact: boolean;
}) {
  const [isOpen, setIsOpen] = useState(!isCompact);
  const IconComponent = iconMap[category.icon] || Settings;

  if (!category.available && category.unavailable?.includes("Not available")) {
    return (
      <div className="flex items-center gap-2 py-2 px-3 rounded-md bg-muted/50">
        <IconComponent className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-medium text-muted-foreground">{category.title}</span>
        <Badge variant="outline" className="ml-auto text-xs bg-destructive/10 text-destructive border-destructive/20">
          <Ban className="h-3 w-3 mr-1" />
          Not available
        </Badge>
      </div>
    );
  }

  const allFeatures = [...category.features, ...(category.unavailable || [])];
  const displayFeatures = isCompact ? allFeatures.slice(0, 2) : allFeatures;
  const hasMore = isCompact && allFeatures.length > 2;

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger className="flex items-center gap-2 w-full py-2 px-3 rounded-md hover:bg-muted/50 transition-colors">
        <IconComponent className="h-4 w-4 text-primary" />
        <span className="text-sm font-medium">{category.title}</span>
        <Badge variant="secondary" className="ml-1 text-xs">
          {category.features.length}
        </Badge>
        {hasMore && !isOpen && (
          <span className="text-xs text-muted-foreground ml-1">+{allFeatures.length - 2} more</span>
        )}
        <span className="ml-auto">
          {isOpen ? (
            <ChevronUp className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          )}
        </span>
      </CollapsibleTrigger>
      <CollapsibleContent className="pl-9 pr-3 pb-2 space-y-1">
        {(isOpen ? allFeatures : displayFeatures).map((feature, idx) => {
          const isUnavailable = category.unavailable?.includes(feature);
          return (
            <div 
              key={idx} 
              className={cn(
                "flex items-center gap-2 text-sm py-1",
                isUnavailable && "text-muted-foreground"
              )}
            >
              {isUnavailable ? (
                <X className="h-3.5 w-3.5 text-destructive/70" />
              ) : (
                <Check className="h-3.5 w-3.5 text-green-500" />
              )}
              <span className={cn(isUnavailable && "line-through")}>{feature}</span>
            </div>
          );
        })}
      </CollapsibleContent>
    </Collapsible>
  );
}

export function PlanFeatureList({ planId, compact = false }: PlanFeatureListProps) {
  const planFeatures = PLAN_FEATURE_DETAILS[planId];

  if (!planFeatures) {
    return null;
  }

  return (
    <div className="space-y-1">
      {CATEGORY_ORDER.map((categoryKey) => (
        <CategorySection
          key={categoryKey}
          category={planFeatures[categoryKey]}
          isCompact={compact}
        />
      ))}
    </div>
  );
}
