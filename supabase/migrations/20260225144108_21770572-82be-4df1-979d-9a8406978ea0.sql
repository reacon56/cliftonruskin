
-- Organisation plan table
CREATE TABLE public.organisation_plan (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organisations(id) UNIQUE,
  plan_name text NOT NULL DEFAULT 'Standard',
  entity_limit integer NOT NULL DEFAULT 50,
  included_notes_per_year integer NOT NULL DEFAULT 20,
  included_notes_used_ytd integer NOT NULL DEFAULT 0,
  renewal_date date,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.organisation_plan ENABLE ROW LEVEL SECURITY;

-- All org members can read their plan
CREATE POLICY "Users see own org plan"
  ON public.organisation_plan FOR SELECT
  TO authenticated
  USING (
    org_id = get_user_org_id(auth.uid())
    OR is_internal(auth.uid())
  );

-- Only internal ops can manage plans
CREATE POLICY "Internal manage plans"
  ON public.organisation_plan FOR ALL
  TO authenticated
  USING (is_internal(auth.uid()))
  WITH CHECK (is_internal(auth.uid()));
