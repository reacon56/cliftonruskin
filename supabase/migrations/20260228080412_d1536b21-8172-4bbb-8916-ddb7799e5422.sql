
-- Extend audit_events with richer context columns
ALTER TABLE public.audit_events
  ADD COLUMN IF NOT EXISTS entity_id UUID REFERENCES public.entities(id),
  ADD COLUMN IF NOT EXISTS case_id UUID REFERENCES public.cases(id),
  ADD COLUMN IF NOT EXISTS report_id UUID,
  ADD COLUMN IF NOT EXISTS event_summary TEXT,
  ADD COLUMN IF NOT EXISTS is_internal BOOLEAN NOT NULL DEFAULT false;

-- Indexes for filtered timeline queries
CREATE INDEX IF NOT EXISTS idx_audit_events_entity ON public.audit_events(entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_events_case ON public.audit_events(case_id);
CREATE INDEX IF NOT EXISTS idx_audit_events_report ON public.audit_events(report_id);
CREATE INDEX IF NOT EXISTS idx_audit_events_internal ON public.audit_events(is_internal);
