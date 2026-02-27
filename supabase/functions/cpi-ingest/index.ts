import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/**
 * CPI Ingestion Edge Function
 *
 * Accepts a CSV payload (inline or via URL) with columns:
 *   country, country_code (ISO-2 or ISO-3), cpi_score, year, rank (optional)
 *
 * Stores each row as a CPI_SCORE jurisdiction_indicator with
 * value_json = { score, year, rank, source }.
 *
 * Diffs against existing values and logs changes.
 */

// ── ISO-3 → ISO-2 fallback mapping (common codes) ──
const ISO3_TO_ISO2: Record<string, string> = {
  AFG: "AF", ALB: "AL", DZA: "DZ", AGO: "AO", ARG: "AR", ARM: "AM",
  AUS: "AU", AUT: "AT", AZE: "AZ", BHS: "BS", BHR: "BH", BGD: "BD",
  BRB: "BB", BLR: "BY", BEL: "BE", BLZ: "BZ", BEN: "BJ", BTN: "BT",
  BOL: "BO", BIH: "BA", BWA: "BW", BRA: "BR", BRN: "BN", BGR: "BG",
  BFA: "BF", BDI: "BI", KHM: "KH", CMR: "CM", CAN: "CA", CPV: "CV",
  CAF: "CF", TCD: "TD", CHL: "CL", CHN: "CN", COL: "CO", COM: "KM",
  COG: "CG", COD: "CD", CRI: "CR", CIV: "CI", HRV: "HR", CUB: "CU",
  CYP: "CY", CZE: "CZ", DNK: "DK", DJI: "DJ", DOM: "DO", ECU: "EC",
  EGY: "EG", SLV: "SV", GNQ: "GQ", ERI: "ER", EST: "EE", SWZ: "SZ",
  ETH: "ET", FJI: "FJ", FIN: "FI", FRA: "FR", GAB: "GA", GMB: "GM",
  GEO: "GE", DEU: "DE", GHA: "GH", GRC: "GR", GTM: "GT", GIN: "GN",
  GNB: "GW", GUY: "GY", HTI: "HT", HND: "HN", HUN: "HU", ISL: "IS",
  IND: "IN", IDN: "ID", IRN: "IR", IRQ: "IQ", IRL: "IE", ISR: "IL",
  ITA: "IT", JAM: "JM", JPN: "JP", JOR: "JO", KAZ: "KZ", KEN: "KE",
  KWT: "KW", KGZ: "KG", LAO: "LA", LVA: "LV", LBN: "LB", LSO: "LS",
  LBR: "LR", LBY: "LY", LTU: "LT", LUX: "LU", MDG: "MG", MWI: "MW",
  MYS: "MY", MDV: "MV", MLI: "ML", MLT: "MT", MRT: "MR", MUS: "MU",
  MEX: "MX", MDA: "MD", MNG: "MN", MNE: "ME", MAR: "MA", MOZ: "MZ",
  MMR: "MM", NAM: "NA", NPL: "NP", NLD: "NL", NZL: "NZ", NIC: "NI",
  NER: "NE", NGA: "NG", PRK: "KP", MKD: "MK", NOR: "NO", OMN: "OM",
  PAK: "PK", PAN: "PA", PNG: "PG", PRY: "PY", PER: "PE", PHL: "PH",
  POL: "PL", PRT: "PT", QAT: "QA", ROU: "RO", RUS: "RU", RWA: "RW",
  SAU: "SA", SEN: "SN", SRB: "RS", SLE: "SL", SGP: "SG", SVK: "SK",
  SVN: "SI", SLB: "SB", SOM: "SO", ZAF: "ZA", KOR: "KR", SSD: "SS",
  ESP: "ES", LKA: "LK", SDN: "SD", SUR: "SR", SWE: "SE", CHE: "CH",
  SYR: "SY", TWN: "TW", TJK: "TJ", TZA: "TZ", THA: "TH", TLS: "TL",
  TGO: "TG", TON: "TO", TTO: "TT", TUN: "TN", TUR: "TR", TKM: "TM",
  UGA: "UG", UKR: "UA", ARE: "AE", GBR: "GB", USA: "US", URY: "UY",
  UZB: "UZ", VUT: "VU", VEN: "VE", VNM: "VN", YEM: "YE", ZMB: "ZM",
  ZWE: "ZW", HKG: "HK", MAC: "MO",
};

