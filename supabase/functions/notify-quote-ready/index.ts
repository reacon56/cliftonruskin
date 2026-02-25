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

    // Verify caller
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

    const { case_id, total_price, entity_name } = await req.json();

    // Get org_id from the case
    const { data: caseData } = await supabaseAdmin
      .from("cases")
      .select("org_id")
      .eq("id", case_id)
      .single();

    if (!caseData) throw new Error("Case not found");

    // Get org name
    const { data: org } = await supabaseAdmin
      .from("organisations")
      .select("name")
      .eq("id", caseData.org_id)
      .single();

    // Find all client_admin users in this org
    const { data: admins } = await supabaseAdmin
      .from("profiles")
      .select("email, full_name, user_id")
      .eq("org_id", caseData.org_id);

    if (!admins || admins.length === 0) {
      return new Response(JSON.stringify({ sent: 0 }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Filter to client_admin role
    const { data: adminRoles } = await supabaseAdmin
      .from("user_roles")
      .select("user_id")
      .eq("role", "client_admin")
      .in("user_id", admins.map((a: any) => a.user_id));

    const adminUserIds = new Set((adminRoles || []).map((r: any) => r.user_id));
    const recipients = admins.filter((a: any) => adminUserIds.has(a.user_id));

    if (recipients.length === 0) {
      return new Response(JSON.stringify({ sent: 0 }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const resend = new Resend(RESEND_API_KEY);

    let sent = 0;
    for (const admin of recipients) {
      const { error } = await resend.emails.send({
        from: "Clifton Ruskin <onboarding@resend.dev>",
        to: [admin.email],
        subject: `Quote ready for approval – ${entity_name || "New Case"}`,
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; padding: 32px 24px; background: #ffffff;">
            <h1 style="color: #1a1a2e; font-size: 20px; margin-bottom: 8px;">Quote Ready for Your Approval</h1>
            <hr style="border: none; border-top: 2px solid #c9a962; margin: 16px 0;" />
            <p style="color: #444; font-size: 14px; line-height: 1.6;">
              Hi ${admin.full_name || "there"},
            </p>
            <p style="color: #444; font-size: 14px; line-height: 1.6;">
              A new quote has been prepared for <strong>${entity_name || "your entity"}</strong> and is awaiting your review.
            </p>
            <table style="width: 100%; margin: 20px 0; border-collapse: collapse;">
              <tr>
                <td style="color: #666; font-size: 13px; padding: 8px 0;">Organisation</td>
                <td style="color: #1a1a2e; font-size: 13px; padding: 8px 0; text-align: right; font-weight: 600;">${org?.name || "—"}</td>
              </tr>
              <tr>
                <td style="color: #666; font-size: 13px; padding: 8px 0;">Total Price</td>
                <td style="color: #c9a962; font-size: 16px; padding: 8px 0; text-align: right; font-weight: 700;">£${Number(total_price || 0).toLocaleString()}</td>
              </tr>
            </table>
            <p style="color: #444; font-size: 14px; line-height: 1.6;">
              Please log in to the platform to review and approve or reject this quote.
            </p>
            <p style="color: #999; font-size: 12px; margin-top: 32px;">
              This is an automated notification from the Clifton Ruskin platform.
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
    console.error("notify-quote-ready error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
