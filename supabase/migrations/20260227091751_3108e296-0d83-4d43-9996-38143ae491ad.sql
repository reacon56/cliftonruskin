
-- Partner escalation lifecycle table
CREATE TABLE public.partner_escalations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid NOT NULL REFERENCES public.cases(id),
  entity_id uuid REFERENCES public.entities(id),
  partner_id uuid,
  partner_task_id uuid,
  status text NOT NULL DEFAULT 'pending_approval',
  trigger_source text NOT NULL DEFAULT 'officer',
  brief text,
  scope_confirmation text,
  estimated_cost numeric,
  approved_cost numeric,
  approved_by uuid,
  approved_at timestamptz,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  risk_recalculated boolean NOT NULL DEFAULT false
);

ALTER TABLE public.partner_escalations ENABLE ROW LEVEL SECURITY;

-- Internal users full access
CREATE POLICY "Internal manage escalations"
  ON public.partner_escalations FOR ALL
  USING (is_internal(auth.uid()))
  WITH CHECK (is_internal(auth.uid()));

-- Clients can see escalations for their org's cases
CREATE POLICY "Users see own org escalations"
  ON public.partner_escalations FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM cases c
    WHERE c.id = partner_escalations.case_id
      AND (c.org_id = get_user_org_id(auth.uid()) OR is_internal(auth.uid()))
  ));
