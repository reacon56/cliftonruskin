import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ── FATF list URLs ──
const FATF_CALL_FOR_ACTION_URL =
  "https://www.fatf-gafi.org/en/countries/black-and-grey-lists/high-risk-jurisdictions.html";
const FATF_INCREASED_MONITORING_URL =
  "https://www.fatf-gafi.org/en/countries/black-and-grey-lists/increased-monitoring.html";

// ── Country name → ISO-2 mapping (comprehensive for FATF-relevant jurisdictions) ──
const NAME_TO_ISO2: Record<string, string> = {
  "afghanistan": "AF", "albania": "AL", "algeria": "DZ", "angola": "AO",
  "antigua and barbuda": "AG", "argentina": "AR", "australia": "AU",
  "bahamas": "BS", "bangladesh": "BD", "barbados": "BB", "belarus": "BY",
  "belize": "BZ", "benin": "BJ", "bolivia": "BO", "bosnia and herzegovina": "BA",
  "botswana": "BW", "brazil": "BR", "brunei darussalam": "BN", "brunei": "BN",
  "bulgaria": "BG", "burkina faso": "BF", "burundi": "BI",
  "cabo verde": "CV", "cambodia": "KH", "cameroon": "CM", "canada": "CA",
  "cayman islands": "KY", "central african republic": "CF", "chad": "TD",
  "china": "CN", "colombia": "CO", "comoros": "KM", "congo": "CG",
  "costa rica": "CR", "croatia": "HR", "cuba": "CU", "cyprus": "CY",
  "côte d'ivoire": "CI", "cote d'ivoire": "CI", "ivory coast": "CI",
  "democratic people's republic of korea": "KP", "north korea": "KP", "dprk": "KP",
  "democratic republic of the congo": "CD", "drc": "CD",
  "dominican republic": "DO", "ecuador": "EC", "egypt": "EG",
  "el salvador": "SV", "equatorial guinea": "GQ", "eritrea": "ER",
  "ethiopia": "ET", "fiji": "FJ", "france": "FR", "gabon": "GA",
  "gambia": "GM", "georgia": "GE", "germany": "DE", "ghana": "GH",
  "greece": "GR", "guatemala": "GT", "guinea": "GN", "guinea-bissau": "GW",
  "guyana": "GY", "haiti": "HT", "honduras": "HN", "hong kong": "HK",
  "hungary": "HU", "iceland": "IS", "india": "IN", "indonesia": "ID",
  "iran": "IR", "iran, islamic republic of": "IR", "islamic republic of iran": "IR",
  "iraq": "IQ", "ireland": "IE", "israel": "IL", "italy": "IT",
  "jamaica": "JM", "japan": "JP", "jordan": "JO", "kazakhstan": "KZ",
  "kenya": "KE", "kuwait": "KW", "kyrgyzstan": "KG",
  "lao people's democratic republic": "LA", "laos": "LA",
  "lebanon": "LB", "lesotho": "LS", "liberia": "LR", "libya": "LY",
  "madagascar": "MG", "malawi": "MW", "malaysia": "MY", "maldives": "MV",
  "mali": "ML", "malta": "MT", "mauritania": "MR", "mauritius": "MU",
  "mexico": "MX", "mongolia": "MN", "montenegro": "ME", "morocco": "MA",
  "mozambique": "MZ", "myanmar": "MM", "namibia": "NA", "nauru": "NR",
  "nepal": "NP", "netherlands": "NL", "new zealand": "NZ",
  "nicaragua": "NI", "niger": "NE", "nigeria": "NG", "norway": "NO",
  "oman": "OM", "pakistan": "PK", "palau": "PW", "panama": "PA",
  "papua new guinea": "PG", "paraguay": "PY", "peru": "PE",
  "philippines": "PH", "poland": "PL", "portugal": "PT", "qatar": "QA",
  "romania": "RO", "russia": "RU", "russian federation": "RU",
  "rwanda": "RW", "saudi arabia": "SA", "senegal": "SN", "serbia": "RS",
  "sierra leone": "SL", "singapore": "SG", "slovakia": "SK",
  "slovenia": "SI", "solomon islands": "SB", "somalia": "SO",
  "south africa": "ZA", "south korea": "KR", "republic of korea": "KR",
  "south sudan": "SS", "spain": "ES", "sri lanka": "LK",
  "sudan": "SD", "suriname": "SR", "sweden": "SE", "switzerland": "CH",
  "syria": "SY", "syrian arab republic": "SY",
  "tajikistan": "TJ", "tanzania": "TZ", "united republic of tanzania": "TZ",
  "thailand": "TH", "togo": "TG", "trinidad and tobago": "TT",
  "tunisia": "TN", "turkey": "TR", "türkiye": "TR", "turkiye": "TR",
  "turkmenistan": "TM", "tuvalu": "TV", "uganda": "UG", "ukraine": "UA",
  "united arab emirates": "AE", "uae": "AE",
  "united kingdom": "GB", "uk": "GB",
  "united states": "US", "usa": "US", "united states of america": "US",
  "uruguay": "UY", "uzbekistan": "UZ", "vanuatu": "VU",
  "venezuela": "VE", "vietnam": "VN", "viet nam": "VN",
  "yemen": "YE", "zambia": "ZM", "zimbabwe": "ZW",
  // Special territories
  "hong kong, china": "HK", "macao": "MO", "macau": "MO",
  "chinese taipei": "TW", "taiwan": "TW",
  "british virgin islands": "VG", "jersey": "JE", "guernsey": "GG",
  "isle of man": "IM", "gibraltar": "GI", "bermuda": "BM",
  "st. kitts and nevis": "KN", "saint kitts and nevis": "KN",
  "st. lucia": "LC", "saint lucia": "LC",
  "st. vincent and the grenadines": "VC", "saint vincent and the grenadines": "VC",
};

