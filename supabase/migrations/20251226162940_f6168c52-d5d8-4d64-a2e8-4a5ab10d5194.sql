-- Create help_categories table
CREATE TABLE public.help_categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  icon TEXT,
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create help_articles table
CREATE TABLE public.help_articles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  category_id UUID REFERENCES public.help_categories(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  content TEXT NOT NULL,
  excerpt TEXT,
  tags TEXT[] DEFAULT '{}',
  related_screens TEXT[] DEFAULT '{}', -- For in-app contextual help (e.g., 'pos', 'inventory', 'reports')
  is_published BOOLEAN DEFAULT false,
  is_featured BOOLEAN DEFAULT false,
  view_count INTEGER DEFAULT 0,
  helpful_count INTEGER DEFAULT 0,
  not_helpful_count INTEGER DEFAULT 0,
  author_id UUID,
  author_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create help_article_feedback table for tracking user feedback
CREATE TABLE public.help_article_feedback (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  article_id UUID NOT NULL REFERENCES public.help_articles(id) ON DELETE CASCADE,
  user_id UUID,
  business_id UUID REFERENCES public.businesses(id) ON DELETE SET NULL,
  is_helpful BOOLEAN NOT NULL,
  feedback_text TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create help_search_analytics for tracking unresolved searches
CREATE TABLE public.help_search_analytics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  search_query TEXT NOT NULL,
  user_id UUID,
  business_id UUID REFERENCES public.businesses(id) ON DELETE SET NULL,
  results_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.help_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.help_articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.help_article_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.help_search_analytics ENABLE ROW LEVEL SECURITY;

-- Help categories are publicly readable (anyone can view help)
CREATE POLICY "Help categories are publicly readable" 
ON public.help_categories 
FOR SELECT 
USING (is_active = true);

-- Only super admins can manage categories
CREATE POLICY "Super admins can manage help categories" 
ON public.help_categories 
FOR ALL 
USING (public.is_admin(auth.uid()));

-- Published help articles are publicly readable
CREATE POLICY "Published help articles are publicly readable" 
ON public.help_articles 
FOR SELECT 
USING (is_published = true);

-- Super admins can manage all articles
CREATE POLICY "Super admins can manage help articles" 
ON public.help_articles 
FOR ALL 
USING (public.is_admin(auth.uid()));

-- Anyone can submit feedback
CREATE POLICY "Authenticated users can submit feedback" 
ON public.help_article_feedback 
FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL);

-- Users can view their own feedback
CREATE POLICY "Users can view their own feedback" 
ON public.help_article_feedback 
FOR SELECT 
USING (user_id = auth.uid());

-- Super admins can view all feedback
CREATE POLICY "Super admins can view all feedback" 
ON public.help_article_feedback 
FOR SELECT 
USING (public.is_admin(auth.uid()));

-- Anyone can log searches
CREATE POLICY "Authenticated users can log searches" 
ON public.help_search_analytics 
FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL);

-- Super admins can view search analytics
CREATE POLICY "Super admins can view search analytics" 
ON public.help_search_analytics 
FOR SELECT 
USING (public.is_admin(auth.uid()));

-- Add updated_at triggers
CREATE TRIGGER update_help_categories_updated_at
  BEFORE UPDATE ON public.help_categories
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_help_articles_updated_at
  BEFORE UPDATE ON public.help_articles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for better search performance
CREATE INDEX idx_help_articles_category ON public.help_articles(category_id);
CREATE INDEX idx_help_articles_published ON public.help_articles(is_published);
CREATE INDEX idx_help_articles_tags ON public.help_articles USING GIN(tags);
CREATE INDEX idx_help_articles_related_screens ON public.help_articles USING GIN(related_screens);
CREATE INDEX idx_help_search_analytics_query ON public.help_search_analytics(search_query);

-- Insert the 7 categories from the BVBooks Help Center structure
INSERT INTO public.help_categories (name, slug, description, icon, display_order) VALUES
('Getting Started with BVBooks', 'getting-started', 'Welcome to BVBooks and learn how to set up your business', 'Rocket', 1),
('Inventory Management', 'inventory-management', 'Learn how to manage your products and stock effectively', 'Package', 2),
('Staff Management & Permissions', 'staff-management', 'Manage your team, roles, and access controls', 'Users', 3),
('Reports & Analytics', 'reports-analytics', 'Understand your business performance with detailed reports', 'BarChart3', 4),
('Loss Prevention & Security', 'loss-prevention', 'Protect your business from fraud and theft', 'Shield', 5),
('Billing & Subscriptions', 'billing-subscriptions', 'Manage your BVBooks subscription and payments', 'CreditCard', 6),
('Troubleshooting & FAQs', 'troubleshooting', 'Common issues and frequently asked questions', 'HelpCircle', 7);