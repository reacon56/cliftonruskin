import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// UK OFSI Consolidated List CSV download
const UK_SANCTIONS_CSV_URL =
  "https://assets.publishing.service.gov.uk/media/65ca53bf5702e4000e41fd52/UK_Sanctions_List.csv";

// ── Comprehensive vs targeted regime classification ──
// Regimes where the UK imposes economy-wide / near-total restrictions
const COMPREHENSIVE_REGIMES = new Set([
  "russia", "syria", "north korea", "dprk", "iran", "belarus", "myanmar", "burma",
  "libya", "cuba", "somalia", "south sudan", "yemen", "central african republic",
  "democratic republic of the congo", "drc", "mali", "guinea", "haiti",
  "nicaragua", "zimbabwe", "afghanistan",
]);

// ── Country name → ISO-2 mapping ──
const NAME_TO_ISO2: Record<string, string> = {
  "afghanistan": "AF", "albania": "AL", "algeria": "DZ", "angola": "AO",
  "argentina": "AR", "armenia": "AM", "azerbaijan": "AZ",
  "bahamas": "BS", "bahrain": "BH", "bangladesh": "BD", "barbados": "BB",
  "belarus": "BY", "belgium": "BE", "belize": "BZ", "benin": "BJ",
  "bolivia": "BO", "bosnia and herzegovina": "BA", "botswana": "BW",
  "brazil": "BR", "brunei": "BN", "bulgaria": "BG", "burkina faso": "BF",
  "burma": "MM", "myanmar": "MM", "burundi": "BI",
  "cambodia": "KH", "cameroon": "CM", "canada": "CA",
  "central african republic": "CF", "chad": "TD", "chile": "CL",
  "china": "CN", "colombia": "CO", "comoros": "KM", "congo": "CG",
  "costa rica": "CR", "croatia": "HR", "cuba": "CU", "cyprus": "CY",
  "czech republic": "CZ", "czechia": "CZ",
  "côte d'ivoire": "CI", "cote d'ivoire": "CI", "ivory coast": "CI",
  "democratic republic of the congo": "CD", "drc": "CD",
  "denmark": "DK", "djibouti": "DJ", "dominican republic": "DO",
  "ecuador": "EC", "egypt": "EG", "el salvador": "SV",
  "equatorial guinea": "GQ", "eritrea": "ER", "estonia": "EE",
  "ethiopia": "ET", "fiji": "FJ", "finland": "FI", "france": "FR",
  "gabon": "GA", "gambia": "GM", "georgia": "GE", "germany": "DE",
  "ghana": "GH", "greece": "GR", "guatemala": "GT", "guinea": "GN",
  "guinea-bissau": "GW", "guyana": "GY", "haiti": "HT", "honduras": "HN",
  "hong kong": "HK", "hungary": "HU", "iceland": "IS", "india": "IN",
  "indonesia": "ID", "iran": "IR", "iraq": "IQ", "ireland": "IE",
  "israel": "IL", "italy": "IT", "jamaica": "JM", "japan": "JP",
  "jordan": "JO", "kazakhstan": "KZ", "kenya": "KE", "kuwait": "KW",
  "kyrgyzstan": "KG", "laos": "LA", "latvia": "LV", "lebanon": "LB",
  "lesotho": "LS", "liberia": "LR", "libya": "LY", "liechtenstein": "LI",
  "lithuania": "LT", "luxembourg": "LU",
  "madagascar": "MG", "malawi": "MW", "malaysia": "MY", "maldives": "MV",
  "mali": "ML", "malta": "MT", "mauritania": "MR", "mauritius": "MU",
  "mexico": "MX", "moldova": "MD", "mongolia": "MN", "montenegro": "ME",
  "morocco": "MA", "mozambique": "MZ", "namibia": "NA", "nepal": "NP",
  "netherlands": "NL", "new zealand": "NZ", "nicaragua": "NI",
  "niger": "NE", "nigeria": "NG", "north korea": "KP", "dprk": "KP",
  "north macedonia": "MK", "norway": "NO", "oman": "OM",
  "pakistan": "PK", "panama": "PA", "papua new guinea": "PG",
  "paraguay": "PY", "peru": "PE", "philippines": "PH", "poland": "PL",
  "portugal": "PT", "qatar": "QA", "romania": "RO",
  "russia": "RU", "russian federation": "RU", "rwanda": "RW",
  "saudi arabia": "SA", "senegal": "SN", "serbia": "RS",
  "sierra leone": "SL", "singapore": "SG", "slovakia": "SK",
  "slovenia": "SI", "somalia": "SO", "south africa": "ZA",
  "south korea": "KR", "south sudan": "SS", "spain": "ES",
  "sri lanka": "LK", "sudan": "SD", "suriname": "SR", "sweden": "SE",
  "switzerland": "CH", "syria": "SY", "syrian arab republic": "SY",
  "tajikistan": "TJ", "tanzania": "TZ", "thailand": "TH", "togo": "TG",
  "trinidad and tobago": "TT", "tunisia": "TN",
  "turkey": "TR", "türkiye": "TR", "turkiye": "TR",
  "turkmenistan": "TM", "uganda": "UG", "ukraine": "UA",
  "united arab emirates": "AE", "uae": "AE",
  "united kingdom": "GB", "uk": "GB",
  "united states": "US", "usa": "US",
  "uruguay": "UY", "uzbekistan": "UZ", "vanuatu": "VU",
  "venezuela": "VE", "vietnam": "VN", "viet nam": "VN",
  "yemen": "YE", "zambia": "ZM", "zimbabwe": "ZW",
  "hong kong, china": "HK", "british virgin islands": "VG",
  "jersey": "JE", "guernsey": "GG", "isle of man": "IM",
  "gibraltar": "GI", "bermuda": "BM", "cayman islands": "KY",
};

