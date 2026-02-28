
-- Indicator cadence rules for freshness computation
CREATE TABLE public.indicator_cadence_rule (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  indicator_type TEXT NOT NULL UNIQUE,
  expected_max_age_days INT NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS: readable by all authenticated users, writable by internal admins
ALTER TABLE public.indicator_cadence_rule ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read cadence rules"
  ON public.indicator_cadence_rule FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Internal admins can manage cadence rules"
  ON public.indicator_cadence_rule FOR ALL
  TO authenticated
  USING (public.is_internal(auth.uid()))
  WITH CHECK (public.is_internal(auth.uid()));

-- Seed data
INSERT INTO public.indicator_cadence_rule (indicator_type, expected_max_age_days, notes) VALUES
  ('FATF_STATUS',                  150, 'FATF plenary updates roughly every 4-5 months'),
  ('EU_AML_HRTC',                  180, 'EU Delegated Regulation updated ~every 6 months'),
  ('SANCTIONS_UK_PROGRAMME',         7, 'UK OFSI consolidated list updated weekly'),
  ('SANCTIONS_EU_PROGRAMME',         7, 'EU sanctions list updated weekly'),
  ('SANCTIONS_US_OFAC_PROGRAMME',    7, 'OFAC SDN list updated multiple times per week'),
  ('US_STATE_SPONSOR_TERRORISM',    90, 'State Dept designation reviewed quarterly'),
  ('US_FINCEN_311',                 90, 'Section 311 actions issued irregularly'),
  ('EU_TAX_NONCOOP',               180, 'EU Council reviews list every 6 months'),
  ('CPI_SCORE',                    540, 'TI publishes CPI annually (~18 months tolerance)');
