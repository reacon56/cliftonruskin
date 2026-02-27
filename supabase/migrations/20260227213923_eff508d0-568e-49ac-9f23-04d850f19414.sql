
-- Jurisdiction alias table for canonicalisation
CREATE TABLE public.jurisdiction_alias (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  jurisdiction_id uuid NOT NULL REFERENCES public.jurisdiction(id) ON DELETE CASCADE,
  alias_name text NOT NULL,
  source_name text NOT NULL DEFAULT 'manual',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(alias_name)
);

-- Enable RLS
ALTER TABLE public.jurisdiction_alias ENABLE ROW LEVEL SECURITY;

-- Internal users can read
CREATE POLICY "Internal read jurisdiction alias"
  ON public.jurisdiction_alias FOR SELECT
  TO authenticated
  USING (is_internal(auth.uid()));

-- Managers can manage
CREATE POLICY "Manager manage jurisdiction alias"
  ON public.jurisdiction_alias FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'fvc_assurance_manager') OR has_role(auth.uid(), 'fvc_ops_admin'))
  WITH CHECK (has_role(auth.uid(), 'fvc_assurance_manager') OR has_role(auth.uid(), 'fvc_ops_admin'));

-- Seed common aliases
INSERT INTO public.jurisdiction_alias (jurisdiction_id, alias_name, source_name)
SELECT j.id, a.alias, 'seed'
FROM public.jurisdiction j
CROSS JOIN LATERAL (VALUES
  -- Variations that commonly appear in source data
  ('GB', 'United Kingdom of Great Britain and Northern Ireland'),
  ('GB', 'UK'),
  ('GB', 'Great Britain'),
  ('GB', 'England'),
  ('US', 'United States of America'),
  ('US', 'USA'),
  ('US', 'U.S.A.'),
  ('US', 'U.S.'),
  ('AE', 'UAE'),
  ('AE', 'U.A.E.'),
  ('RU', 'Russian Federation'),
  ('CN', 'People''s Republic of China'),
  ('CN', 'PRC'),
  ('HK', 'Hong Kong SAR'),
  ('HK', 'Hong Kong, China'),
  ('KY', 'Cayman Is.'),
  ('SG', 'Republic of Singapore'),
  ('CH', 'Swiss Confederation'),
  ('NG', 'Federal Republic of Nigeria')
) AS a(code, alias)
WHERE j.country_code = a.code
ON CONFLICT (alias_name) DO NOTHING;
