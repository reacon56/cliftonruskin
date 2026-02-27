import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const METHODOLOGY_NOTE =
  "Indicators inform scoping, controls and risk weighting; they are not a full description of conditions on the ground.";

interface AnnexIndicator {
  indicator_type: string;
  value: Record<string, unknown>;
  effective_date: string | null;
  retrieved_at: string | null;
  source_name: string | null;
  source_url: string | null;
}

interface AnnexJurisdiction {
  jurisdiction_id: string;
  country_name: string;
  country_code: string;
  link_types: string[];
  confidence: string;
  indicators: AnnexIndicator[];
}

interface AnnexPayload {
  entity_id: string;
  entity_name: string;
  case_id: string | null;
  generated_at: string;
  methodology_note: string;
  jurisdictions: AnnexJurisdiction[];
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { entity_id, case_id } = await req.json();
    if (!entity_id) {
      return new Response(JSON.stringify({ error: "entity_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const sb = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // 1. Entity name
    const { data: ent } = await sb
      .from("entities")
      .select("name, incorporation_country_code, hq_country_code")
      .eq("id", entity_id)
      .single();

    // 2. Explicit jurisdiction links
    const { data: links } = await sb
      .from("entity_jurisdiction_link")
      .select(
        "jurisdiction_id, link_type, confidence, jurisdiction:jurisdiction_id(id, country_code, country_name)"
      )
      .eq("entity_id", entity_id);

    // Build jurisdiction map
    interface JurBucket {
      jurisdiction_id: string;
      country_name: string;
      country_code: string;
      link_types: string[];
      confidence: string;
    }
    const jurMap = new Map<string, JurBucket>();

    for (const l of (links || []) as any[]) {
      const j = l.jurisdiction;
      if (!j) continue;
      const existing = jurMap.get(j.id);
      if (existing) {
        if (!existing.link_types.includes(l.link_type))
          existing.link_types.push(l.link_type);
      } else {
        jurMap.set(j.id, {
          jurisdiction_id: j.id,
          country_name: j.country_name,
          country_code: j.country_code,
          link_types: [l.link_type],
          confidence: l.confidence,
        });
      }
    }

    // Fallback to legacy if no explicit links
    if (jurMap.size === 0) {
      const codes = new Set<string>();
      if (ent?.incorporation_country_code) codes.add(ent.incorporation_country_code);
      if (ent?.hq_country_code) codes.add(ent.hq_country_code);

      const { data: opC } = await sb
        .from("entity_operating_countries")
        .select("country_code")
        .eq("entity_id", entity_id);
      (opC || []).forEach((o: any) => codes.add(o.country_code));

      if (codes.size > 0) {
        const { data: fj } = await sb
          .from("jurisdiction")
          .select("id, country_code, country_name")
          .in("country_code", Array.from(codes));
        for (const j of (fj || []) as any[]) {
          jurMap.set(j.id, {
            jurisdiction_id: j.id,
            country_name: j.country_name,
            country_code: j.country_code,
            link_types: ["LEGACY"],
            confidence: "LIKELY",
          });
        }
      }
    }

    const jurIds = Array.from(jurMap.keys());

    // 3. Load indicators for all linked jurisdictions
    const { data: indicators } = jurIds.length > 0
      ? await sb
          .from("jurisdiction_indicator")
          .select("*")
          .in("jurisdiction_id", jurIds)
      : { data: [] };

    // 4. Build annex structure
    const jurisdictions: AnnexJurisdiction[] = [];
    for (const [jId, bucket] of jurMap.entries()) {
      const jurIndicators = (indicators || [])
        .filter((ind: any) => ind.jurisdiction_id === jId)
        .map((ind: any) => ({
          indicator_type: ind.indicator_type,
          value: ind.value_json ?? {},
          effective_date: ind.effective_date ?? null,
          retrieved_at: ind.retrieved_at ?? ind.created_at ?? null,
          source_name: ind.source_name ?? null,
          source_url: ind.source_url ?? null,
        }));

      jurisdictions.push({
        jurisdiction_id: jId,
        country_name: bucket.country_name,
        country_code: bucket.country_code,
        link_types: bucket.link_types,
        confidence: bucket.confidence,
        indicators: jurIndicators,
      });
    }

    // Sort by country name
    jurisdictions.sort((a, b) => a.country_name.localeCompare(b.country_name));

    const payload: AnnexPayload = {
      entity_id,
      entity_name: ent?.name ?? "Unknown",
      case_id: case_id ?? null,
      generated_at: new Date().toISOString(),
      methodology_note: METHODOLOGY_NOTE,
      jurisdictions,
    };

    return new Response(JSON.stringify(payload), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("report-annex-generator error:", err);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
