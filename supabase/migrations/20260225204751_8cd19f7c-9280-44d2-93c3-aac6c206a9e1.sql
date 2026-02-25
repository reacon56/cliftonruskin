
-- Master LIA Templates (org-level, created once by Client Admin)
CREATE TABLE public.master_lia_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id UUID NOT NULL REFERENCES public.organisations(id),
  name TEXT NOT NULL,
  purpose_category TEXT NOT NULL DEFAULT '',
  lawful_basis TEXT NOT NULL DEFAULT 'legitimate_interests',
  legitimate_interest TEXT,
  necessity TEXT,
  less_intrusive TEXT,
  balancing_fields JSONB DEFAULT '{}'::jsonb,
  safeguards TEXT,
  retention_months INTEGER,
  outcome TEXT,
  conditions TEXT,
  status TEXT NOT NULL DEFAULT 'draft',
  approved_by UUID,
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.master_lia_templates ENABLE ROW LEVEL SECURITY;

-- Client admin full control
CREATE POLICY "Client admin manage master LIA templates"
  ON public.master_lia_templates FOR ALL
  USING (
    (org_id = get_user_org_id(auth.uid()) AND has_role(auth.uid(), 'client_admin'::app_role))
    OR is_internal(auth.uid())
  );

-- All org users can read
CREATE POLICY "Users see own org master LIA templates"
  ON public.master_lia_templates FOR SELECT
  USING (org_id = get_user_org_id(auth.uid()) OR is_internal(auth.uid()));

-- Case DP Declarations (lightweight per-case)
CREATE TABLE public.case_dp_declarations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  case_id UUID NOT NULL REFERENCES public.cases(id),
  org_id UUID NOT NULL REFERENCES public.organisations(id),
  master_lia_id UUID REFERENCES public.master_lia_templates(id),
  purpose TEXT NOT NULL DEFAULT '',
  data_categories JSONB DEFAULT '[]'::jsonb,
  sensitive_criminal_offence BOOLEAN NOT NULL DEFAULT false,
  sensitive_special_category BOOLEAN NOT NULL DEFAULT false,
  minimisation_confirmed BOOLEAN NOT NULL DEFAULT false,
  retention_months INTEGER,
  requires_approval BOOLEAN NOT NULL DEFAULT false,
  approval_reasons JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.case_dp_declarations ENABLE ROW LEVEL SECURITY;

-- Users who can see the case can see its DP declaration
CREATE POLICY "Users see own org dp declarations"
  ON public.case_dp_declarations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM cases c
      WHERE c.id = case_dp_declarations.case_id
        AND (c.org_id = get_user_org_id(auth.uid()) OR is_internal(auth.uid()))
    )
  );

-- Client admin/requester can insert
CREATE POLICY "Client create dp declarations"
  ON public.case_dp_declarations FOR INSERT
  WITH CHECK (
    org_id = get_user_org_id(auth.uid())
    AND (has_role(auth.uid(), 'client_admin'::app_role) OR has_role(auth.uid(), 'client_requester'::app_role))
  );

-- Internal can manage
CREATE POLICY "Internal manage dp declarations"
  ON public.case_dp_declarations FOR ALL
  USING (is_internal(auth.uid()));
