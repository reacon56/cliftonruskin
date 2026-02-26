
CREATE TABLE public.upgrade_requests (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id uuid NOT NULL REFERENCES public.organisations(id),
  requested_feature text NOT NULL,
  requested_by uuid NOT NULL,
  notes text,
  status text NOT NULL DEFAULT 'pending',
  resolved_by uuid,
  resolved_at timestamptz,
  resolution_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.upgrade_requests ENABLE ROW LEVEL SECURITY;

-- Clients can insert requests for their own org
CREATE POLICY "Client insert upgrade requests"
  ON public.upgrade_requests FOR INSERT TO authenticated
  WITH CHECK (
    org_id = get_user_org_id(auth.uid())
    AND requested_by = auth.uid()
  );

-- Clients can see their own org's requests
CREATE POLICY "Client read own org upgrade requests"
  ON public.upgrade_requests FOR SELECT TO authenticated
  USING (
    org_id = get_user_org_id(auth.uid())
    OR is_internal(auth.uid())
  );

-- Internal staff can manage all requests
CREATE POLICY "Internal manage upgrade requests"
  ON public.upgrade_requests FOR ALL TO authenticated
  USING (is_internal(auth.uid()));

CREATE INDEX idx_upgrade_requests_status ON public.upgrade_requests(status);
CREATE INDEX idx_upgrade_requests_org ON public.upgrade_requests(org_id);
