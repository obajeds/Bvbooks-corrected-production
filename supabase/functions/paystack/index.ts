import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Input validation schemas
const uuidSchema = z.string().uuid();
const emailSchema = z.string().email().max(255);
const actionSchema = z.enum(['initialize', 'verify', 'cancel']);
const planSchema = z.enum(['free', 'professional', 'enterprise', 'addon_extra_branch_monthly', 'addon_extra_branch_quarterly', 'addon_extra_branch_yearly', 'addon_ai_insights_monthly', 'addon_ai_insights_quarterly', 'addon_ai_insights_yearly', 'addon_sms_email_monthly', 'addon_sms_email_quarterly', 'addon_sms_email_yearly', 'addon_email_notifications_monthly', 'addon_email_notifications_quarterly', 'addon_email_notifications_yearly']);

const initializeSchema = z.object({
  action: z.literal('initialize'),
  email: emailSchema,
  amount: z.number().positive().min(100).max(100000000), // 100 kobo to 1M Naira
  plan: planSchema,
  businessId: uuidSchema,
  metadata: z.record(z.unknown()).optional(),
});

const verifySchema = z.object({
  action: z.literal('verify'),
  reference: z.string().min(1).max(100),
});

const cancelSchema = z.object({
  action: z.literal('cancel'),
  businessId: uuidSchema,
});

// Helper to verify user authentication and business ownership
async function verifyAuth(req: Request, supabase: any, businessId?: string) {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    throw new Error('Authentication required');
  }

  const jwt = authHeader.replace('Bearer ', '');
  const { data: { user }, error: authError } = await supabase.auth.getUser(jwt);
  
  if (authError || !user) {
    throw new Error('Invalid authentication token');
  }

  // If businessId provided, verify ownership
  if (businessId) {
    const { data: business, error: businessError } = await supabase
      .from('businesses')
      .select('owner_user_id')
      .eq('id', businessId)
      .single();

    if (businessError || !business) {
      throw new Error('Business not found');
    }

    if (business.owner_user_id !== user.id) {
      throw new Error('Access denied: not business owner');
    }
  }

  return user;
}

// Allowed origins for callback URL validation
const ALLOWED_ORIGINS = [
  'https://app.bvbooks.net',
  'https://www.app.bvbooks.net',
  'https://bvbooks.net',
  'https://www.bvbooks.net',
  'https://qarkrmokbgyeeieefjbf.lovableproject.com',
  'https://my-book-boss.lovable.app',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:8080',
  'http://127.0.0.1:8080',
];

// Patterns for dynamically allowed origins (Lovable preview domains)
const ALLOWED_ORIGIN_PATTERNS = [
  /^https:\/\/[a-zA-Z0-9-]+\.lovableproject\.com$/i,
  /^https:\/\/[a-zA-Z0-9-]+--[a-zA-Z0-9-]+\.lovable\.app$/i,
  /^https:\/\/id-preview--[a-zA-Z0-9-]+\.lovable\.app$/i,
  /^https:\/\/preview--[a-zA-Z0-9-]+\.lovable\.app$/i,
  /^https:\/\/[a-zA-Z0-9-]+\.lovable\.app$/i,
  /^https:\/\/.*\.bvbooks\.net$/i,
];

