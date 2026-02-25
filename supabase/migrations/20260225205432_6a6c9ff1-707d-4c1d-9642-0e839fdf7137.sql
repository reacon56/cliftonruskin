
ALTER TABLE public.monitoring_events
  ADD COLUMN case_id UUID REFERENCES public.cases(id) DEFAULT NULL;
