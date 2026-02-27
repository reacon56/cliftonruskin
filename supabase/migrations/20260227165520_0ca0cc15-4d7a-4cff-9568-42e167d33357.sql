
-- Raw sanctions entity records from UK (and extensible to other lists)
CREATE TABLE public.sanctions_entity (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  source_list text NOT NULL DEFAULT 'UK_OFSI',
  source_entity_id text,
  entity_type text NOT NULL DEFAULT 'Individual',
  primary_name text NOT NULL,
  aliases jsonb DEFAULT '[]'::jsonb,
  nationality_codes text[] DEFAULT '{}',
  country_codes text[] DEFAULT '{}',
  regime_name text,
  regime_type text DEFAULT 'TARGETED',
  designation_date date,
  designation_source text,
  raw_data jsonb DEFAULT '{}'::jsonb,
  ingestion_run_id uuid REFERENCES public.ingestion_run(id),
  source_url text,
  source_snapshot_hash text,
  retrieved_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  is_active boolean NOT NULL DEFAULT true
);

-- Index for lookups
CREATE INDEX idx_sanctions_entity_source ON public.sanctions_entity(source_list, source_entity_id);
CREATE INDEX idx_sanctions_entity_country ON public.sanctions_entity USING GIN (country_codes);
CREATE INDEX idx_sanctions_entity_regime ON public.sanctions_entity(regime_name);

-- RLS
ALTER TABLE public.sanctions_entity ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Internal read sanctions entities" ON public.sanctions_entity
  FOR SELECT USING (is_internal(auth.uid()));

CREATE POLICY "Manager manage sanctions entities" ON public.sanctions_entity
  FOR ALL
  USING (has_role(auth.uid(), 'fvc_assurance_manager'::app_role) OR has_role(auth.uid(), 'fvc_ops_admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'fvc_assurance_manager'::app_role) OR has_role(auth.uid(), 'fvc_ops_admin'::app_role));
