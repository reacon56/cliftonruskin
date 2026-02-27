
-- 1. Link type enum
CREATE TYPE public.jurisdiction_link_type AS ENUM (
  'INCORPORATION',
  'OPERATIONS',
  'UBO_NATIONALITY',
  'BANK_LOCATION',
  'SUPPLIER_LOCATION',
  'SHIPPING_ROUTE',
  'OTHER'
);

-- 2. Confidence enum
CREATE TYPE public.link_confidence AS ENUM (
  'CONFIRMED',
  'LIKELY',
  'UNCONFIRMED'
);

-- 3. entity_jurisdiction_link table
CREATE TABLE public.entity_jurisdiction_link (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id UUID NOT NULL REFERENCES public.entities(id) ON DELETE CASCADE,
  jurisdiction_id UUID NOT NULL REFERENCES public.jurisdiction(id) ON DELETE CASCADE,
  link_type public.jurisdiction_link_type NOT NULL,
  confidence public.link_confidence NOT NULL DEFAULT 'CONFIRMED',
  source TEXT NOT NULL DEFAULT 'manual',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

ALTER TABLE public.entity_jurisdiction_link ENABLE ROW LEVEL SECURITY;

-- Org users can read links for their entities
CREATE POLICY "org_read_entity_jurisdiction_links"
  ON public.entity_jurisdiction_link FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.entities e
      WHERE e.id = entity_id
        AND e.org_id = public.get_user_org_id(auth.uid())
    )
  );

-- Internal can do everything
CREATE POLICY "internal_manage_entity_jurisdiction_links"
  ON public.entity_jurisdiction_link FOR ALL TO authenticated
  USING (public.is_internal(auth.uid()))
  WITH CHECK (public.is_internal(auth.uid()));

-- Client admins can insert/delete for their entities
CREATE POLICY "client_admin_manage_entity_jurisdiction_links"
  ON public.entity_jurisdiction_link FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.entities e
      WHERE e.id = entity_id
        AND e.org_id = public.get_user_org_id(auth.uid())
        AND public.has_role(auth.uid(), 'client_admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.entities e
      WHERE e.id = entity_id
        AND e.org_id = public.get_user_org_id(auth.uid())
        AND public.has_role(auth.uid(), 'client_admin')
    )
  );

-- Service role
CREATE POLICY "service_manage_entity_jurisdiction_links"
  ON public.entity_jurisdiction_link FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

-- Indexes
CREATE INDEX idx_entity_jurisdiction_link_entity ON public.entity_jurisdiction_link(entity_id);
CREATE INDEX idx_entity_jurisdiction_link_jurisdiction ON public.entity_jurisdiction_link(jurisdiction_id);
CREATE UNIQUE INDEX idx_entity_jurisdiction_link_unique ON public.entity_jurisdiction_link(entity_id, jurisdiction_id, link_type);
