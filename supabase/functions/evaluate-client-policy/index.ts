import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ENGINE_VERSION = "v1";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { org_id, entity_id, case_id } = await req.json();
    if (!org_id || !entity_id) {
      return new Response(JSON.stringify({ error: "org_id and entity_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const sb = createClient(supabaseUrl, serviceKey);

    // 1. Load enabled ruleset for this org
    const { data: rulesets, error: rsErr } = await sb
      .from("client_policy_ruleset")
      .select("id, name, version")
      .eq("org_id", org_id)
      .eq("enabled", true)
      .order("updated_at", { ascending: false })
      .limit(1);

    if (rsErr) throw rsErr;
    if (!rulesets || rulesets.length === 0) {
      return new Response(JSON.stringify({ message: "No enabled ruleset found" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const ruleset = rulesets[0];

    // 2. Load rules in priority order
    const { data: rules, error: rulesErr } = await sb
      .from("client_policy_rule")
      .select("*")
      .eq("ruleset_id", ruleset.id)
      .order("priority");

    if (rulesErr) throw rulesErr;
    if (!rules || rules.length === 0) {
      return new Response(JSON.stringify({ message: "No rules in ruleset" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 3. Get entity's linked jurisdictions
    const { data: opCountries } = await sb
      .from("entity_operating_countries")
      .select("country_code")
      .eq("entity_id", entity_id);

    const { data: entityData } = await sb
      .from("entities")
      .select("incorporation_country_code, hq_country_code")
      .eq("id", entity_id)
      .single();

    const countryCodes = new Set<string>();
    (opCountries || []).forEach((oc: any) => countryCodes.add(oc.country_code));
    if (entityData?.incorporation_country_code) countryCodes.add(entityData.incorporation_country_code);
    if (entityData?.hq_country_code) countryCodes.add(entityData.hq_country_code);

    if (countryCodes.size === 0) {
      return new Response(JSON.stringify({ message: "No linked jurisdictions" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 4. Get jurisdiction IDs for these country codes
    const { data: jurisdictions } = await sb
      .from("jurisdiction")
      .select("id, country_code")
      .in("country_code", Array.from(countryCodes));

    const jurisdictionIds = (jurisdictions || []).map((j: any) => j.id);
    if (jurisdictionIds.length === 0) {
      return new Response(JSON.stringify({ message: "No jurisdiction records found" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 5. Load all indicators for these jurisdictions
    const { data: indicators } = await sb
      .from("jurisdiction_indicator")
      .select("*")
      .in("jurisdiction_id", jurisdictionIds);

    // 6. Evaluate rules
    const mergedActions = new Set<string>();
    const matchedRules: any[] = [];

    for (const rule of rules) {
      const relevantIndicators = (indicators || []).filter(
        (ind: any) => ind.indicator_type === rule.if_indicator_type
      );

      for (const ind of relevantIndicators) {
        if (evaluateCondition(ind.value_json, rule.operator, rule.compare_value_json)) {
          const actions = rule.then_outcome_json?.actions || [];
          actions.forEach((a: string) => mergedActions.add(a));
          matchedRules.push({
            rule_id: rule.id,
            indicator_type: rule.if_indicator_type,
            condition: `${rule.operator} ${JSON.stringify(rule.compare_value_json)}`,
            jurisdiction_id: ind.jurisdiction_id,
          });
        }
      }
    }

    const outcomeJson = {
      actions: Array.from(mergedActions),
      matched_rules: matchedRules,
      jurisdictions_evaluated: jurisdictionIds.length,
      indicators_checked: (indicators || []).length,
    };

    // 7. Store outcome
    const { data: stored, error: storeErr } = await sb
      .from("client_policy_outcome")
      .insert({
        org_id,
        entity_id,
        case_id: case_id || null,
        ruleset_id: ruleset.id,
        outcome_json: outcomeJson,
        engine_version: ENGINE_VERSION,
      })
      .select()
      .single();

    if (storeErr) throw storeErr;

    return new Response(JSON.stringify({ outcome: stored }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("evaluate-client-policy error:", err);
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

  // Extract the primary value from the indicator
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
