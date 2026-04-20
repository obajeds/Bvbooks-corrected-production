import { Link } from "react-router-dom";
import { HelpCircle, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface HelpLinkProps {
  articleSlug?: string;
  category?: string;
  screenName?: string;
  label?: string;
  variant?: "icon" | "button" | "link";
  className?: string;
}

export function HelpLink({
  articleSlug,
  category,
  screenName,
  label = "Help",
  variant = "icon",
  className,
}: HelpLinkProps) {
  let to = "/dashboard/help";
  
  if (articleSlug) {
    to = `/dashboard/help/${articleSlug}`;
  } else if (category) {
    to = `/dashboard/help?category=${category}`;
  } else if (screenName) {
    to = `/dashboard/help?screen=${screenName}`;
  }

  if (variant === "icon") {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Link to={to} className={cn("text-muted-foreground hover:text-primary", className)}>
              <HelpCircle className="h-4 w-4" />
            </Link>
          </TooltipTrigger>
          <TooltipContent>
            <p>{label}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  if (variant === "button") {
    return (
      <Button variant="outline" size="sm" asChild className={className}>
        <Link to={to}>
          <HelpCircle className="h-4 w-4 mr-2" />
          {label}
        </Link>
      </Button>
    );
  }

  return (
    <Link
      to={to}
      className={cn(
        "inline-flex items-center gap-1 text-sm text-primary hover:underline",
        className
      )}
    >
      {label}
      <ExternalLink className="h-3 w-3" />
    </Link>
  );
}
