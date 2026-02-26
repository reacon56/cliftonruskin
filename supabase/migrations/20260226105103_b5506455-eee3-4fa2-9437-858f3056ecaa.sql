
-- Feature flags per organisation with tier defaults and future billing support
CREATE TABLE public.org_feature_flags (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id UUID NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
  feature_key TEXT NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT false,
  tier_default TEXT NOT NULL DEFAULT 'disabled',
  overridden_by UUID,
  overridden_at TIMESTAMP WITH TIME ZONE,
  -- Future billing support
  billing_model TEXT DEFAULT 'included',
  unit_price NUMERIC,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (org_id, feature_key)
);

-- RLS
ALTER TABLE public.org_feature_flags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see own org feature flags"
  ON public.org_feature_flags FOR SELECT
  USING (
    org_id = get_user_org_id(auth.uid()) OR is_internal(auth.uid())
  );

CREATE POLICY "Internal manage feature flags"
  ON public.org_feature_flags FOR ALL
  USING (is_internal(auth.uid()));

CREATE POLICY "Client admin read feature flags"
  ON public.org_feature_flags FOR SELECT
  USING (
    org_id = get_user_org_id(auth.uid())
    AND has_role(auth.uid(), 'client_admin'::app_role)
  );

-- Feature activation audit log
CREATE TABLE public.feature_activation_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id UUID NOT NULL REFERENCES public.organisations(id),
  feature_key TEXT NOT NULL,
  action TEXT NOT NULL,
  changed_by UUID,
  previous_value BOOLEAN,
  new_value BOOLEAN,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.feature_activation_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Internal manage feature logs"
  ON public.feature_activation_log FOR ALL
  USING (is_internal(auth.uid()));

CREATE POLICY "Users see own org feature logs"
  ON public.feature_activation_log FOR SELECT
  USING (
    org_id = get_user_org_id(auth.uid()) OR is_internal(auth.uid())
  );
