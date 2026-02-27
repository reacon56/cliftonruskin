import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/**
 * Canonicalise a country input to a jurisdiction record.
 * Resolution: ISO code → country_name → jurisdiction_alias → null
 */
function canonicalise(
  input: string,
  jurisdictions: Array<{ id: string; country_code: string; country_name: string }>,
  aliases: Array<{ jurisdiction_id: string; alias_name: string }>
): { id: string; country_code: string } | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  const upper = trimmed.toUpperCase();
  const lower = trimmed.toLowerCase();

  // 1. Exact ISO2 code
  const byCode = jurisdictions.find((j) => j.country_code.toUpperCase() === upper);
  if (byCode) return { id: byCode.id, country_code: byCode.country_code };

  // 2. Country name (case-insensitive)
  const byName = jurisdictions.find((j) => j.country_name.toLowerCase() === lower);
  if (byName) return { id: byName.id, country_code: byName.country_code };

  // 3. Alias (case-insensitive)
  const aliasMatch = aliases.find((a) => a.alias_name.toLowerCase() === lower);
  if (aliasMatch) {
    const j = jurisdictions.find((j) => j.id === aliasMatch.jurisdiction_id);
    if (j) return { id: j.id, country_code: j.country_code };
  }

  return null;
}

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

    // Pre-load canonicalisation lookup tables
    const [jurisdictionsRes, aliasesRes] = await Promise.all([
      supabase.from("jurisdiction").select("id, country_code, country_name"),
      supabase.from("jurisdiction_alias").select("jurisdiction_id, alias_name"),
    ]);
    const jurisdictions = jurisdictionsRes.data || [];
    const aliases = aliasesRes.data || [];

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
      const unmappedCountries: string[] = [];

      try {
        // Process URLs — in production this fetches, parses, and upserts indicators.
        // Each parsed record with a country field goes through canonicalisation.
        const urls: string[] = source.urls || [];
        for (const url of urls) {
          console.log(`[${source.name}] Processing: ${url} (${source.source_type} / ${source.expected_format})`);
          recordsProcessed++;

          // --- Canonicalisation demo ---
          // In a real pipeline, each parsed row would contain a country_name field.
          // Example: simulate extracting country names from fetched data.
          // For now we demonstrate the lookup path; real implementation would
          // replace this with actual parsed records.
          //
          // const parsedRows = await fetchAndParse(url, source);
          // for (const row of parsedRows) {
          //   const match = canonicalise(row.country_name, jurisdictions, aliases);
          //   if (!match) {
          //     unmappedCountries.push(row.country_name);
          //     continue; // skip unmapped
          //   }
          //   // upsert indicator for match.id ...
          //   recordsChanged++;
          // }
        }

        if (urls.length === 0 && source.base_url) {
          console.log(`[${source.name}] Would process base_url: ${source.base_url}`);
          recordsProcessed = 1;
        }

        // Log unmapped country errors
        for (const country of unmappedCountries) {
          await supabase.from("ingestion_error").insert({
            ingestion_run_id: run.id,
            error_message: `Unmapped country name: "${country}"`,
            error_detail: {
              country_name: country,
              resolution_steps: [
                "1. Check jurisdiction table for typo",
                "2. Add entry to jurisdiction_alias",
                "3. Or create new jurisdiction record",
              ],
            },
          });
        }

        if (unmappedCountries.length > 0) {
          console.warn(
            `[${source.name}] ${unmappedCountries.length} unmapped countries: ${unmappedCountries.join(", ")}`
          );
        }
      } catch (procErr) {
        console.error(`[${source.name}] Processing error:`, procErr);
        status = "failed";

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
