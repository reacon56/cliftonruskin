
-- Tier Deviation Override Requests table
CREATE TABLE public.tier_deviation_overrides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid NOT NULL REFERENCES public.cases(id),
  requirement_label text NOT NULL,
  requirement_rule_key text NOT NULL,
  matrix_version_id uuid REFERENCES public.tier_matrix_versions(id),
  reason_for_deviation text NOT NULL,
  supporting_notes text,
  officer_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  reviewer_id uuid,
  reviewer_reason text,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.tier_deviation_overrides ENABLE ROW LEVEL SECURITY;

-- Only internal staff can see deviation overrides
CREATE POLICY "Internal read deviation overrides"
  ON public.tier_deviation_overrides FOR SELECT
  USING (is_internal(auth.uid()));

-- Officers can create override requests for their own cases
CREATE POLICY "Officers create deviation overrides"
  ON public.tier_deviation_overrides FOR INSERT
  WITH CHECK (officer_id = auth.uid() AND is_internal(auth.uid()));

-- Managers can update (approve/reject)
CREATE POLICY "Managers update deviation overrides"
  ON public.tier_deviation_overrides FOR UPDATE
  USING (
    has_role(auth.uid(), 'fvc_assurance_manager'::app_role)
    OR has_role(auth.uid(), 'fvc_ops_admin'::app_role)
  );
