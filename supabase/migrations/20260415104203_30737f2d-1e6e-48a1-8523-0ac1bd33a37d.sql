
-- Drop old incompatible job_logs if exists
DROP TABLE IF EXISTS public.job_logs CASCADE;

-- background_jobs table
CREATE TABLE IF NOT EXISTS public.background_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid REFERENCES public.businesses(id) ON DELETE CASCADE NOT NULL,
  job_type text NOT NULL CHECK (job_type IN ('report_generation', 'inventory_recalculation', 'daily_summary')),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'retry')),
  payload jsonb DEFAULT '{}'::jsonb,
  result jsonb,
  attempts int NOT NULL DEFAULT 0,
  max_attempts int NOT NULL DEFAULT 3,
  scheduled_for timestamptz NOT NULL DEFAULT now(),
  started_at timestamptz,
  completed_at timestamptz,
  error_message text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_background_jobs_status_scheduled ON public.background_jobs (status, scheduled_for) WHERE status IN ('pending', 'retry');
CREATE INDEX IF NOT EXISTS idx_background_jobs_business ON public.background_jobs (business_id, created_at DESC);

ALTER TABLE public.background_jobs ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'background_jobs' AND policyname = 'Super admins can manage all jobs') THEN
    CREATE POLICY "Super admins can manage all jobs"
      ON public.background_jobs FOR ALL TO authenticated
      USING (EXISTS (SELECT 1 FROM public.admin_roles WHERE user_id = auth.uid() AND role = 'super_admin'))
      WITH CHECK (EXISTS (SELECT 1 FROM public.admin_roles WHERE user_id = auth.uid() AND role = 'super_admin'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'background_jobs' AND policyname = 'Business owners can view own jobs') THEN
    CREATE POLICY "Business owners can view own jobs"
      ON public.background_jobs FOR SELECT TO authenticated
      USING (business_id IN (SELECT id FROM public.businesses WHERE owner_user_id = auth.uid()));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'background_jobs' AND policyname = 'Business owners can create jobs') THEN
    CREATE POLICY "Business owners can create jobs"
      ON public.background_jobs FOR INSERT TO authenticated
      WITH CHECK (business_id IN (SELECT id FROM public.businesses WHERE owner_user_id = auth.uid()));
  END IF;
END $$;

-- job_logs table
CREATE TABLE public.job_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid REFERENCES public.background_jobs(id) ON DELETE CASCADE NOT NULL,
  attempt_number int NOT NULL,
  status text NOT NULL,
  message text,
  error_details jsonb,
  duration_ms int,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_job_logs_job ON public.job_logs (job_id, created_at DESC);

ALTER TABLE public.job_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins can view all job logs"
  ON public.job_logs FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.admin_roles WHERE user_id = auth.uid() AND role = 'super_admin'));

CREATE POLICY "Business owners can view own job logs"
  ON public.job_logs FOR SELECT TO authenticated
  USING (
    job_id IN (
      SELECT bj.id FROM public.background_jobs bj
      JOIN public.businesses b ON b.id = bj.business_id
      WHERE b.owner_user_id = auth.uid()
    )
  );

-- RPC to claim jobs
CREATE OR REPLACE FUNCTION public.claim_background_jobs(batch_size int DEFAULT 5)
RETURNS SETOF public.background_jobs
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  UPDATE background_jobs
  SET status = 'processing',
      started_at = now(),
      attempts = attempts + 1
  WHERE id IN (
    SELECT bj.id FROM background_jobs bj
    WHERE bj.status IN ('pending', 'retry')
      AND bj.scheduled_for <= now()
    ORDER BY bj.created_at ASC
    LIMIT batch_size
    FOR UPDATE SKIP LOCKED
  )
  RETURNING *;
END;
$$;
