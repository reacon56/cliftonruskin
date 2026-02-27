
-- Analyst time entries for unit economics tracking
CREATE TABLE public.analyst_time_entries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  case_id UUID NOT NULL REFERENCES public.cases(id),
  officer_id UUID NOT NULL,
  org_id UUID NOT NULL REFERENCES public.organisations(id),
  bucket TEXT NOT NULL CHECK (bucket IN ('data_retrieval', 'analysis_writeup', 'partner_management', 'revisions', 'qa_rework')),
  minutes INTEGER NOT NULL CHECK (minutes > 0),
  note TEXT,
  entry_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.analyst_time_entries ENABLE ROW LEVEL SECURITY;

-- Officers can insert their own time entries
CREATE POLICY "Officers insert own time entries"
  ON public.analyst_time_entries
  FOR INSERT
  WITH CHECK (
    officer_id = auth.uid()
    AND is_internal(auth.uid())
  );

-- Officers can update their own time entries
CREATE POLICY "Officers update own time entries"
  ON public.analyst_time_entries
  FOR UPDATE
  USING (
    officer_id = auth.uid()
    AND is_internal(auth.uid())
  );

-- Officers see own entries, managers see all internal
CREATE POLICY "Internal read time entries"
  ON public.analyst_time_entries
  FOR SELECT
  USING (
    is_internal(auth.uid())
  );

-- Managers can delete time entries
CREATE POLICY "Manager delete time entries"
  ON public.analyst_time_entries
  FOR DELETE
  USING (
    has_role(auth.uid(), 'fvc_assurance_manager'::app_role)
    OR has_role(auth.uid(), 'fvc_ops_admin'::app_role)
  );
