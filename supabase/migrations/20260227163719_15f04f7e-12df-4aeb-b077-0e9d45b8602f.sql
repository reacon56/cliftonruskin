
-- Enum for indicator types
CREATE TYPE public.indicator_type AS ENUM (
  'FATF_STATUS',
  'EU_AML_HRTC',
  'SANCTIONS_UK_PROGRAMME',
  'SANCTIONS_EU_PROGRAMME',
  'SANCTIONS_US_OFAC_PROGRAMME',
  'US_STATE_SPONSOR_TERRORISM',
  'US_FINCEN_311',
  'EU_TAX_NONCOOP',
  'CPI_SCORE'
);

-- Core jurisdiction table (distinct from existing jurisdiction_profiles which is CR-internal)
CREATE TABLE public.jurisdiction (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  country_code text NOT NULL UNIQUE,
  country_name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Data sources registry
CREATE TABLE public.data_source (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL UNIQUE,
  base_url text,
  description text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Ingestion run log
CREATE TABLE public.ingestion_run (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  data_source_id uuid NOT NULL REFERENCES public.data_source(id),
  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz,
  status text NOT NULL DEFAULT 'running',
  records_processed integer NOT NULL DEFAULT 0,
  records_changed integer NOT NULL DEFAULT 0,
  metadata jsonb DEFAULT '{}'::jsonb
);

-- Ingestion errors
CREATE TABLE public.ingestion_error (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ingestion_run_id uuid NOT NULL REFERENCES public.ingestion_run(id),
  error_message text NOT NULL,
  error_detail jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Jurisdiction indicators (current state)
CREATE TABLE public.jurisdiction_indicator (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  jurisdiction_id uuid NOT NULL REFERENCES public.jurisdiction(id),
  indicator_type public.indicator_type NOT NULL,
  value_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  effective_date date NOT NULL,
  source_name text NOT NULL,
  source_url text,
  source_snapshot_hash text,
  retrieved_at timestamptz NOT NULL DEFAULT now(),
  ingestion_run_id uuid REFERENCES public.ingestion_run(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (jurisdiction_id, indicator_type)
);

-- Jurisdiction indicator change history
CREATE TABLE public.jurisdiction_indicator_change (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  jurisdiction_indicator_id uuid NOT NULL REFERENCES public.jurisdiction_indicator(id),
  jurisdiction_id uuid NOT NULL REFERENCES public.jurisdiction(id),
  indicator_type public.indicator_type NOT NULL,
  old_value_json jsonb,
  new_value_json jsonb NOT NULL,
  old_effective_date date,
  new_effective_date date NOT NULL,
  source_name text NOT NULL,
  source_url text,
  source_snapshot_hash text,
  ingestion_run_id uuid REFERENCES public.ingestion_run(id),
  detected_at timestamptz NOT NULL DEFAULT now(),
  acknowledged boolean NOT NULL DEFAULT false,
  acknowledged_by uuid,
  acknowledged_at timestamptz
);

-- RLS policies
ALTER TABLE public.jurisdiction ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.data_source ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ingestion_run ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ingestion_error ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jurisdiction_indicator ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jurisdiction_indicator_change ENABLE ROW LEVEL SECURITY;

-- jurisdiction: internal read, manager manage
CREATE POLICY "Internal read jurisdiction" ON public.jurisdiction FOR SELECT USING (is_internal(auth.uid()));
CREATE POLICY "Manager manage jurisdiction" ON public.jurisdiction FOR ALL USING (has_role(auth.uid(), 'fvc_assurance_manager'::app_role) OR has_role(auth.uid(), 'fvc_ops_admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'fvc_assurance_manager'::app_role) OR has_role(auth.uid(), 'fvc_ops_admin'::app_role));

-- data_source: internal read, manager manage
CREATE POLICY "Internal read data source" ON public.data_source FOR SELECT USING (is_internal(auth.uid()));
CREATE POLICY "Manager manage data source" ON public.data_source FOR ALL USING (has_role(auth.uid(), 'fvc_assurance_manager'::app_role) OR has_role(auth.uid(), 'fvc_ops_admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'fvc_assurance_manager'::app_role) OR has_role(auth.uid(), 'fvc_ops_admin'::app_role));

-- ingestion_run: internal read, manager manage
CREATE POLICY "Internal read ingestion run" ON public.ingestion_run FOR SELECT USING (is_internal(auth.uid()));
CREATE POLICY "Manager manage ingestion run" ON public.ingestion_run FOR ALL USING (has_role(auth.uid(), 'fvc_assurance_manager'::app_role) OR has_role(auth.uid(), 'fvc_ops_admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'fvc_assurance_manager'::app_role) OR has_role(auth.uid(), 'fvc_ops_admin'::app_role));

-- ingestion_error: internal read, manager manage
CREATE POLICY "Internal read ingestion error" ON public.ingestion_error FOR SELECT USING (is_internal(auth.uid()));
CREATE POLICY "Manager manage ingestion error" ON public.ingestion_error FOR ALL USING (has_role(auth.uid(), 'fvc_assurance_manager'::app_role) OR has_role(auth.uid(), 'fvc_ops_admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'fvc_assurance_manager'::app_role) OR has_role(auth.uid(), 'fvc_ops_admin'::app_role));

-- jurisdiction_indicator: internal read, manager manage
CREATE POLICY "Internal read jurisdiction indicator" ON public.jurisdiction_indicator FOR SELECT USING (is_internal(auth.uid()));
CREATE POLICY "Manager manage jurisdiction indicator" ON public.jurisdiction_indicator FOR ALL USING (has_role(auth.uid(), 'fvc_assurance_manager'::app_role) OR has_role(auth.uid(), 'fvc_ops_admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'fvc_assurance_manager'::app_role) OR has_role(auth.uid(), 'fvc_ops_admin'::app_role));

-- jurisdiction_indicator_change: internal read, manager manage
CREATE POLICY "Internal read jurisdiction indicator change" ON public.jurisdiction_indicator_change FOR SELECT USING (is_internal(auth.uid()));
CREATE POLICY "Manager manage jurisdiction indicator change" ON public.jurisdiction_indicator_change FOR ALL USING (has_role(auth.uid(), 'fvc_assurance_manager'::app_role) OR has_role(auth.uid(), 'fvc_ops_admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'fvc_assurance_manager'::app_role) OR has_role(auth.uid(), 'fvc_ops_admin'::app_role));
