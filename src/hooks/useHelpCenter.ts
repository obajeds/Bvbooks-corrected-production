import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface HelpCategory {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  icon: string | null;
  display_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface HelpArticle {
  id: string;
  category_id: string | null;
  title: string;
  slug: string;
  content: string;
  excerpt: string | null;
  tags: string[];
  related_screens: string[];
  is_published: boolean;
  is_featured: boolean;
  view_count: number;
  helpful_count: number;
  not_helpful_count: number;
  author_id: string | null;
  author_name: string | null;
  created_at: string;
  updated_at: string;
  category?: HelpCategory;
}

export function useHelpCategories() {
  return useQuery({
    queryKey: ["help-categories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("help_categories")
        .select("*")
        .eq("is_active", true)
        .order("display_order", { ascending: true });
      
      if (error) throw error;
      return data as HelpCategory[];
    },
  });
}

export function useHelpArticles(categorySlug?: string, searchQuery?: string) {
  return useQuery({
    queryKey: ["help-articles", categorySlug, searchQuery],
    queryFn: async () => {
      let query = supabase
        .from("help_articles")
        .select(`
          *,
          category:help_categories(*)
        `)
        .eq("is_published", true)
        .order("created_at", { ascending: false });

      if (categorySlug) {
        // First get the category ID
        const { data: categoryData } = await supabase
          .from("help_categories")
          .select("id")
          .eq("slug", categorySlug)
          .single();
        
        if (categoryData) {
          query = query.eq("category_id", categoryData.id);
        }
      }

      const { data, error } = await query;
      if (error) throw error;

      let articles = data as HelpArticle[];

      // Client-side search filtering (simple approach)
      if (searchQuery && searchQuery.trim()) {
        const search = searchQuery.toLowerCase();
        articles = articles.filter(
          (article) =>
            article.title.toLowerCase().includes(search) ||
            article.content.toLowerCase().includes(search) ||
            article.excerpt?.toLowerCase().includes(search) ||
            article.tags.some((tag) => tag.toLowerCase().includes(search))
        );
      }

      return articles;
    },
  });
}

export function useHelpArticle(slug: string) {
  return useQuery({
    queryKey: ["help-article", slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("help_articles")
        .select(`
          *,
          category:help_categories(*)
        `)
        .eq("slug", slug)
        .eq("is_published", true)
        .single();

      if (error) throw error;

      // Increment view count
      await supabase
        .from("help_articles")
        .update({ view_count: (data.view_count || 0) + 1 })
        .eq("id", data.id);

      return data as HelpArticle;
    },
    enabled: !!slug,
  });
}

export function useRelatedArticles(articleId: string, categoryId: string | null, tags: string[]) {
  return useQuery({
    queryKey: ["related-articles", articleId, categoryId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("help_articles")
        .select("id, title, slug, excerpt")
        .eq("is_published", true)
        .neq("id", articleId)
        .limit(3);

      if (error) throw error;
      return data;
    },
    enabled: !!articleId,
  });
}

export function useContextualHelp(screenName: string) {
  return useQuery({
    queryKey: ["contextual-help", screenName],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("help_articles")
        .select("id, title, slug, excerpt")
        .eq("is_published", true)
        .contains("related_screens", [screenName])
        .limit(5);

      if (error) throw error;
      return data;
    },
    enabled: !!screenName,
  });
}

export function useArticleFeedback() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      articleId,
      isHelpful,
      feedbackText,
    }: {
      articleId: string;
      isHelpful: boolean;
      feedbackText?: string;
    }) => {
      const { error } = await supabase.from("help_article_feedback").insert({
        article_id: articleId,
        user_id: user?.id,
        is_helpful: isHelpful,
        feedback_text: feedbackText,
      });

      if (error) throw error;

      // Update the article's helpful counts directly
      if (isHelpful) {
        await supabase
          .from("help_articles")
          .update({ helpful_count: (await supabase.from("help_articles").select("helpful_count").eq("id", articleId).single()).data?.helpful_count + 1 || 1 })
          .eq("id", articleId);
      } else {
        await supabase
          .from("help_articles")
          .update({ not_helpful_count: (await supabase.from("help_articles").select("not_helpful_count").eq("id", articleId).single()).data?.not_helpful_count + 1 || 1 })
          .eq("id", articleId);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["help-article"] });
    },
  });
}

export function useLogSearch() {
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      searchQuery,
      resultsCount,
    }: {
      searchQuery: string;
      resultsCount: number;
    }) => {
      await supabase.from("help_search_analytics").insert({
        search_query: searchQuery,
        user_id: user?.id,
        results_count: resultsCount,
      });
    },
  });
}

// Admin functions
export function useAllHelpArticles() {
  return useQuery({
    queryKey: ["admin-help-articles"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("help_articles")
        .select(`
          *,
          category:help_categories(*)
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as HelpArticle[];
    },
  });
}

export function useCreateArticle() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (article: {
      title: string;
      slug: string;
      content: string;
      category_id?: string;
      excerpt?: string;
      tags?: string[];
      related_screens?: string[];
      is_published?: boolean;
      is_featured?: boolean;
      author_id?: string;
      author_name?: string;
    }) => {
      const { data, error } = await supabase
        .from("help_articles")
        .insert(article)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["help-articles"] });
      queryClient.invalidateQueries({ queryKey: ["admin-help-articles"] });
    },
  });
}

export function useUpdateArticle() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      ...updates
    }: Partial<HelpArticle> & { id: string }) => {
      const { data, error } = await supabase
        .from("help_articles")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["help-articles"] });
      queryClient.invalidateQueries({ queryKey: ["admin-help-articles"] });
      queryClient.invalidateQueries({ queryKey: ["help-article"] });
    },
  });
}

export function useDeleteArticle() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("help_articles")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["help-articles"] });
      queryClient.invalidateQueries({ queryKey: ["admin-help-articles"] });
    },
  });
}

export function useHelpSearchAnalytics() {
  return useQuery({
    queryKey: ["help-search-analytics"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("help_search_analytics")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);

      if (error) throw error;
      return data;
    },
  });
}

export function useMostViewedArticles() {
  return useQuery({
    queryKey: ["most-viewed-articles"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("help_articles")
        .select("id, title, slug, view_count, helpful_count, not_helpful_count")
        .eq("is_published", true)
        .order("view_count", { ascending: false })
        .limit(10);

      if (error) throw error;
      return data;
    },
  });
}
