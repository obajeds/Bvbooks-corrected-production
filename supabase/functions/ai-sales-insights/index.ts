import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const openAIApiKey = Deno.env.get("OPENAI_API_KEY");
const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("No authorization header");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Get user from token
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      throw new Error("Unauthorized");
    }

    const { businessId, period = "month" } = await req.json();

    if (!businessId) {
      throw new Error("Business ID is required");
    }

    // Verify user owns or has access to this business
    const { data: business } = await supabase
      .from('businesses')
      .select('owner_user_id')
      .eq('id', businessId)
      .single();

    if (!business || business.owner_user_id !== user.id) {
      return new Response(
        JSON.stringify({ error: "AI Insights is restricted to the business owner" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if business has ai_insights addon
    const { data: allAddons } = await supabase
      .from("business_addons")
      .select("id, addon_feature:addon_features(feature_key)")
      .eq("business_id", businessId)
      .eq("status", "active");
    
    const hasAIAddon = allAddons?.some((a: any) => a.addon_feature?.feature_key === "ai_insights");
    if (!hasAIAddon) {
      return new Response(
        JSON.stringify({ error: "AI Insights addon not active" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Calculate date range
    const now = new Date();
    let startDate: Date;
    switch (period) {
      case "week":
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case "month":
        startDate = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
        break;
      case "quarter":
        startDate = new Date(now.getFullYear(), now.getMonth() - 3, now.getDate());
        break;
      default:
        startDate = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
    }

    // Fetch sales data
    const { data: sales, error: salesError } = await supabase
      .from("sales")
      .select(`
        id, created_at, total_amount, discount_amount, payment_method, created_by,
        sale_items(id, product_id, product_name, quantity, unit_price, total_price)
      `)
      .eq("business_id", businessId)
      .gte("created_at", startDate.toISOString())
      .order("created_at", { ascending: false });

    if (salesError) {
      console.error("Error fetching sales:", salesError);
      throw salesError;
    }

    // Fetch stock movements for loss detection
    const { data: stockMovements, error: stockError } = await supabase
      .from("stock_movements")
      .select("id, product_id, movement_type, quantity, notes, created_at, created_by, products(name)")
      .eq("business_id", businessId)
      .gte("created_at", startDate.toISOString())
      .order("created_at", { ascending: false });

    if (stockError) {
      console.error("Error fetching stock movements:", stockError);
    }

    // Fetch staff for performance analysis
    const { data: staff, error: staffError } = await supabase
      .from("staff")
      .select("id, name, role, user_id")
      .eq("business_id", businessId)
      .eq("is_active", true);

    if (staffError) {
      console.error("Error fetching staff:", staffError);
    }

    // Prepare summary data for AI
    const salesSummary = {
      totalSales: sales?.length || 0,
      totalRevenue: sales?.reduce((sum, s) => sum + Number(s.total_amount), 0) || 0,
      totalDiscounts: sales?.reduce((sum, s) => sum + Number(s.discount_amount || 0), 0) || 0,
      avgOrderValue: sales?.length ? (sales.reduce((sum, s) => sum + Number(s.total_amount), 0) / sales.length) : 0,
      paymentMethods: sales?.reduce((acc, s) => {
        acc[s.payment_method] = (acc[s.payment_method] || 0) + 1;
        return acc;
      }, {} as Record<string, number>) || {},
      salesByHour: sales?.reduce((acc, s) => {
        const hour = new Date(s.created_at).getHours();
        acc[hour] = (acc[hour] || 0) + 1;
        return acc;
      }, {} as Record<number, number>) || {},
      salesByDay: sales?.reduce((acc, s) => {
        const day = new Date(s.created_at).toLocaleDateString("en-US", { weekday: "long" });
        acc[day] = (acc[day] || 0) + 1;
        return acc;
      }, {} as Record<string, number>) || {},
      topProducts: getTopProducts(sales || []),
      highDiscountSales: sales?.filter(s => Number(s.discount_amount || 0) > Number(s.total_amount) * 0.2) || [],
    };

    const stockSummary = {
      totalMovements: stockMovements?.length || 0,
      adjustments: stockMovements?.filter(m => m.movement_type === "adjustment") || [],
      negativeAdjustments: stockMovements?.filter(m => m.movement_type === "out" || m.movement_type === "damage") || [],
      unusualPatterns: detectUnusualPatterns(stockMovements || []),
    };

    const staffSummary = staff?.map(s => ({
      id: s.id,
      name: s.name,
      role: s.role,
      salesCount: sales?.filter(sale => sale.created_by === s.user_id).length || 0,
      totalRevenue: sales?.filter(sale => sale.created_by === s.user_id)
        .reduce((sum, sale) => sum + Number(sale.total_amount), 0) || 0,
      totalDiscounts: sales?.filter(sale => sale.created_by === s.user_id)
        .reduce((sum, sale) => sum + Number(sale.discount_amount || 0), 0) || 0,
    })) || [];

    // Call OpenAI for analysis
    const prompt = `You are an expert business analyst for a retail/inventory management system. Analyze the following business data and provide actionable insights.

DATA SUMMARY:
Period: ${period} (${startDate.toLocaleDateString()} to ${now.toLocaleDateString()})

SALES DATA:
- Total transactions: ${salesSummary.totalSales}
- Total revenue: ${salesSummary.totalRevenue.toFixed(2)}
- Average order value: ${salesSummary.avgOrderValue.toFixed(2)}
- Total discounts given: ${salesSummary.totalDiscounts.toFixed(2)}
- Payment methods: ${JSON.stringify(salesSummary.paymentMethods)}
- Sales by hour: ${JSON.stringify(salesSummary.salesByHour)}
- Sales by day: ${JSON.stringify(salesSummary.salesByDay)}
- Top selling products: ${JSON.stringify(salesSummary.topProducts.slice(0, 10))}
- High discount sales (>20%): ${salesSummary.highDiscountSales.length} transactions

INVENTORY/LOSS DATA:
- Total stock movements: ${stockSummary.totalMovements}
- Stock adjustments: ${stockSummary.adjustments.length}
- Negative adjustments (potential losses): ${stockSummary.negativeAdjustments.length}
- Unusual patterns detected: ${stockSummary.unusualPatterns.length}

STAFF PERFORMANCE:
${staffSummary.map(s => `- ${s.name} (${s.role}): ${s.salesCount} sales, Revenue: ${s.totalRevenue.toFixed(2)}, Discounts: ${s.totalDiscounts.toFixed(2)}`).join('\n')}

Provide your analysis in the following JSON format:
{
  "salesPatterns": {
    "peakHours": ["list of peak hours with explanation"],
    "peakDays": ["list of peak days with explanation"],
    "trendingProducts": ["products that are selling well"],
    "seasonalInsights": "any seasonal pattern observations",
    "recommendations": ["actionable recommendations for sales improvement"]
  },
  "lossPreventionAlerts": {
    "highRiskAreas": ["areas of concern"],
    "unusualDiscounts": "analysis of discount patterns",
    "inventoryAnomalies": ["inventory issues detected"],
    "recommendations": ["loss prevention recommendations"]
  },
  "staffPerformance": {
    "topPerformers": ["staff members performing well"],
    "needsImprovement": ["staff who may need coaching"],
    "anomalies": ["unusual patterns in staff activity"],
    "recommendations": ["staff management recommendations"]
  },
  "overallHealth": {
    "score": 0-100,
    "summary": "brief overall business health summary",
    "criticalAlerts": ["any urgent issues"],
    "opportunities": ["growth opportunities identified"]
  }
}

Be specific, data-driven, and actionable in your insights. If data is limited, acknowledge that and provide what insights you can.`;

    console.log("Calling OpenAI API for insights...");
    
    const openAIResponse = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${openAIApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: "You are a business analytics expert. Always respond with valid JSON only, no markdown formatting." },
          { role: "user", content: prompt }
        ],
        temperature: 0.7,
        max_tokens: 2000,
      }),
    });

    if (!openAIResponse.ok) {
      const errorText = await openAIResponse.text();
      console.error("OpenAI API error:", errorText);
      throw new Error(`OpenAI API error: ${openAIResponse.status}`);
    }

    const openAIData = await openAIResponse.json();
    const aiContent = openAIData.choices[0]?.message?.content;

    if (!aiContent) {
      throw new Error("No response from OpenAI");
    }

    console.log("AI Response received:", aiContent.substring(0, 200));

    // Parse the AI response
    let insights;
    try {
      // Remove any markdown code blocks if present
      const cleanedContent = aiContent.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      insights = JSON.parse(cleanedContent);
    } catch (parseError) {
      console.error("Error parsing AI response:", parseError);
      insights = {
        salesPatterns: {
          peakHours: ["Unable to parse detailed insights"],
          peakDays: [],
          trendingProducts: [],
          seasonalInsights: "Analysis in progress",
          recommendations: ["Please try again"]
        },
        lossPreventionAlerts: {
          highRiskAreas: [],
          unusualDiscounts: "Analysis pending",
          inventoryAnomalies: [],
          recommendations: []
        },
        staffPerformance: {
          topPerformers: [],
          needsImprovement: [],
          anomalies: [],
          recommendations: []
        },
        overallHealth: {
          score: 50,
          summary: "Unable to complete full analysis",
          criticalAlerts: [],
          opportunities: []
        },
        rawResponse: aiContent
      };
    }

    return new Response(
      JSON.stringify({
        success: true,
        period,
        generatedAt: new Date().toISOString(),
        dataSummary: {
          salesCount: salesSummary.totalSales,
          totalRevenue: salesSummary.totalRevenue,
          avgOrderValue: salesSummary.avgOrderValue,
          stockMovements: stockSummary.totalMovements,
          staffCount: staffSummary.length,
        },
        insights,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Error in ai-sales-insights:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Detailed error:", errorMessage);
    return new Response(
      JSON.stringify({ error: "Failed to generate insights. Please try again." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

function getTopProducts(sales: any[]): { name: string; quantity: number; revenue: number }[] {
  const productMap = new Map<string, { name: string; quantity: number; revenue: number }>();
  
  for (const sale of sales) {
    for (const item of sale.sale_items || []) {
      const existing = productMap.get(item.product_name) || { name: item.product_name, quantity: 0, revenue: 0 };
      existing.quantity += item.quantity;
      existing.revenue += Number(item.total_price);
      productMap.set(item.product_name, existing);
    }
  }
  
  return Array.from(productMap.values())
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 20);
}

function detectUnusualPatterns(movements: any[]): string[] {
  const patterns: string[] = [];
  
  // Detect frequent adjustments on same product
  const productAdjustments = movements
    .filter(m => m.movement_type === "adjustment")
    .reduce((acc, m) => {
      acc[m.product_id] = (acc[m.product_id] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  
  for (const [productId, count] of Object.entries(productAdjustments)) {
    if ((count as number) >= 3) {
      const product = movements.find(m => m.product_id === productId);
      patterns.push(`Frequent adjustments (${count}x) on: ${product?.products?.name || productId}`);
    }
  }
  
  // Detect large negative adjustments
  const largeNegatives = movements.filter(
    m => (m.movement_type === "out" || m.movement_type === "damage") && m.quantity > 10
  );
  
  for (const neg of largeNegatives) {
    patterns.push(`Large stock decrease (${neg.quantity}) on: ${neg.products?.name || neg.product_id}`);
  }
  
  return patterns;
}
