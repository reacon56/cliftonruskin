
-- Package entitlements per org (overrides defaults from feature_tier)
CREATE TABLE public.package_entitlements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
  package text NOT NULL DEFAULT 'core',
  source_tier_access text NOT NULL DEFAULT 'core',
  allowed_report_tiers text[] NOT NULL DEFAULT ARRAY['basic','standard'],
  partner_escalation_enabled boolean NOT NULL DEFAULT false,
  ai_brief_export_enabled boolean NOT NULL DEFAULT false,
  dashboard_modules jsonb NOT NULL DEFAULT '[]'::jsonb,
  addon_entitlements jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(org_id)
);

ALTER TABLE public.package_entitlements ENABLE ROW LEVEL SECURITY;

-- Internal full manage
CREATE POLICY "Internal manage entitlements"
  ON public.package_entitlements FOR ALL
  TO authenticated
  USING (public.is_internal(auth.uid()))
  WITH CHECK (public.is_internal(auth.uid()));

-- Clients can read their own entitlements
CREATE POLICY "Clients read own entitlements"
  ON public.package_entitlements FOR SELECT
  TO authenticated
  USING (org_id = public.get_user_org_id(auth.uid()));

-- Entitlement change log
CREATE TABLE public.entitlement_change_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organisations(id),
  changed_by uuid NOT NULL,
  field_changed text NOT NULL,
  old_value text,
  new_value text,
  reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.entitlement_change_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Internal manage entitlement logs"
  ON public.entitlement_change_log FOR ALL
  TO authenticated
  USING (public.is_internal(auth.uid()))
  WITH CHECK (public.is_internal(auth.uid()));

CREATE POLICY "Clients read own entitlement logs"
  ON public.entitlement_change_log FOR SELECT
  TO authenticated
  USING (org_id = public.get_user_org_id(auth.uid()));
