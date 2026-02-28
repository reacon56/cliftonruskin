
-- Enum for sanctions authority
CREATE TYPE public.sanctions_authority AS ENUM ('UK', 'EU', 'US');

-- Enum for regime classification
CREATE TYPE public.sanctions_regime_type AS ENUM ('TARGETED', 'COMPREHENSIVE');

-- Curated mapping table
CREATE TABLE public.sanctions_regime_map (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  authority public.sanctions_authority NOT NULL,
  jurisdiction_id UUID NOT NULL REFERENCES public.jurisdiction(id) ON DELETE CASCADE,
  regime_type public.sanctions_regime_type NOT NULL DEFAULT 'TARGETED',
  rationale_text TEXT,
  source_url TEXT,
  effective_date DATE NOT NULL DEFAULT CURRENT_DATE,
  last_reviewed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (authority, jurisdiction_id)
);

-- RLS
ALTER TABLE public.sanctions_regime_map ENABLE ROW LEVEL SECURITY;

-- Platform admins + internal analysts can read
CREATE POLICY "Internal users can read sanctions_regime_map"
  ON public.sanctions_regime_map FOR SELECT
  USING (public.is_internal(auth.uid()));

-- Only platform admins can manage
CREATE POLICY "Platform admins can manage sanctions_regime_map"
  ON public.sanctions_regime_map FOR ALL
  USING (public.has_role(auth.uid(), 'fvc_ops_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'fvc_ops_admin'));
