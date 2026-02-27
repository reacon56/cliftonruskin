
-- 1. Operator enum for rule conditions
CREATE TYPE public.policy_operator AS ENUM ('EQUALS', 'NOT_EQUALS', 'IN', 'NOT_IN', 'GTE', 'LTE', 'GT', 'LT', 'EXISTS', 'NOT_EXISTS');

-- 2. client_policy_ruleset
CREATE TABLE public.client_policy_ruleset (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  version INT NOT NULL DEFAULT 1,
  enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.client_policy_ruleset ENABLE ROW LEVEL SECURITY;

CREATE POLICY "client_admin_manage_rulesets"
  ON public.client_policy_ruleset FOR ALL TO authenticated
  USING (org_id = public.get_user_org_id(auth.uid()) AND public.has_role(auth.uid(), 'client_admin'))
  WITH CHECK (org_id = public.get_user_org_id(auth.uid()) AND public.has_role(auth.uid(), 'client_admin'));

CREATE POLICY "org_users_read_rulesets"
  ON public.client_policy_ruleset FOR SELECT TO authenticated
  USING (org_id = public.get_user_org_id(auth.uid()));

CREATE POLICY "internal_read_rulesets"
  ON public.client_policy_ruleset FOR SELECT TO authenticated
  USING (public.is_internal(auth.uid()));

-- 3. client_policy_rule
CREATE TABLE public.client_policy_rule (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ruleset_id UUID NOT NULL REFERENCES public.client_policy_ruleset(id) ON DELETE CASCADE,
  priority INT NOT NULL DEFAULT 0,
  if_indicator_type TEXT NOT NULL,
  operator public.policy_operator NOT NULL DEFAULT 'EQUALS',
  compare_value_json JSONB NOT NULL DEFAULT '{}',
  then_outcome_json JSONB NOT NULL DEFAULT '{}',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.client_policy_rule ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ruleset_owner_manage_rules"
  ON public.client_policy_rule FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.client_policy_ruleset r
      WHERE r.id = ruleset_id
        AND r.org_id = public.get_user_org_id(auth.uid())
        AND public.has_role(auth.uid(), 'client_admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.client_policy_ruleset r
      WHERE r.id = ruleset_id
        AND r.org_id = public.get_user_org_id(auth.uid())
        AND public.has_role(auth.uid(), 'client_admin')
    )
  );

CREATE POLICY "org_users_read_rules"
  ON public.client_policy_rule FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.client_policy_ruleset r
      WHERE r.id = ruleset_id
        AND r.org_id = public.get_user_org_id(auth.uid())
    )
  );

CREATE POLICY "internal_read_rules"
  ON public.client_policy_rule FOR SELECT TO authenticated
  USING (public.is_internal(auth.uid()));

-- 4. client_policy_outcome
CREATE TABLE public.client_policy_outcome (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
  case_id UUID REFERENCES public.cases(id) ON DELETE SET NULL,
  entity_id UUID REFERENCES public.entities(id) ON DELETE CASCADE,
  ruleset_id UUID NOT NULL REFERENCES public.client_policy_ruleset(id) ON DELETE CASCADE,
  outcome_json JSONB NOT NULL DEFAULT '{}',
  computed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  engine_version TEXT NOT NULL DEFAULT 'v1'
);

ALTER TABLE public.client_policy_outcome ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_users_read_outcomes"
  ON public.client_policy_outcome FOR SELECT TO authenticated
  USING (org_id = public.get_user_org_id(auth.uid()));

CREATE POLICY "internal_read_outcomes"
  ON public.client_policy_outcome FOR SELECT TO authenticated
  USING (public.is_internal(auth.uid()));

CREATE POLICY "service_insert_outcomes"
  ON public.client_policy_outcome FOR INSERT TO service_role
  WITH CHECK (true);

CREATE POLICY "internal_insert_outcomes"
  ON public.client_policy_outcome FOR INSERT TO authenticated
  WITH CHECK (public.is_internal(auth.uid()));

-- Indexes
CREATE INDEX idx_client_policy_ruleset_org ON public.client_policy_ruleset(org_id, enabled);
CREATE INDEX idx_client_policy_rule_ruleset ON public.client_policy_rule(ruleset_id, priority);
CREATE INDEX idx_client_policy_outcome_entity ON public.client_policy_outcome(entity_id, computed_at DESC);