function validateOrigin(origin: string | null): string {
  if (!origin) {
    throw new Error('Origin header is required');
  }
  
  // Check static allowed origins
  if (ALLOWED_ORIGINS.includes(origin)) {
    return origin;
  }
  
  // Check dynamic patterns (Lovable preview domains)
  for (const pattern of ALLOWED_ORIGIN_PATTERNS) {
    if (pattern.test(origin)) {
      console.log(`Origin ${origin} matched pattern ${pattern}`);
      return origin;
    }
  }
  
  throw new Error('Invalid origin');
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const PAYSTACK_SECRET_KEY = Deno.env.get('PAYSTACK_SECRET_KEY');
    if (!PAYSTACK_SECRET_KEY) {
      throw new Error('PAYSTACK_SECRET_KEY not configured');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Parse and validate action first
    const rawData = await req.json();
    const actionResult = actionSchema.safeParse(rawData.action);
    
    if (!actionResult.success) {
      throw new Error(`Invalid action. Must be one of: initialize, verify, cancel`);
    }

    const action = actionResult.data;
    console.log(`Paystack action: ${action}`);

    switch (action) {
      case 'initialize': {
        // Validate full input schema
        const parseResult = initializeSchema.safeParse(rawData);
        if (!parseResult.success) {
          const errors = parseResult.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ');
          throw new Error(`Validation error: ${errors}`);
        }

        const { email, amount, plan, businessId, metadata } = parseResult.data;

        // Verify authentication and business ownership
        await verifyAuth(req, supabase, businessId);

        console.log(`Initializing payment for ${email}, amount: ${amount}, plan: ${plan}`);

        // Validate origin for callback URL security
        const validatedOrigin = validateOrigin(req.headers.get('origin'));

        const response = await fetch('https://api.paystack.co/transaction/initialize', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${PAYSTACK_SECRET_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email,
            amount: amount * 100, // Paystack expects amount in kobo
            currency: 'NGN',
            callback_url: `${validatedOrigin}/subscription?verify=true`,
            metadata: {
              plan,
              business_id: businessId,
              ...metadata,
            },
          }),
        });

        const result = await response.json();
        console.log('Paystack initialize response:', result);

        if (!result.status) {
          throw new Error(result.message || 'Failed to initialize payment');
        }

        return new Response(JSON.stringify(result), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'verify': {
        // Validate input schema
        const parseResult = verifySchema.safeParse(rawData);
        if (!parseResult.success) {
          const errors = parseResult.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ');
          throw new Error(`Validation error: ${errors}`);
        }

        const { reference } = parseResult.data;

        // Verify authentication (we'll check business ownership after getting payment metadata)
        const user = await verifyAuth(req, supabase);

        console.log(`Verifying payment reference: ${reference}`);

        const response = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${PAYSTACK_SECRET_KEY}`,
          },
        });

        const result = await response.json();
        console.log('Paystack verify response:', result);

        if (!result.status || result.data.status !== 'success') {
          throw new Error('Payment verification failed');
        }

        const { metadata, amount } = result.data;
        const plan = metadata?.plan;
        const businessId = metadata?.business_id;
        const addonFeatureId = metadata?.addon_feature_id;
        const addonType = metadata?.addon_type;
        const billingPeriod = metadata?.billing_period;

        if (!plan || !businessId) {
          throw new Error('Invalid payment metadata');
        }

        // Validate the business_id from payment metadata is a valid UUID
        const businessIdResult = uuidSchema.safeParse(businessId);
        if (!businessIdResult.success) {
          throw new Error('Invalid business ID in payment metadata');
        }

        // DUPLICATE PAYMENT CHECK: See if this reference was already processed
        const { data: existingPayment } = await supabase
          .from('subscriptions')
          .select('id, payment_reference')
          .eq('payment_reference', reference)
          .maybeSingle();

        if (existingPayment) {
          console.log(`Payment reference ${reference} already processed for subscription ${existingPayment.id}`);
          return new Response(JSON.stringify({
            status: true,
            message: 'Payment already processed',
            data: {
              alreadyProcessed: true,
              subscriptionId: existingPayment.id,
            },
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // Helper function to issue refund
        const issueRefund = async (transactionReference: string, reason: string) => {
          console.log(`Issuing refund for ${transactionReference}: ${reason}`);
          try {
            const refundResponse = await fetch('https://api.paystack.co/refund', {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${PAYSTACK_SECRET_KEY}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                transaction: transactionReference,
              }),
            });
            const refundResult = await refundResponse.json();
            console.log('Paystack refund response:', refundResult);
            return refundResult;
          } catch (refundError) {
            console.error('Failed to issue refund:', refundError);
            return null;
          }
        };

        // Verify user owns this business before activating subscription
        const { data: business, error: businessError } = await supabase
          .from('businesses')
          .select('owner_user_id, plan_expires_at, current_plan')
          .eq('id', businessId)
          .single();

        if (businessError || !business) {
          throw new Error('Business not found');
        }

        if (business.owner_user_id !== user.id) {
          throw new Error('Access denied: payment does not belong to your business');
        }

        // Calculate end date based on billing period
        const now = new Date();
        const endDate = new Date(now);
        
        // Check if this is an addon purchase
        const isAddon = plan.startsWith('addon_');
        
        if (isAddon) {
          // Check for existing addon with same reference (duplicate payment)
          const { data: existingAddonPayment } = await supabase
            .from('business_addons')
            .select('id, payment_reference')
            .eq('payment_reference', reference)
            .maybeSingle();

          if (existingAddonPayment) {
            console.log(`Addon payment ${reference} already processed`);
            return new Response(JSON.stringify({
              status: true,
              message: 'Addon payment already processed',
              data: {
                alreadyProcessed: true,
                addonId: existingAddonPayment.id,
              },
            }), {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
          }

          // Handle addon purchase
          if (!addonFeatureId) {
            throw new Error('Addon feature ID is required for addon purchases');
          }

          // Calculate end date based on billing period
          if (billingPeriod === 'yearly') {
            endDate.setFullYear(endDate.getFullYear() + 1);
          } else if (billingPeriod === 'quarterly') {
            endDate.setMonth(endDate.getMonth() + 3);
          } else {
            endDate.setDate(endDate.getDate() + 30); // monthly
          }

          // Check if addon already exists for this business (any status)
          const { data: existingAddon } = await supabase
            .from('business_addons')
            .select('id, quantity, amount_paid, status')
            .eq('business_id', businessId)
            .eq('addon_feature_id', addonFeatureId)
            .maybeSingle();

          let addonError;
          if (existingAddon) {
            // Update existing addon - set to active, update quantity if was active, reset if was inactive
            const newQuantity = existingAddon.status === 'active' ? existingAddon.quantity + 1 : 1;
            const newAmountPaid = existingAddon.status === 'active' ? existingAddon.amount_paid + (amount / 100) : (amount / 100);
            
            const { error } = await supabase
              .from('business_addons')
              .update({
                quantity: newQuantity,
                status: 'active',
                start_date: now.toISOString(),
                end_date: endDate.toISOString(),
                amount_paid: newAmountPaid,
                billing_period: billingPeriod || 'monthly',
                payment_reference: reference,
                updated_at: now.toISOString(),
              })
              .eq('id', existingAddon.id);
            addonError = error;
          } else {
            // Create new business_addon record
            const { error } = await supabase
              .from('business_addons')
              .insert({
                business_id: businessId,
                addon_feature_id: addonFeatureId,
                quantity: 1,
                status: 'active',
                start_date: now.toISOString(),
                end_date: endDate.toISOString(),
                amount_paid: amount / 100,
                billing_period: billingPeriod || 'monthly',
                payment_reference: reference,
              });
            addonError = error;
          }

          if (addonError) {
            console.error('Failed to create/update addon record:', addonError);
            throw new Error('Failed to create addon record');
          }

          console.log(`Addon activated for business ${businessId}, type: ${addonType}, quantity: ${existingAddon ? existingAddon.quantity + 1 : 1}`);

          return new Response(JSON.stringify({
            status: true,
            message: 'Payment verified and addon activated',
            data: {
              plan,
              businessId,
              addonType,
              expiresAt: endDate.toISOString(),
            },
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        } else {
          // Handle subscription purchase - calculate end date based on billing period
          const subBillingPeriod = metadata?.billing_period || 'monthly';
          if (subBillingPeriod === 'yearly') {
            endDate.setFullYear(endDate.getFullYear() + 1);
          } else if (subBillingPeriod === 'quarterly') {
            endDate.setMonth(endDate.getMonth() + 3);
          } else {
            endDate.setMonth(endDate.getMonth() + 1); // Monthly - use setMonth for proper date handling
          }
          
          console.log(`Subscription billing period: ${subBillingPeriod}, end date: ${endDate.toISOString()}`);

          // DUPLICATE SUBSCRIPTION CHECK: Check if business already has an active subscription
          // with future expiry for the SAME or HIGHER tier plan
          const { data: existingSubscription } = await supabase
            .from('subscriptions')
            .select('id, status, plan, end_date, payment_reference')
            .eq('business_id', businessId)
            .eq('status', 'active')
            .maybeSingle();

          // Check for true duplicate: same plan, subscription still valid, different payment
          if (existingSubscription && existingSubscription.payment_reference !== reference) {
            const existingEndDate = new Date(existingSubscription.end_date);
            const planHierarchy: Record<string, number> = { 'free': 0, 'professional': 1, 'enterprise': 2 };
            const existingPlanLevel = planHierarchy[existingSubscription.plan] ?? 0;
            const newPlanLevel = planHierarchy[plan] ?? 0;

            // If existing subscription is still valid (not expired) and same/higher plan level
            // This is a duplicate payment - issue refund
            if (existingEndDate > now && newPlanLevel <= existingPlanLevel) {
              console.log(`DUPLICATE DETECTED: Business ${businessId} already has active ${existingSubscription.plan} until ${existingEndDate.toISOString()}`);
              
              // Issue automatic refund
              const refundResult = await issueRefund(reference, `Duplicate subscription payment. Business already has active ${existingSubscription.plan} plan.`);
              
              return new Response(JSON.stringify({
                status: false,
                message: `You already have an active ${existingSubscription.plan} subscription until ${existingEndDate.toLocaleDateString()}. Payment has been automatically refunded.`,
                data: {
                  duplicateDetected: true,
                  existingPlan: existingSubscription.plan,
                  existingExpiry: existingSubscription.end_date,
                  refundInitiated: refundResult?.status === true,
                },
              }), {
                status: 400,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              });
            }
          }

          // ATOMIC SUBSCRIPTION ACTIVATION
          // Step 1: Create/update subscription record FIRST (single source of truth)
          let subscriptionId: string | null = null;
          let subscriptionError;
          
          if (existingSubscription) {
            // UPDATE existing subscription (upgrade case or renewal after expiry)
            console.log(`[ATOMIC] Updating existing subscription ${existingSubscription.id} for business ${businessId}`);
            const { data: updatedSub, error } = await supabase
              .from('subscriptions')
              .update({
                plan: plan,
                status: 'active',
                amount: amount / 100,
                currency: 'NGN',
                start_date: now.toISOString(),
                end_date: endDate.toISOString(),
                payment_method: 'paystack',
                payment_reference: reference,
              })
              .eq('id', existingSubscription.id)
              .select('id')
              .single();
            subscriptionError = error;
            subscriptionId = updatedSub?.id || existingSubscription.id;
          } else {
            // Create new subscription record
            console.log(`[ATOMIC] Creating new subscription for business ${businessId}`);
            const { data: newSub, error } = await supabase
              .from('subscriptions')
              .insert({
                business_id: businessId,
                plan: plan,
                status: 'active',
                amount: amount / 100,
                currency: 'NGN',
                start_date: now.toISOString(),
                end_date: endDate.toISOString(),
                payment_method: 'paystack',
                payment_reference: reference,
              })
              .select('id')
              .single();
            subscriptionError = error;
            subscriptionId = newSub?.id || null;
          }

          // CRITICAL: If subscription creation/update fails, log as "paid_not_activated"
          if (subscriptionError || !subscriptionId) {
            console.error('[ATOMIC FAILURE] Failed to create/update subscription:', subscriptionError);
            
            // Log payment mismatch for Super Admin reconciliation
            await supabase
              .from('admin_audit_logs')
              .insert({
                admin_user_id: user.id,
                admin_name: 'System',
                role: 'super_admin',
                action: 'paid_not_activated',
                entity_type: 'business',
                entity_id: businessId,
                entity_name: `Payment ${reference}`,
                ip_address: '0.0.0.0',
                after_value: JSON.stringify({
                  payment_reference: reference,
                  plan: plan,
                  amount: amount / 100,
                  error: subscriptionError?.message || 'Unknown error',
                  timestamp: now.toISOString(),
                }),
                reason: 'CRITICAL: Payment successful but subscription activation failed',
              });
            
            // Return error - DO NOT grant access
            return new Response(JSON.stringify({
              status: false,
              message: 'Payment received but subscription activation failed. Please contact support with reference: ' + reference,
              data: {
                paid_not_activated: true,
                payment_reference: reference,
                plan: plan,
              },
            }), {
              status: 500,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
          }

          // Step 2: Update business table (secondary sync)
          const { error: businessUpdateError } = await supabase
            .from('businesses')
            .update({
              current_plan: plan,
              subscription_plan: plan,
              subscription_expiry: endDate.toISOString(),
              account_status: 'active',
              plan_started_at: now.toISOString(),
              plan_expires_at: endDate.toISOString(),
              trial_started_at: null,
              trial_ends_at: null,
            })
            .eq('id', businessId);

          if (businessUpdateError) {
            console.error('[ATOMIC WARNING] Business update failed but subscription is active:', businessUpdateError);
            // Log warning but don't fail - subscription is the source of truth
            await supabase
              .from('admin_audit_logs')
              .insert({
                admin_user_id: user.id,
                admin_name: 'System',
                role: 'super_admin',
                action: 'subscription_sync_warning',
                entity_type: 'business',
                entity_id: businessId,
                entity_name: `Business sync failed for ${reference}`,
                ip_address: '0.0.0.0',
                after_value: JSON.stringify({
                  subscription_id: subscriptionId,
                  payment_reference: reference,
                  error: businessUpdateError.message,
                  timestamp: now.toISOString(),
                }),
                reason: 'Business table sync failed but subscription is active',
              });
          }

          // Step 3: Verify subscription was actually persisted (consistency check)
          const { data: verifiedSubscription, error: verifyError } = await supabase
            .from('subscriptions')
            .select('id, status, plan, end_date')
            .eq('id', subscriptionId)
            .eq('status', 'active')
            .single();

          if (verifyError || !verifiedSubscription) {
            console.error('[ATOMIC CRITICAL] Subscription verification failed after creation:', verifyError);
            
            // Log critical error for manual reconciliation
            await supabase
              .from('admin_audit_logs')
              .insert({
                admin_user_id: user.id,
                admin_name: 'System',
                role: 'super_admin',
                action: 'subscription_verification_failed',
                entity_type: 'business',
                entity_id: businessId,
                entity_name: `Verification failed for ${reference}`,
                ip_address: '0.0.0.0',
                after_value: JSON.stringify({
                  subscription_id: subscriptionId,
                  payment_reference: reference,
                  plan: plan,
                  verify_error: verifyError?.message,
                  timestamp: now.toISOString(),
                }),
                reason: 'CRITICAL: Subscription created but verification query failed',
              });
              
            return new Response(JSON.stringify({
              status: false,
              message: 'Subscription activation could not be verified. Please contact support with reference: ' + reference,
              data: {
                verification_failed: true,
                payment_reference: reference,
              },
            }), {
              status: 500,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
          }

          console.log(`[ATOMIC SUCCESS] Subscription ${subscriptionId} activated for business ${businessId}, plan: ${plan}, expires: ${endDate.toISOString()}`);

          return new Response(JSON.stringify({
            status: true,
            message: 'Payment verified and subscription activated',
            data: {
              plan,
              businessId,
              subscriptionId,
              expiresAt: endDate.toISOString(),
              verifiedActive: true,
            },
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
      }

      case 'cancel': {
        // Validate input schema
        const parseResult = cancelSchema.safeParse(rawData);
        if (!parseResult.success) {
          const errors = parseResult.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ');
          throw new Error(`Validation error: ${errors}`);
        }

        const { businessId } = parseResult.data;

        // Verify authentication and business ownership
        await verifyAuth(req, supabase, businessId);

        console.log(`Cancelling subscription for business ${businessId}`);

        // Get current active subscription
        const { data: subscription, error: fetchError } = await supabase
          .from('subscriptions')
          .select('*')
          .eq('business_id', businessId)
          .eq('status', 'active')
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        if (fetchError || !subscription) {
          throw new Error('No active subscription found');
        }

        // Mark subscription as cancelled
        const { error: updateError } = await supabase
          .from('subscriptions')
          .update({
            status: 'cancelled',
            change_reason: 'User cancelled',
          })
          .eq('id', subscription.id);

        if (updateError) {
          throw new Error('Failed to cancel subscription');
        }

        console.log(`Subscription ${subscription.id} cancelled`);

        return new Response(JSON.stringify({
          status: true,
          message: 'Subscription cancelled. Access will continue until the end of the billing period.',
          data: {
            expiresAt: subscription.end_date,
          },
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      default:
        throw new Error(`Unknown action: ${action}`);
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'An error occurred';
    console.error('Paystack function error:', errorMessage);
    return new Response(JSON.stringify({
      status: false,
      message: errorMessage,
    }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
