
-- Fix search_path on map_indicator_to_alert_type
CREATE OR REPLACE FUNCTION public.map_indicator_to_alert_type(ind_type TEXT)
RETURNS public.client_alert_type
LANGUAGE sql IMMUTABLE
SET search_path TO 'public'
AS $$
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
