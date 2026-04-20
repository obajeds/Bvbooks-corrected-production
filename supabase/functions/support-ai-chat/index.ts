import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SYSTEM_PROMPT = `You are the BVBooks AI assistant. Your role is to help users with questions about their account, invoices, stock, payments, branch operations, and reports. Always provide accurate, concise, and friendly responses.

IMPORTANT: You have access to a Knowledge Base (KB). When KB articles are provided in context, prioritize using that information first and cite the article title when answering.

GUIDELINES:
1. Respond clearly with actionable information when possible.
2. When KB articles are available and relevant, cite them: "According to our help article '[Article Title]'..."
3. Use the chat history to provide context in responses.
4. Provide short, helpful suggestions - avoid generic replies like "I don't know."
5. Keep the tone professional, approachable, and supportive.
6. Keep responses under 150 words unless the user needs detailed instructions.
7. When guiding users to features, use the exact navigation paths from the NAVIGATION GUIDE below.

ESCALATION RULES - Respond with [ESCALATE] at the start of your message if:
- The user explicitly asks to speak to a human or live agent
- The query involves sensitive topics: fraud, payment disputes, account security, billing changes
- You cannot answer the question confidently after 2 attempts
- The user expresses frustration or dissatisfaction with AI responses
- The issue requires account access or sensitive data modifications
- The problem is complex and requires human judgment
- KB articles don't cover the issue and you're uncertain about the answer

When escalating, still provide a brief helpful message after [ESCALATE]. For example:
"[ESCALATE] Connecting you to a live agent. Your chat history will be preserved. While you wait, please have your account details ready."

AUTO-ESCALATION KEYWORDS - If the user message contains these, escalate immediately:
- "speak to human", "talk to agent", "live agent", "real person", "customer service"
- "fraud", "unauthorized", "hacked", "security breach", "stolen"
- "refund", "dispute", "chargeback", "billing error"
- "cancel account", "delete account", "close account"

CONTEXT:
BVBooks is a business management and POS application with features including inventory management, sales and POS operations, staff management and HRM, financial reports, multi-branch support, and customer relationship management.

NAVIGATION GUIDE - Use these exact menu names when directing users:
Main Menu Items (visible in left sidebar):
• "Business Health" - Dashboard with sales overview, revenue trends, and key metrics
• "Sales" - View sales history, process transactions, access POS
• "Stock Control" - Expandable menu containing:
  - "All Items" - View and manage all products/inventory items
  - "Categories" - Manage product categories
  - "Stock Levels" - View current stock quantities per branch
  - "Adjustments" - Create or approve stock adjustments
  - "Suppliers" - Manage supplier information
  - "Purchase Orders" - Create and track purchase orders
• "Customers" - Customer list, customer groups, credit management
• "Team Activity" - Expandable menu containing:
  - "Staff" - View and manage staff members
  - "Departments" - Manage departments
  - "Attendance" - Track staff attendance
  - "Payroll" - Manage payroll (owner only)
  - "Leave" - Manage leave requests
• "Expenses" - Record and manage business expenses
• "Accounting" - Financial summaries and accounting reports
• "Business Insights" - Detailed reports and analytics
• "Approvals" - Pending approvals for discounts, refunds, stock adjustments
• "Notifications" - System notifications and alerts
• "Activity Log" - Audit trail of all system actions
• "Help Center" - Help articles and support
• "Settings" - Business settings, branches, staff permissions, subscription

Settings Sub-sections (accessible via Settings menu):
• Business - Business details, logo, currency
• Branches - Manage branch locations
• Staff Roles - Permission management
• Subscription - Plan and billing
• Business Hours - Operating hours per branch
• Account Closure - Day/shift closure rules

Note: Some menu items may be hidden based on the user's role and permissions. If a user cannot find a menu item, they may not have permission to access that feature.`;


interface KBArticle {
  id: string;
  title: string;
  content: string;
  slug: string;
  excerpt: string | null;
  tags: string[];
}

async function searchKnowledgeBase(supabase: any, query: string): Promise<{ articles: KBArticle[]; articleIds: string[] }> {
  try {
    const searchTerms = query.toLowerCase().split(/\s+/).filter(term => term.length > 2);
    
    if (searchTerms.length === 0) {
      return { articles: [], articleIds: [] };
    }

    // Search for relevant KB articles
    const { data: articles, error } = await supabase
      .from('help_articles')
      .select('id, title, content, slug, excerpt, tags')
      .eq('is_published', true)
      .limit(5);

    if (error) {
      console.error('Error searching KB:', error);
      return { articles: [], articleIds: [] };
    }

    // Filter articles by relevance (simple keyword matching)
    const relevantArticles = (articles || []).filter((article: KBArticle) => {
      const searchableText = `${article.title} ${article.excerpt || ''} ${article.content} ${(article.tags || []).join(' ')}`.toLowerCase();
      return searchTerms.some(term => searchableText.includes(term));
    }).slice(0, 3); // Return top 3 most relevant

    console.log(`KB search for "${query}" found ${relevantArticles.length} relevant articles`);

    return {
      articles: relevantArticles,
      articleIds: relevantArticles.map((a: KBArticle) => a.id)
    };
  } catch (error) {
    console.error('KB search error:', error);
    return { articles: [], articleIds: [] };
  }
}

