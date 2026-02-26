import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/** All internal (CR) roles that should have cross-org access */
const INTERNAL_ROLES = [
  "fvc_analyst",
  "fvc_ops_admin",
  "fvc_assurance_manager",
  "fvc_assurance_officer",
  "fvc_assurance_lead",
  "fvc_quality_reviewer",
];

const CLIENT_ROLES = ["client_admin", "client_requester", "client_auditor"];

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

    // Authenticate user via JWT
    const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });

    const {
      data: { user },
      error: userError,
    } = await userClient.auth.getUser();

    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { bucket, path } = await req.json();

    if (!bucket || !path || typeof bucket !== "string" || typeof path !== "string") {
      return new Response(JSON.stringify({ error: "bucket and path required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Prevent path traversal
    if (path.includes("..") || path.startsWith("/")) {
      return new Response(JSON.stringify({ error: "Invalid path" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    // Fetch user roles once
    const { data: roles } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id);

    const roleList = (roles || []).map((r: any) => r.role as string);
    const isInternal = roleList.some((r) => INTERNAL_ROLES.includes(r));
    const isClient = roleList.some((r) => CLIENT_ROLES.includes(r));
    const isPartner = roleList.includes("partner");

    // Fetch user's org_id for org-scoping checks
    let userOrgId: string | null = null;
    if (isClient) {
      const { data: profile } = await adminClient
        .from("profiles")
        .select("org_id")
        .eq("user_id", user.id)
        .single();
      userOrgId = profile?.org_id ?? null;
    }

    /* ── Bucket-specific authorization ── */

    if (bucket === "partner-evidence") {
      if (!isInternal && !isPartner) {
        return new Response(JSON.stringify({ error: "Forbidden" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Partners: verify the task belongs to them
      if (isPartner && !isInternal) {
        const taskId = path.split("/")[0];
        if (!taskId) {
          return new Response(JSON.stringify({ error: "Forbidden" }), {
            status: 403,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const { data: task } = await adminClient
          .from("partner_tasks")
          .select("id")
          .eq("id", taskId)
          .eq("partner_user_id", user.id)
          .single();

        if (!task) {
          return new Response(JSON.stringify({ error: "Forbidden" }), {
            status: 403,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      }
    } else if (bucket === "deliverables") {
      if (!isInternal && !isClient) {
        return new Response(JSON.stringify({ error: "Forbidden" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Clients: verify the deliverable belongs to their org via case → entity → org
      if (isClient && !isInternal) {
        if (!userOrgId) {
          return new Response(JSON.stringify({ error: "Forbidden: no org" }), {
            status: 403,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        // Path format: {caseId}/{filename} or {deliverableId}/{filename}
        const objectId = path.split("/")[0];
        if (!objectId) {
          return new Response(JSON.stringify({ error: "Forbidden" }), {
            status: 403,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        // Check if this case belongs to the user's org
        const { data: caseRow } = await adminClient
          .from("cases")
          .select("id")
          .eq("id", objectId)
          .eq("org_id", userOrgId)
          .maybeSingle();

        // Also check deliverables table → case → org
        if (!caseRow) {
          const { data: delivRow } = await adminClient
            .from("deliverables")
            .select("case_id, cases!inner(org_id)")
            .eq("id", objectId)
            .maybeSingle();

          const delivOrgId = (delivRow as any)?.cases?.org_id;
          if (!delivRow || delivOrgId !== userOrgId) {
            return new Response(JSON.stringify({ error: "Forbidden" }), {
              status: 403,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
          }
        }
      }
    } else {
      return new Response(JSON.stringify({ error: "Unknown bucket" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Generate signed URL (valid for 1 hour)
    const { data, error } = await adminClient.storage
      .from(bucket)
      .createSignedUrl(path, 3600);

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ signedUrl: data.signedUrl }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
