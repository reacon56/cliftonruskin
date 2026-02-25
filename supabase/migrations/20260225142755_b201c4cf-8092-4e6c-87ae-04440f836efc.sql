
-- Saved views table for personal and org-wide filter views
CREATE TABLE public.saved_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organisations(id),
  user_id uuid DEFAULT NULL, -- null = org-wide (shared), non-null = personal
  name text NOT NULL,
  page_type text NOT NULL, -- 'entities', 'cases', 'monitoring'
  filter_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.saved_views ENABLE ROW LEVEL SECURITY;

-- Users can see their own personal views + org-wide views for their org
CREATE POLICY "Users see own and org views"
  ON public.saved_views FOR SELECT
  TO authenticated
  USING (
    (org_id = get_user_org_id(auth.uid()) AND (user_id IS NULL OR user_id = auth.uid()))
    OR is_internal(auth.uid())
  );

-- Any authenticated user can create personal views; client_admin can create org-wide
CREATE POLICY "Users create views"
  ON public.saved_views FOR INSERT
  TO authenticated
  WITH CHECK (
    org_id = get_user_org_id(auth.uid())
    AND (
      user_id = auth.uid()  -- personal view
      OR (user_id IS NULL AND has_role(auth.uid(), 'client_admin'))  -- org-wide requires admin
    )
  );

-- Users can delete their own personal views; admins can delete org-wide
CREATE POLICY "Users delete views"
  ON public.saved_views FOR DELETE
  TO authenticated
  USING (
    org_id = get_user_org_id(auth.uid())
    AND (
      user_id = auth.uid()
      OR (user_id IS NULL AND has_role(auth.uid(), 'client_admin'))
    )
  );
