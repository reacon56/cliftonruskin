
-- Policy simulation tables
CREATE TABLE public.policy_simulation (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organisations(id),
  ruleset_id UUID REFERENCES public.client_policy_ruleset(id),
  name TEXT NOT NULL DEFAULT 'Untitled simulation',
  proposed_rules_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  status TEXT NOT NULL DEFAULT 'draft',
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.policy_simulation_result (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  simulation_id UUID NOT NULL REFERENCES public.policy_simulation(id) ON DELETE CASCADE,
  entity_id UUID NOT NULL REFERENCES public.entities(id),
  current_outcome_json JSONB,
  proposed_outcome_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  has_change BOOLEAN NOT NULL DEFAULT false,
  computed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_ps_org ON public.policy_simulation(org_id);
CREATE INDEX idx_psr_sim ON public.policy_simulation_result(simulation_id);
CREATE INDEX idx_psr_entity ON public.policy_simulation_result(entity_id);

-- RLS
ALTER TABLE public.policy_simulation ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.policy_simulation_result ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can manage own simulations"
  ON public.policy_simulation FOR ALL
  USING (org_id = public.get_user_org_id(auth.uid()))
  WITH CHECK (org_id = public.get_user_org_id(auth.uid()));

CREATE POLICY "Internal users can view all simulations"
  ON public.policy_simulation FOR SELECT
  USING (public.is_internal(auth.uid()));

CREATE POLICY "Users can read results for their simulations"
  ON public.policy_simulation_result FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.policy_simulation ps
      WHERE ps.id = simulation_id
        AND (ps.org_id = public.get_user_org_id(auth.uid()) OR public.is_internal(auth.uid()))
    )
  );

-- Service role inserts results (no RLS insert policy needed — bypassed by service role)
