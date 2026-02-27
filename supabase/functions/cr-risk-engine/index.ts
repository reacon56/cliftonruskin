import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ENGINE_VERSION = "CR-JURIS-1.0";

// Weight multipliers by link_type
const LINK_TYPE_WEIGHTS: Record<string, number> = {
  INCORPORATION: 1.0,
  OPERATIONS: 1.0,
  UBO_NATIONALITY: 0.7,
  BANK_LOCATION: 0.7,
  SUPPLIER_LOCATION: 0.7,
  SHIPPING_ROUTE: 0.7,
  OTHER: 0.5,
};

interface Factor {
  indicator_type: string;
  value: any;
  score_contribution: number;
  source_name?: string;
  jurisdiction_country?: string;
  link_type?: string;
  weight_multiplier?: number;
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

    // 2. Get entity's explicit jurisdiction links (primary source)
    const { data: explicitLinks } = await sb
      .from("entity_jurisdiction_link")
      .select("jurisdiction_id, link_type, confidence, jurisdiction(id, country_code, country_name)")
      .eq("entity_id", entity_id);

    // Also fall back to legacy sources if no explicit links
    const { data: entityData } = await sb
      .from("entities")
      .select("incorporation_country_code, hq_country_code")
      .eq("id", entity_id)
      .single();

    const { data: opCountries } = await sb
      .from("entity_operating_countries")
      .select("country_code")
      .eq("entity_id", entity_id);

    // Build jurisdiction map with weight multipliers
    // Keyed by jurisdiction_id → { country_name, max_weight }
    interface JurInfo {
      country_name: string;
      country_code: string;
      max_weight: number;
      link_types: string[];
    }
    const jurMap = new Map<string, JurInfo>();

    // Explicit links (preferred)
    for (const link of (explicitLinks || []) as any[]) {
      const jur = link.jurisdiction;
      if (!jur) continue;
      const w = LINK_TYPE_WEIGHTS[link.link_type] ?? 0.5;
      const existing = jurMap.get(jur.id);
      if (existing) {
        existing.max_weight = Math.max(existing.max_weight, w);
        existing.link_types.push(link.link_type);
      } else {
        jurMap.set(jur.id, {
          country_name: jur.country_name,
          country_code: jur.country_code,
          max_weight: w,
          link_types: [link.link_type],
        });
      }
    }

    // Fallback: if no explicit links, use legacy country codes
    if (jurMap.size === 0) {
      const fallbackCodes = new Set<string>();
      (opCountries || []).forEach((oc: any) => fallbackCodes.add(oc.country_code));
      if (entityData?.incorporation_country_code) fallbackCodes.add(entityData.incorporation_country_code);
      if (entityData?.hq_country_code) fallbackCodes.add(entityData.hq_country_code);

      if (fallbackCodes.size > 0) {
        const { data: fallbackJurs } = await sb
          .from("jurisdiction")
          .select("id, country_code, country_name")
          .in("country_code", Array.from(fallbackCodes));

        for (const j of (fallbackJurs || []) as any[]) {
          const isInc = j.country_code === entityData?.incorporation_country_code;
          const isHq = j.country_code === entityData?.hq_country_code;
          const w = (isInc || isHq) ? 1.0 : 0.7;
          jurMap.set(j.id, {
            country_name: j.country_name,
            country_code: j.country_code,
            max_weight: w,
            link_types: isInc ? ["INCORPORATION"] : isHq ? ["OPERATIONS"] : ["OPERATIONS"],
          });
        }
      }
    }

