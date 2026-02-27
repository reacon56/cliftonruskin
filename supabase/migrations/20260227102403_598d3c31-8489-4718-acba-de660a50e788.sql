
-- Tier Requirements Matrix: versioned methodology enforcement per report tier
CREATE TABLE public.tier_matrix_versions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  version_number INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'superseded', 'draft')),
  created_by UUID,
  change_log TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.tier_matrix_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Internal read matrix versions"
  ON public.tier_matrix_versions FOR SELECT
  USING (is_internal(auth.uid()));

CREATE POLICY "Manager manage matrix versions"
  ON public.tier_matrix_versions FOR ALL
  USING (has_role(auth.uid(), 'fvc_assurance_manager'::app_role) OR has_role(auth.uid(), 'fvc_ops_admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'fvc_assurance_manager'::app_role) OR has_role(auth.uid(), 'fvc_ops_admin'::app_role));

-- The actual matrix rules per tier per version
CREATE TABLE public.tier_requirements_matrix (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  matrix_version_id UUID NOT NULL REFERENCES public.tier_matrix_versions(id),
  report_tier TEXT NOT NULL CHECK (report_tier IN ('standard', 'enhanced', 'dossier')),
  -- Required source categories (JSONB array of category keys)
  required_source_categories JSONB NOT NULL DEFAULT '[]'::jsonb,
  -- Min retrieval logs per category (JSONB map: category -> min count)
  min_retrieval_logs JSONB NOT NULL DEFAULT '{}'::jsonb,
  -- Required officer commentary sections (JSONB array of section keys)
  required_commentary_sections JSONB NOT NULL DEFAULT '[]'::jsonb,
  -- Whether AI review run is required
  ai_review_required BOOLEAN NOT NULL DEFAULT false,
  -- Required QA checklist items (JSONB array of item labels)
  qa_checklist_items JSONB NOT NULL DEFAULT '[]'::jsonb,
  -- Escalation thresholds
  escalation_risk_band_threshold TEXT NOT NULL DEFAULT 'High',
  sanctions_match_requires_manager_review BOOLEAN NOT NULL DEFAULT true,
  adverse_media_threshold INTEGER NOT NULL DEFAULT 3,
  adverse_media_requires_contextual_analysis BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (matrix_version_id, report_tier)
);

ALTER TABLE public.tier_requirements_matrix ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Internal read matrix"
  ON public.tier_requirements_matrix FOR SELECT
  USING (is_internal(auth.uid()));

CREATE POLICY "Manager manage matrix"
  ON public.tier_requirements_matrix FOR ALL
  USING (has_role(auth.uid(), 'fvc_assurance_manager'::app_role) OR has_role(auth.uid(), 'fvc_ops_admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'fvc_assurance_manager'::app_role) OR has_role(auth.uid(), 'fvc_ops_admin'::app_role));

-- Seed initial v1 matrix
INSERT INTO public.tier_matrix_versions (version_number, status, change_log)
VALUES (1, 'active', 'Initial methodology matrix');

-- Seed rules for each tier (referencing the version we just inserted)
WITH v AS (SELECT id FROM public.tier_matrix_versions WHERE version_number = 1 LIMIT 1)
INSERT INTO public.tier_requirements_matrix (matrix_version_id, report_tier, required_source_categories, min_retrieval_logs, required_commentary_sections, ai_review_required, qa_checklist_items, escalation_risk_band_threshold, adverse_media_threshold)
VALUES
  ((SELECT id FROM v), 'standard',
   '["sanctions","corporate_registry","adverse_media"]'::jsonb,
   '{"sanctions":1,"corporate_registry":1,"adverse_media":1}'::jsonb,
   '["contextual_analysis","explanation_of_material_findings"]'::jsonb,
   false,
   '["Structured data locked","Commentary complete","Risk model executed"]'::jsonb,
   'High', 3),
  ((SELECT id FROM v), 'enhanced',
   '["sanctions","corporate_registry","adverse_media","jurisdiction_reference","litigation"]'::jsonb,
   '{"sanctions":2,"corporate_registry":1,"adverse_media":2,"jurisdiction_reference":1,"litigation":1}'::jsonb,
   '["contextual_analysis","explanation_of_material_findings","mitigating_factors","recommended_follow_up_actions"]'::jsonb,
   true,
   '["Structured data locked","Commentary complete","Risk model executed","Pre-QA review passed","AI review acknowledged"]'::jsonb,
   'High', 2),
  ((SELECT id FROM v), 'dossier',
   '["sanctions","corporate_registry","adverse_media","jurisdiction_reference","litigation","offshore_leaks"]'::jsonb,
   '{"sanctions":3,"corporate_registry":2,"adverse_media":3,"jurisdiction_reference":1,"litigation":2,"offshore_leaks":1}'::jsonb,
   '["contextual_analysis","explanation_of_material_findings","mitigating_factors","recommended_follow_up_actions","client_safe_notes"]'::jsonb,
   true,
   '["Structured data locked","Commentary complete","Risk model executed","Pre-QA review passed","AI review acknowledged","Manager sign-off"]'::jsonb,
   'Medium', 1);
