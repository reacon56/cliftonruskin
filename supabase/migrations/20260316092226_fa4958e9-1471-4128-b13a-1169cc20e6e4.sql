
-- Table: programme_intelligence_profile
CREATE TABLE public.programme_intelligence_profile (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
  sector_profile jsonb NOT NULL DEFAULT '[]'::jsonb,
  jurisdiction_profile jsonb NOT NULL DEFAULT '[]'::jsonb,
  risk_profile jsonb NOT NULL DEFAULT '{}'::jsonb,
  entity_count integer NOT NULL DEFAULT 0,
  tier_a_count integer NOT NULL DEFAULT 0,
  last_generated_at timestamptz NOT NULL DEFAULT now(),
  generated_from_entity_count integer NOT NULL DEFAULT 0,
  manual_context text,
  UNIQUE (org_id)
);

ALTER TABLE public.programme_intelligence_profile ENABLE ROW LEVEL SECURITY;

-- RLS: internal users can read all, org members can read own
CREATE POLICY "Internal users can read all PIPs"
  ON public.programme_intelligence_profile FOR SELECT
  TO authenticated
  USING (public.is_internal(auth.uid()) OR org_id = public.get_user_org_id(auth.uid()));

CREATE POLICY "Internal users can upsert PIPs"
  ON public.programme_intelligence_profile FOR ALL
  TO authenticated
  USING (public.is_internal(auth.uid()))
  WITH CHECK (public.is_internal(auth.uid()));

-- Allow org members to update manual_context only
CREATE POLICY "Org members can update own PIP"
  ON public.programme_intelligence_profile FOR UPDATE
  TO authenticated
  USING (org_id = public.get_user_org_id(auth.uid()))
  WITH CHECK (org_id = public.get_user_org_id(auth.uid()));

-- Function: generate_programme_profile
CREATE OR REPLACE FUNCTION public.generate_programme_profile(_org_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_sector jsonb;
  v_jurisdiction jsonb;
  v_risk jsonb;
  v_entity_count integer;
  v_tier_a integer;
BEGIN
  -- Count entities
  SELECT count(*), count(*) FILTER (WHERE risk_tier = 'a')
  INTO v_entity_count, v_tier_a
  FROM public.entities
  WHERE org_id = _org_id AND status != 'archived';

  -- Build sector profile from business_unit, entity_type, service_provided
  SELECT coalesce(jsonb_agg(DISTINCT val ORDER BY val), '[]'::jsonb)
  INTO v_sector
  FROM (
    SELECT business_unit AS val FROM public.entities WHERE org_id = _org_id AND status != 'archived' AND business_unit IS NOT NULL AND business_unit != ''
    UNION
    SELECT entity_type FROM public.entities WHERE org_id = _org_id AND status != 'archived' AND entity_type IS NOT NULL AND entity_type != ''
    UNION
    SELECT service_provided FROM public.entities WHERE org_id = _org_id AND status != 'archived' AND service_provided IS NOT NULL AND service_provided != ''
  ) sub;

  -- Build jurisdiction profile from inc, hq, and operating countries
  SELECT coalesce(jsonb_agg(jsonb_build_object('code', code, 'name', name, 'source', source) ORDER BY name), '[]'::jsonb)
  INTO v_jurisdiction
  FROM (
    SELECT DISTINCT incorporation_country_code AS code, incorporation_country_name AS name, 'incorporation' AS source
    FROM public.entities WHERE org_id = _org_id AND status != 'archived' AND incorporation_country_code IS NOT NULL
    UNION
    SELECT DISTINCT hq_country_code, hq_country_name, 'hq'
    FROM public.entities WHERE org_id = _org_id AND status != 'archived' AND hq_country_code IS NOT NULL
    UNION
    SELECT DISTINCT eoc.country_code, eoc.country_name, 'operations'
    FROM public.entity_operating_countries eoc
    JOIN public.entities e ON e.id = eoc.entity_id
    WHERE e.org_id = _org_id AND e.status != 'archived'
  ) sub;

  -- Build risk profile
  SELECT jsonb_build_object(
    'tier_a', count(*) FILTER (WHERE risk_tier = 'a'),
    'tier_b', count(*) FILTER (WHERE risk_tier = 'b'),
    'tier_c', count(*) FILTER (WHERE risk_tier = 'c'),
    'high_criticality', count(*) FILTER (WHERE criticality = 'high'),
    'monitored', (SELECT count(*) FROM public.client_monitored_entity WHERE org_id = _org_id AND enabled = true)
  )
  INTO v_risk
  FROM public.entities
  WHERE org_id = _org_id AND status != 'archived';

  -- Upsert
  INSERT INTO public.programme_intelligence_profile (org_id, sector_profile, jurisdiction_profile, risk_profile, entity_count, tier_a_count, last_generated_at, generated_from_entity_count)
  VALUES (_org_id, v_sector, v_jurisdiction, v_risk, v_entity_count, v_tier_a, now(), v_entity_count)
  ON CONFLICT (org_id) DO UPDATE SET
    sector_profile = EXCLUDED.sector_profile,
    jurisdiction_profile = EXCLUDED.jurisdiction_profile,
    risk_profile = EXCLUDED.risk_profile,
    entity_count = EXCLUDED.entity_count,
    tier_a_count = EXCLUDED.tier_a_count,
    last_generated_at = now(),
    generated_from_entity_count = EXCLUDED.generated_from_entity_count;
END;
$$;

-- Trigger function for entities changes
CREATE OR REPLACE FUNCTION public.fn_regenerate_pip()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_org_id uuid;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_org_id := OLD.org_id;
  ELSE
    v_org_id := NEW.org_id;
  END IF;

  PERFORM public.generate_programme_profile(v_org_id);
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Trigger on entities table
CREATE TRIGGER trg_pip_on_entity_change
AFTER INSERT OR UPDATE OF business_unit, entity_type, service_provided, incorporation_country_code, hq_country_code, status OR DELETE
ON public.entities
FOR EACH ROW
EXECUTE FUNCTION public.fn_regenerate_pip();
