
-- Jurisdiction Profiles (stable facts per country)
CREATE TABLE public.jurisdiction_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  country_code text NOT NULL UNIQUE,
  country_name text NOT NULL,
  incorporation_regime_summary text,
  beneficial_ownership_transparency_level text,
  public_registry_depth text,
  enforcement_environment_notes text,
  sanctions_exposure_notes text,
  source_availability_notes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.jurisdiction_profiles ENABLE ROW LEVEL SECURITY;

-- Only internal users can read
CREATE POLICY "Internal read jurisdiction profiles"
  ON public.jurisdiction_profiles FOR SELECT
  USING (is_internal(auth.uid()));

-- Only managers can manage
CREATE POLICY "Manager manage jurisdiction profiles"
  ON public.jurisdiction_profiles FOR ALL
  USING (
    has_role(auth.uid(), 'fvc_assurance_manager'::app_role)
    OR has_role(auth.uid(), 'fvc_ops_admin'::app_role)
  )
  WITH CHECK (
    has_role(auth.uid(), 'fvc_assurance_manager'::app_role)
    OR has_role(auth.uid(), 'fvc_ops_admin'::app_role)
  );

-- Jurisdiction Timeline Updates (reverse-chronological entries)
CREATE TABLE public.jurisdiction_updates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  jurisdiction_id uuid NOT NULL REFERENCES public.jurisdiction_profiles(id) ON DELETE CASCADE,
  update_date date NOT NULL DEFAULT CURRENT_DATE,
  title text NOT NULL,
  factual_summary text,
  category text NOT NULL DEFAULT 'Other',
  internal_source_reference text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.jurisdiction_updates ENABLE ROW LEVEL SECURITY;

-- Only internal users can read
CREATE POLICY "Internal read jurisdiction updates"
  ON public.jurisdiction_updates FOR SELECT
  USING (is_internal(auth.uid()));

-- Only managers can manage
CREATE POLICY "Manager manage jurisdiction updates"
  ON public.jurisdiction_updates FOR ALL
  USING (
    has_role(auth.uid(), 'fvc_assurance_manager'::app_role)
    OR has_role(auth.uid(), 'fvc_ops_admin'::app_role)
  )
  WITH CHECK (
    has_role(auth.uid(), 'fvc_assurance_manager'::app_role)
    OR has_role(auth.uid(), 'fvc_ops_admin'::app_role)
  );
