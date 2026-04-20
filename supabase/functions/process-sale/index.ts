import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
}

const saleItemSchema = z.object({
  product_id: z.string().uuid(),
  product_name: z.string().min(1).max(200),
  quantity: z.number().positive().max(100000),
  unit_price: z.number().nonnegative().max(999999999),
  total_price: z.number().nonnegative().max(999999999),
  cost_price: z.number().nonnegative().max(999999999).optional().default(0),
  discount: z.number().nonnegative().max(999999999).optional().default(0),
})

const processSaleSchema = z.object({
  idempotency_key: z.string().min(10).max(200),
  business_id: z.string().uuid(),
  branch_id: z.string().uuid().optional().nullable(),
  customer_id: z.string().uuid().optional().nullable(),
  subtotal: z.number().nonnegative().max(999999999),
  discount_amount: z.number().nonnegative().max(999999999).optional().default(0),
  tax_amount: z.number().nonnegative().max(999999999).optional().default(0),
  total_amount: z.number().nonnegative().max(999999999),
  payment_method: z.string().min(1).max(500),
  payment_status: z.enum(['completed', 'pending', 'partial']).optional().default('completed'),
  notes: z.string().max(500).optional().nullable(),
  discount_type: z.enum(['rewards_redemption', 'company_discount']).optional().nullable(),
  discount_reason: z.string().max(500).optional().nullable(),
  discount_approved_by: z.string().uuid().optional().nullable(),
  rewards_redeemed_value: z.number().nonnegative().optional().default(0),
  items: z.array(saleItemSchema).min(1).max(100),
})

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    // Authenticate user
    const authHeader = req.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ ok: false, error: 'Missing authorization' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)

    if (authError || !user) {
      return new Response(
        JSON.stringify({ ok: false, error: 'Invalid token' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Validate input
    const rawBody = await req.json()
    const parseResult = processSaleSchema.safeParse(rawBody)

    if (!parseResult.success) {
      const errors = parseResult.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ')
      return new Response(
        JSON.stringify({ ok: false, error: 'Invalid request data', details: errors }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const input = parseResult.data

    // BOLA Prevention: Verify user has access to this business (parallel)
    const [{ data: businessAccess }, { data: staffRecord }] = await Promise.all([
      supabase
        .from('businesses')
        .select('id, owner_user_id')
        .eq('id', input.business_id)
        .single(),
      supabase
        .from('staff')
        .select('id')
        .eq('business_id', input.business_id)
        .eq('user_id', user.id)
        .eq('is_active', true)
        .maybeSingle(),
    ])

    const isOwner = businessAccess?.owner_user_id === user.id

    if (!isOwner && !staffRecord) {
      return new Response(
        JSON.stringify({ ok: false, error: 'Access denied' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Idempotency check: if key already exists, return the existing sale
    const { data: existingKey } = await supabase
      .from('sale_idempotency_keys')
      .select('sale_id')
      .eq('idempotency_key', input.idempotency_key)
      .maybeSingle()

    if (existingKey) {
      return new Response(
        JSON.stringify({
          ok: true,
          success: true,
          sale_id: existingKey.sale_id,
          deduplicated: true,
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Call the atomic database function (handles locking, validation, stock deduction)
    const { data: result, error: rpcError } = await supabase.rpc(
      'create_sale_atomic',
      {
        p_business_id: input.business_id,
        p_branch_id: input.branch_id || null,
        p_customer_id: input.customer_id || null,
        p_subtotal: input.subtotal,
        p_discount_amount: input.discount_amount,
        p_tax_amount: input.tax_amount,
        p_total_amount: input.total_amount,
        p_payment_method: input.payment_method,
        p_payment_status: input.payment_status,
        p_notes: input.notes || null,
        p_created_by: user.id,
        p_discount_type: input.discount_type || null,
        p_discount_reason: input.discount_reason || null,
        p_discount_approved_by: input.discount_approved_by || null,
        p_rewards_redeemed_value: input.rewards_redeemed_value,
        p_items: input.items,
      }
    )

    if (rpcError) {
      console.error('create_sale_atomic RPC error:', JSON.stringify({
        message: rpcError.message,
        details: (rpcError as any).details,
        hint: (rpcError as any).hint,
      }))
      const isStockError = rpcError.message?.includes('Insufficient stock')
      return new Response(
        JSON.stringify({
          ok: false,
          error: isStockError ? rpcError.message : 'Sale processing failed. Please try again.',
          code: isStockError ? 'INSUFFICIENT_STOCK' : 'PROCESSING_ERROR',
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Store idempotency key (ignore unique violations — means concurrent duplicate)
    await supabase
      .from('sale_idempotency_keys')
      .insert({
        idempotency_key: input.idempotency_key,
        sale_id: result.id,
        business_id: input.business_id,
      })

    // Log the activity
    await supabase.from('activity_logs').insert({
      business_id: input.business_id,
      user_id: user.id,
      entity_type: 'sale',
      action: 'sale_completed',
      entity_id: result.id,
      entity_name: result.invoice_number,
      details: {
        total_amount: input.total_amount,
        payment_method: input.payment_method,
        items_count: input.items.length,
        branch_id: input.branch_id,
      },
    })

    return new Response(
      JSON.stringify({
        ok: true,
        success: true,
        sale_id: result.id,
        invoice_number: result.invoice_number,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Process sale error:', JSON.stringify({
      message: (error as Error)?.message,
      stack: (error as Error)?.stack,
    }))
    return new Response(
      JSON.stringify({ ok: false, error: 'Sale processing failed. Please try again.' }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
