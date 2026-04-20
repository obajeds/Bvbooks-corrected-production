import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Input validation schemas
const uuidSchema = z.string().uuid();
const saleItemSchema = z.object({
  product_id: uuidSchema.optional(),
  product_name: z.string().max(200),
  quantity: z.number().positive().max(100000),
  unit_price: z.number().nonnegative().max(999999999),
  total_price: z.number().nonnegative().max(999999999),
});

// Transaction metadata for signed transactions
const transactionMetadataSchema = z.object({
  device_id: z.string().min(10).max(200),
  business_id: uuidSchema,
  branch_id: uuidSchema.optional(),
  created_at: z.string().datetime(),
  version: z.number().int().positive(),
}).optional();

const salePayloadSchema = z.object({
  id: uuidSchema,
  business_id: uuidSchema,
  branch_id: uuidSchema.optional(),
  customer_id: uuidSchema.optional(),
  invoice_number: z.string().max(50),
  subtotal: z.number().nonnegative().max(999999999),
  discount_amount: z.number().nonnegative().max(999999999).optional(),
  tax_amount: z.number().nonnegative().max(999999999).optional(),
  total_amount: z.number().nonnegative().max(999999999),
  payment_method: z.string().max(500),
  payment_status: z.enum(['completed', 'pending', 'partial']).optional(),
  notes: z.string().max(500).optional(),
  items: z.array(saleItemSchema).max(100),
  created_at: z.string().datetime(),
  // Signature fields for tamper protection
  _signature: z.string().length(64).optional(), // HMAC-SHA256 is 64 hex chars
  _metadata: transactionMetadataSchema,
});

const syncRequestSchema = z.object({
  device_fingerprint: z.string().min(10).max(200),
  device_name: z.string().max(100).optional(),
  business_id: uuidSchema,
  sales: z.array(salePayloadSchema).max(50), // Max 50 sales per sync
});

type SalePayload = z.infer<typeof salePayloadSchema>;
type SyncRequest = z.infer<typeof syncRequestSchema>;

// Rate limiting using database-backed approach (in-memory is ineffective for stateless edge functions)
async function checkRateLimitDB(supabase: any, identifier: string): Promise<boolean> {
  try {
    const result = await supabase.rpc('check_rate_limit', {
      _identifier: identifier,
      _identifier_type: 'sync',
      _max_attempts: 30,
      _window_minutes: 1,
    });
    if (result.error) {
      console.error('Rate limit check failed:', result.error);
      return true; // Allow on error (fail-open for sync)
    }
    return !result.data?.is_limited;
  } catch {
    return true; // Allow on error
  }
}

// Check for duplicate transaction submissions using DB
async function isDuplicateTransaction(supabase: any, transactionId: string): Promise<boolean> {
  try {
    const { data } = await supabase
      .from('sales')
      .select('id')
      .eq('id', transactionId)
      .maybeSingle();
    return !!data;
  } catch {
    return false;
  }
}

// Validate transaction signature (basic validation - device must match)
function validateTransactionMetadata(
  sale: SalePayload, 
  deviceFingerprint: string, 
  businessId: string
): { valid: boolean; reason?: string } {
  // If no metadata, treat as legacy unsigned transaction (allow for backwards compat)
  if (!sale._metadata) {
    return { valid: true };
  }
  
  // Validate device ID matches
  if (sale._metadata.device_id !== deviceFingerprint) {
    return { valid: false, reason: 'device_id_mismatch' };
  }
  
  // Validate business ID matches
  if (sale._metadata.business_id !== businessId) {
    return { valid: false, reason: 'business_id_mismatch' };
  }
  
  // Validate timestamp is not in the future (with 5 min tolerance)
  const createdAt = new Date(sale._metadata.created_at).getTime();
  const now = Date.now();
  if (createdAt > now + 5 * 60 * 1000) {
    return { valid: false, reason: 'future_timestamp' };
  }
  
  // Validate timestamp is not too old (30 days max)
  if (now - createdAt > 30 * 24 * 60 * 60 * 1000) {
    return { valid: false, reason: 'expired_transaction' };
  }
  
  return { valid: true };
}

