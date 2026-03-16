
-- Add relevance columns to market_lessons
ALTER TABLE public.market_lessons
  ADD COLUMN IF NOT EXISTS relevance_score text,
  ADD COLUMN IF NOT EXISTS relevance_reasoning text;

-- Create suppression table for per-org suppression of market lessons
CREATE TABLE public.market_lesson_suppressions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  market_lesson_id uuid NOT NULL REFERENCES public.market_lessons(id) ON DELETE CASCADE,
  org_id uuid NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
  suppressed_by text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (market_lesson_id, org_id)
);

ALTER TABLE public.market_lesson_suppressions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Internal users can manage suppressions"
  ON public.market_lesson_suppressions FOR ALL
  TO authenticated
  USING (public.is_internal(auth.uid()))
  WITH CHECK (public.is_internal(auth.uid()));

CREATE POLICY "Org members can read own suppressions"
  ON public.market_lesson_suppressions FOR SELECT
  TO authenticated
  USING (org_id = public.get_user_org_id(auth.uid()));
