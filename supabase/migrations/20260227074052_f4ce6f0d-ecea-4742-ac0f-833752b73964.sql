
-- Risk Model Configuration (versioned, manager-only)
CREATE TABLE public.risk_model_configs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  version text NOT NULL DEFAULT 'v1.0',
  jurisdiction_weight numeric NOT NULL DEFAULT 25,
  structural_weight numeric NOT NULL DEFAULT 25,
  association_weight numeric NOT NULL DEFAULT 25,
  event_weight numeric NOT NULL DEFAULT 25,
  band_low_max numeric NOT NULL DEFAULT 25,
  band_medium_max numeric NOT NULL DEFAULT 50,
  band_high_max numeric NOT NULL DEFAULT 75,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  notes text
);

ALTER TABLE public.risk_model_configs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Internal read risk configs"
ON public.risk_model_configs FOR SELECT TO authenticated
USING (is_internal(auth.uid()));

CREATE POLICY "Manager manage risk configs"
ON public.risk_model_configs FOR ALL TO authenticated
USING (has_role(auth.uid(), 'fvc_assurance_manager') OR has_role(auth.uid(), 'fvc_ops_admin'))
WITH CHECK (has_role(auth.uid(), 'fvc_assurance_manager') OR has_role(auth.uid(), 'fvc_ops_admin'));

-- Entity Risk Scores
CREATE TABLE public.entity_risk_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id uuid NOT NULL REFERENCES public.entities(id) ON DELETE CASCADE,
  model_version text NOT NULL DEFAULT 'v1.0',
  jurisdiction_score numeric NOT NULL DEFAULT 0,
  structural_score numeric NOT NULL DEFAULT 0,
  association_score numeric NOT NULL DEFAULT 0,
  event_score numeric NOT NULL DEFAULT 0,
  overall_score numeric NOT NULL DEFAULT 0,
  risk_band text NOT NULL DEFAULT 'Low',
  reason_codes jsonb NOT NULL DEFAULT '[]'::jsonb,
  confidence text NOT NULL DEFAULT 'Low',
  calculated_at timestamptz NOT NULL DEFAULT now(),
  calculated_by uuid
);

ALTER TABLE public.entity_risk_scores ENABLE ROW LEVEL SECURITY;

-- Internal see all scores
CREATE POLICY "Internal read risk scores"
ON public.entity_risk_scores FOR SELECT TO authenticated
USING (is_internal(auth.uid()));

-- Clients see scores for their entities (band + reasons only enforced in UI)
CREATE POLICY "Clients read own entity risk scores"
ON public.entity_risk_scores FOR SELECT TO authenticated
USING (
  NOT is_internal(auth.uid())
  AND EXISTS (
    SELECT 1 FROM entities e
    WHERE e.id = entity_risk_scores.entity_id
      AND e.org_id = get_user_org_id(auth.uid())
  )
);

-- Internal insert/update
CREATE POLICY "Internal manage risk scores"
ON public.entity_risk_scores FOR ALL TO authenticated
USING (is_internal(auth.uid()))
WITH CHECK (is_internal(auth.uid()));

-- Risk Overrides (audit trail)
CREATE TABLE public.risk_overrides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id uuid NOT NULL REFERENCES public.entities(id) ON DELETE CASCADE,
  previous_band text NOT NULL,
  new_band text NOT NULL,
  justification text NOT NULL,
  overridden_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.risk_overrides ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Internal read overrides"
ON public.risk_overrides FOR SELECT TO authenticated
USING (is_internal(auth.uid()));

CREATE POLICY "Manager insert overrides"
ON public.risk_overrides FOR INSERT TO authenticated
WITH CHECK (
  overridden_by = auth.uid()
  AND (has_role(auth.uid(), 'fvc_assurance_manager') OR has_role(auth.uid(), 'fvc_ops_admin'))
);
