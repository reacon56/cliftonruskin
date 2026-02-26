
-- Create market_lessons table
CREATE TABLE public.market_lessons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  category text NOT NULL DEFAULT '',
  publication_name text NOT NULL DEFAULT '',
  publication_url text NOT NULL DEFAULT '',
  publication_date date,
  summary_text text,
  governance_reflection text,
  jurisdiction_country_code text,
  published boolean NOT NULL DEFAULT false,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.market_lessons ENABLE ROW LEVEL SECURITY;

-- Public can read published lessons (for the Observations page)
CREATE POLICY "Anyone can read published lessons"
  ON public.market_lessons FOR SELECT
  USING (published = true);

-- Internal users can do everything
CREATE POLICY "Internal manage market lessons"
  ON public.market_lessons FOR ALL
  USING (is_internal(auth.uid()));

-- Internal users can insert drafts
CREATE POLICY "Internal insert market lessons"
  ON public.market_lessons FOR INSERT
  WITH CHECK (is_internal(auth.uid()));
