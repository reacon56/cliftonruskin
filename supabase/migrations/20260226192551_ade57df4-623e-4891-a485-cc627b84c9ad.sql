
-- Add retention_days to organisation_plan
ALTER TABLE public.organisation_plan
  ADD COLUMN IF NOT EXISTS report_retention_days integer NOT NULL DEFAULT 90;

-- Expunge log table
CREATE TABLE public.expunge_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deliverable_id uuid NOT NULL REFERENCES public.deliverables(id),
  case_id uuid NOT NULL REFERENCES public.cases(id),
  org_id uuid NOT NULL REFERENCES public.organisations(id),
  entity_name text,
  deliverable_title text,
  expunged_by uuid NOT NULL,
  reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.expunge_log ENABLE ROW LEVEL SECURITY;

-- Only internal managers can insert/read expunge logs
CREATE POLICY "Internal manage expunge log"
  ON public.expunge_log FOR ALL
  USING (is_internal(auth.uid()))
  WITH CHECK (is_internal(auth.uid()));

-- Add expunged flag to deliverables
ALTER TABLE public.deliverables
  ADD COLUMN IF NOT EXISTS expunged boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS expunged_at timestamptz,
  ADD COLUMN IF NOT EXISTS expunged_by uuid;
