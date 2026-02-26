
-- Extend partners table with directory fields
ALTER TABLE public.partners
  ADD COLUMN IF NOT EXISTS jurisdictions_covered text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS services_offered text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS sla_terms text,
  ADD COLUMN IF NOT EXISTS rate_structure text,
  ADD COLUMN IF NOT EXISTS compliance_document_url text,
  ADD COLUMN IF NOT EXISTS dd_status text NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS internal_rating integer,
  ADD COLUMN IF NOT EXISTS contact_name text,
  ADD COLUMN IF NOT EXISTS contact_email text,
  ADD COLUMN IF NOT EXISTS contact_phone text,
  ADD COLUMN IF NOT EXISTS notes_internal text,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

-- Ensure RLS is enabled
ALTER TABLE public.partners ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any, then create proper ones
DO $$ BEGIN
  DROP POLICY IF EXISTS "Internal manage partners" ON public.partners;
  DROP POLICY IF EXISTS "Internal read partners" ON public.partners;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

CREATE POLICY "Internal manage partners"
  ON public.partners FOR ALL
  USING (is_internal(auth.uid()))
  WITH CHECK (is_internal(auth.uid()));