function resolveToIso2(code: string): string | null {
  if (!code) return null;
  const trimmed = code.trim().toUpperCase();
  if (trimmed.length === 2) return trimmed;
  if (trimmed.length === 3 && ISO3_TO_ISO2[trimmed]) return ISO3_TO_ISO2[trimmed];
  return null;
}

async function computeHash(content: string): Promise<string> {
  const data = new TextEncoder().encode(content);
  const buf = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (i + 1 < line.length && line[i + 1] === '"') { current += '"'; i++; }
        else inQuotes = false;
      } else current += ch;
    } else {
      if (ch === '"') inQuotes = true;
      else if (ch === ",") { result.push(current); current = ""; }
      else current += ch;
    }
  }
  result.push(current);
  return result;
}

interface CpiRow {
  countryCode: string; // ISO-2
  countryName: string;
  score: number;
  year: number;
  rank: number | null;
}

function parseCSV(csvText: string): CpiRow[] {
  const lines = csvText.split("\n").map((l) => l.trim()).filter(Boolean);
  if (lines.length < 2) return [];

  const headers = parseCSVLine(lines[0]).map((h) => h.trim().toLowerCase().replace(/[^a-z0-9_]/g, "_"));

  // Find relevant columns by fuzzy matching
  const colCode = headers.findIndex((h) => h.includes("code") || h === "iso" || h === "iso3" || h === "iso2" || h === "country_code");
  const colCountry = headers.findIndex((h) => h.includes("country") && !h.includes("code"));
  const colScore = headers.findIndex((h) => h.includes("score") || h.includes("cpi"));
  const colYear = headers.findIndex((h) => h.includes("year"));
  const colRank = headers.findIndex((h) => h.includes("rank"));

  if (colScore === -1) {
    throw new Error("CSV must contain a 'score' or 'cpi' column");
  }

  const rows: CpiRow[] = [];

  for (let i = 1; i < lines.length; i++) {
    const vals = parseCSVLine(lines[i]);
    const rawCode = colCode >= 0 ? vals[colCode]?.trim() : "";
    const countryName = colCountry >= 0 ? vals[colCountry]?.trim() : rawCode;
    const scoreStr = vals[colScore]?.trim();
    const yearStr = colYear >= 0 ? vals[colYear]?.trim() : "";
    const rankStr = colRank >= 0 ? vals[colRank]?.trim() : "";

    const code = resolveToIso2(rawCode);
    if (!code) continue;

    const score = parseFloat(scoreStr);
    if (isNaN(score)) continue;

    const year = yearStr ? parseInt(yearStr, 10) : new Date().getFullYear();
    const rank = rankStr ? parseInt(rankStr, 10) : null;

    rows.push({ countryCode: code, countryName: countryName || code, score, year, rank: isNaN(rank as any) ? null : rank });
  }

  return rows;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceRoleKey);

  const body = await req.json().catch(() => ({}));
  const dataSourceId: string | undefined = body.data_source_id;
  const csvPayload: string | undefined = body.csv; // inline CSV text
  const csvUrl: string | undefined = body.csv_url;  // or fetch from URL
  const uploadYear: number | undefined = body.year;

  // Create ingestion run
  const { data: run, error: runErr } = await supabase
    .from("ingestion_run")
    .insert({
      data_source_id: dataSourceId || null,
      status: "running",
      records_processed: 0,
      records_changed: 0,
      metadata: { connector: "cpi", triggered_at: new Date().toISOString(), year: uploadYear },
    })
    .select()
    .single();

  if (runErr) {
    return new Response(
      JSON.stringify({ success: false, error: runErr.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const runId = run.id;
  let totalProcessed = 0;
  let totalChanged = 0;

  try {
    // ── 1. Get CSV data ──
    let csvText: string;
    if (csvPayload) {
      csvText = csvPayload;
    } else if (csvUrl) {
      console.log("[CPI] Fetching CSV from URL…");
      const resp = await fetch(csvUrl, { headers: { "User-Agent": "CliftonRuskin-CPIIngest/1.0" } });
      if (!resp.ok) throw new Error(`HTTP ${resp.status} fetching CPI CSV`);
      csvText = await resp.text();
    } else {
      throw new Error("Provide either 'csv' (inline text) or 'csv_url' in the request body");
    }

    const snapshotHash = await computeHash(csvText);
    const rows = parseCSV(csvText);
    console.log(`[CPI] Parsed ${rows.length} rows`);

    if (rows.length === 0) {
      throw new Error("No valid CPI rows found in CSV. Expected columns: country_code, score, year (optional)");
    }

    // Override year if provided
    if (uploadYear) {
      for (const r of rows) r.year = uploadYear;
    }

    const today = new Date().toISOString().split("T")[0];

    // ── 2. Get existing CPI indicators ──
    const { data: existingIndicators } = await supabase
      .from("jurisdiction_indicator")
      .select("*, jurisdiction:jurisdiction_id(country_code)")
      .eq("indicator_type", "CPI_SCORE");

    const existingByCode: Record<string, any> = {};
    for (const ind of existingIndicators || []) {
      const code = (ind as any).jurisdiction?.country_code;
      if (code) existingByCode[code] = ind;
    }

    // ── 3. Process each row ──
    for (const row of rows) {
      // Ensure jurisdiction exists
      await supabase.from("jurisdiction").upsert(
        { country_code: row.countryCode, country_name: row.countryName },
        { onConflict: "country_code" }
      );

      const { data: jur } = await supabase
        .from("jurisdiction")
        .select("id")
        .eq("country_code", row.countryCode)
        .single();

      if (!jur) continue;

      const valueJson = {
        score: row.score,
        year: row.year,
        rank: row.rank,
        source: "Transparency International CPI",
        indicator_only: true, // Mark as indicator-only
      };

      const existing = existingByCode[row.countryCode];
      const oldScore = existing ? (existing.value_json as any)?.score : null;
      const oldYear = existing ? (existing.value_json as any)?.year : null;
      const isNew = !existing;
      const isChanged = existing && (oldScore !== row.score || oldYear !== row.year);

      const { data: indicator } = await supabase
        .from("jurisdiction_indicator")
        .upsert(
          {
            jurisdiction_id: jur.id,
            indicator_type: "CPI_SCORE",
            value_json: valueJson,
            effective_date: `${row.year}-01-01`,
            source_name: "Transparency International",
            source_url: csvUrl || null,
            source_snapshot_hash: snapshotHash,
            retrieved_at: new Date().toISOString(),
            ingestion_run_id: runId,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "jurisdiction_id,indicator_type" }
        )
        .select()
        .single();

      totalProcessed++;

      if (indicator && (isNew || isChanged)) {
        await supabase.from("jurisdiction_indicator_change").insert({
          jurisdiction_indicator_id: indicator.id,
          jurisdiction_id: jur.id,
          indicator_type: "CPI_SCORE",
          old_value_json: existing?.value_json || null,
          new_value_json: valueJson,
          old_effective_date: existing?.effective_date || null,
          new_effective_date: `${row.year}-01-01`,
          source_name: "Transparency International",
          source_url: csvUrl || null,
          source_snapshot_hash: snapshotHash,
          ingestion_run_id: runId,
        });
        totalChanged++;
      }
    }

    // ── 4. Finalize ──
    await supabase
      .from("ingestion_run")
      .update({
        status: "completed",
        finished_at: new Date().toISOString(),
        records_processed: totalProcessed,
        records_changed: totalChanged,
      })
      .eq("id", runId);

    if (dataSourceId) {
      await supabase
        .from("data_source")
        .update({ last_run_at: new Date().toISOString(), last_run_status: "completed" })
        .eq("id", dataSourceId);
    }

    console.log(`[CPI] Complete: ${totalProcessed} scores, ${totalChanged} changes`);

    return new Response(
      JSON.stringify({
        success: true,
        run_id: runId,
        records_processed: totalProcessed,
        records_changed: totalChanged,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[CPI] Fatal error:", error);

    await supabase.from("ingestion_error").insert({
      ingestion_run_id: runId,
      error_message: error instanceof Error ? error.message : String(error),
      error_detail: { stack: error instanceof Error ? error.stack : null },
    });

    await supabase
      .from("ingestion_run")
      .update({
        status: "failed",
        finished_at: new Date().toISOString(),
        records_processed: totalProcessed,
        records_changed: totalChanged,
      })
      .eq("id", runId);

    if (dataSourceId) {
      await supabase
        .from("data_source")
        .update({ last_run_at: new Date().toISOString(), last_run_status: "failed" })
        .eq("id", dataSourceId);
    }

    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : String(error) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