/**
 * Resolve a country name to ISO-2 code.
 */
function resolveCountryCode(name: string): string | null {
  const cleaned = name.trim().toLowerCase()
    .replace(/[*†‡]+/g, "")       // remove footnote markers
    .replace(/\s+/g, " ")
    .trim();
  return NAME_TO_ISO2[cleaned] || null;
}

/**
 * Compute SHA-256 hash of content for snapshot tracking.
 */
async function computeHash(content: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(content);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Parse FATF HTML page and extract country names from list items.
 * FATF pages typically list countries in <li> elements or specific content blocks.
 */
function parseCountryNames(html: string): string[] {
  const countries: string[] = [];

  // Strategy 1: Look for list items containing country names
  const liRegex = /<li[^>]*>([^<]+)<\/li>/gi;
  let match;
  while ((match = liRegex.exec(html)) !== null) {
    const text = match[1].trim()
      .replace(/&amp;/g, "&")
      .replace(/&nbsp;/g, " ")
      .replace(/&#\d+;/g, "")
      .replace(/\s+/g, " ")
      .trim();
    if (text.length > 1 && text.length < 80 && resolveCountryCode(text)) {
      countries.push(text);
    }
  }

  // Strategy 2: Look for <p> or <strong> tags with country names (fallback)
  if (countries.length === 0) {
    const pRegex = /<(?:p|strong|b|h\d)[^>]*>([^<]{2,60})<\/(?:p|strong|b|h\d)>/gi;
    while ((match = pRegex.exec(html)) !== null) {
      const text = match[1].trim()
        .replace(/&amp;/g, "&")
        .replace(/&nbsp;/g, " ")
        .replace(/\s+/g, " ")
        .trim();
      if (text.length > 1 && text.length < 60 && resolveCountryCode(text)) {
        countries.push(text);
      }
    }
  }

  // Deduplicate
  return [...new Set(countries)];
}

/**
 * Try to extract a publication/last-updated date from the HTML.
 */
function extractPublicationDate(html: string): string {
  // Look for common date patterns in FATF pages
  const datePatterns = [
    /(?:updated|published|date)[:\s]*(\d{1,2}\s+\w+\s+\d{4})/i,
    /(\d{1,2}\s+(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{4})/i,
    /(\d{4}-\d{2}-\d{2})/,
  ];
  for (const pattern of datePatterns) {
    const m = html.match(pattern);
    if (m) {
      const parsed = new Date(m[1]);
      if (!isNaN(parsed.getTime())) {
        return parsed.toISOString().split("T")[0];
      }
    }
  }
  // Fallback to today
  return new Date().toISOString().split("T")[0];
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceRoleKey);

  // Optionally accept a data_source_id to link the run
  const body = await req.json().catch(() => ({}));
  const dataSourceId: string | undefined = body.data_source_id;

  // Create ingestion_run
  const { data: run, error: runErr } = await supabase
    .from("ingestion_run")
    .insert({
      data_source_id: dataSourceId || null,
      status: "running",
      records_processed: 0,
      records_changed: 0,
      metadata: { connector: "fatf", triggered_at: new Date().toISOString() },
    })
    .select()
    .single();

  if (runErr) {
    console.error("Failed to create ingestion run:", runErr);
    return new Response(
      JSON.stringify({ success: false, error: runErr.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const runId = run.id;
  let totalProcessed = 0;
  let totalChanged = 0;

  try {
    const lists: Array<{
      url: string;
      fatfStatus: string; // "call_for_action" or "increased_monitoring"
      indicatorType: string;
    }> = [
      {
        url: FATF_CALL_FOR_ACTION_URL,
        fatfStatus: "call_for_action",
        indicatorType: "FATF_STATUS",
      },
      {
        url: FATF_INCREASED_MONITORING_URL,
        fatfStatus: "increased_monitoring",
        indicatorType: "FATF_STATUS",
      },
    ];

    for (const listDef of lists) {
      console.log(`[FATF] Fetching: ${listDef.url}`);

      // Fetch the page
      const response = await fetch(listDef.url, {
        headers: { "User-Agent": "CliftonRuskin-JurisdictionIngest/1.0" },
      });

      if (!response.ok) {
        const errMsg = `HTTP ${response.status} fetching ${listDef.url}`;
        console.error(`[FATF] ${errMsg}`);
        await supabase.from("ingestion_error").insert({
          ingestion_run_id: runId,
          error_message: errMsg,
          error_detail: { status: response.status, url: listDef.url },
        });
        continue;
      }

      const html = await response.text();
      const snapshotHash = await computeHash(html);
      const publicationDate = extractPublicationDate(html);
      const countryNames = parseCountryNames(html);

      console.log(`[FATF] ${listDef.fatfStatus}: found ${countryNames.length} countries, date=${publicationDate}`);

      // Resolve to ISO-2 codes
      const parsedCountries: Array<{ name: string; code: string }> = [];
      for (const name of countryNames) {
        const code = resolveCountryCode(name);
        if (code) {
          parsedCountries.push({ name, code });
        } else {
          console.warn(`[FATF] Could not resolve country: "${name}"`);
          await supabase.from("ingestion_error").insert({
            ingestion_run_id: runId,
            error_message: `Unresolved country name: "${name}"`,
            error_detail: { list: listDef.fatfStatus, name },
          });
        }
      }

      // Ensure jurisdiction records exist
      for (const c of parsedCountries) {
        await supabase
          .from("jurisdiction")
          .upsert(
            { country_code: c.code, country_name: c.name },
            { onConflict: "country_code" }
          );
      }

      // Get current indicators for this type
      const { data: existingIndicators } = await supabase
        .from("jurisdiction_indicator")
        .select("*, jurisdiction:jurisdiction_id(country_code)")
        .eq("indicator_type", listDef.indicatorType);

      const existingByCode: Record<string, any> = {};
      for (const ind of existingIndicators || []) {
        const code = (ind as any).jurisdiction?.country_code;
        if (code) {
          // Filter to same fatf_status
          const val = ind.value_json as any;
          if (val?.fatf_status === listDef.fatfStatus) {
            existingByCode[code] = ind;
          }
        }
      }

      const newCodes = new Set(parsedCountries.map((c) => c.code));
      const existingCodes = new Set(Object.keys(existingByCode));

      // ADDED: countries in new list but not in existing
      const added = [...newCodes].filter((c) => !existingCodes.has(c));
      // REMOVED: countries in existing but not in new list
      const removed = [...existingCodes].filter((c) => !newCodes.has(c));
      // STILL PRESENT: countries in both (check if value changed)
      const retained = [...newCodes].filter((c) => existingCodes.has(c));

      console.log(`[FATF] ${listDef.fatfStatus}: +${added.length} added, -${removed.length} removed, ${retained.length} retained`);

      // Process ADDED
      for (const code of added) {
        // Get jurisdiction ID
        const { data: jur } = await supabase
          .from("jurisdiction")
          .select("id")
          .eq("country_code", code)
          .single();

        if (!jur) continue;

        const valueJson = {
          fatf_status: listDef.fatfStatus,
          listed: true,
          source_list: listDef.fatfStatus === "call_for_action" ? "High-Risk (Call for Action)" : "Increased Monitoring (Grey List)",
        };

        // Upsert indicator
        const { data: indicator } = await supabase
          .from("jurisdiction_indicator")
          .upsert(
            {
              jurisdiction_id: jur.id,
              indicator_type: listDef.indicatorType,
              value_json: valueJson,
              effective_date: publicationDate,
              source_name: "FATF",
              source_url: listDef.url,
              source_snapshot_hash: snapshotHash,
              retrieved_at: new Date().toISOString(),
              ingestion_run_id: runId,
              updated_at: new Date().toISOString(),
            },
            { onConflict: "jurisdiction_id,indicator_type" }
          )
          .select()
          .single();

        if (indicator) {
          // Write change event
          await supabase.from("jurisdiction_indicator_change").insert({
            jurisdiction_indicator_id: indicator.id,
            jurisdiction_id: jur.id,
            indicator_type: listDef.indicatorType,
            old_value_json: null,
            new_value_json: valueJson,
            old_effective_date: null,
            new_effective_date: publicationDate,
            source_name: "FATF",
            source_url: listDef.url,
            source_snapshot_hash: snapshotHash,
            ingestion_run_id: runId,
          });
          totalChanged++;
        }
        totalProcessed++;
      }

      // Process REMOVED
      for (const code of removed) {
        const existing = existingByCode[code];
        if (!existing) continue;

        const removedValue = {
          ...(existing.value_json as any),
          listed: false,
          delisted_date: publicationDate,
        };

        // Update indicator to show delisted
        await supabase
          .from("jurisdiction_indicator")
          .update({
            value_json: removedValue,
            effective_date: publicationDate,
            source_url: listDef.url,
            source_snapshot_hash: snapshotHash,
            retrieved_at: new Date().toISOString(),
            ingestion_run_id: runId,
            updated_at: new Date().toISOString(),
          })
          .eq("id", existing.id);

        // Write change event
        await supabase.from("jurisdiction_indicator_change").insert({
          jurisdiction_indicator_id: existing.id,
          jurisdiction_id: existing.jurisdiction_id,
          indicator_type: listDef.indicatorType,
          old_value_json: existing.value_json,
          new_value_json: removedValue,
          old_effective_date: existing.effective_date,
          new_effective_date: publicationDate,
          source_name: "FATF",
          source_url: listDef.url,
          source_snapshot_hash: snapshotHash,
          ingestion_run_id: runId,
        });

        totalChanged++;
        totalProcessed++;
      }

      // Process RETAINED (update retrieved_at, check for date changes)
      for (const code of retained) {
        const existing = existingByCode[code];
        if (!existing) continue;

        const valueJson = {
          fatf_status: listDef.fatfStatus,
          listed: true,
          source_list: listDef.fatfStatus === "call_for_action" ? "High-Risk (Call for Action)" : "Increased Monitoring (Grey List)",
        };

        const dateChanged = existing.effective_date !== publicationDate;

        // Always update retrieved_at and snapshot
        await supabase
          .from("jurisdiction_indicator")
          .update({
            value_json: valueJson,
            effective_date: publicationDate,
            source_url: listDef.url,
            source_snapshot_hash: snapshotHash,
            retrieved_at: new Date().toISOString(),
            ingestion_run_id: runId,
            updated_at: new Date().toISOString(),
          })
          .eq("id", existing.id);

        // If the effective date changed, record as a change (list refreshed)
        if (dateChanged) {
          await supabase.from("jurisdiction_indicator_change").insert({
            jurisdiction_indicator_id: existing.id,
            jurisdiction_id: existing.jurisdiction_id,
            indicator_type: listDef.indicatorType,
            old_value_json: existing.value_json,
            new_value_json: valueJson,
            old_effective_date: existing.effective_date,
            new_effective_date: publicationDate,
            source_name: "FATF",
            source_url: listDef.url,
            source_snapshot_hash: snapshotHash,
            ingestion_run_id: runId,
          });
          totalChanged++;
        }
        totalProcessed++;
      }
    }

    // Finalize run
    await supabase
      .from("ingestion_run")
      .update({
        status: "completed",
        finished_at: new Date().toISOString(),
        records_processed: totalProcessed,
        records_changed: totalChanged,
      })
      .eq("id", runId);

    // Update data_source if linked
    if (dataSourceId) {
      await supabase
        .from("data_source")
        .update({ last_run_at: new Date().toISOString(), last_run_status: "completed" })
        .eq("id", dataSourceId);
    }

    console.log(`[FATF] Run complete: ${totalProcessed} processed, ${totalChanged} changed`);

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
    console.error("[FATF] Fatal error:", error);

    // Log error
    await supabase.from("ingestion_error").insert({
      ingestion_run_id: runId,
      error_message: error instanceof Error ? error.message : String(error),
      error_detail: { stack: error instanceof Error ? error.stack : null },
    });

    // Mark run as failed
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
