
-- Enable pg_net for HTTP calls from triggers
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Function to trigger impact analysis when alert_event is created
CREATE OR REPLACE FUNCTION public.fn_trigger_impact_analysis()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_url TEXT;
  v_key TEXT;
BEGIN
  -- Construct the edge function URL
  v_url := rtrim(current_setting('app.settings.supabase_url', true), '/') || '/functions/v1/jurisdiction-impact-analysis';
  v_key := current_setting('app.settings.supabase_service_role_key', true);

  -- If settings not available, use env-based approach
  IF v_url IS NULL OR v_url = '' OR v_url = '/functions/v1/jurisdiction-impact-analysis' THEN
    v_url := 'https://nhojqcswjunsgcrudkrt.supabase.co/functions/v1/jurisdiction-impact-analysis';
  END IF;
  IF v_key IS NULL OR v_key = '' THEN
    -- Skip if we can't authenticate
    RETURN NEW;
  END IF;

  PERFORM extensions.http_post(
    url := v_url,
    body := jsonb_build_object('alert_event_id', NEW.id)::text,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || v_key
    )::text
  );

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Don't fail the insert if impact analysis fails
  RAISE WARNING 'Impact analysis trigger failed: %', SQLERRM;
  RETURN NEW;
END;
$$;

-- Create trigger on alert_event
CREATE TRIGGER trg_alert_event_impact_analysis
  AFTER INSERT ON public.alert_event
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_trigger_impact_analysis();