// Log security event to database
async function logSecurityEvent(
  supabase: any,
  businessId: string,
  userId: string,
  eventType: string,
  details: Record<string, unknown>
) {
  try {
    await supabase.from('activity_logs').insert({
      business_id: businessId,
      user_id: userId,
      entity_type: 'security',
      action: eventType,
      details: details,
    });
  } catch (e) {
    console.error('Failed to log security event:', e);
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Get user from auth header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Rate limit by user ID (database-backed)
    if (!(await checkRateLimitDB(supabase, user.id))) {
      return new Response(
        JSON.stringify({ error: 'Too many sync requests. Please try again later.' }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    // Parse and validate input
    const rawBody = await req.json()
    const parseResult = syncRequestSchema.safeParse(rawBody)
    
    if (!parseResult.success) {
      const errors = parseResult.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ')
      console.error('Validation error:', errors)
      return new Response(
        JSON.stringify({ error: 'Invalid request data', details: errors }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { device_fingerprint, device_name, business_id, sales }: SyncRequest = parseResult.data

    // BOLA Prevention: Verify user has access to this business
    const { data: businessAccess } = await supabase
      .from('businesses')
      .select('id, owner_user_id')
      .eq('id', business_id)
      .single()

    const isOwner = businessAccess?.owner_user_id === user.id

    // Check if user is staff of this business
    const { data: staffRecord } = await supabase
      .from('staff')
      .select('id, branch_id')
      .eq('business_id', business_id)
      .eq('user_id', user.id)
      .eq('is_active', true)
      .maybeSingle()

    if (!isOwner && !staffRecord) {
      console.error(`BOLA attempt: User ${user.id} tried to sync to business ${business_id}`)
      return new Response(
        JSON.stringify({ error: 'Access denied' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 1. Register or update device
    const { data: device, error: deviceError } = await supabase
      .from('devices')
      .upsert({
        device_fingerprint,
        device_name: device_name || 'Unknown Device',
        cashier_id: user.id,
        business_id,
        last_seen: new Date().toISOString()
      }, { onConflict: 'device_fingerprint' })
      .select()
      .single()

    if (deviceError) {
      console.error('Device registration error:', deviceError)
      return new Response(
        JSON.stringify({ error: 'Failed to register device', details: deviceError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const results = {
      synced: [] as string[],
      failed: [] as { id: string; error: string }[],
      skipped: [] as string[],
      rejected: [] as { id: string; reason: string }[],
    }

    // 2. Process each sale with signature validation
    for (const sale of sales) {
      try {
        // Check for duplicate submission (replay attack prevention, DB-backed)
        if (await isDuplicateTransaction(supabase, sale.id)) {
          results.skipped.push(sale.id);
          continue;
        }

        // Validate transaction metadata/signature
        const validation = validateTransactionMetadata(sale, device_fingerprint, business_id);
        if (!validation.valid) {
          console.error(`Transaction validation failed for ${sale.id}: ${validation.reason}`);
          await logSecurityEvent(supabase, business_id, user.id, 'sync_validation_failed', {
            transaction_id: sale.id,
            reason: validation.reason,
            device_fingerprint: device_fingerprint.slice(0, 8), // Partial for logging
          });
          results.rejected.push({ id: sale.id, reason: validation.reason || 'validation_failed' });
          continue;
        }

        // Check if sale already exists (idempotency)
        const { data: existingSale } = await supabase
          .from('sales')
          .select('id')
          .eq('id', sale.id)
          .single()

        if (existingSale) {
          results.skipped.push(sale.id)
          continue
        }

        // Check if day is locked
        const saleDate = new Date(sale.created_at).toISOString().split('T')[0]
        const { data: dayLock } = await supabase
          .from('day_locks')
          .select('locked')
          .eq('business_id', business_id)
          .eq('cashier_id', user.id)
          .eq('sale_date', saleDate)
          .single()

        if (dayLock?.locked) {
          results.failed.push({ id: sale.id, error: 'Day is locked' })
          continue
        }

        // Insert the sale
        const { data: newSale, error: saleError } = await supabase
          .from('sales')
          .insert({
            id: sale.id,
            business_id: sale.business_id,
            branch_id: sale.branch_id || null,
            customer_id: sale.customer_id || null,
            invoice_number: sale.invoice_number,
            subtotal: sale.subtotal,
            discount_amount: sale.discount_amount || 0,
            tax_amount: sale.tax_amount || 0,
            total_amount: sale.total_amount,
            payment_method: sale.payment_method,
            payment_status: sale.payment_status || 'completed',
            notes: sale.notes || null,
            created_by: user.id,
            created_at: sale.created_at
          })
          .select()
          .single()

        if (saleError) {
          console.error('Sale insert error:', saleError)
          results.failed.push({ id: sale.id, error: saleError.message })
          continue
        }

        // Insert sale items
        if (sale.items && sale.items.length > 0) {
          const saleItems = sale.items.map(item => ({
            sale_id: newSale.id,
            product_id: item.product_id || null,
            product_name: item.product_name,
            quantity: item.quantity,
            unit_price: item.unit_price,
            total_price: item.total_price
          }))

          const { error: itemsError } = await supabase
            .from('sale_items')
            .insert(saleItems)

          if (itemsError) {
            console.error('Sale items error:', itemsError)
          }

          // Update product stock atomically (branch-aware)
          // The DB trigger on sale_items INSERT handles stock_movement records automatically
          let stockFailed = false;
          for (const item of sale.items) {
            if (item.product_id) {
              const { data: success, error: stockErr } = await supabase.rpc('atomic_decrement_stock', {
                p_product_id: item.product_id,
                p_quantity: item.quantity,
                p_business_id: business_id,
                p_branch_id: sale.branch_id || null,
              })

              if (stockErr) {
                console.error(`Stock error for product ${item.product_id}:`, stockErr)
              } else if (!success) {
                // Insufficient stock - reject this entire sale
                await supabase.from('sales').delete().eq('id', newSale.id)
                results.failed.push({ id: sale.id, error: `Insufficient stock for "${item.product_name}"` })
                stockFailed = true;
                break;
              }
            }
          }
          if (stockFailed) continue;
        }

        // Insert into sales_ledger for audit trail
        await supabase
          .from('sales_ledger')
          .insert({
            sale_id: newSale.id,
            business_id,
            cashier_id: user.id,
            amount: sale.total_amount,
            payment_type: sale.payment_method,
            reference: sale.invoice_number
          })

        // Update sync status
        await supabase.rpc('update_sync_status', {
          _business_id: business_id,
          _cashier_id: user.id,
          _sale_date: saleDate,
          _increment_synced: 1
        })

        // Mark in offline queue as synced
        await supabase
          .from('offline_sales_queue')
          .update({ status: 'synced', synced_at: new Date().toISOString() })
          .eq('id', sale.id)
          .eq('cashier_id', user.id)

        results.synced.push(sale.id)
      } catch (err) {
        console.error('Error processing sale:', err)
        results.failed.push({ id: sale.id, error: String(err) })
      }
    }

    // 3. Log the sync operation
    await supabase
      .from('sync_logs')
      .insert({
        device_id: device.id,
        business_id,
        records_sent: sales.length,
        records_received: results.synced.length,
        status: results.failed.length === 0 ? 'success' : 
                results.synced.length > 0 ? 'partial' : 'failed'
      })

    return new Response(
      JSON.stringify({
        success: true,
        device_id: device.id,
        results,
        summary: {
          total: sales.length,
          synced: results.synced.length,
          failed: results.failed.length,
          skipped: results.skipped.length
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    // Sanitize error - don't leak internal details
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error('Sync error:', errorMessage)
    return new Response(
      JSON.stringify({ error: 'Sync failed. Please try again.' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
