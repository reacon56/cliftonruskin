import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { alert_event_id } = await req.json();
    if (!alert_event_id) {
      return new Response(JSON.stringify({ error: "alert_event_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const sb = createClient(supabaseUrl, serviceKey);

    // 1. Load the alert event
    const { data: alertEvent, error: aeErr } = await sb
      .from("alert_event")
      .select("id, alert_type, jurisdiction_id, summary, details_json")
      .eq("id", alert_event_id)
      .single();

    if (aeErr || !alertEvent) {
      return new Response(JSON.stringify({ error: "Alert event not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const jurisdictionId = alertEvent.jurisdiction_id;

    // 2. Find all orgs that monitor entities linked to this jurisdiction
    // via entity_jurisdiction_link + client_monitored_entity
    const { data: linkedEntities } = await sb
      .from("entity_jurisdiction_link")
      .select("entity_id, entities:entity_id(id, name, org_id)")
      .eq("jurisdiction_id", jurisdictionId);

    if (!linkedEntities || linkedEntities.length === 0) {
      return new Response(JSON.stringify({ message: "No entities linked to jurisdiction", impacts: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get unique entity IDs
    const entityIds = [...new Set((linkedEntities as any[]).map((l) => l.entity_id))];

    // Check which are monitored
    const { data: monitored } = await sb
      .from("client_monitored_entity")
      .select("entity_id, org_id")
      .in("entity_id", entityIds)
      .eq("enabled", true);

    // Also include all entities linked (even if not explicitly monitored) for completeness
    // Build org → entity map
    const entityOrgMap = new Map<string, string>();
    for (const l of linkedEntities as any[]) {
      if (l.entities?.org_id) {
        entityOrgMap.set(l.entity_id, l.entities.org_id);
      }
    }

    // Deduplicate: use monitored entities + all linked entities
    const impactEntities = new Map<string, { entityId: string; orgId: string; entityName: string }>();
    for (const l of linkedEntities as any[]) {
      if (l.entities) {
        impactEntities.set(l.entity_id, {
          entityId: l.entity_id,
          orgId: l.entities.org_id,
          entityName: l.entities.name,
        });
      }
    }

    const impacts: any[] = [];
    const details = alertEvent.details_json as any;
    const indicatorType = details?.indicator_type ?? alertEvent.alert_type;

    for (const [, { entityId, orgId, entityName }] of impactEntities) {
      // Get previous risk result for comparison
      const { data: prevRisk } = await sb
        .from("cr_risk_result")
        .select("risk_band, risk_score")
        .eq("entity_id", entityId)
        .order("generated_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      const oldBand = prevRisk?.risk_band ?? null;
      const oldScore = prevRisk?.risk_score ?? null;

      // Re-run CR Risk Engine
      let newBand: string | null = null;
      let newScore: number | null = null;
      try {
        const riskResp = await fetch(`${supabaseUrl}/functions/v1/cr-risk-engine`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${serviceKey}`,
          },
          body: JSON.stringify({ entity_id: entityId }),
        });
        if (riskResp.ok) {
          const riskData = await riskResp.json();
          newBand = riskData.result?.risk_band ?? null;
          newScore = riskData.result?.risk_score ?? null;
        }
      } catch (e) {
        console.error(`Risk engine failed for entity ${entityId}:`, e);
      }

      // Record CR_SCORE_CHANGE impact if band changed
      if (newBand && oldBand && newBand !== oldBand) {
        impacts.push({
          alert_event_id,
          org_id: orgId,
          jurisdiction_id: jurisdictionId,
          entity_id: entityId,
          impact_type: "CR_SCORE_CHANGE",
          impact_summary: `CR risk band moved ${oldBand} → ${newBand} for ${entityName}`,
        });
      }

      // Re-run Client Policy Evaluator
      let policyTriggered = false;
      try {
        const policyResp = await fetch(`${supabaseUrl}/functions/v1/evaluate-client-policy`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${serviceKey}`,
          },
          body: JSON.stringify({ org_id: orgId, entity_id: entityId }),
        });
        if (policyResp.ok) {
          const policyData = await policyResp.json();
          const actions = policyData.outcome?.outcome_json?.actions ?? [];
          if (actions.length > 0) {
            policyTriggered = true;
            const actionSummary = actions.slice(0, 3).join(", ");
            impacts.push({
              alert_event_id,
              org_id: orgId,
              jurisdiction_id: jurisdictionId,
              entity_id: entityId,
              impact_type: "POLICY_TRIGGER",
              impact_summary: `Client policy now triggers: ${actionSummary} for ${entityName}`,
            });
          }
        }
      } catch (e) {
        console.error(`Policy eval failed for entity ${entityId}:`, e);
      }

      // Always record a MONITORING_ALERT impact
      impacts.push({
        alert_event_id,
        org_id: orgId,
        jurisdiction_id: jurisdictionId,
        entity_id: entityId,
        impact_type: "MONITORING_ALERT",
        impact_summary: `${indicatorType} change affects ${entityName}`,
      });
    }

    // Batch insert impacts
    if (impacts.length > 0) {
      const { error: insertErr } = await sb
        .from("jurisdiction_change_impact")
        .insert(impacts);
      if (insertErr) {
        console.error("Failed to insert impacts:", insertErr);
      }
    }

    return new Response(
      JSON.stringify({ message: "Impact analysis complete", impacts: impacts.length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("jurisdiction-impact-analysis error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
