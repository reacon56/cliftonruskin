
-- 1. Create alert_type enum
CREATE TYPE public.client_alert_type AS ENUM (
  'FATF_CHANGE',
  'EU_HRTC_CHANGE',
  'UK_SANCTIONS_CHANGE',
  'EU_SANCTIONS_CHANGE',
  'OFAC_SANCTIONS_CHANGE',
  'CPI_CHANGE'
);

-- 2. Create client-level alert_subscription table
CREATE TABLE public.alert_subscription (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  alert_type public.client_alert_type NOT NULL,
  jurisdiction_id UUID REFERENCES public.jurisdiction(id) ON DELETE CASCADE,
  all_linked_jurisdictions BOOLEAN NOT NULL DEFAULT false,
  enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.alert_subscription ENABLE ROW LEVEL SECURITY;

-- Client admins can manage their org's subscriptions
CREATE POLICY "client_admin_manage_alert_subscriptions"
  ON public.alert_subscription FOR ALL TO authenticated
  USING (org_id = public.get_user_org_id(auth.uid()) AND public.has_role(auth.uid(), 'client_admin'))
  WITH CHECK (org_id = public.get_user_org_id(auth.uid()) AND public.has_role(auth.uid(), 'client_admin'));

-- Users can manage their own subscriptions
CREATE POLICY "user_manage_own_alert_subscriptions"
  ON public.alert_subscription FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Internal can view all
CREATE POLICY "internal_view_alert_subscriptions"
  ON public.alert_subscription FOR SELECT TO authenticated
  USING (public.is_internal(auth.uid()));

-- 3. Create alert_event table (fan-out from indicator changes)
CREATE TABLE public.alert_event (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_type public.client_alert_type NOT NULL,
  jurisdiction_id UUID NOT NULL REFERENCES public.jurisdiction(id),
  indicator_change_id UUID REFERENCES public.jurisdiction_indicator_change(id),
  summary TEXT NOT NULL,
  details_json JSONB DEFAULT '{}',
  detected_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  effective_date DATE,
  source_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.alert_event ENABLE ROW LEVEL SECURITY;

-- Alert events are readable by authenticated users (filtered client-side by subscription)
CREATE POLICY "authenticated_read_alert_events"
  ON public.alert_event FOR SELECT TO authenticated
  USING (true);

-- Only internal/system can insert
CREATE POLICY "internal_insert_alert_events"
  ON public.alert_event FOR INSERT TO authenticated
  WITH CHECK (public.is_internal(auth.uid()));

-- 4. Create user-level notification delivery table
CREATE TABLE public.alert_notification (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  org_id UUID NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
  alert_event_id UUID NOT NULL REFERENCES public.alert_event(id) ON DELETE CASCADE,
  is_read BOOLEAN NOT NULL DEFAULT false,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.alert_notification ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_read_own_notifications"
  ON public.alert_notification FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "user_update_own_notifications"
  ON public.alert_notification FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Internal can insert notifications
CREATE POLICY "internal_insert_notifications"
  ON public.alert_notification FOR INSERT TO authenticated
  WITH CHECK (public.is_internal(auth.uid()));

-- System-level insert via trigger (service role)
CREATE POLICY "service_insert_notifications"
  ON public.alert_notification FOR INSERT TO service_role
  WITH CHECK (true);

-- 5. Mapping function: indicator_type → client_alert_type
CREATE OR REPLACE FUNCTION public.map_indicator_to_alert_type(ind_type TEXT)
RETURNS public.client_alert_type
LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE ind_type
    WHEN 'FATF_STATUS' THEN 'FATF_CHANGE'::public.client_alert_type
    WHEN 'EU_AML_HRTC' THEN 'EU_HRTC_CHANGE'::public.client_alert_type
    WHEN 'SANCTIONS_UK_PROGRAMME' THEN 'UK_SANCTIONS_CHANGE'::public.client_alert_type
    WHEN 'SANCTIONS_EU_PROGRAMME' THEN 'EU_SANCTIONS_CHANGE'::public.client_alert_type
    WHEN 'SANCTIONS_US_OFAC_PROGRAMME' THEN 'OFAC_SANCTIONS_CHANGE'::public.client_alert_type
    WHEN 'CPI_SCORE' THEN 'CPI_CHANGE'::public.client_alert_type
    ELSE NULL
  END
$$;

-- 6. Trigger function: on jurisdiction_indicator_change insert → create alert_event
CREATE OR REPLACE FUNCTION public.fn_create_alert_event()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_alert_type public.client_alert_type;
  v_summary TEXT;
  v_event_id UUID;
BEGIN
  v_alert_type := public.map_indicator_to_alert_type(NEW.indicator_type);
  IF v_alert_type IS NULL THEN
    RETURN NEW;
  END IF;

  v_summary := NEW.indicator_type || ' changed for jurisdiction';

  INSERT INTO public.alert_event (
    alert_type, jurisdiction_id, indicator_change_id,
    summary, details_json, detected_at, effective_date, source_url
  ) VALUES (
    v_alert_type, NEW.jurisdiction_id, NEW.id,
    v_summary,
    jsonb_build_object(
      'old_value', NEW.old_value_json,
      'new_value', NEW.new_value_json,
      'indicator_type', NEW.indicator_type,
      'source_name', NEW.source_name
    ),
    COALESCE(NEW.detected_at, now()),
    NEW.new_effective_date::date,
    NEW.source_url
  )
  RETURNING id INTO v_event_id;

  -- Fan out notifications to subscribed users
  INSERT INTO public.alert_notification (user_id, org_id, alert_event_id)
  SELECT DISTINCT
    COALESCE(sub.user_id, p.user_id),
    sub.org_id,
    v_event_id
  FROM public.alert_subscription sub
  LEFT JOIN public.profiles p ON p.org_id = sub.org_id
  WHERE sub.enabled = true
    AND sub.alert_type = v_alert_type
    AND (
      sub.jurisdiction_id = NEW.jurisdiction_id
      OR sub.jurisdiction_id IS NULL
      OR (sub.all_linked_jurisdictions = true AND EXISTS (
        SELECT 1 FROM public.entity_operating_countries eoc
        JOIN public.entities e ON e.id = eoc.entity_id
        JOIN public.jurisdiction j ON j.country_code = eoc.country_code
        WHERE e.org_id = sub.org_id AND j.id = NEW.jurisdiction_id
      ))
    )
    AND COALESCE(sub.user_id, p.user_id) IS NOT NULL;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_jurisdiction_change_alert
  AFTER INSERT ON public.jurisdiction_indicator_change
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_create_alert_event();

-- Index for notification queries
CREATE INDEX idx_alert_notification_user_unread
  ON public.alert_notification (user_id, is_read)
  WHERE is_read = false;

CREATE INDEX idx_alert_subscription_org
  ON public.alert_subscription (org_id, alert_type, enabled);
