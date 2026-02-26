CREATE TABLE public.entity_operating_countries (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  entity_id uuid NOT NULL REFERENCES public.entities(id) ON DELETE CASCADE,
  country_code text NOT NULL,
  country_name text NOT NULL,
  confidence text NOT NULL DEFAULT 'unconfirmed',
  source text NOT NULL DEFAULT 'analyst',
  added_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_eoc_entity ON public.entity_operating_countries(entity_id);

ALTER TABLE public.entity_operating_countries ENABLE ROW LEVEL SECURITY;

-- Users see operating countries for their org's entities
CREATE POLICY "Users see own org operating countries" ON public.entity_operating_countries
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM entities e
      WHERE e.id = entity_operating_countries.entity_id
        AND (e.org_id = get_user_org_id(auth.uid()) OR is_internal(auth.uid()))
    )
  );

-- Internal users can manage
CREATE POLICY "Internal manage operating countries" ON public.entity_operating_countries
  FOR ALL USING (is_internal(auth.uid()));

-- Client admin/requester can insert
CREATE POLICY "Client insert operating countries" ON public.entity_operating_countries
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM entities e
      WHERE e.id = entity_operating_countries.entity_id
        AND e.org_id = get_user_org_id(auth.uid())
        AND (has_role(auth.uid(), 'client_admin') OR has_role(auth.uid(), 'client_requester'))
    )
  );

-- Client admin can delete
CREATE POLICY "Client admin delete operating countries" ON public.entity_operating_countries
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM entities e
      WHERE e.id = entity_operating_countries.entity_id
        AND e.org_id = get_user_org_id(auth.uid())
        AND has_role(auth.uid(), 'client_admin')
    )
  );