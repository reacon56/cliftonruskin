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

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  const today = new Date().toISOString().split("T")[0];
  const in30 = new Date(Date.now() + 30 * 86400000).toISOString().split("T")[0];

  // Find entities with reviews due soon or overdue
  const { data: entities, error } = await supabase
    .from("entities")
    .select("id, name, org_id, next_review_date, risk_tier, owner_user_id")
    .not("next_review_date", "is", null)
    .lte("next_review_date", in30)
    .eq("status", "active");

  if (error) {
    console.error("Failed to fetch entities:", error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const results: any[] = [];

  for (const entity of entities ?? []) {
    const isOverdue = entity.next_review_date < today;
    const reminderType = isOverdue ? "overdue" : "due_soon";

    // Check if we already sent this reminder today
    const { data: existing } = await supabase
      .from("review_reminders")
      .select("id")
      .eq("entity_id", entity.id)
      .eq("reminder_type", reminderType)
      .eq("sent_date", today)
      .limit(1);

    if (existing && existing.length > 0) continue;

    // Look up the owner's email for the notification
    let recipientEmail: string | null = null;
    if (entity.owner_user_id) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("email")
        .eq("user_id", entity.owner_user_id)
        .single();
      recipientEmail = profile?.email ?? null;
    }

    // If no owner, find any client_admin in the org
    if (!recipientEmail) {
      const { data: orgProfiles } = await supabase
        .from("profiles")
        .select("email, user_id")
        .eq("org_id", entity.org_id);

      for (const p of orgProfiles ?? []) {
        const { data: roles } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", p.user_id)
          .eq("role", "client_admin")
          .limit(1);
        if (roles && roles.length > 0) {
          recipientEmail = p.email;
          break;
        }
      }
    }

    const daysUntil = Math.ceil(
      (new Date(entity.next_review_date).getTime() - Date.now()) / 86400000
    );

    // === MOCK EMAIL — replace with Resend when ready ===
    const emailSubject = isOverdue
      ? `⚠️ Review overdue: ${entity.name} (${Math.abs(daysUntil)} days)`
      : `📋 Review due soon: ${entity.name} (${daysUntil} days)`;

    const emailBody = isOverdue
      ? `The review for ${entity.name} (Tier ${entity.risk_tier}) was due on ${entity.next_review_date} and is now ${Math.abs(daysUntil)} days overdue. Please commission a review as soon as possible.`
      : `The review for ${entity.name} (Tier ${entity.risk_tier}) is due on ${entity.next_review_date} (${daysUntil} days from now). Consider commissioning a review soon.`;

    console.log("📧 MOCK EMAIL NOTIFICATION");
    console.log(`   To: ${recipientEmail ?? "no recipient found"}`);
    console.log(`   Subject: ${emailSubject}`);
    console.log(`   Body: ${emailBody}`);
    console.log("---");

    // Log the reminder to prevent duplicates
    await supabase.from("review_reminders").insert({
      entity_id: entity.id,
      org_id: entity.org_id,
      reminder_type: reminderType,
      recipient_email: recipientEmail,
    });

    results.push({
      entity: entity.name,
      type: reminderType,
      recipient: recipientEmail,
      days: daysUntil,
    });
  }

  console.log(`✅ Processed ${results.length} review reminders`);

  return new Response(
    JSON.stringify({ processed: results.length, reminders: results }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
});
