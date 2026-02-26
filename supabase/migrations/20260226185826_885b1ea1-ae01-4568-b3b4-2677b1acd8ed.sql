
-- Programme settings: one row per org, stores cadence and defaults per risk tier
CREATE TABLE public.programme_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
  
  -- Cadence per risk tier (months between reviews)
  cadence_tier_a integer NOT NULL DEFAULT 6,
  cadence_tier_b integer NOT NULL DEFAULT 12,
  cadence_tier_c integer NOT NULL DEFAULT 24,
  
  -- Default report tier per risk tier
  report_tier_a text NOT NULL DEFAULT 'enhanced',
  report_tier_b text NOT NULL DEFAULT 'standard',
  report_tier_c text NOT NULL DEFAULT 'basic',
  
  -- Add-on toggles (JSON object of feature_key -> boolean)
  addons jsonb NOT NULL DEFAULT '{}'::jsonb,
  
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  
  UNIQUE(org_id)
);

ALTER TABLE public.programme_settings ENABLE ROW LEVEL SECURITY;

-- Programme audit log: tracks changes
CREATE TABLE public.programme_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
  changed_by uuid NOT NULL,
  field_changed text NOT NULL,
  old_value text,
  new_value text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.programme_audit_log ENABLE ROW LEVEL SECURITY;

-- RLS for programme_settings
CREATE POLICY "Internal manage programme settings"
  ON public.programme_settings FOR ALL
  USING (is_internal(auth.uid()));

CREATE POLICY "Client admin read programme settings"
  ON public.programme_settings FOR SELECT
  USING (org_id = get_user_org_id(auth.uid()) AND has_role(auth.uid(), 'client_admin'::app_role));

-- RLS for programme_audit_log
CREATE POLICY "Internal manage programme audit log"
  ON public.programme_audit_log FOR ALL
  USING (is_internal(auth.uid()));

CREATE POLICY "Client admin read programme audit log"
  ON public.programme_audit_log FOR SELECT
  USING (org_id = get_user_org_id(auth.uid()) AND has_role(auth.uid(), 'client_admin'::app_role));
