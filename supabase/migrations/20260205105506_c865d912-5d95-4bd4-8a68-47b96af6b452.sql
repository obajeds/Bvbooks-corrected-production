
-- Fix help_articles: Restrict to authenticated users only
DROP POLICY IF EXISTS "Anyone can view published help articles" ON public.help_articles;
DROP POLICY IF EXISTS "Published help articles are publicly readable" ON public.help_articles;
DROP POLICY IF EXISTS "Authenticated users can view published help articles" ON public.help_articles;

CREATE POLICY "Authenticated users can view published help articles"
ON public.help_articles
FOR SELECT
TO authenticated
USING (is_published = true);

-- Fix help_categories: Restrict to authenticated users only  
DROP POLICY IF EXISTS "Anyone can view active help categories" ON public.help_categories;
DROP POLICY IF EXISTS "Help categories are publicly readable" ON public.help_categories;
DROP POLICY IF EXISTS "Authenticated users can view help categories" ON public.help_categories;

CREATE POLICY "Authenticated users can view help categories"
ON public.help_categories
FOR SELECT
TO authenticated
USING (is_active = true);
