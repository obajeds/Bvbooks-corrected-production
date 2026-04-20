import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// In-memory rate limiting (per-instance, resets on cold start)
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 30;
const RATE_WINDOW_MS = 60_000;

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry || entry.resetAt <= now) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return false;
  }
  entry.count++;
  return entry.count > RATE_LIMIT;
}

function getStockStatus(qty: number): string {
  if (qty > 10) return "In Stock";
  if (qty > 0) return "Low Stock";
  return "Out of Stock";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    // Rate limit by IP
    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("cf-connecting-ip") ||
      "unknown";
    if (isRateLimited(ip)) {
      return new Response(
        JSON.stringify({ error: "Too many requests. Please try again later." }),
        {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const body = await req.json();
    const { businessId, barcodeValue } = body;

    if (!businessId || !barcodeValue) {
      return new Response(
        JSON.stringify({ error: "businessId and barcodeValue are required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const trimmedBarcode = String(barcodeValue).trim();
    if (trimmedBarcode.length < 1 || trimmedBarcode.length > 100) {
      return new Response(
        JSON.stringify({ error: "Invalid barcode value" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Create service-role client to bypass RLS
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // 1. Look up barcode
    let productId: string | null = null;

    const { data: barcodeMatch } = await supabase
      .from("barcodes")
      .select("product_id")
      .eq("business_id", businessId)
      .eq("barcode_value", trimmedBarcode)
      .eq("is_active", true)
      .maybeSingle();

    if (barcodeMatch) {
      productId = barcodeMatch.product_id;
    }

    // 2. Fallback: try matching by SKU
    if (!productId) {
      const { data: skuMatch } = await supabase
        .from("products")
        .select("id")
        .eq("business_id", businessId)
        .eq("sku", trimmedBarcode)
        .maybeSingle();

      if (skuMatch) {
        productId = skuMatch.id;
      }
    }

    if (!productId) {
      return new Response(
        JSON.stringify({ found: false, message: "Product not found" }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // 3. Fetch product details (only public-safe fields)
    const { data: product, error: productError } = await supabase
      .from("products")
      .select("name, selling_price, stock_quantity, unit, image_url")
      .eq("id", productId)
      .eq("business_id", businessId)
      .maybeSingle();

    if (productError || !product) {
      return new Response(
        JSON.stringify({ found: false, message: "Product not found" }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // 4. Fetch business details for branding
    const { data: business } = await supabase
      .from("businesses")
      .select("trading_name, logo_url, currency")
      .eq("id", businessId)
      .maybeSingle();

    return new Response(
      JSON.stringify({
        found: true,
        product: {
          name: product.name,
          price: product.selling_price,
          stockStatus: getStockStatus(product.stock_quantity || 0),
          unit: product.unit || "unit",
          imageUrl: product.image_url,
        },
        business: {
          name: business?.trading_name || "Store",
          logoUrl: business?.logo_url,
          currency: business?.currency || "NGN",
        },
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Price check error:", error);
    return new Response(
      JSON.stringify({ error: "An unexpected error occurred" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
