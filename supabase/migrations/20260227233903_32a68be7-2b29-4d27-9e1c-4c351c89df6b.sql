
-- 1. client_monitored_entity table
CREATE TABLE public.client_monitored_entity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
  entity_id UUID NOT NULL REFERENCES public.entities(id) ON DELETE CASCADE,
  enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_cme_org_entity ON public.client_monitored_entity(org_id, entity_id);
CREATE INDEX idx_cme_entity ON public.client_monitored_entity(entity_id);

ALTER TABLE public.client_monitored_entity ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org users can read own monitored entities"
  ON public.client_monitored_entity FOR SELECT
  USING (org_id = public.get_user_org_id(auth.uid()));

CREATE POLICY "Client admins can manage monitored entities"
  ON public.client_monitored_entity FOR ALL
  USING (org_id = public.get_user_org_id(auth.uid()))
  WITH CHECK (org_id = public.get_user_org_id(auth.uid()));

-- 2. Replace fn_create_alert_event to also fan out to monitored-entity owners
CREATE OR REPLACE FUNCTION public.fn_create_alert_event()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $function$
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

  -- Fan out to subscription-based users (existing logic)
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

  -- Fan out to monitored-entity owners via entity_jurisdiction_link
  INSERT INTO public.alert_notification (user_id, org_id, alert_event_id)
  SELECT DISTINCT p.user_id, cme.org_id, v_event_id
  FROM public.client_monitored_entity cme
  JOIN public.entity_jurisdiction_link ejl ON ejl.entity_id = cme.entity_id
  JOIN public.profiles p ON p.org_id = cme.org_id
  WHERE cme.enabled = true
    AND ejl.jurisdiction_id = NEW.jurisdiction_id
    AND p.user_id IS NOT NULL
    AND NOT EXISTS (
      SELECT 1 FROM public.alert_notification an2
      WHERE an2.alert_event_id = v_event_id
        AND an2.user_id = p.user_id
        AND an2.org_id = cme.org_id
    );

  RETURN NEW;
END;
$function$;

-- 3. Ensure trigger exists on jurisdiction_indicator_change
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_indicator_change_alert'
  ) THEN
    CREATE TRIGGER trg_indicator_change_alert
      AFTER INSERT ON public.jurisdiction_indicator_change
      FOR EACH ROW
      EXECUTE FUNCTION public.fn_create_alert_event();
  END IF;
END$$;
