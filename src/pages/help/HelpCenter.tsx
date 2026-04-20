import { useState, useEffect } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { 
  Search, 
  Rocket, 
  Package, 
  Users, 
  BarChart3, 
  Shield, 
  CreditCard, 
  HelpCircle,
  MessageCircle,
  ChevronRight,
  BookOpen
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useHelpCategories, useHelpArticles, useLogSearch } from "@/hooks/useHelpCenter";
import { cn } from "@/lib/utils";
import { WhatsAppSupportCard } from "@/components/support/WhatsAppSupport";

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  Rocket,
  Package,
  Users,
  BarChart3,
  Shield,
  CreditCard,
  HelpCircle,
};

export default function HelpCenter() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState(searchParams.get("q") || "");
  const [debouncedSearch, setDebouncedSearch] = useState(searchQuery);
  const selectedCategory = searchParams.get("category") || "";

  const { data: categories, isLoading: categoriesLoading } = useHelpCategories();
  const { data: articles, isLoading: articlesLoading } = useHelpArticles(
    selectedCategory,
    debouncedSearch
  );
  const logSearch = useLogSearch();

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      if (searchQuery.trim()) {
        setSearchParams((prev) => {
          prev.set("q", searchQuery);
          return prev;
        });
      } else {
        setSearchParams((prev) => {
          prev.delete("q");
          return prev;
        });
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, setSearchParams]);

  // Log search when results come back
  useEffect(() => {
    if (debouncedSearch && articles) {
      logSearch.mutate({
        searchQuery: debouncedSearch,
        resultsCount: articles.length,
      });
    }
  }, [debouncedSearch, articles?.length]);

  const handleCategoryClick = (slug: string) => {
    if (selectedCategory === slug) {
      setSearchParams((prev) => {
        prev.delete("category");
        return prev;
      });
    } else {
      setSearchParams((prev) => {
        prev.set("category", slug);
        return prev;
      });
    }
  };

  const featuredArticles = articles?.filter((a) => a.is_featured).slice(0, 3);
  const regularArticles = articles?.filter((a) => !a.is_featured || featuredArticles?.length === 0);

  return (
    <div className="bg-background">
      {/* Hero Section */}
      <div className="bg-primary text-primary-foreground py-12 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <BookOpen className="h-8 w-8" />
            <h1 className="text-3xl md:text-4xl font-bold font-display">
              BVBooks Help Center
            </h1>
          </div>
          <p className="text-lg opacity-90 mb-8 max-w-2xl mx-auto">
            Find answers to your questions and learn how to get the most out of BVBooks
          </p>

          {/* Search Bar */}
          <div className="relative max-w-xl mx-auto">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search for help articles..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-12 h-12 text-lg bg-background text-foreground border-0 shadow-lg"
            />
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Categories */}
        <section className="mb-10">
          <h2 className="text-xl font-semibold mb-4">Browse by Category</h2>
          {categoriesLoading ? (
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
              {[...Array(7)].map((_, i) => (
                <Skeleton key={i} className="h-24 rounded-lg" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
              {categories?.map((category) => {
                const Icon = iconMap[category.icon || "HelpCircle"] || HelpCircle;
                const isSelected = selectedCategory === category.slug;
                return (
                  <button
                    key={category.id}
                    onClick={() => handleCategoryClick(category.slug)}
                    className={cn(
                      "flex flex-col items-center justify-center p-4 rounded-lg border transition-all text-center",
                      isSelected
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-card hover:bg-accent/10 border-border hover:border-primary/50"
                    )}
                  >
                    <Icon className="h-6 w-6 mb-2" />
                    <span className="text-xs font-medium line-clamp-2">
                      {category.name.replace("with BVBooks", "").replace("& ", "&\n")}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </section>

        {/* Search Results or Articles */}
        <section>
          {debouncedSearch && (
            <div className="mb-4 flex items-center gap-2">
              <span className="text-muted-foreground">
                {articles?.length || 0} results for "{debouncedSearch}"
              </span>
              {articles?.length === 0 && (
                <Button variant="link" asChild className="p-0 h-auto">
                  <Link to="/dashboard/settings">Contact Support</Link>
                </Button>
              )}
            </div>
          )}

          {selectedCategory && (
            <div className="mb-4 flex items-center gap-2">
              <Badge variant="secondary" className="gap-1">
                {categories?.find((c) => c.slug === selectedCategory)?.name}
                <button
                  onClick={() => handleCategoryClick(selectedCategory)}
                  className="ml-1 hover:text-destructive"
                >
                  ×
                </button>
              </Badge>
            </div>
          )}

          {articlesLoading ? (
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-24 rounded-lg" />
              ))}
            </div>
          ) : articles?.length === 0 ? (
            <Card className="text-center py-12">
              <CardContent>
                <HelpCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">No articles found</h3>
                <p className="text-muted-foreground mb-4">
                  We couldn't find any articles matching your search.
                </p>
                <Button asChild>
                  <Link to="/dashboard/settings">
                    <MessageCircle className="h-4 w-4 mr-2" />
                    Contact Support
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {/* Featured Articles */}
              {featuredArticles && featuredArticles.length > 0 && !debouncedSearch && (
                <div className="mb-8">
                  <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                    <Rocket className="h-5 w-5 text-primary" />
                    Featured Articles
                  </h3>
                  <div className="grid md:grid-cols-3 gap-4">
                    {featuredArticles.map((article) => (
                      <Link key={article.id} to={`/dashboard/help/${article.slug}`}>
                        <Card className="h-full hover:shadow-md transition-shadow hover:border-primary/50">
                          <CardHeader className="pb-2">
                            <CardTitle className="text-base line-clamp-2">
                              {article.title}
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            <CardDescription className="line-clamp-2">
                              {article.excerpt || article.content.substring(0, 100)}
                            </CardDescription>
                          </CardContent>
                        </Card>
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {/* Regular Articles */}
              <div className="space-y-2">
                {regularArticles?.map((article) => (
                  <Link key={article.id} to={`/dashboard/help/${article.slug}`}>
                    <Card className="hover:shadow-sm transition-shadow hover:border-primary/30">
                      <CardContent className="flex items-center justify-between py-4">
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-sm md:text-base truncate">
                            {article.title}
                          </h4>
                          <p className="text-sm text-muted-foreground truncate">
                            {article.excerpt || article.content.substring(0, 80)}...
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            {article.category && (
                              <Badge variant="outline" className="text-xs">
                                {article.category.name}
                              </Badge>
                            )}
                            {article.tags?.slice(0, 2).map((tag) => (
                              <Badge key={tag} variant="secondary" className="text-xs">
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        </div>
                        <ChevronRight className="h-5 w-5 text-muted-foreground flex-shrink-0 ml-4" />
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </section>

        {/* Contact Support CTA */}
        <section className="mt-12">
          <h3 className="text-xl font-semibold text-center mb-6">Can't find what you're looking for?</h3>
          <div className="grid md:grid-cols-2 gap-4 max-w-2xl mx-auto">
            {/* WhatsApp Support - Enterprise Only */}
            <WhatsAppSupportCard />

            {/* Live Chat & Ticket Support - Available to all paid users */}
            <Card className="bg-muted/50 hover:border-primary/40 transition-colors">
              <CardContent className="py-6 text-center">
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <MessageCircle className="h-6 w-6 text-primary" />
                </div>
                <h4 className="font-semibold mb-2">Live Chat & Tickets</h4>
                <p className="text-sm text-muted-foreground mb-4">
                  Use the Support button at the bottom right corner to chat with our AI assistant or create a support ticket.
                </p>
                <p className="text-xs text-muted-foreground italic">
                  Available for Professional & Enterprise plans
                </p>
              </CardContent>
            </Card>
          </div>
        </section>
      </div>
    </div>
  );
}