function buildKBContext(articles: KBArticle[]): string {
  if (articles.length === 0) return '';

  let context = '\n\n--- KNOWLEDGE BASE ARTICLES (Use these to answer if relevant) ---\n';
  articles.forEach((article, index) => {
    // Truncate content to first 500 chars for context efficiency
    const truncatedContent = article.content.length > 500 
      ? article.content.substring(0, 500) + '...' 
      : article.content;
    context += `\nArticle ${index + 1}: "${article.title}"\n${truncatedContent}\n`;
  });
  context += '\n--- END KNOWLEDGE BASE ---\n';
  
  return context;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error('Missing authorization header');
      return new Response(JSON.stringify({ 
        error: 'Authentication required',
        response: null,
        shouldEscalate: false,
        blocked: true 
      }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      console.error('Invalid authentication token:', authError?.message);
      return new Response(JSON.stringify({ 
        error: 'Invalid authentication token',
        response: null,
        shouldEscalate: false,
        blocked: true 
      }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Verify user has an active business (owner or staff)
    const { data: business } = await supabase
      .from('businesses')
      .select('id')
      .eq('owner_user_id', user.id)
      .single();

    const { data: staffMember } = await supabase
      .from('staff')
      .select('id, business_id')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .single();

    if (!business && !staffMember) {
      console.error('No active business found for user:', user.id);
      return new Response(JSON.stringify({ 
        error: 'No active business found',
        response: null,
        shouldEscalate: false,
        blocked: true 
      }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (!openAIApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    const { message, conversationHistory = [], conversationId } = await req.json();

    // Server-side input validation
    if (!message || typeof message !== 'string') {
      return new Response(JSON.stringify({ 
        error: 'Invalid message format',
        response: null,
        shouldEscalate: false,
        blocked: true 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Validate message length (1-5000 characters)
    const trimmedMessage = message.trim();
    if (trimmedMessage.length < 1) {
      return new Response(JSON.stringify({ 
        error: 'Message cannot be empty',
        response: null,
        shouldEscalate: false,
        blocked: true 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (trimmedMessage.length > 5000) {
      return new Response(JSON.stringify({ 
        error: 'Message exceeds maximum length of 5000 characters',
        response: null,
        shouldEscalate: false,
        blocked: true 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Use validated message
    const validatedMessage = trimmedMessage;

    // Check conversation status if conversationId is provided
    if (conversationId) {
      const { data: conversation, error: convError } = await supabase
        .from('support_conversations')
        .select('status, assigned_admin_id')
        .eq('id', conversationId)
        .single();

      if (convError) {
        console.error('Error fetching conversation:', convError);
      }

      // AI should NOT respond if:
      // 1. Conversation is escalated (waiting for human)
      // 2. Conversation has a human agent active
      // 3. Conversation is closed
      if (conversation && conversation.status !== 'ai_only') {
        console.log('AI response blocked - conversation status:', conversation.status);
        return new Response(JSON.stringify({ 
          response: null,
          shouldEscalate: false,
          blocked: true,
          reason: `Conversation is ${conversation.status}, AI responses disabled`,
          kbArticleIds: []
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    // Search KB first before calling OpenAI
    console.log('Searching KB for user query:', validatedMessage);
    const { articles: kbArticles, articleIds: kbArticleIds } = await searchKnowledgeBase(supabase, validatedMessage);
    const kbContext = buildKBContext(kbArticles);

    // Build messages array with conversation history and KB context
    const systemPromptWithKB = SYSTEM_PROMPT + kbContext;
    const messages = [
      { role: 'system', content: systemPromptWithKB },
      ...conversationHistory.slice(-10), // Keep last 10 messages for context
      { role: 'user', content: validatedMessage }
    ];

    console.log('Sending request to OpenAI with', messages.length, 'messages for user:', user.id, 'KB articles:', kbArticleIds.length);

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages,
        max_tokens: 500,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('OpenAI API error:', errorData);
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const aiResponse = data.choices[0].message.content;

    // Check if AI wants to escalate
    const shouldEscalate = aiResponse.startsWith('[ESCALATE]');
    const cleanResponse = aiResponse.replace('[ESCALATE]', '').trim();

    console.log('AI response received, escalate:', shouldEscalate, 'KB articles cited:', kbArticleIds.length);

    return new Response(JSON.stringify({ 
      response: cleanResponse,
      shouldEscalate,
      blocked: false,
      kbArticleIds, // Return KB article IDs that were used for this response
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error in support-ai-chat function:', errorMessage);
    return new Response(JSON.stringify({ 
      error: errorMessage,
      response: "I'm having trouble connecting right now. Would you like to speak with a human agent?",
      shouldEscalate: true,
      blocked: false,
      kbArticleIds: [],
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
