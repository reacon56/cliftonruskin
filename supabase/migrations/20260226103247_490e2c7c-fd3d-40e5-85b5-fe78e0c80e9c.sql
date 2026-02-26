
-- Entity relationships table for ownership & structure
CREATE TABLE public.entity_relationships (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  source_entity_id UUID NOT NULL REFERENCES public.entities(id) ON DELETE CASCADE,
  target_entity_id UUID NOT NULL REFERENCES public.entities(id) ON DELETE CASCADE,
  relationship_type TEXT NOT NULL DEFAULT 'subsidiary',
  percentage NUMERIC,
  confidence_level TEXT NOT NULL DEFAULT 'med',
  source_reference TEXT,
  last_verified_date DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT entity_relationships_type_check CHECK (
    relationship_type IN ('shareholder', 'ubo', 'director', 'parent', 'subsidiary', 'branch', 'registered_office', 'operating_presence')
  )
);

-- RLS
ALTER TABLE public.entity_relationships ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see own org entity relationships"
  ON public.entity_relationships FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM entities e
      WHERE (e.id = entity_relationships.source_entity_id OR e.id = entity_relationships.target_entity_id)
        AND (e.org_id = get_user_org_id(auth.uid()) OR is_internal(auth.uid()))
    )
  );

CREATE POLICY "Internal manage entity relationships"
  ON public.entity_relationships FOR ALL
  USING (is_internal(auth.uid()));

CREATE POLICY "Client admin manage entity relationships"
  ON public.entity_relationships FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM entities e
      WHERE e.id = entity_relationships.source_entity_id
        AND e.org_id = get_user_org_id(auth.uid())
        AND has_role(auth.uid(), 'client_admin'::app_role)
    )
  );
