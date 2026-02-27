
-- 1. Risk band enum
CREATE TYPE public.cr_risk_band AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'SEVERE');

-- 2. cr_risk_engine_config
CREATE TABLE public.cr_risk_engine_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  engine_version TEXT NOT NULL UNIQUE,
  thresholds_json JSONB NOT NULL DEFAULT '{}',
  weights_json JSONB NOT NULL DEFAULT '{}',
  enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.cr_risk_engine_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "internal_manage_risk_config"
  ON public.cr_risk_engine_config FOR ALL TO authenticated
  USING (public.is_internal(auth.uid()))
  WITH CHECK (public.is_internal(auth.uid()));

CREATE POLICY "service_manage_risk_config"
  ON public.cr_risk_engine_config FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

-- 3. cr_risk_result
CREATE TABLE public.cr_risk_result (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id UUID NOT NULL REFERENCES public.entities(id) ON DELETE CASCADE,
  jurisdiction_id UUID REFERENCES public.jurisdiction(id) ON DELETE SET NULL,
  risk_score NUMERIC(5,2) NOT NULL DEFAULT 0,
  risk_band public.cr_risk_band NOT NULL DEFAULT 'LOW',
  engine_version TEXT NOT NULL,
  contributing_factors_json JSONB NOT NULL DEFAULT '[]',
  recommended_controls_json JSONB NOT NULL DEFAULT '[]',
  generated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.cr_risk_result ENABLE ROW LEVEL SECURITY;

-- Org users can see results for their entities
CREATE POLICY "org_users_read_risk_results"
  ON public.cr_risk_result FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.entities e
      WHERE e.id = entity_id
        AND e.org_id = public.get_user_org_id(auth.uid())
    )
  );

CREATE POLICY "internal_read_risk_results"
  ON public.cr_risk_result FOR SELECT TO authenticated
  USING (public.is_internal(auth.uid()));

CREATE POLICY "internal_insert_risk_results"
  ON public.cr_risk_result FOR INSERT TO authenticated
  WITH CHECK (public.is_internal(auth.uid()));

CREATE POLICY "service_insert_risk_results"
  ON public.cr_risk_result FOR INSERT TO service_role
  WITH CHECK (true);

-- Indexes
CREATE INDEX idx_cr_risk_result_entity ON public.cr_risk_result(entity_id, generated_at DESC);

-- 4. Seed default config for CR-JURIS-1.0
INSERT INTO public.cr_risk_engine_config (engine_version, thresholds_json, weights_json, enabled)
VALUES (
  'CR-JURIS-1.0',
  '{"LOW": [0, 19], "MEDIUM": [20, 39], "HIGH": [40, 69], "SEVERE": [70, 100]}',
  '{
    "FATF_CALL_FOR_ACTION": 50,
    "FATF_INCREASED_MONITORING": 25,
    "EU_AML_HRTC": 25,
    "SANCTIONS_TARGETED": 20,
    "SANCTIONS_COMPREHENSIVE": 40,
    "CPI_BELOW_30": 10
  }',
  true
);
