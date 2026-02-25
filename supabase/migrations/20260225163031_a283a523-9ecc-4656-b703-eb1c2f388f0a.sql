
-- Create lia_assessments table
CREATE TABLE IF NOT EXISTS public.lia_assessments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organisations(id),
  case_id uuid REFERENCES public.cases(id),
  created_by_user_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'draft',
  purpose text,
  legitimate_interest text,
  necessity text,
  data_subjects jsonb DEFAULT '[]'::jsonb,
  data_categories jsonb DEFAULT '[]'::jsonb,
  sources jsonb DEFAULT '[]'::jsonb,
  special_category_requested boolean NOT NULL DEFAULT false,
  criminal_offence_requested boolean NOT NULL DEFAULT false,
  safeguards text,
  balancing_test_factors jsonb DEFAULT '{}'::jsonb,
  outcome text,
  conditions text,
  retention_months integer,
  review_date date,
  approved_by_user_id uuid,
  approved_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.lia_assessments ENABLE ROW LEVEL SECURITY;

-- RLS: Users see own org LIAs
CREATE POLICY "Users see own org lia_assessments"
  ON public.lia_assessments FOR SELECT
  USING ((org_id = get_user_org_id(auth.uid())) OR is_internal(auth.uid()));

-- RLS: Client admin/requester can create
CREATE POLICY "Client create lia_assessments"
  ON public.lia_assessments FOR INSERT
  WITH CHECK (
    (org_id = get_user_org_id(auth.uid()))
    AND (has_role(auth.uid(), 'client_admin') OR has_role(auth.uid(), 'client_requester'))
  );

-- RLS: Client admin/requester can update own org
CREATE POLICY "Client update lia_assessments"
  ON public.lia_assessments FOR UPDATE
  USING (
    ((org_id = get_user_org_id(auth.uid()))
      AND (has_role(auth.uid(), 'client_admin') OR has_role(auth.uid(), 'client_requester')))
    OR is_internal(auth.uid())
  );

-- Create lia_exports table
CREATE TABLE IF NOT EXISTS public.lia_exports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lia_id uuid NOT NULL REFERENCES public.lia_assessments(id),
  case_id uuid REFERENCES public.cases(id),
  deliverable_id uuid REFERENCES public.deliverables(id),
  file_url text,
  version integer NOT NULL DEFAULT 1,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.lia_exports ENABLE ROW LEVEL SECURITY;

-- RLS for lia_exports
CREATE POLICY "Users see own org lia_exports"
  ON public.lia_exports FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM lia_assessments la
      WHERE la.id = lia_exports.lia_id
        AND ((la.org_id = get_user_org_id(auth.uid())) OR is_internal(auth.uid()))
    )
  );

CREATE POLICY "Client create lia_exports"
  ON public.lia_exports FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM lia_assessments la
      WHERE la.id = lia_exports.lia_id
        AND ((la.org_id = get_user_org_id(auth.uid())) OR is_internal(auth.uid()))
    )
  );
