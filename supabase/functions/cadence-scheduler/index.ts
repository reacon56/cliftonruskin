import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  // Find entities whose next_review_date is within 30 days
  // and who don't already have an open scheduled/submitted/in_progress case
  const today = new Date().toISOString().split("T")[0];
  const in30 = new Date(Date.now() + 30 * 86400000).toISOString().split("T")[0];

  const { data: entities, error: entErr } = await supabase
    .from("entities")
    .select("id, org_id, name, risk_tier, next_review_date")
    .lte("next_review_date", in30)
    .eq("status", "active");

  if (entErr) {
    return new Response(JSON.stringify({ error: entErr.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let created = 0;

  for (const entity of entities ?? []) {
    // Check if there's already an open case for this entity
    const { count } = await supabase
      .from("cases")
      .select("id", { count: "exact", head: true })
      .eq("entity_id", entity.id)
      .in("status", ["scheduled", "submitted", "quoted", "approved", "assigned", "in_progress", "awaiting_client", "qc"]);

    if ((count ?? 0) > 0) continue;

    // Determine product type from policy rules
    let productType = "Refresh Note";
    const { data: org } = await supabase
      .from("organisations")
      .select("risk_policy_default_id")
      .eq("id", entity.org_id)
      .single();

    if (org?.risk_policy_default_id) {
      const { data: rule } = await supabase
        .from("policy_rules")
        .select("default_product")
        .eq("policy_id", org.risk_policy_default_id)
        .eq("risk_tier", entity.risk_tier)
        .single();
      if (rule?.default_product) productType = rule.default_product;
    }

    // Create scheduled case
    const { data: newCase } = await supabase.from("cases").insert({
      org_id: entity.org_id,
      entity_id: entity.id,
      product_type: productType,
      priority: "standard",
      status: "scheduled",
      scope_notes: `Cadence-scheduled review for ${entity.name}. Next review date: ${entity.next_review_date}.`,
    }).select("id").single();

    if (newCase) {
      // Audit event
      await supabase.from("audit_events").insert({
        org_id: entity.org_id,
        action_type: "CASE_SCHEDULED",
        object_type: "case",
        object_id: newCase.id,
        metadata: {
          entity_name: entity.name,
          entity_id: entity.id,
          next_review_date: entity.next_review_date,
          product_type: productType,
          source: "cadence_auto",
        },
      });
      created++;
    }
  }

  return new Response(
    JSON.stringify({ created, checked: entities?.length ?? 0 }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
});
