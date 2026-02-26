
-- Master Entities table (CR internal only)
CREATE TABLE public.master_entities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  canonical_name text NOT NULL,
  canonical_registration_number text,
  jurisdiction_incorporation text,
  registered_address_line1 text,
  registered_city text,
  registered_country text,
  registered_postcode text,
  hq_address_line1 text,
  hq_city text,
  hq_country text,
  hq_postcode text,
  website text,
  notes_internal text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.master_entities ENABLE ROW LEVEL SECURITY;

-- Only internal users can see/manage master entities
CREATE POLICY "Internal read master entities"
  ON public.master_entities FOR SELECT
  TO authenticated
  USING (is_internal(auth.uid()));

CREATE POLICY "Internal manage master entities"
  ON public.master_entities FOR ALL
  TO authenticated
  USING (is_internal(auth.uid()))
  WITH CHECK (is_internal(auth.uid()));

-- Add master_entity_id FK to entities table
ALTER TABLE public.entities
  ADD COLUMN master_entity_id uuid REFERENCES public.master_entities(id);

-- Add has_conflict flag for placeholder conflict detection
ALTER TABLE public.entities
  ADD COLUMN has_master_conflict boolean NOT NULL DEFAULT false;
