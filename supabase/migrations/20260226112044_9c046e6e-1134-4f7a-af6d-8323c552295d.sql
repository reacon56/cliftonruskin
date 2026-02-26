
-- Billing events: thin usage-tracking layer for manual invoicing
CREATE TABLE public.billing_events (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id uuid NOT NULL REFERENCES public.organisations(id),
  feature_key text NOT NULL,
  event_type text NOT NULL,  -- 'enabled', 'disabled', 'export', 'first_view'
  entity_id uuid REFERENCES public.entities(id),
  case_id uuid REFERENCES public.cases(id),
  performed_by uuid,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Index for monthly rollups
CREATE INDEX idx_billing_events_org_month ON public.billing_events (org_id, created_at);
CREATE INDEX idx_billing_events_type ON public.billing_events (event_type);

-- RLS
ALTER TABLE public.billing_events ENABLE ROW LEVEL SECURITY;

-- Internal can do everything
CREATE POLICY "Internal manage billing events"
  ON public.billing_events FOR ALL
  USING (is_internal(auth.uid()));

-- Client admins can read their own org's billing events
CREATE POLICY "Client admin read billing events"
  ON public.billing_events FOR SELECT
  USING (org_id = get_user_org_id(auth.uid()) AND has_role(auth.uid(), 'client_admin'::app_role));

-- Authenticated users can insert (for self-service tracking like exports)
CREATE POLICY "Authenticated insert billing events"
  ON public.billing_events FOR INSERT
  WITH CHECK (performed_by = auth.uid());
