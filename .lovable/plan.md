

## Plan: Clean Up Stale Cron Jobs, Fix Hardcoded URLs

### Summary
All env variables already point to the correct production Supabase project (`qarkrmokbgyeeieefjbf`). No staging references. But there are 3 dead cron jobs wasting resources and 2 client files with hardcoded URLs.

### Step 1: Remove Dead Cron Jobs (SQL — run via insert tool, not migration)

Unschedule the 3 jobs that call non-existent edge functions:

```sql
SELECT cron.unschedule(2);  -- subscription-reminder (old key + no function)
SELECT cron.unschedule(3);  -- health-check (no function)
SELECT cron.unschedule(5);  -- job-worker (no function, runs every minute)
SELECT cron.unschedule(6);  -- daily_summary enqueue (depends on dead job-worker)
```

### Step 2: Fix Hardcoded Supabase URLs in Client Code

**`src/hooks/useClientBRM.ts`** — Replace hardcoded URL with env var:
```typescript
const response = await fetch(
  `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/client-brm?action=get-brm&businessId=${businessId}`,
```

**`src/pages/PriceChecker.tsx`** — Replace hardcoded URL with env var:
```typescript
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
```

### Step 3: Fix Hardcoded Fallback in DB Function

Create a migration to update `send_event_email_notification()` to remove the hardcoded URL/key fallback (same pattern as the trigger fix already applied — return NEW if settings are missing).

### Files

| Action | File |
|--------|------|
| SQL (insert tool) | Remove cron jobs 2, 3, 5, 6 |
| Edit | `src/hooks/useClientBRM.ts` — use env var |
| Edit | `src/pages/PriceChecker.tsx` — use env var |
| Migration | Remove hardcoded fallback in `send_event_email_notification` |

