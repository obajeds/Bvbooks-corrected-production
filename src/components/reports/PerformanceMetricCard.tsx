import { ReactNode } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

interface PerformanceMetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: ReactNode;
  trend?: {
    value: number;
    label: string;
  };
  status?: "success" | "warning" | "danger" | "neutral";
  onClick?: () => void;
  className?: string;
}

export function PerformanceMetricCard({
  title,
  value,
  subtitle,
  icon,
  trend,
  status = "neutral",
  onClick,
  className,
}: PerformanceMetricCardProps) {
  const statusStyles = {
    success: "border-l-4 border-l-success",
    warning: "border-l-4 border-l-warning",
    danger: "border-l-4 border-l-destructive",
    neutral: "",
  };

  const trendIcon = trend ? (
    trend.value > 0 ? (
      <TrendingUp className="h-3 w-3 text-success" />
    ) : trend.value < 0 ? (
      <TrendingDown className="h-3 w-3 text-destructive" />
    ) : (
      <Minus className="h-3 w-3 text-muted-foreground" />
    )
  ) : null;

  const trendColor = trend
    ? trend.value > 0
      ? "text-success"
      : trend.value < 0
      ? "text-destructive"
      : "text-muted-foreground"
    : "";

  return (
    <Card
      className={cn(
        "transition-all duration-200 hover:shadow-md",
        statusStyles[status],
        onClick && "cursor-pointer hover:border-primary",
        className
      )}
      onClick={onClick}
    >
      <CardContent className="p-4 sm:p-6">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <p className="text-xs sm:text-sm font-medium text-muted-foreground truncate">
              {title}
            </p>
            <p className="text-lg sm:text-2xl font-bold mt-1 break-all">{value}</p>
            {subtitle && (
              <p className="text-xs sm:text-sm text-muted-foreground mt-1 truncate">
                {subtitle}
              </p>
            )}
            {trend && (
              <div className="flex items-center gap-1 mt-2">
                {trendIcon}
                <span className={cn("text-xs font-medium", trendColor)}>
                  {trend.value > 0 ? "+" : ""}
                  {trend.value}%
                </span>
                <span className="text-xs text-muted-foreground">
                  {trend.label}
                </span>
              </div>
            )}
          </div>
          <div className="shrink-0 p-2 rounded-lg bg-primary/10 text-primary">
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

interface AlertBadgeProps {
  count: number;
  variant: "warning" | "danger" | "success";
  label: string;
}

export function AlertBadge({ count, variant, label }: AlertBadgeProps) {
  if (count === 0) return null;

  const variantStyles = {
    warning: "bg-warning/20 text-warning-foreground border-warning/30",
    danger: "bg-destructive/20 text-destructive border-destructive/30",
    success: "bg-success/20 text-success border-success/30",
  };

  return (
    <Badge
      variant="outline"
      className={cn("text-xs font-medium", variantStyles[variant])}
    >
      {count} {label}
    </Badge>
  );
}