function resolveCountryCode(name: string): string | null {
  if (!name) return null;
  const cleaned = name.trim().toLowerCase().replace(/\s+/g, " ");
  // Direct match
  if (NAME_TO_ISO2[cleaned]) return NAME_TO_ISO2[cleaned];
  // Already an ISO-2 code?
  if (/^[A-Z]{2}$/.test(name.trim())) return name.trim();
  return null;
}

async function computeHash(content: string): Promise<string> {
  const data = new TextEncoder().encode(content);
  const buf = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Parse CSV rows. The UK Sanctions List CSV uses comma separation with quoted fields.
 * Key columns we care about:
 *   - "Group ID" (source entity identifier)
 *   - "Group Type" (Individual/Entity/Ship)
 *   - "Name 1" .. "Name 6" (name parts)
 *   - "Country" (nationality/association)
 *   - "Regime" (the sanctions regime name)
 *   - "Date Designated"
 *   - "Other Information"
 *   - "UK Sanctions List Date Designated"
 */
function parseCSV(text: string): Array<Record<string, string>> {
  const lines = text.split("\n");
  if (lines.length < 2) return [];

  // Parse header
  const headers = parseCSVLine(lines[0]);
  const rows: Array<Record<string, string>> = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const values = parseCSVLine(line);
    const row: Record<string, string> = {};
    for (let j = 0; j < headers.length; j++) {
      row[headers[j].trim()] = (values[j] || "").trim();
    }
    rows.push(row);
  }
  return rows;
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (i + 1 < line.length && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        current += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ",") {
        result.push(current);
        current = "";
      } else {
        current += ch;
      }
    }
  }
  result.push(current);
  return result;
}

/**
 * Classify regime type based on regime name.
 */
