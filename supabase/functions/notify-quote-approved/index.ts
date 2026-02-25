import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { Resend } from "npm:resend@2.0.0";

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
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) throw new Error("RESEND_API_KEY is not configured");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: corsHeaders,
      });
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const supabaseUser = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: claims, error: claimsErr } = await supabaseUser.auth.getClaims(
      authHeader.replace("Bearer ", "")
    );
    if (claimsErr || !claims?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: corsHeaders,
      });
    }

    const { case_id, total_price, entity_name, approved_by_name } = await req.json();

    // Get case org
    const { data: caseData } = await supabaseAdmin
      .from("cases")
      .select("org_id")
      .eq("id", case_id)
      .single();

    if (!caseData) throw new Error("Case not found");

    const { data: org } = await supabaseAdmin
      .from("organisations")
      .select("name")
      .eq("id", caseData.org_id)
      .single();

    // Find all internal (FVC) users
    const { data: internalRoles } = await supabaseAdmin
      .from("user_roles")
      .select("user_id")
      .in("role", [
        "fvc_analyst",
        "fvc_ops_admin",
        "fvc_assurance_manager",
        "fvc_assurance_officer",
        "fvc_assurance_lead",
        "fvc_quality_reviewer",
      ]);

    if (!internalRoles || internalRoles.length === 0) {
      return new Response(JSON.stringify({ sent: 0 }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const uniqueIds = [...new Set(internalRoles.map((r: any) => r.user_id))];

    const { data: internalUsers } = await supabaseAdmin
      .from("profiles")
      .select("email, full_name")
      .in("user_id", uniqueIds);

    if (!internalUsers || internalUsers.length === 0) {
      return new Response(JSON.stringify({ sent: 0 }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const resend = new Resend(RESEND_API_KEY);

    let sent = 0;
    for (const staff of internalUsers) {
      const { error } = await resend.emails.send({
        from: "FV&C Platform <onboarding@resend.dev>",
        to: [staff.email],
        subject: `Quote approved – ${entity_name || "Case"} (${org?.name || ""})`,
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; padding: 32px 24px; background: #ffffff;">
            <h1 style="color: #1a1a2e; font-size: 20px; margin-bottom: 8px;">Quote Approved</h1>
            <hr style="border: none; border-top: 2px solid #c9a962; margin: 16px 0;" />
            <p style="color: #444; font-size: 14px; line-height: 1.6;">
              Hi ${staff.full_name || "there"},
            </p>
            <p style="color: #444; font-size: 14px; line-height: 1.6;">
              The quote for <strong>${entity_name || "a case"}</strong> has been approved by <strong>${approved_by_name || "a Client Admin"}</strong>.
            </p>
            <table style="width: 100%; margin: 20px 0; border-collapse: collapse;">
              <tr>
                <td style="color: #666; font-size: 13px; padding: 8px 0;">Organisation</td>
                <td style="color: #1a1a2e; font-size: 13px; padding: 8px 0; text-align: right; font-weight: 600;">${org?.name || "—"}</td>
              </tr>
              <tr>
                <td style="color: #666; font-size: 13px; padding: 8px 0;">Entity</td>
                <td style="color: #1a1a2e; font-size: 13px; padding: 8px 0; text-align: right; font-weight: 600;">${entity_name || "—"}</td>
              </tr>
              <tr>
                <td style="color: #666; font-size: 13px; padding: 8px 0;">Approved Amount</td>
                <td style="color: #c9a962; font-size: 16px; padding: 8px 0; text-align: right; font-weight: 700;">£${Number(total_price || 0).toLocaleString()}</td>
              </tr>
            </table>
            <p style="color: #444; font-size: 14px; line-height: 1.6;">
              The case is now ready for assignment. Please log in to the platform to proceed.
            </p>
            <p style="color: #999; font-size: 12px; margin-top: 32px;">
              This is an automated notification from the FV&C platform.
            </p>
          </div>
        `,
      });
      if (!error) sent++;
    }

    return new Response(JSON.stringify({ sent }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("notify-quote-approved error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
