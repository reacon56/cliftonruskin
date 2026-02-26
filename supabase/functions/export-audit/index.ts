import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const INTERNAL_ROLES = [
  "fvc_analyst", "fvc_ops_admin", "fvc_assurance_manager",
  "fvc_assurance_officer", "fvc_assurance_lead", "fvc_quality_reviewer",
];

const EXPORT_ROLES = [
  ...INTERNAL_ROLES,
  "client_admin", "client_requester",
];

/** Simple in-memory rate limiter: max 10 exports per user per 5 minutes */
const rateBuckets = new Map<string, { count: number; windowStart: number }>();
const RATE_WINDOW_MS = 5 * 60 * 1000;
const RATE_LIMIT = 10;

function checkRateLimit(userId: string): boolean {
  const now = Date.now();
  const bucket = rateBuckets.get(userId);
  if (!bucket || now - bucket.windowStart > RATE_WINDOW_MS) {
    rateBuckets.set(userId, { count: 1, windowStart: now });
    return true;
  }
  if (bucket.count >= RATE_LIMIT) return false;
  bucket.count++;
  return true;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing auth" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { entity_id, export_type, format } = await req.json();

    if (!entity_id || typeof entity_id !== "string") {
      return new Response(JSON.stringify({ error: "entity_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    // Fetch roles
    const { data: roles } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id);

    const roleList = (roles || []).map((r: any) => r.role as string);
    const canExport = roleList.some((r) => EXPORT_ROLES.includes(r));

    if (!canExport) {
      return new Response(JSON.stringify({ error: "Forbidden: insufficient role for export" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Rate limit
    if (!checkRateLimit(user.id)) {
      return new Response(JSON.stringify({ error: "Rate limit exceeded. Please wait before exporting again." }), {
        status: 429,
        headers: { ...corsHeaders, "Content-Type": "application/json", "Retry-After": "300" },
      });
    }

    // Verify entity access: entity must belong to user's org (clients) or user is internal
    const isInternal = roleList.some((r) => INTERNAL_ROLES.includes(r));

    if (!isInternal) {
      const { data: profile } = await adminClient
        .from("profiles")
        .select("org_id")
        .eq("user_id", user.id)
        .single();

      if (!profile?.org_id) {
        return new Response(JSON.stringify({ error: "Forbidden: no org" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: entity } = await adminClient
        .from("entities")
        .select("id")
        .eq("id", entity_id)
        .eq("org_id", profile.org_id)
        .maybeSingle();

      if (!entity) {
        return new Response(JSON.stringify({ error: "Forbidden: entity not in your organisation" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Log the export to audit_events
    await adminClient.from("audit_events").insert({
      object_type: "entity",
      object_id: entity_id,
      action_type: "ownership_export",
      user_id: user.id,
      metadata: {
        export_type: export_type || "ownership_structure",
        format: format || "png",
        timestamp: new Date().toISOString(),
      },
    });

    // Log to billing_events for invoicing + check feature flag
    const { data: userProfile } = await adminClient
      .from("profiles")
      .select("org_id")
      .eq("user_id", user.id)
      .single();

    if (userProfile?.org_id) {
      // Billing event
      await adminClient.from("billing_events").insert({
        org_id: userProfile.org_id,
        feature_key: export_type || "ownership_structure_intelligence",
        event_type: "export",
        entity_id: entity_id,
        performed_by: user.id,
        metadata: { format: format || "png" },
      });

      // Check feature flag
      const { data: flag } = await adminClient
        .from("org_feature_flags")
        .select("enabled")
        .eq("org_id", userProfile.org_id)
        .eq("feature_key", "ownership_structure_intelligence")
        .maybeSingle();

      if (flag && !flag.enabled) {
        return new Response(JSON.stringify({ error: "Feature not enabled for your organisation" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    return new Response(JSON.stringify({ allowed: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
