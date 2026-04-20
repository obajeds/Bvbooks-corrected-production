import { Check, X, Ban } from "lucide-react";
import { cn } from "@/lib/utils";
import { 
  PLAN_FEATURE_DETAILS, 
  CATEGORY_ORDER, 
  PLAN_SUMMARY,
  type BVBooksPlan 
} from "@/lib/planFeatures";
import { Badge } from "@/components/ui/badge";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";

const PLANS_TO_COMPARE: BVBooksPlan[] = ['free', 'professional', 'enterprise'];

export function PlanComparisonTable() {
  return (
    <div className="w-full">
      <ScrollArea className="w-full">
        <div className="min-w-[700px]">
          {/* Header */}
          <div className="grid grid-cols-4 gap-4 pb-4 border-b sticky top-0 bg-background z-10">
            <div className="font-semibold text-muted-foreground">Feature Category</div>
            {PLANS_TO_COMPARE.map((planId) => (
              <div key={planId} className="text-center">
                <div className="font-bold text-lg">{PLAN_SUMMARY[planId].name}</div>
                <div className="text-xs text-muted-foreground mt-1">
                  {PLAN_SUMMARY[planId].branches} branch • {PLAN_SUMMARY[planId].staff} staff
                </div>
              </div>
            ))}
          </div>

          {/* Categories */}
          {CATEGORY_ORDER.map((categoryKey) => {
            const categoryTitle = PLAN_FEATURE_DETAILS.free[categoryKey].title;
            
            return (
              <div key={categoryKey} className="border-b last:border-b-0">
                {/* Category Header */}
                <div className="grid grid-cols-4 gap-4 py-3 bg-muted/30">
                  <div className="font-semibold text-sm flex items-center">
                    {categoryTitle}
                  </div>
                  {PLANS_TO_COMPARE.map((planId) => {
                    const category = PLAN_FEATURE_DETAILS[planId][categoryKey];
                    if (!category.available) {
                      return (
                        <div key={planId} className="flex justify-center">
                          <Badge variant="outline" className="text-xs bg-destructive/10 text-destructive border-destructive/20">
                            <Ban className="h-3 w-3 mr-1" />
                            Not available
                          </Badge>
                        </div>
                      );
                    }
                    return (
                      <div key={planId} className="flex justify-center">
                        <Badge variant="secondary" className="text-xs">
                          {category.features.length} features
                        </Badge>
                      </div>
                    );
                  })}
                </div>

                {/* Features */}
                {(() => {
                  // Collect all unique features across plans for this category
                  const allFeatures = new Set<string>();
                  PLANS_TO_COMPARE.forEach((planId) => {
                    const category = PLAN_FEATURE_DETAILS[planId][categoryKey];
                    category.features.forEach((f) => allFeatures.add(f));
                    category.unavailable?.forEach((f) => {
                      if (f !== "Not available") allFeatures.add(f);
                    });
                  });

                  return Array.from(allFeatures).map((feature, idx) => (
                    <div 
                      key={idx} 
                      className={cn(
                        "grid grid-cols-4 gap-4 py-2 px-2 text-sm",
                        idx % 2 === 0 && "bg-muted/10"
                      )}
                    >
                      <div className="text-muted-foreground truncate" title={feature}>
                        {feature}
                      </div>
                      {PLANS_TO_COMPARE.map((planId) => {
                        const category = PLAN_FEATURE_DETAILS[planId][categoryKey];
                        
                        if (!category.available) {
                          return (
                            <div key={planId} className="flex justify-center">
                              <X className="h-4 w-4 text-muted-foreground/50" />
                            </div>
                          );
                        }

                        const hasFeature = category.features.includes(feature);
                        const isExplicitlyUnavailable = category.unavailable?.includes(feature);

                        if (hasFeature) {
                          return (
                            <div key={planId} className="flex justify-center">
                              <Check className="h-4 w-4 text-green-500" />
                            </div>
                          );
                        }

                        if (isExplicitlyUnavailable) {
                          return (
                            <div key={planId} className="flex justify-center">
                              <X className="h-4 w-4 text-destructive" />
                            </div>
                          );
                        }

                        // Feature not mentioned in this plan
                        return (
                          <div key={planId} className="flex justify-center">
                            <X className="h-4 w-4 text-muted-foreground/30" />
                          </div>
                        );
                      })}
                    </div>
                  ));
                })()}
              </div>
            );
          })}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </div>
  );
}
