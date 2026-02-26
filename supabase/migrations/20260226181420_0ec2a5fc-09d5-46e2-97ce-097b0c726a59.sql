
CREATE TABLE public.entity_import_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id uuid NOT NULL REFERENCES public.organisations(id),
  uploaded_by uuid NOT NULL,
  file_name text NOT NULL,
  total_rows integer NOT NULL DEFAULT 0,
  created_count integer NOT NULL DEFAULT 0,
  skipped_count integer NOT NULL DEFAULT 0,
  error_count integer NOT NULL DEFAULT 0,
  error_details jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.entity_import_logs ENABLE ROW LEVEL SECURITY;

-- Client admins see their own org's import logs
CREATE POLICY "Users see own org import logs"
  ON public.entity_import_logs FOR SELECT
  USING (org_id = get_user_org_id(auth.uid()) OR is_internal(auth.uid()));

-- Client admins can insert import logs
CREATE POLICY "Client admin insert import logs"
  ON public.entity_import_logs FOR INSERT
  WITH CHECK (
    uploaded_by = auth.uid()
    AND org_id = get_user_org_id(auth.uid())
    AND has_role(auth.uid(), 'client_admin'::app_role)
  );

-- Internal can manage all
CREATE POLICY "Internal manage import logs"
  ON public.entity_import_logs FOR ALL
  USING (is_internal(auth.uid()));