function classifyRegime(regimeName: string): "COMPREHENSIVE" | "TARGETED" | "NONE" {
  if (!regimeName) return "NONE";
  const lower = regimeName.toLowerCase();
  for (const r of COMPREHENSIVE_REGIMES) {
    if (lower.includes(r)) return "COMPREHENSIVE";
  }
  return "TARGETED";
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

  // Create ingestion run
  const { data: run, error: runErr } = await supabase
    .from("ingestion_run")
    .insert({
      data_source_id: dataSourceId || null,
      status: "running",
      records_processed: 0,
      records_changed: 0,
      metadata: { connector: "uk_sanctions", triggered_at: new Date().toISOString() },
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
    // ── 1. Fetch CSV ──
    console.log("[UK Sanctions] Fetching CSV…");
    const csvResponse = await fetch(UK_SANCTIONS_CSV_URL, {
      headers: { "User-Agent": "CliftonRuskin-SanctionsIngest/1.0" },
    });

    if (!csvResponse.ok) {
      throw new Error(`HTTP ${csvResponse.status} fetching UK Sanctions CSV`);
    }

    const csvText = await csvResponse.text();
    const snapshotHash = await computeHash(csvText);
    const rows = parseCSV(csvText);
    console.log(`[UK Sanctions] Parsed ${rows.length} rows`);

    // ── 2. Mark all existing UK_OFSI entities as potentially stale ──
    await supabase
      .from("sanctions_entity")
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq("source_list", "UK_OFSI");

    // ── 3. Process each row → sanctions_entity ──
    // Batch to avoid too many individual inserts
    const BATCH_SIZE = 100;
    const regimeCountryMap: Map<string, Set<string>> = new Map(); // regime → set of country codes

    // Find relevant column names (UK list column names vary slightly)
    const sampleRow = rows[0] || {};
    const colGroupId = Object.keys(sampleRow).find(k => k.toLowerCase().includes("group id")) || "Group ID";
    const colGroupType = Object.keys(sampleRow).find(k => k.toLowerCase().includes("group type")) || "Group Type";
    const colName1 = Object.keys(sampleRow).find(k => /^name\s*1$/i.test(k)) || "Name 1";
    const colName2 = Object.keys(sampleRow).find(k => /^name\s*2$/i.test(k)) || "Name 2";
    const colName3 = Object.keys(sampleRow).find(k => /^name\s*3$/i.test(k)) || "Name 3";
    const colName6 = Object.keys(sampleRow).find(k => /^name\s*6$/i.test(k)) || "Name 6";
    const colCountry = Object.keys(sampleRow).find(k => k.toLowerCase() === "country") || "Country";
    const colRegime = Object.keys(sampleRow).find(k => k.toLowerCase().includes("regime")) || "Regime";
    const colDateDesignated = Object.keys(sampleRow).find(k => k.toLowerCase().includes("date designated")) || "Date Designated";

    for (let batch = 0; batch < rows.length; batch += BATCH_SIZE) {
      const chunk = rows.slice(batch, batch + BATCH_SIZE);
      const entities: Array<Record<string, unknown>> = [];

      for (const row of chunk) {
        const groupId = row[colGroupId] || "";
        const groupType = row[colGroupType] || "Individual";
        const nameParts = [row[colName6], row[colName1], row[colName2], row[colName3]]
          .filter(Boolean)
          .join(" ")
          .trim();
        if (!nameParts) continue;

        const countryRaw = row[colCountry] || "";
        const regime = row[colRegime] || "";
        const dateDesignated = row[colDateDesignated] || "";

        // Resolve country codes
        const countryCodes: string[] = [];
        for (const part of countryRaw.split(/[,;\/]/).map(s => s.trim()).filter(Boolean)) {
          const code = resolveCountryCode(part);
          if (code) countryCodes.push(code);
        }

        // Track regime → countries for jurisdiction-level summary
        if (regime) {
          if (!regimeCountryMap.has(regime)) regimeCountryMap.set(regime, new Set());
          for (const cc of countryCodes) {
            regimeCountryMap.get(regime)!.add(cc);
          }
          // Also map regime name itself to a country if it's a country-based regime
          const regimeCode = resolveCountryCode(regime);
          if (regimeCode) {
            regimeCountryMap.get(regime)!.add(regimeCode);
          }
        }

        // Parse designation date
        let designationDate: string | null = null;
        if (dateDesignated) {
          const parsed = new Date(dateDesignated);
          if (!isNaN(parsed.getTime())) {
            designationDate = parsed.toISOString().split("T")[0];
          }
        }

        const regimeType = classifyRegime(regime);

        entities.push({
          source_list: "UK_OFSI",
          source_entity_id: groupId || null,
          entity_type: groupType.includes("Individual") ? "Individual" : "Entity",
          primary_name: nameParts.substring(0, 500),
          aliases: [],
          nationality_codes: [],
          country_codes: countryCodes,
          regime_name: regime || null,
          regime_type: regimeType,
          designation_date: designationDate,
          designation_source: "UK OFSI Consolidated List",
          raw_data: row,
          ingestion_run_id: runId,
          source_url: UK_SANCTIONS_CSV_URL,
          source_snapshot_hash: snapshotHash,
          retrieved_at: new Date().toISOString(),
          is_active: true,
          updated_at: new Date().toISOString(),
        });

        totalProcessed++;
      }

      if (entities.length > 0) {
        // Upsert by source_list + source_entity_id
        const { error: insertErr } = await supabase
          .from("sanctions_entity")
          .upsert(entities as any, {
            onConflict: "id",
            ignoreDuplicates: false,
          });

        if (insertErr) {
          console.error(`[UK Sanctions] Batch insert error:`, insertErr);
          await supabase.from("ingestion_error").insert({
            ingestion_run_id: runId,
            error_message: `Batch insert error at offset ${batch}: ${insertErr.message}`,
            error_detail: { batch_offset: batch, error: insertErr },
          });
        }
      }
    }

    console.log(`[UK Sanctions] Processed ${totalProcessed} entities across ${regimeCountryMap.size} regimes`);

    // ── 4. Derive SANCTIONS_UK_PROGRAMME indicators per country ──
    // Aggregate: for each country, determine if any comprehensive regime targets it
    const countryRegimeStatus: Map<string, "COMPREHENSIVE" | "TARGETED"> = new Map();

    for (const [regime, codes] of regimeCountryMap) {
      const type = classifyRegime(regime);
      for (const code of codes) {
        const current = countryRegimeStatus.get(code);
        // Comprehensive trumps targeted
        if (type === "COMPREHENSIVE" || !current) {
          countryRegimeStatus.set(code, type === "COMPREHENSIVE" ? "COMPREHENSIVE" : (current || "TARGETED"));
        }
      }
    }

    // Also derive from the regime name itself (e.g., "Russia" regime → RU)
    for (const [regime] of regimeCountryMap) {
      const code = resolveCountryCode(regime);
      if (code) {
        const type = classifyRegime(regime);
        const current = countryRegimeStatus.get(code);
        if (type === "COMPREHENSIVE" || !current) {
          countryRegimeStatus.set(code, type === "COMPREHENSIVE" ? "COMPREHENSIVE" : (current || "TARGETED"));
        }
      }
    }

    console.log(`[UK Sanctions] Derived indicators for ${countryRegimeStatus.size} countries`);

    // Get existing SANCTIONS_UK_PROGRAMME indicators
    const { data: existingIndicators } = await supabase
      .from("jurisdiction_indicator")
      .select("*, jurisdiction:jurisdiction_id(country_code)")
      .eq("indicator_type", "SANCTIONS_UK_PROGRAMME");

    const existingByCode: Record<string, any> = {};
    for (const ind of existingIndicators || []) {
      const code = (ind as any).jurisdiction?.country_code;
      if (code) existingByCode[code] = ind;
    }

    const today = new Date().toISOString().split("T")[0];
    const newCodes = new Set(countryRegimeStatus.keys());
    const existingCodes = new Set(Object.keys(existingByCode));

    // ADDED or CHANGED
    for (const [code, status] of countryRegimeStatus) {
      // Ensure jurisdiction record exists
      await supabase.from("jurisdiction").upsert(
        { country_code: code, country_name: code },
        { onConflict: "country_code" }
      );

      const { data: jur } = await supabase
        .from("jurisdiction")
        .select("id")
        .eq("country_code", code)
        .single();

      if (!jur) continue;

      const valueJson = {
        programme_status: status,
        entity_count: 0, // Could be computed but adds complexity
        source: "UK_OFSI",
      };

      const existing = existingByCode[code];
      const oldStatus = existing ? (existing.value_json as any)?.programme_status : null;
      const isNew = !existing;
      const isChanged = existing && oldStatus !== status;

      // Upsert indicator
      const { data: indicator } = await supabase
        .from("jurisdiction_indicator")
        .upsert(
          {
            jurisdiction_id: jur.id,
            indicator_type: "SANCTIONS_UK_PROGRAMME",
            value_json: valueJson,
            effective_date: today,
            source_name: "UK OFSI",
            source_url: UK_SANCTIONS_CSV_URL,
            source_snapshot_hash: snapshotHash,
            retrieved_at: new Date().toISOString(),
            ingestion_run_id: runId,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "jurisdiction_id,indicator_type" }
        )
        .select()
        .single();

      if (indicator && (isNew || isChanged)) {
        await supabase.from("jurisdiction_indicator_change").insert({
          jurisdiction_indicator_id: indicator.id,
          jurisdiction_id: jur.id,
          indicator_type: "SANCTIONS_UK_PROGRAMME",
          old_value_json: existing?.value_json || null,
          new_value_json: valueJson,
          old_effective_date: existing?.effective_date || null,
          new_effective_date: today,
          source_name: "UK OFSI",
          source_url: UK_SANCTIONS_CSV_URL,
          source_snapshot_hash: snapshotHash,
          ingestion_run_id: runId,
        });
        totalChanged++;
      }
    }

    // REMOVED: countries that had an indicator but no longer have any regime exposure
    for (const code of existingCodes) {
      if (!newCodes.has(code)) {
        const existing = existingByCode[code];
        const removedValue = {
          programme_status: "NONE",
          entity_count: 0,
          source: "UK_OFSI",
          delisted_date: today,
        };

        await supabase
          .from("jurisdiction_indicator")
          .update({
            value_json: removedValue,
            effective_date: today,
            source_url: UK_SANCTIONS_CSV_URL,
            source_snapshot_hash: snapshotHash,
            retrieved_at: new Date().toISOString(),
            ingestion_run_id: runId,
            updated_at: new Date().toISOString(),
          })
          .eq("id", existing.id);

        await supabase.from("jurisdiction_indicator_change").insert({
          jurisdiction_indicator_id: existing.id,
          jurisdiction_id: existing.jurisdiction_id,
          indicator_type: "SANCTIONS_UK_PROGRAMME",
          old_value_json: existing.value_json,
          new_value_json: removedValue,
          old_effective_date: existing.effective_date,
          new_effective_date: today,
          source_name: "UK OFSI",
          source_url: UK_SANCTIONS_CSV_URL,
          source_snapshot_hash: snapshotHash,
          ingestion_run_id: runId,
        });
        totalChanged++;
      }
    }

    // ── 5. Finalize ──
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

    console.log(`[UK Sanctions] Complete: ${totalProcessed} entities, ${totalChanged} indicator changes`);

    return new Response(
      JSON.stringify({
        success: true,
        run_id: runId,
        records_processed: totalProcessed,
        records_changed: totalChanged,
        regimes_found: regimeCountryMap.size,
        countries_with_indicators: countryRegimeStatus.size,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[UK Sanctions] Fatal error:", error);

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