    if (jurMap.size === 0) {
      return new Response(JSON.stringify({ message: "No linked jurisdictions for entity" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const jurisdictionIds = Array.from(jurMap.keys());

    // 3. Load all indicators
    const { data: indicators } = await sb
      .from("jurisdiction_indicator")
      .select("*")
      .in("jurisdiction_id", jurisdictionIds);

    // 4. Evaluate scoring rules with weight multipliers
    let score = 0;
    let minBand: string | null = null;
    const factors: Factor[] = [];

    for (const ind of (indicators || []) as any[]) {
      const jurInfo = jurMap.get(ind.jurisdiction_id);
      if (!jurInfo) continue;
      const weightMult = jurInfo.max_weight;
      const country = jurInfo.country_name;
      const vj = ind.value_json || {};

      // FATF_STATUS
      if (ind.indicator_type === "FATF_STATUS") {
        const status = vj.status || vj.programme_status || "";
        if (status === "CALL_FOR_ACTION" || status === "Black List") {
          const basePts = weights.FATF_CALL_FOR_ACTION || 50;
          const pts = Math.round(basePts * weightMult);
          score += pts;
          minBand = "HIGH";
          factors.push({
            indicator_type: "FATF_STATUS", value: status, score_contribution: pts,
            source_name: ind.source_name, jurisdiction_country: country,
            link_type: jurInfo.link_types.join(", "), weight_multiplier: weightMult,
            description: `FATF Call for Action — immediate high-risk designation for ${country}`,
          });
        } else if (status === "INCREASED_MONITORING" || status === "Grey List") {
          const basePts = weights.FATF_INCREASED_MONITORING || 25;
          const pts = Math.round(basePts * weightMult);
          score += pts;
          factors.push({
            indicator_type: "FATF_STATUS", value: status, score_contribution: pts,
            source_name: ind.source_name, jurisdiction_country: country,
            link_type: jurInfo.link_types.join(", "), weight_multiplier: weightMult,
            description: `FATF Increased Monitoring — enhanced scrutiny required for ${country}`,
          });
        }
      }

      // EU_AML_HRTC
      if (ind.indicator_type === "EU_AML_HRTC") {
        const status = vj.status || "";
        if (status === "YES" || status === "LISTED" || status === "High-Risk Third Country") {
          const basePts = weights.EU_AML_HRTC || 25;
          const pts = Math.round(basePts * weightMult);
          score += pts;
          factors.push({
            indicator_type: "EU_AML_HRTC", value: status, score_contribution: pts,
            source_name: ind.source_name, jurisdiction_country: country,
            link_type: jurInfo.link_types.join(", "), weight_multiplier: weightMult,
            description: `EU AML High-Risk Third Country listing for ${country}`,
          });
        }
      }

      // SANCTIONS programmes
      if (ind.indicator_type?.startsWith("SANCTIONS_")) {
        const progStatus = vj.programme_status || vj.status || "";
        if (progStatus === "COMPREHENSIVE") {
          const basePts = weights.SANCTIONS_COMPREHENSIVE || 40;
          const pts = Math.round(basePts * weightMult);
          score += pts;
          factors.push({
            indicator_type: ind.indicator_type, value: progStatus, score_contribution: pts,
            source_name: ind.source_name, jurisdiction_country: country,
            link_type: jurInfo.link_types.join(", "), weight_multiplier: weightMult,
            description: `Comprehensive sanctions programme active for ${country}`,
          });
        } else if (progStatus === "TARGETED" || progStatus) {
          const basePts = weights.SANCTIONS_TARGETED || 20;
          const pts = Math.round(basePts * weightMult);
          score += pts;
          factors.push({
            indicator_type: ind.indicator_type, value: progStatus, score_contribution: pts,
            source_name: ind.source_name, jurisdiction_country: country,
            link_type: jurInfo.link_types.join(", "), weight_multiplier: weightMult,
            description: `Targeted sanctions programme for ${country}`,
          });
        }
      }

      // CPI_SCORE
      if (ind.indicator_type === "CPI_SCORE") {
        const cpiScore = vj.score;
        if (cpiScore != null && Number(cpiScore) < 30) {
          const basePts = weights.CPI_BELOW_30 || 10;
          const pts = Math.round(basePts * weightMult);
          score += pts;
          factors.push({
            indicator_type: "CPI_SCORE", value: cpiScore, score_contribution: pts,
            source_name: ind.source_name, jurisdiction_country: country,
            link_type: jurInfo.link_types.join(", "), weight_multiplier: weightMult,
            description: `CPI score ${cpiScore} (below 30) for ${country} — indicator only, never sole trigger`,
          });
        }
      }
    }

    score = Math.min(score, 100);

    // 5. Determine band
    let band = "LOW";
    for (const [b, range] of Object.entries(thresholds)) {
      if (score >= range[0] && score <= range[1]) {
        band = b;
        break;
      }
    }
    if (minBand) {
      const bandOrder = ["LOW", "MEDIUM", "HIGH", "SEVERE"];
      if (bandOrder.indexOf(minBand) > bandOrder.indexOf(band)) {
        band = minBand;
      }
    }

    const controls = BAND_CONTROLS[band] || BAND_CONTROLS.LOW;

    // 6. Store result
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
