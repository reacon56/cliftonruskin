import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ENGINE_VERSION = "CR-JURIS-1.0";

interface Factor {
  indicator_type: string;
  value: any;
  score_contribution: number;
  source_name?: string;
  jurisdiction_country?: string;
  description: string;
}

interface ControlRecommendation {
  control: string;
  rationale: string;
}

const BAND_CONTROLS: Record<string, ControlRecommendation[]> = {
  LOW: [
    { control: "STANDARD_DD", rationale: "Standard due diligence is sufficient for low-risk jurisdictions" },
  ],
  MEDIUM: [
    { control: "STANDARD_DD", rationale: "Standard due diligence with additional monitoring" },
    { control: "PERIODIC_REVIEW_12M", rationale: "Annual review cycle recommended" },
  ],
  HIGH: [
    { control: "EDD_REQUIRED", rationale: "Enhanced due diligence required for high-risk jurisdiction exposure" },
    { control: "SOW_SOF_VERIFICATION", rationale: "Source of wealth and source of funds verification required" },
    { control: "SENIOR_APPROVAL", rationale: "Senior management approval required before engagement" },
    { control: "PERIODIC_REVIEW_6M", rationale: "Six-monthly review cycle" },
  ],
  SEVERE: [
    { control: "EDD_REQUIRED", rationale: "Enhanced due diligence mandatory" },
    { control: "SOW_SOF_VERIFICATION", rationale: "Full source of wealth and funds verification" },
    { control: "SENIOR_APPROVAL", rationale: "Board-level or MLRO approval required" },
    { control: "ENHANCED_MONITORING", rationale: "Continuous enhanced monitoring with automated alerts" },
    { control: "LEGAL_REVIEW", rationale: "Independent legal review of engagement" },
    { control: "PERIODIC_REVIEW_3M", rationale: "Quarterly review cycle" },
  ],
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { entity_id } = await req.json();
    if (!entity_id) {
      return new Response(JSON.stringify({ error: "entity_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const sb = createClient(supabaseUrl, serviceKey);

    // 1. Load engine config
    const { data: config, error: cfgErr } = await sb
      .from("cr_risk_engine_config")
      .select("*")
      .eq("engine_version", ENGINE_VERSION)
      .eq("enabled", true)
      .single();

    if (cfgErr || !config) {
      return new Response(JSON.stringify({ error: "No active engine config found" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const weights = config.weights_json as Record<string, number>;
    const thresholds = config.thresholds_json as Record<string, number[]>;

    // 2. Get entity's linked jurisdictions
    const { data: entityData } = await sb
      .from("entities")
      .select("incorporation_country_code, hq_country_code")
      .eq("id", entity_id)
      .single();

    const { data: opCountries } = await sb
      .from("entity_operating_countries")
      .select("country_code")
      .eq("entity_id", entity_id);

    const countryCodes = new Set<string>();
    (opCountries || []).forEach((oc: any) => countryCodes.add(oc.country_code));
    if (entityData?.incorporation_country_code) countryCodes.add(entityData.incorporation_country_code);
    if (entityData?.hq_country_code) countryCodes.add(entityData.hq_country_code);

    if (countryCodes.size === 0) {
      return new Response(JSON.stringify({ message: "No linked jurisdictions for entity" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 3. Get jurisdiction records
    const { data: jurisdictions } = await sb
      .from("jurisdiction")
      .select("id, country_code, country_name")
      .in("country_code", Array.from(countryCodes));

    const jurisdictionIds = (jurisdictions || []).map((j: any) => j.id);
    const jMap = Object.fromEntries((jurisdictions || []).map((j: any) => [j.id, j]));

    if (jurisdictionIds.length === 0) {
      return new Response(JSON.stringify({ message: "No jurisdiction records found" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 4. Load all indicators
    const { data: indicators } = await sb
      .from("jurisdiction_indicator")
      .select("*")
      .in("jurisdiction_id", jurisdictionIds);

    // 5. Evaluate scoring rules
    let score = 0;
    let minBand: string | null = null;
    const factors: Factor[] = [];

    for (const ind of (indicators || []) as any[]) {
      const jur = jMap[ind.jurisdiction_id];
      const country = jur?.country_name || ind.jurisdiction_id;
      const vj = ind.value_json || {};

      // FATF_STATUS
      if (ind.indicator_type === "FATF_STATUS") {
        const status = vj.status || vj.programme_status || "";
        if (status === "CALL_FOR_ACTION" || status === "Black List") {
          const pts = weights.FATF_CALL_FOR_ACTION || 50;
          score += pts;
          minBand = "HIGH";
          factors.push({
            indicator_type: "FATF_STATUS",
            value: status,
            score_contribution: pts,
            source_name: ind.source_name,
            jurisdiction_country: country,
            description: `FATF Call for Action — immediate high-risk designation for ${country}`,
          });
        } else if (status === "INCREASED_MONITORING" || status === "Grey List") {
          const pts = weights.FATF_INCREASED_MONITORING || 25;
          score += pts;
          factors.push({
            indicator_type: "FATF_STATUS",
            value: status,
            score_contribution: pts,
            source_name: ind.source_name,
            jurisdiction_country: country,
            description: `FATF Increased Monitoring — enhanced scrutiny required for ${country}`,
          });
        }
      }

      // EU_AML_HRTC
      if (ind.indicator_type === "EU_AML_HRTC") {
        const status = vj.status || "";
        if (status === "YES" || status === "LISTED" || status === "High-Risk Third Country") {
          const pts = weights.EU_AML_HRTC || 25;
          score += pts;
          factors.push({
            indicator_type: "EU_AML_HRTC",
            value: status,
            score_contribution: pts,
            source_name: ind.source_name,
            jurisdiction_country: country,
            description: `EU AML High-Risk Third Country listing for ${country}`,
          });
        }
      }

      // SANCTIONS programmes
      if (ind.indicator_type?.startsWith("SANCTIONS_")) {
        const progStatus = vj.programme_status || vj.status || "";
        if (progStatus === "COMPREHENSIVE") {
          const pts = weights.SANCTIONS_COMPREHENSIVE || 40;
          score += pts;
          factors.push({
            indicator_type: ind.indicator_type,
            value: progStatus,
            score_contribution: pts,
            source_name: ind.source_name,
            jurisdiction_country: country,
            description: `Comprehensive sanctions programme active for ${country} (${ind.indicator_type})`,
          });
        } else if (progStatus === "TARGETED" || progStatus) {
          const pts = weights.SANCTIONS_TARGETED || 20;
          score += pts;
          factors.push({
            indicator_type: ind.indicator_type,
            value: progStatus,
            score_contribution: pts,
            source_name: ind.source_name,
            jurisdiction_country: country,
            description: `Targeted sanctions programme for ${country} (${ind.indicator_type})`,
          });
        }
      }

      // CPI_SCORE
      if (ind.indicator_type === "CPI_SCORE") {
        const cpiScore = vj.score;
        if (cpiScore != null && Number(cpiScore) < 30) {
          const pts = weights.CPI_BELOW_30 || 10;
          score += pts;
          factors.push({
            indicator_type: "CPI_SCORE",
            value: cpiScore,
            score_contribution: pts,
            source_name: ind.source_name,
            jurisdiction_country: country,
            description: `CPI score ${cpiScore} (below 30) for ${country} — indicator only, never sole trigger`,
          });
        }
      }
    }

    // Cap score at 100
    score = Math.min(score, 100);

    // 6. Determine band from thresholds
    let band = "LOW";
    for (const [b, range] of Object.entries(thresholds)) {
      if (score >= range[0] && score <= range[1]) {
        band = b;
        break;
      }
    }

    // Apply minimum band floor
    if (minBand) {
      const bandOrder = ["LOW", "MEDIUM", "HIGH", "SEVERE"];
      if (bandOrder.indexOf(minBand) > bandOrder.indexOf(band)) {
        band = minBand;
      }
    }

    // 7. Get recommended controls
    const controls = BAND_CONTROLS[band] || BAND_CONTROLS.LOW;

    // 8. Store result
    const { data: result, error: insertErr } = await sb
      .from("cr_risk_result")
      .insert({
        entity_id,
        risk_score: score,
        risk_band: band,
        engine_version: ENGINE_VERSION,
        contributing_factors_json: factors,
        recommended_controls_json: controls,
      })
      .select()
      .single();

    if (insertErr) throw insertErr;

    return new Response(JSON.stringify({ result }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("cr-risk-engine error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
