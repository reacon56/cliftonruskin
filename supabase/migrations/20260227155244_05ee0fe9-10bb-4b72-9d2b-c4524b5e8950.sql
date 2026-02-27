
-- Programme budgets per client org per period
CREATE TABLE public.programme_budgets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organisations(id),
  period_type text NOT NULL DEFAULT 'annual',
  period_start date NOT NULL,
  period_end date NOT NULL,
  total_cap numeric NOT NULL DEFAULT 0,
  jurisdiction_caps jsonb NOT NULL DEFAULT '{}',
  criticality_caps jsonb NOT NULL DEFAULT '{}',
  cap_behaviour text NOT NULL DEFAULT 'warn',
  committed_spend numeric NOT NULL DEFAULT 0,
  delivered_spend numeric NOT NULL DEFAULT 0,
  partner_spend numeric NOT NULL DEFAULT 0,
  notes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.programme_budgets ENABLE ROW LEVEL SECURITY;

-- Internal full access
CREATE POLICY "Internal manage programme budgets"
  ON public.programme_budgets FOR ALL TO authenticated
  USING (public.is_internal(auth.uid()))
  WITH CHECK (public.is_internal(auth.uid()));

-- Clients read own org budgets (no internal margins visible)
CREATE POLICY "Clients read own budgets"
  ON public.programme_budgets FOR SELECT TO authenticated
  USING (org_id = public.get_user_org_id(auth.uid()));

-- Budget cap overrides by managers
CREATE TABLE public.budget_overrides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  budget_id uuid NOT NULL REFERENCES public.programme_budgets(id) ON DELETE CASCADE,
  case_id uuid REFERENCES public.cases(id),
  override_amount numeric NOT NULL DEFAULT 0,
  justification text NOT NULL,
  override_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.budget_overrides ENABLE ROW LEVEL SECURITY;

-- Only internal staff can manage overrides
CREATE POLICY "Internal manage budget overrides"
  ON public.budget_overrides FOR ALL TO authenticated
  USING (public.is_internal(auth.uid()))
  WITH CHECK (public.is_internal(auth.uid()));
