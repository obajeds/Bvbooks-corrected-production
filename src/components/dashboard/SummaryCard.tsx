import { Link } from "react-router-dom";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface SummaryCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  href: string;
  trend?: {
    value: number;
    positive: boolean;
  };
  className?: string;
}

export function SummaryCard({
  title,
  value,
  icon: Icon,
  href,
  trend,
  className,
}: SummaryCardProps) {
  return (
    <Link
      to={href}
      className={cn(
        "group block rounded-lg border bg-card p-6 transition-all hover:shadow-md",
        className
      )}
    >
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <p className="text-3xl font-bold">{value}</p>
          <p className="text-sm text-muted-foreground">{title}</p>
          {trend && (
            <p
              className={cn(
                "text-xs font-medium",
                trend.positive ? "text-success" : "text-danger"
              )}
            >
              {trend.positive ? "+" : "-"}{Math.abs(trend.value)}% from yesterday
            </p>
          )}
        </div>
        <div className="rounded-full bg-primary/10 p-3 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
          <Icon className="h-6 w-6" />
        </div>
      </div>
    </Link>
  );
}
