
-- 1. Create partners table (global partner organisations)
CREATE TABLE public.partners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  country text,
  capability_tags jsonb DEFAULT '[]'::jsonb,
  rate_card jsonb DEFAULT '{}'::jsonb,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.partners ENABLE ROW LEVEL SECURITY;

-- Only internal users can see/manage partners — clients NEVER see this table
CREATE POLICY "Internal manage partners"
  ON public.partners FOR ALL TO authenticated
  USING (public.is_internal(auth.uid()));

-- 2. Add partner_id and entity_id to partner_tasks BEFORE referencing them in policies
ALTER TABLE public.partner_tasks
  ADD COLUMN partner_id uuid REFERENCES public.partners(id),
  ADD COLUMN entity_id uuid REFERENCES public.entities(id);

-- Now create partner self-lookup policy (needs partner_id column to exist)
CREATE POLICY "Partners see own record"
  ON public.partners FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.partner_tasks pt
      WHERE pt.partner_id = partners.id
        AND pt.partner_user_id = auth.uid()
    )
  );

-- 3. Create partner_evidence table
CREATE TABLE public.partner_evidence (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_task_id uuid NOT NULL REFERENCES public.partner_tasks(id) ON DELETE CASCADE,
  evidence_type text NOT NULL DEFAULT 'document',
  file_url text,
  notes text,
  captured_at timestamptz DEFAULT now(),
  geo_lat numeric,
  geo_lng numeric,
  client_shareable boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.partner_evidence ENABLE ROW LEVEL SECURITY;

-- Internal users see all partner evidence
CREATE POLICY "Internal manage partner evidence"
  ON public.partner_evidence FOR ALL TO authenticated
  USING (public.is_internal(auth.uid()));

-- Partners see evidence for their own tasks only
CREATE POLICY "Partners see own task evidence"
  ON public.partner_evidence FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.partner_tasks pt
      WHERE pt.id = partner_evidence.partner_task_id
        AND pt.partner_user_id = auth.uid()
    )
  );

-- Partners can insert evidence for their own tasks
CREATE POLICY "Partners insert own task evidence"
  ON public.partner_evidence FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.partner_tasks pt
      WHERE pt.id = partner_evidence.partner_task_id
        AND pt.partner_user_id = auth.uid()
    )
  );

-- Partners can update evidence for their own tasks
CREATE POLICY "Partners update own task evidence"
  ON public.partner_evidence FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.partner_tasks pt
      WHERE pt.id = partner_evidence.partner_task_id
        AND pt.partner_user_id = auth.uid()
    )
  );
