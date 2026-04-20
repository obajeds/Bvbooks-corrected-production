import { Link } from "react-router-dom";
import { HelpCircle, ChevronRight, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useContextualHelp } from "@/hooks/useHelpCenter";

interface ContextualHelpPanelProps {
  screenName: string;
  title?: string;
  className?: string;
}

export function ContextualHelpPanel({
  screenName,
  title = "Need Help?",
  className,
}: ContextualHelpPanelProps) {
  const { data: articles, isLoading } = useContextualHelp(screenName);

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader className="pb-2">
          <Skeleton className="h-5 w-24" />
        </CardHeader>
        <CardContent className="space-y-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
        </CardContent>
      </Card>
    );
  }

  if (!articles || articles.length === 0) {
    return null;
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <HelpCircle className="h-4 w-4 text-primary" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {articles.map((article) => (
          <Link
            key={article.id}
            to={`/dashboard/help/${article.slug}`}
            className="flex items-center justify-between p-2 rounded-md hover:bg-muted transition-colors text-sm"
          >
            <span className="truncate flex-1">{article.title}</span>
            <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          </Link>
        ))}
        <Button variant="ghost" size="sm" asChild className="w-full mt-2">
          <Link to={`/dashboard/help?screen=${screenName}`}>
            <BookOpen className="h-4 w-4 mr-2" />
            View all help articles
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}
