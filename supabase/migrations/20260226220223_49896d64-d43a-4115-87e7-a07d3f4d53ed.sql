
-- Source Registry table
CREATE TABLE public.research_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_name text NOT NULL,
  category text NOT NULL DEFAULT 'Other',
  tier text NOT NULL DEFAULT 'Core',
  jurisdictions_covered text[] NOT NULL DEFAULT '{}',
  access_type text NOT NULL DEFAULT 'Manual Portal',
  cost_level text NOT NULL DEFAULT 'Free',
  permitted_use_notes text,
  enabled boolean NOT NULL DEFAULT true,
  linked_package text NOT NULL DEFAULT 'Core',
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.research_sources ENABLE ROW LEVEL SECURITY;

-- Only internal users can see sources
CREATE POLICY "Internal read sources"
  ON public.research_sources FOR SELECT
  USING (is_internal(auth.uid()));

-- Only managers can manage sources
CREATE POLICY "Manager manage sources"
  ON public.research_sources FOR ALL
  USING (
    has_role(auth.uid(), 'fvc_assurance_manager'::app_role)
    OR has_role(auth.uid(), 'fvc_ops_admin'::app_role)
  )
  WITH CHECK (
    has_role(auth.uid(), 'fvc_assurance_manager'::app_role)
    OR has_role(auth.uid(), 'fvc_ops_admin'::app_role)
  );

-- Retrieval Log table
CREATE TABLE public.retrieval_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid NOT NULL REFERENCES public.cases(id),
  entity_id uuid NOT NULL REFERENCES public.entities(id),
  source_id uuid NOT NULL REFERENCES public.research_sources(id),
  officer_id uuid NOT NULL,
  purpose_of_search text NOT NULL DEFAULT 'Routine',
  query_text text,
  outcome_status text NOT NULL DEFAULT 'No Match',
  notes_internal text,
  promoted_to text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.retrieval_logs ENABLE ROW LEVEL SECURITY;

-- Only internal users can see retrieval logs
CREATE POLICY "Internal read retrieval logs"
  ON public.retrieval_logs FOR SELECT
  USING (is_internal(auth.uid()));

-- Internal users can insert retrieval logs
CREATE POLICY "Internal insert retrieval logs"
  ON public.retrieval_logs FOR INSERT
  WITH CHECK (is_internal(auth.uid()) AND officer_id = auth.uid());

-- Internal users can update retrieval logs (for promotion)
CREATE POLICY "Internal update retrieval logs"
  ON public.retrieval_logs FOR UPDATE
  USING (is_internal(auth.uid()));
