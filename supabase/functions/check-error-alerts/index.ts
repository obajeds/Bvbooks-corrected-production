import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Fetch active alert rules
    const { data: rules, error: rulesError } = await supabase
      .from('alert_rules')
      .select('*')
      .eq('is_active', true)

    if (rulesError) {
      console.error('Failed to fetch alert rules:', rulesError)
      return new Response(JSON.stringify({ error: 'Failed to fetch rules' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (!rules || rules.length === 0) {
      return new Response(JSON.stringify({ message: 'No active alert rules' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const alertsTriggered: string[] = []

    for (const rule of rules) {
      const windowStart = new Date(Date.now() - rule.window_minutes * 60 * 1000).toISOString()

      let query = supabase
        .from('error_events')
        .select('id', { count: 'exact', head: true })
        .gte('created_at', windowStart)

      // Filter by condition type
      if (rule.condition_type === 'error_rate') {
        query = query.in('severity', ['error', 'critical'])
      } else if (rule.condition_type === 'slow_query') {
        query = query.eq('error_type', 'slow_api_call')
      } else if (rule.condition_type === 'failed_transaction') {
        query = query.in('error_type', ['failed_transaction', 'api_call_failed'])
      }

      const { count, error: countError } = await query

      if (countError) {
        console.error(`Failed to count errors for rule ${rule.name}:`, countError)
        continue
      }

      if (count !== null && count >= rule.threshold) {
        // Check if we already sent a notification for this rule recently (within the window)
        const { data: recentNotif } = await supabase
          .from('admin_notifications')
          .select('id')
          .eq('type', 'alert')
          .ilike('title', `%${rule.name}%`)
          .gte('created_at', windowStart)
          .limit(1)

        if (recentNotif && recentNotif.length > 0) {
          continue // Already notified within this window
        }

        // Insert admin notification
        await supabase.from('admin_notifications').insert({
          type: 'alert',
          title: `Alert: ${rule.name}`,
          message: `Threshold exceeded: ${count} events in ${rule.window_minutes} minutes (threshold: ${rule.threshold}). Condition: ${rule.condition_type}.`,
        })

        alertsTriggered.push(rule.name)
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        rules_checked: rules.length,
        alerts_triggered: alertsTriggered,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('check-error-alerts error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
