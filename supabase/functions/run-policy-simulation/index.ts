import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/**
 * Runs proposed policy rules against monitored entities WITHOUT touching
 * the live ruleset. Stores results in policy_simulation_result for comparison.
 */
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { simulation_id } = await req.json();
    if (!simulation_id) {
      return new Response(JSON.stringify({ error: "simulation_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const sb = createClient(supabaseUrl, serviceKey);

    // 1. Load simulation
    const { data: sim, error: simErr } = await sb
      .from("policy_simulation")
      .select("*")
      .eq("id", simulation_id)
      .single();

    if (simErr || !sim) {
      return new Response(JSON.stringify({ error: "Simulation not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const orgId = sim.org_id;
    const proposedRules = (sim.proposed_rules_json as any[]) || [];

    // 2. Get monitored entities for this org
    const { data: monitoredLinks } = await sb
      .from("client_monitored_entity")
      .select("entity_id")
      .eq("org_id", orgId)
      .eq("enabled", true);

    const entityIds = [...new Set((monitoredLinks || []).map((m: any) => m.entity_id))];

    if (entityIds.length === 0) {
      // Update status
      await sb.from("policy_simulation").update({ status: "completed" }).eq("id", simulation_id);
      return new Response(JSON.stringify({ message: "No monitored entities", results: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 3. Get current live outcomes for comparison
    const { data: currentOutcomes } = await sb
      .from("client_policy_outcome")
      .select("entity_id, outcome_json, computed_at")
      .eq("org_id", orgId)
      .in("entity_id", entityIds)
      .order("computed_at", { ascending: false });

    // Deduplicate: latest per entity
    const currentOutcomeMap = new Map<string, any>();
    for (const co of (currentOutcomes || []) as any[]) {
      if (!currentOutcomeMap.has(co.entity_id)) {
        currentOutcomeMap.set(co.entity_id, co.outcome_json);
      }
    }

    // 4. For each entity, get linked jurisdictions and indicators, then evaluate proposed rules
    const results: any[] = [];

    for (const entityId of entityIds) {
      // Get linked jurisdictions
      const { data: links } = await sb
        .from("entity_jurisdiction_link")
        .select("jurisdiction_id")
        .eq("entity_id", entityId);

      const jurIds = (links || []).map((l: any) => l.jurisdiction_id);

      let indicators: any[] = [];
      if (jurIds.length > 0) {
        const { data: inds } = await sb
          .from("jurisdiction_indicator")
          .select("*")
          .in("jurisdiction_id", jurIds);
        indicators = inds || [];
      }

      // Evaluate proposed rules
      const mergedActions = new Set<string>();
      const matchedRules: any[] = [];

      for (const rule of proposedRules) {
        const relevantIndicators = indicators.filter(
          (ind: any) => ind.indicator_type === rule.if_indicator_type
        );

        for (const ind of relevantIndicators) {
          if (evaluateCondition(ind.value_json, rule.operator, rule.compare_value_json)) {
            const actions = rule.then_outcome_json?.actions || [];
            actions.forEach((a: string) => mergedActions.add(a));
            matchedRules.push({
              rule_indicator: rule.if_indicator_type,
              condition: `${rule.operator} ${JSON.stringify(rule.compare_value_json)}`,
              jurisdiction_id: ind.jurisdiction_id,
            });
          }
        }
      }

      const proposedOutcome = {
        actions: Array.from(mergedActions),
        matched_rules: matchedRules,
        jurisdictions_evaluated: jurIds.length,
        indicators_checked: indicators.length,
      };

      const currentOutcome = currentOutcomeMap.get(entityId) || null;

      // Determine if there's a meaningful change
      const currentActions = new Set(currentOutcome?.actions || []);
      const proposedActions = new Set(proposedOutcome.actions);
      const hasChange =
        currentActions.size !== proposedActions.size ||
        [...proposedActions].some((a) => !currentActions.has(a)) ||
        [...currentActions].some((a) => !proposedActions.has(a));

      results.push({
        simulation_id,
        entity_id: entityId,
        current_outcome_json: currentOutcome,
        proposed_outcome_json: proposedOutcome,
        has_change: hasChange,
      });
    }

    // 5. Clear old results and insert new
    await sb.from("policy_simulation_result").delete().eq("simulation_id", simulation_id);

    if (results.length > 0) {
      const { error: insertErr } = await sb
        .from("policy_simulation_result")
        .insert(results);
      if (insertErr) {
        console.error("Failed to insert results:", insertErr);
      }
    }

    // 6. Update simulation status
    await sb.from("policy_simulation").update({ status: "completed" }).eq("id", simulation_id);

    // 7. Compute summary
    const changedCount = results.filter((r) => r.has_change).length;
    const eddRequired = results.filter((r) =>
      r.proposed_outcome_json.actions?.includes("EDD_REQUIRED")
    ).length;
    const doNotOnboard = results.filter((r) =>
      r.proposed_outcome_json.actions?.includes("BLOCK_ONBOARDING") ||
      r.proposed_outcome_json.actions?.includes("DO_NOT_ONBOARD")
    ).length;

    return new Response(
      JSON.stringify({
        message: "Simulation complete",
        total_entities: results.length,
        changed_entities: changedCount,
        edd_required_count: eddRequired,
        do_not_onboard_count: doNotOnboard,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("run-policy-simulation error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

function evaluateCondition(valueJson: any, operator: string, compareJson: any): boolean {
  if (!valueJson) return operator === "NOT_EXISTS";
  if (operator === "EXISTS") return true;
  if (operator === "NOT_EXISTS") return false;

  const indVal = valueJson?.status || valueJson?.programme_status || valueJson?.score;
  const compareVal = compareJson?.value;
  const compareValues = compareJson?.values;

  switch (operator) {
    case "EQUALS":
      return String(indVal) === String(compareVal);
    case "NOT_EQUALS":
      return String(indVal) !== String(compareVal);
    case "IN":
      return Array.isArray(compareValues) && compareValues.map(String).includes(String(indVal));
    case "NOT_IN":
      return Array.isArray(compareValues) && !compareValues.map(String).includes(String(indVal));
    case "GTE":
      return Number(indVal) >= Number(compareVal);
    case "LTE":
      return Number(indVal) <= Number(compareVal);
    case "GT":
      return Number(indVal) > Number(compareVal);
    case "LT":
      return Number(indVal) < Number(compareVal);
    default:
      return false;
  }
}
