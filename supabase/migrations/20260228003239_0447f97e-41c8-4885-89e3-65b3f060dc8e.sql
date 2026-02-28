
-- Impact type enum
CREATE TYPE public.impact_type AS ENUM ('POLICY_TRIGGER', 'CR_SCORE_CHANGE', 'MONITORING_ALERT');

-- Jurisdiction change impact table
CREATE TABLE public.jurisdiction_change_impact (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_event_id UUID NOT NULL REFERENCES public.alert_event(id) ON DELETE CASCADE,
  org_id UUID NOT NULL REFERENCES public.organisations(id),
  jurisdiction_id UUID NOT NULL REFERENCES public.jurisdiction(id),
  entity_id UUID NOT NULL REFERENCES public.entities(id),
  case_id UUID REFERENCES public.cases(id),
  impact_type public.impact_type NOT NULL,
  impact_summary TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_jci_alert_event ON public.jurisdiction_change_impact(alert_event_id);
CREATE INDEX idx_jci_org ON public.jurisdiction_change_impact(org_id);
CREATE INDEX idx_jci_entity ON public.jurisdiction_change_impact(entity_id);
CREATE INDEX idx_jci_created ON public.jurisdiction_change_impact(created_at DESC);

-- RLS
ALTER TABLE public.jurisdiction_change_impact ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Internal users can read all impacts"
  ON public.jurisdiction_change_impact FOR SELECT
  USING (public.is_internal(auth.uid()));

CREATE POLICY "Org members can read own impacts"
  ON public.jurisdiction_change_impact FOR SELECT
  USING (org_id = public.get_user_org_id(auth.uid()));

CREATE POLICY "Service role can insert impacts"
  ON public.jurisdiction_change_impact FOR INSERT
  WITH CHECK (true);
