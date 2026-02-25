
-- 1. Module types (reference table)
CREATE TABLE public.module_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  description text,
  default_enabled boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.module_types ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can read module types"
  ON public.module_types FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Internal manage module types"
  ON public.module_types FOR ALL TO authenticated
  USING (is_internal(auth.uid()));

-- Seed the two module types
INSERT INTO public.module_types (code, name, description) VALUES
  ('COMMERCIAL_POSTURE', 'Commercial Posture Note', 'Market Behaviour Intelligence — analyses trade references, payment signals, dispute posture and supplier/customer themes to assess commercial reliability.'),
  ('JURISDICTION_BENCHMARK', 'Jurisdiction & Sector Benchmark Addendum', 'Local Reality Benchmark — compares entity behaviour against jurisdiction and sector norms using governance indices and enforcement reality.');

-- 2. Case modules (link a module to a case)
CREATE TABLE public.case_modules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
  module_type_id uuid NOT NULL REFERENCES public.module_types(id),
  status text NOT NULL DEFAULT 'draft',
  requested_by uuid,
  approved_by uuid,
  price_estimate numeric,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (case_id, module_type_id)
);

ALTER TABLE public.case_modules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see own org case modules"
  ON public.case_modules FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM cases c
      WHERE c.id = case_modules.case_id
        AND (c.org_id = get_user_org_id(auth.uid()) OR is_internal(auth.uid()))
    )
  );

CREATE POLICY "Client create case modules"
  ON public.case_modules FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM cases c
      WHERE c.id = case_modules.case_id
        AND (
          (c.org_id = get_user_org_id(auth.uid()) AND (has_role(auth.uid(), 'client_admin') OR has_role(auth.uid(), 'client_requester')))
          OR is_internal(auth.uid())
        )
    )
  );

CREATE POLICY "Update case modules"
  ON public.case_modules FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM cases c
      WHERE c.id = case_modules.case_id
        AND (
          (c.org_id = get_user_org_id(auth.uid()) AND has_role(auth.uid(), 'client_admin'))
          OR is_internal(auth.uid())
        )
    )
  );

-- 3. Module outputs
CREATE TABLE public.module_outputs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_module_id uuid NOT NULL REFERENCES public.case_modules(id) ON DELETE CASCADE,
  deliverable_id uuid REFERENCES public.deliverables(id),
  executive_summary text,
  confidence_level text NOT NULL DEFAULT 'med',
  limitations text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.module_outputs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see own org module outputs"
  ON public.module_outputs FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM case_modules cm
      JOIN cases c ON c.id = cm.case_id
      WHERE cm.id = module_outputs.case_module_id
        AND (c.org_id = get_user_org_id(auth.uid()) OR is_internal(auth.uid()))
    )
  );

CREATE POLICY "Internal manage module outputs"
  ON public.module_outputs FOR ALL TO authenticated
  USING (is_internal(auth.uid()));

-- 4. Commercial posture inputs
CREATE TABLE public.commercial_posture_inputs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_module_id uuid NOT NULL REFERENCES public.case_modules(id) ON DELETE CASCADE,
  reference_type text NOT NULL,
  source_category text NOT NULL DEFAULT 'public',
  note_text text,
  confidence text NOT NULL DEFAULT 'med',
  is_anonymised boolean NOT NULL DEFAULT true,
  attachment_url text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.commercial_posture_inputs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see own org posture inputs"
  ON public.commercial_posture_inputs FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM case_modules cm
      JOIN cases c ON c.id = cm.case_id
      WHERE cm.id = commercial_posture_inputs.case_module_id
        AND (c.org_id = get_user_org_id(auth.uid()) OR is_internal(auth.uid()))
    )
  );

CREATE POLICY "Internal manage posture inputs"
  ON public.commercial_posture_inputs FOR ALL TO authenticated
  USING (is_internal(auth.uid()));

-- 5. Jurisdiction benchmark inputs
CREATE TABLE public.jurisdiction_benchmark_inputs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_module_id uuid NOT NULL REFERENCES public.case_modules(id) ON DELETE CASCADE,
  jurisdiction_country text NOT NULL,
  sector text,
  normal_patterns text,
  abnormal_patterns text,
  enforcement_reality_notes text,
  practical_guidance text,
  indices_used jsonb DEFAULT '[]'::jsonb,
  confidence text NOT NULL DEFAULT 'med',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.jurisdiction_benchmark_inputs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see own org benchmark inputs"
  ON public.jurisdiction_benchmark_inputs FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM case_modules cm
      JOIN cases c ON c.id = cm.case_id
      WHERE cm.id = jurisdiction_benchmark_inputs.case_module_id
        AND (c.org_id = get_user_org_id(auth.uid()) OR is_internal(auth.uid()))
    )
  );

CREATE POLICY "Internal manage benchmark inputs"
  ON public.jurisdiction_benchmark_inputs FOR ALL TO authenticated
  USING (is_internal(auth.uid()));

-- 6. Add missing entity context fields
ALTER TABLE public.entities
  ADD COLUMN IF NOT EXISTS data_access_level text DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS payment_terms text;
