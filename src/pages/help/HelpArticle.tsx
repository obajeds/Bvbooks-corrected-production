import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import DOMPurify from "dompurify";
import { 
  ChevronLeft, 
  ThumbsUp, 
  ThumbsDown, 
  Clock, 
  Eye,
  MessageCircle,
  BookOpen,
  CheckCircle2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { useHelpArticle, useRelatedArticles, useArticleFeedback } from "@/hooks/useHelpCenter";
import { formatDistanceToNow } from "date-fns";

export default function HelpArticle() {
  const { slug } = useParams<{ slug: string }>();
  const [feedbackGiven, setFeedbackGiven] = useState<boolean | null>(null);
  const [showFeedbackForm, setShowFeedbackForm] = useState(false);
  const [feedbackText, setFeedbackText] = useState("");

  const { data: article, isLoading } = useHelpArticle(slug || "");
  const { data: relatedArticles } = useRelatedArticles(
    article?.id || "",
    article?.category_id || null,
    article?.tags || []
  );
  const feedbackMutation = useArticleFeedback();

  const handleFeedback = async (isHelpful: boolean) => {
    if (!article) return;

    try {
      await feedbackMutation.mutateAsync({
        articleId: article.id,
        isHelpful,
        feedbackText: feedbackText || undefined,
      });
      setFeedbackGiven(isHelpful);
      if (!isHelpful) {
        setShowFeedbackForm(true);
      } else {
        toast.success("Thank you for your feedback!");
      }
    } catch (error) {
      toast.error("Failed to submit feedback");
    }
  };

  const submitNegativeFeedback = async () => {
    if (!article) return;
    
    try {
      await feedbackMutation.mutateAsync({
        articleId: article.id,
        isHelpful: false,
        feedbackText,
      });
      setShowFeedbackForm(false);
      toast.success("Thank you for your feedback! We'll use it to improve.");
    } catch (error) {
      toast.error("Failed to submit feedback");
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-4xl mx-auto px-4 py-8">
          <Skeleton className="h-8 w-48 mb-4" />
          <Skeleton className="h-12 w-3/4 mb-4" />
          <Skeleton className="h-4 w-1/4 mb-8" />
          <div className="space-y-4">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </div>
        </div>
      </div>
    );
  }

  if (!article) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-4xl mx-auto px-4 py-8 text-center">
          <BookOpen className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
          <h1 className="text-2xl font-bold mb-2">Article Not Found</h1>
          <p className="text-muted-foreground mb-4">
            The article you're looking for doesn't exist or has been moved.
          </p>
          <Button asChild>
            <Link to="/dashboard/help">
              <ChevronLeft className="h-4 w-4 mr-2" />
              Back to Help Center
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
          <Link to="/dashboard/help" className="hover:text-primary flex items-center gap-1">
            <ChevronLeft className="h-4 w-4" />
            Help Center
          </Link>
          {article.category && (
            <>
              <span>/</span>
              <Link
                to={`/dashboard/help?category=${article.category.slug}`}
                className="hover:text-primary"
              >
                {article.category.name}
              </Link>
            </>
          )}
        </div>

        {/* Article Header */}
        <header className="mb-8">
          <h1 className="text-2xl md:text-3xl font-bold mb-3">{article.title}</h1>
          <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <Clock className="h-4 w-4" />
              Updated {formatDistanceToNow(new Date(article.updated_at), { addSuffix: true })}
            </span>
            <span className="flex items-center gap-1">
              <Eye className="h-4 w-4" />
              {article.view_count} views
            </span>
          </div>
          {article.tags && article.tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-3">
              {article.tags.map((tag) => (
                <Badge key={tag} variant="secondary">
                  {tag}
                </Badge>
              ))}
            </div>
          )}
        </header>

        {/* Article Content - Sanitized */}
        <article className="prose prose-slate dark:prose-invert max-w-none mb-10">
          <div 
            className="space-y-4"
            dangerouslySetInnerHTML={{ 
              __html: formatContent(article.content) 
            }} 
          />
        </article>

        {/* Feedback Section */}
        <Card className="mb-8">
          <CardContent className="py-6">
            {feedbackGiven === null ? (
              <div className="text-center">
                <h3 className="font-medium mb-3">Was this article helpful?</h3>
                <div className="flex justify-center gap-4">
                  <Button
                    variant="outline"
                    onClick={() => handleFeedback(true)}
                    disabled={feedbackMutation.isPending}
                  >
                    <ThumbsUp className="h-4 w-4 mr-2" />
                    Yes, helpful
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => handleFeedback(false)}
                    disabled={feedbackMutation.isPending}
                  >
                    <ThumbsDown className="h-4 w-4 mr-2" />
                    No, not helpful
                  </Button>
                </div>
              </div>
            ) : feedbackGiven ? (
              <div className="text-center">
                <CheckCircle2 className="h-10 w-10 mx-auto text-success mb-2" />
                <p className="font-medium">Thank you for your feedback!</p>
              </div>
            ) : showFeedbackForm ? (
              <div className="space-y-4">
                <h3 className="font-medium">How can we improve this article?</h3>
                <Textarea
                  placeholder="Tell us what was missing or unclear..."
                  value={feedbackText}
                  onChange={(e) => setFeedbackText(e.target.value)}
                  rows={3}
                />
                <div className="flex gap-2">
                  <Button onClick={submitNegativeFeedback} disabled={feedbackMutation.isPending}>
                    Submit Feedback
                  </Button>
                  <Button variant="ghost" onClick={() => setShowFeedbackForm(false)}>
                    Skip
                  </Button>
                </div>
              </div>
            ) : (
              <div className="text-center">
                <CheckCircle2 className="h-10 w-10 mx-auto text-success mb-2" />
                <p className="font-medium">Thank you for your feedback!</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Related Articles */}
        {relatedArticles && relatedArticles.length > 0 && (
          <section className="mb-8">
            <h2 className="text-lg font-semibold mb-4">Related Articles</h2>
            <div className="grid md:grid-cols-3 gap-4">
              {relatedArticles.map((related) => (
                <Link key={related.id} to={`/dashboard/help/${related.slug}`}>
                  <Card className="h-full hover:shadow-md transition-shadow hover:border-primary/50">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm line-clamp-2">
                        {related.title}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        {related.excerpt}
                      </p>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Contact Support */}
        <Card className="bg-muted/50">
          <CardContent className="py-6 text-center">
            <MessageCircle className="h-8 w-8 mx-auto text-primary mb-3" />
            <h3 className="font-medium mb-2">Still need help?</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Our support team is ready to assist you
            </p>
            <Button asChild>
              <Link to="/dashboard/settings">Contact Support</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// Helper function to format markdown-like content to HTML with sanitization
function formatContent(content: string): string {
  const formatted = content
    // Headers
    .replace(/^### (.*$)/gm, '<h3 class="text-lg font-semibold mt-6 mb-2">$1</h3>')
    .replace(/^## (.*$)/gm, '<h2 class="text-xl font-semibold mt-8 mb-3">$1</h2>')
    .replace(/^# (.*$)/gm, '<h1 class="text-2xl font-bold mt-8 mb-4">$1</h1>')
    // Bold
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    // Italic
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    // Lists
    .replace(/^- (.*$)/gm, '<li class="ml-4">$1</li>')
    .replace(/^(\d+)\. (.*$)/gm, '<li class="ml-4">$2</li>')
    // Line breaks
    .replace(/\n\n/g, '</p><p class="mb-4">')
    .replace(/\n/g, '<br />')
    // Wrap in paragraphs
    .replace(/^(?!<[hlu])/gm, '<p class="mb-4">')
    .replace(/(?<![>])$/gm, '</p>');

  // Sanitize to remove any dangerous HTML
  return DOMPurify.sanitize(formatted, {
    ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'h1', 'h2', 'h3', 'ul', 'ol', 'li', 'a', 'code', 'pre'],
    ALLOWED_ATTR: ['href', 'class', 'id'],
    ALLOW_DATA_ATTR: false,
  });
}