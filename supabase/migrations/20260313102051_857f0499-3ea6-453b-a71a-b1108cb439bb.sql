-- 1) Backfill active staff missing active branch assignments
WITH missing_staff AS (
  SELECT s.id AS staff_id, s.business_id, s.branch_id, s.role
  FROM public.staff s
  WHERE s.is_active = true
    AND NOT EXISTS (
      SELECT 1
      FROM public.staff_branch_assignments sba
      WHERE sba.staff_id = s.id
        AND sba.is_active = true
    )
), resolved_assignments AS (
  SELECT
    ms.staff_id,
    ms.business_id,
    COALESCE(
      (
        SELECT b.id
        FROM public.branches b
        WHERE b.id = ms.branch_id
          AND b.business_id = ms.business_id
          AND b.is_active = true
        LIMIT 1
      ),
      (
        SELECT b.id
        FROM public.branches b
        WHERE b.business_id = ms.business_id
          AND b.is_active = true
        ORDER BY b.is_main DESC, b.created_at ASC
        LIMIT 1
      )
    ) AS resolved_branch_id,
    ms.role
  FROM missing_staff ms
), resolved_with_template AS (
  SELECT
    ra.staff_id,
    ra.resolved_branch_id,
    (
      SELECT rt.id
      FROM public.role_templates rt
      WHERE rt.is_active = true
        AND (
          rt.business_id = ra.business_id
          OR (rt.is_system = true AND rt.business_id IS NULL)
        )
        AND lower(rt.name) = lower(ra.role)
      ORDER BY (rt.business_id = ra.business_id) DESC, rt.is_system DESC
      LIMIT 1
    ) AS resolved_role_template_id
  FROM resolved_assignments ra
  WHERE ra.resolved_branch_id IS NOT NULL
)
INSERT INTO public.staff_branch_assignments (
  staff_id,
  branch_id,
  role_template_id,
  is_primary,
  is_active
)
SELECT
  rwt.staff_id,
  rwt.resolved_branch_id,
  rwt.resolved_role_template_id,
  true,
  true
FROM resolved_with_template rwt
ON CONFLICT (staff_id, branch_id)
DO UPDATE SET
  is_active = true,
  is_primary = true,
  role_template_id = COALESCE(public.staff_branch_assignments.role_template_id, EXCLUDED.role_template_id),
  updated_at = now();

-- 2) Normalize primary flag so each active staff assignment has exactly one primary row
WITH ranked AS (
  SELECT
    sba.id,
    ROW_NUMBER() OVER (
      PARTITION BY sba.staff_id
      ORDER BY sba.is_primary DESC, sba.created_at ASC, sba.id ASC
    ) AS rn
  FROM public.staff_branch_assignments sba
  WHERE sba.is_active = true
)
UPDATE public.staff_branch_assignments sba
SET
  is_primary = (ranked.rn = 1),
  updated_at = now()
FROM ranked
WHERE sba.id = ranked.id
  AND sba.is_primary IS DISTINCT FROM (ranked.rn = 1);

-- 3) Safety trigger function: ensure every active staff has at least one active assignment
CREATE OR REPLACE FUNCTION public.ensure_staff_active_branch_assignment()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_branch_id uuid;
  v_role_template_id uuid;
BEGIN
  -- Only enforce for active staff
  IF NEW.is_active IS DISTINCT FROM true THEN
    RETURN NEW;
  END IF;

  -- If already assigned to at least one active branch, nothing to do
  IF EXISTS (
    SELECT 1
    FROM public.staff_branch_assignments sba
    WHERE sba.staff_id = NEW.id
      AND sba.is_active = true
      AND (sba.expires_at IS NULL OR sba.expires_at >= now())
  ) THEN
    RETURN NEW;
  END IF;

  -- Resolve branch: preferred NEW.branch_id, else active main/first branch in same business
  SELECT b.id
  INTO v_branch_id
  FROM public.branches b
  WHERE b.id = NEW.branch_id
    AND b.business_id = NEW.business_id
    AND b.is_active = true
  LIMIT 1;

  IF v_branch_id IS NULL THEN
    SELECT b.id
    INTO v_branch_id
    FROM public.branches b
    WHERE b.business_id = NEW.business_id
      AND b.is_active = true
    ORDER BY b.is_main DESC, b.created_at ASC
    LIMIT 1;
  END IF;

  -- If no active branch exists for business, skip safely
  IF v_branch_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Best-effort role template match by role name (business template first, then system)
  IF COALESCE(NULLIF(trim(NEW.role), ''), '') <> '' THEN
    SELECT rt.id
    INTO v_role_template_id
    FROM public.role_templates rt
    WHERE rt.is_active = true
      AND (
        rt.business_id = NEW.business_id
        OR (rt.is_system = true AND rt.business_id IS NULL)
      )
      AND lower(rt.name) = lower(NEW.role)
    ORDER BY (rt.business_id = NEW.business_id) DESC, rt.is_system DESC
    LIMIT 1;
  END IF;

  INSERT INTO public.staff_branch_assignments (
    staff_id,
    branch_id,
    role_template_id,
    is_primary,
    is_active
  )
  VALUES (
    NEW.id,
    v_branch_id,
    v_role_template_id,
    true,
    true
  )
  ON CONFLICT (staff_id, branch_id)
  DO UPDATE SET
    is_active = true,
    is_primary = true,
    role_template_id = COALESCE(public.staff_branch_assignments.role_template_id, EXCLUDED.role_template_id),
    updated_at = now();

  -- Keep only one active primary assignment per staff
  UPDATE public.staff_branch_assignments
  SET is_primary = false,
      updated_at = now()
  WHERE staff_id = NEW.id
    AND is_active = true
    AND branch_id <> v_branch_id
    AND is_primary = true;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS ensure_staff_active_branch_assignment_trigger ON public.staff;
CREATE TRIGGER ensure_staff_active_branch_assignment_trigger
AFTER INSERT OR UPDATE OF is_active, branch_id, business_id, role
ON public.staff
FOR EACH ROW
EXECUTE FUNCTION public.ensure_staff_active_branch_assignment();