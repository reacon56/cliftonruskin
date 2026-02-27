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

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const body = await req.json().catch(() => ({}));
    const sourceId: string | undefined = body.source_id;

    // Fetch enabled sources (or a specific one)
    let query = supabase.from("data_source").select("*").eq("is_active", true);
    if (sourceId) {
      query = supabase.from("data_source").select("*").eq("id", sourceId);
    }
    const { data: sources, error: srcErr } = await query;
    if (srcErr) throw srcErr;

    const results: Array<{
      source_id: string;
      source_name: string;
      status: string;
      records_processed: number;
      records_changed: number;
    }> = [];

    for (const source of sources || []) {
      // Create ingestion_run record
      const { data: run, error: runErr } = await supabase
        .from("ingestion_run")
        .insert({
          data_source_id: source.id,
          status: "running",
          records_processed: 0,
          records_changed: 0,
          metadata: {
            source_type: source.source_type,
            expected_format: source.expected_format,
            urls: source.urls,
            triggered_at: new Date().toISOString(),
          },
        })
        .select()
        .single();

      if (runErr) {
        console.error(`Failed to create run for ${source.name}:`, runErr);
        continue;
      }

      let status = "completed";
      let recordsProcessed = 0;
      let recordsChanged = 0;

      try {
        // Placeholder: iterate URLs and simulate processing
        // In production, this would fetch, parse, diff, and upsert indicators
        const urls: string[] = source.urls || [];
        for (const url of urls) {
          console.log(`[${source.name}] Would process: ${url} (${source.source_type} / ${source.expected_format})`);
          recordsProcessed++;
        }

        // If no URLs configured, note it
        if (urls.length === 0 && source.base_url) {
          console.log(`[${source.name}] Would process base_url: ${source.base_url}`);
          recordsProcessed = 1;
        }
      } catch (procErr) {
        console.error(`[${source.name}] Processing error:`, procErr);
        status = "failed";

        // Log error
        await supabase.from("ingestion_error").insert({
          ingestion_run_id: run.id,
          error_message: procErr instanceof Error ? procErr.message : String(procErr),
          error_detail: { stack: procErr instanceof Error ? procErr.stack : null },
        });
      }

      // Update run record
      await supabase
        .from("ingestion_run")
        .update({
          status,
          finished_at: new Date().toISOString(),
          records_processed: recordsProcessed,
          records_changed: recordsChanged,
        })
        .eq("id", run.id);

      // Update source last_run info
      await supabase
        .from("data_source")
        .update({
          last_run_at: new Date().toISOString(),
          last_run_status: status,
        })
        .eq("id", source.id);

      results.push({
        source_id: source.id,
        source_name: source.name,
        status,
        records_processed: recordsProcessed,
        records_changed: recordsChanged,
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        runs: results,
        records_processed: results.reduce((s, r) => s + r.records_processed, 0),
        records_changed: results.reduce((s, r) => s + r.records_changed, 0),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Ingestion runner error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : String(error) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
