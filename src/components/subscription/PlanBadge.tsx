import { Badge } from "@/components/ui/badge";
import { Crown, Sparkles, Star } from "lucide-react";
import type { BVBooksPlan } from "@/hooks/useFeatureGating";

interface PlanBadgeProps {
  plan: BVBooksPlan;
  showIcon?: boolean;
  size?: "sm" | "default" | "lg";
  className?: string;
}

// Only 3 plans: Free, Professional, Enterprise
const PLAN_CONFIG: Record<BVBooksPlan, {
  label: string;
  icon: React.ElementType;
  className: string;
}> = {
  free: {
    label: 'Free',
    icon: Star,
    className: 'bg-muted text-muted-foreground border-border hover:bg-muted/80',
  },
  professional: {
    label: 'Professional',
    icon: Sparkles,
    className: 'bg-amber-500/10 text-amber-600 border-amber-500/20 hover:bg-amber-500/20',
  },
  enterprise: {
    label: 'Enterprise',
    icon: Crown,
    className: 'bg-purple-500/10 text-purple-600 border-purple-500/20 hover:bg-purple-500/20',
  },
};

export function PlanBadge({ plan, showIcon = true, size = "default", className = "" }: PlanBadgeProps) {
  const config = PLAN_CONFIG[plan] || PLAN_CONFIG.free;
  const Icon = config.icon;

  const sizeClasses = {
    sm: "text-xs px-2 py-0.5",
    default: "text-sm px-2.5 py-0.5",
    lg: "text-base px-3 py-1",
  };

  const iconSizes = {
    sm: "h-3 w-3",
    default: "h-3.5 w-3.5",
    lg: "h-4 w-4",
  };

  return (
    <Badge 
      variant="outline" 
      className={`${config.className} ${sizeClasses[size]} ${className}`}
    >
      {showIcon && <Icon className={`${iconSizes[size]} mr-1`} />}
      {config.label}
    </Badge>
  );
}
