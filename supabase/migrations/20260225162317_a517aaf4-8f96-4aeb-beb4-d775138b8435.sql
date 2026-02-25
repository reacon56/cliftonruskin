
-- Add DP columns to cases table
ALTER TABLE public.cases
  ADD COLUMN IF NOT EXISTS requires_personal_data boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS processing_purpose text,
  ADD COLUMN IF NOT EXISTS processing_purpose_detail text,
  ADD COLUMN IF NOT EXISTS lawful_basis text,
  ADD COLUMN IF NOT EXISTS lia_summary text,
  ADD COLUMN IF NOT EXISTS data_categories jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS minimisation_confirmed boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS retention_months integer,
  ADD COLUMN IF NOT EXISTS dp_risk_level text DEFAULT 'low',
  ADD COLUMN IF NOT EXISTS dp_review_required boolean NOT NULL DEFAULT false;

-- Create data_protection_reviews table
CREATE TABLE IF NOT EXISTS public.data_protection_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid NOT NULL REFERENCES public.cases(id),
  reviewer_user_id uuid,
  status text NOT NULL DEFAULT 'pending',
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.data_protection_reviews ENABLE ROW LEVEL SECURITY;

-- RLS: Internal users can manage DP reviews
CREATE POLICY "Internal manage dp reviews"
  ON public.data_protection_reviews
  FOR ALL
  USING (is_internal(auth.uid()));

-- RLS: Clients can see DP reviews for their org cases (status only, not notes)
CREATE POLICY "Users see own org dp reviews"
  ON public.data_protection_reviews
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM cases c
      WHERE c.id = data_protection_reviews.case_id
        AND (c.org_id = get_user_org_id(auth.uid()) OR is_internal(auth.uid()))
    )
  );
