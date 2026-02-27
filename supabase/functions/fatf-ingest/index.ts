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

// ── Built-in name→ISO2 fallback (used before alias lookup) ──
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
  "hong kong, china": "HK", "macao": "MO", "macau": "MO",
  "chinese taipei": "TW", "taiwan": "TW",
  "british virgin islands": "VG", "jersey": "JE", "guernsey": "GG",
  "isle of man": "IM", "gibraltar": "GI", "bermuda": "BM",
  "st. kitts and nevis": "KN", "saint kitts and nevis": "KN",
  "st. lucia": "LC", "saint lucia": "LC",
  "st. vincent and the grenadines": "VC", "saint vincent and the grenadines": "VC",
};

// Jurisdiction + alias caches loaded from DB
type JurisdictionRow = { id: string; country_code: string; country_name: string };
type AliasRow = { jurisdiction_id: string; alias_name: string };

/**
 * Three-tier country resolution:
 * 1. Exact ISO2 code match
 * 2. jurisdiction.country_name match (case-insensitive)
 * 3. jurisdiction_alias match (case-insensitive)
 * 4. Built-in NAME_TO_ISO2 static map
 * Returns jurisdiction_id + country_code or null
 */
function resolveCountry(
  input: string,
  jurisdictions: JurisdictionRow[],
  aliases: AliasRow[]
): { id: string; code: string } | null {
  const cleaned = input.trim().toLowerCase()
    .replace(/[*†‡]+/g, "")
    .replace(/\s+/g, " ")
    .trim();
  if (!cleaned) return null;
  const upper = cleaned.toUpperCase();

  // 1. ISO2 code
  const byCode = jurisdictions.find((j) => j.country_code.toUpperCase() === upper);
  if (byCode) return { id: byCode.id, code: byCode.country_code };

  // 2. Country name
  const byName = jurisdictions.find((j) => j.country_name.toLowerCase() === cleaned);
  if (byName) return { id: byName.id, code: byName.country_code };

  // 3. Alias
  const byAlias = aliases.find((a) => a.alias_name.toLowerCase() === cleaned);
  if (byAlias) {
    const j = jurisdictions.find((j) => j.id === byAlias.jurisdiction_id);
    if (j) return { id: j.id, code: j.country_code };
  }

  // 4. Static fallback → try to find jurisdiction by resolved code
  const staticCode = NAME_TO_ISO2[cleaned];
  if (staticCode) {
    const j = jurisdictions.find((j) => j.country_code.toUpperCase() === staticCode);
    if (j) return { id: j.id, code: j.country_code };
  }

  return null;
}

async function computeHash(content: string): Promise<string> {
  const data = new TextEncoder().encode(content);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hashBuffer)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function parseCountryNames(html: string): string[] {
  const countries: string[] = [];
  // Strategy 1: <li> elements
  const liRegex = /<li[^>]*>([^<]+)<\/li>/gi;
  let match;
  while ((match = liRegex.exec(html)) !== null) {
    const text = match[1].trim().replace(/&amp;/g, "&").replace(/&nbsp;/g, " ").replace(/&#\d+;/g, "").replace(/\s+/g, " ").trim();
    if (text.length > 1 && text.length < 80) countries.push(text);
  }
  // Strategy 2: <p>/<strong> fallback
  if (countries.length === 0) {
    const pRegex = /<(?:p|strong|b|h\d)[^>]*>([^<]{2,60})<\/(?:p|strong|b|h\d)>/gi;
    while ((match = pRegex.exec(html)) !== null) {
      const text = match[1].trim().replace(/&amp;/g, "&").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim();
      if (text.length > 1 && text.length < 60) countries.push(text);
    }
  }
  return [...new Set(countries)];
}

function extractPublicationDate(html: string): string {
  const patterns = [
    /(?:updated|published|date)[:\s]*(\d{1,2}\s+\w+\s+\d{4})/i,
    /(\d{1,2}\s+(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{4})/i,
    /(\d{4}-\d{2}-\d{2})/,
  ];
  for (const pattern of patterns) {
    const m = html.match(pattern);
    if (m) {
      const parsed = new Date(m[1]);
      if (!isNaN(parsed.getTime())) return parsed.toISOString().split("T")[0];
    }
  }
  return new Date().toISOString().split("T")[0];
}

// ── Status values per specification ──
const STATUS_MAP: Record<string, string> = {
  call_for_action: "CALL_FOR_ACTION",
  increased_monitoring: "INCREASED_MONITORING",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceRoleKey);

  const body = await req.json().catch(() => ({}));
  const dataSourceId: string | undefined = body.data_source_id;
  const dryRun: boolean = body.dry_run === true;

  // ── Pre-load canonicalisation tables ──
  const [jurRes, aliasRes] = await Promise.all([
    supabase.from("jurisdiction").select("id, country_code, country_name"),
    supabase.from("jurisdiction_alias").select("jurisdiction_id, alias_name"),
  ]);
  let jurisdictions: JurisdictionRow[] = jurRes.data || [];
  const aliases: AliasRow[] = aliasRes.data || [];

  // ── Dry run: parse only, no DB writes ──
  if (dryRun) {
    const preview: Record<string, Array<{ name: string; resolved_code: string | null; jurisdiction_id: string | null }>> = {};

    const lists = [
      { key: "CALL_FOR_ACTION", url: FATF_CALL_FOR_ACTION_URL },
      { key: "INCREASED_MONITORING", url: FATF_INCREASED_MONITORING_URL },
    ];

    for (const list of lists) {
      try {
        const resp = await fetch(list.url, { headers: { "User-Agent": "CliftonRuskin-JurisdictionIngest/1.0" } });
        if (!resp.ok) {
          preview[list.key] = [{ name: `HTTP ${resp.status}`, resolved_code: null, jurisdiction_id: null }];
          continue;
        }
        const html = await resp.text();
        const names = parseCountryNames(html);
        const pubDate = extractPublicationDate(html);

        preview[list.key] = names.map((name) => {
          const match = resolveCountry(name, jurisdictions, aliases);
          return {
            name,
            resolved_code: match?.code || null,
            jurisdiction_id: match?.id || null,
          };
        });
        (preview as any)[`${list.key}_date`] = pubDate;
        (preview as any)[`${list.key}_total`] = names.length;
      } catch (e) {
        preview[list.key] = [{ name: `Error: ${e instanceof Error ? e.message : String(e)}`, resolved_code: null, jurisdiction_id: null }];
      }
    }

    return new Response(
      JSON.stringify({ success: true, dry_run: true, preview }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // ── Full ingestion run ──
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
    return new Response(
      JSON.stringify({ success: false, error: runErr.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const runId = run.id;
  let totalProcessed = 0;
  let totalChanged = 0;
  const affectedJurisdictionIds = new Set<string>();

  try {
    const lists = [
      { url: FATF_CALL_FOR_ACTION_URL, listKey: "call_for_action" },
      { url: FATF_INCREASED_MONITORING_URL, listKey: "increased_monitoring" },
    ];

    // Collect all resolved countries across both lists
    const allResolvedByList: Record<string, Map<string, { id: string; code: string; name: string }>> = {};

    for (const listDef of lists) {
      console.log(`[FATF] Fetching: ${listDef.url}`);
      const statusValue = STATUS_MAP[listDef.listKey];

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

      console.log(`[FATF] ${listDef.listKey}: found ${countryNames.length} countries, date=${publicationDate}`);

      const resolved = new Map<string, { id: string; code: string; name: string }>();

      for (const name of countryNames) {
        const match = resolveCountry(name, jurisdictions, aliases);
        if (match) {
          resolved.set(match.code, { ...match, name });
        } else {
          console.warn(`[FATF] Unmapped country name: "${name}"`);
          await supabase.from("ingestion_error").insert({
            ingestion_run_id: runId,
            error_message: `Unmapped country name: "${name}"`,
            error_detail: { list: listDef.listKey, name, resolution: "Add to jurisdiction_alias or jurisdiction table" },
          });
        }
      }

      allResolvedByList[listDef.listKey] = resolved;

      // ── Get existing FATF_STATUS indicators ──
      const { data: existingIndicators } = await supabase
        .from("jurisdiction_indicator")
        .select("id, jurisdiction_id, value_json, effective_date, source_snapshot_hash")
        .eq("indicator_type", "FATF_STATUS");

      // Build lookup: jurisdiction_id → existing indicator
      const existingById: Record<string, any> = {};
      for (const ind of existingIndicators || []) {
        const val = ind.value_json as any;
        // Match indicators with same status type
        if (val?.status === statusValue) {
          existingById[ind.jurisdiction_id] = ind;
        }
      }

      const newIds = new Set([...resolved.values()].map((r) => r.id));
      const existingIds = new Set(Object.keys(existingById));

      const added = [...newIds].filter((id) => !existingIds.has(id));
      const removed = [...existingIds].filter((id) => !newIds.has(id));
      const retained = [...newIds].filter((id) => existingIds.has(id));

      console.log(`[FATF] ${listDef.listKey}: +${added.length} added, -${removed.length} removed, ${retained.length} retained`);

      // ── ADDED ──
      for (const jurId of added) {
        const valueJson = { status: statusValue };

        const { data: indicator } = await supabase
          .from("jurisdiction_indicator")
          .upsert({
            jurisdiction_id: jurId,
            indicator_type: "FATF_STATUS",
            value_json: valueJson,
            effective_date: publicationDate,
            source_name: "FATF",
            source_url: listDef.url,
            source_snapshot_hash: snapshotHash,
            retrieved_at: new Date().toISOString(),
            ingestion_run_id: runId,
            updated_at: new Date().toISOString(),
          }, { onConflict: "jurisdiction_id,indicator_type" })
          .select()
          .single();

        if (indicator) {
          await supabase.from("jurisdiction_indicator_change").insert({
            jurisdiction_indicator_id: indicator.id,
            jurisdiction_id: jurId,
            indicator_type: "FATF_STATUS",
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
        affectedJurisdictionIds.add(jurId);
        totalProcessed++;
      }

      // ── REMOVED (previously on this list, now absent) ──
      for (const jurId of removed) {
        const existing = existingById[jurId];
        if (!existing) continue;

        const newValue = { status: "NONE", note: `Removed from ${statusValue} list`, delisted_date: publicationDate };

        await supabase
          .from("jurisdiction_indicator")
          .update({
            value_json: newValue,
            effective_date: publicationDate,
            source_url: listDef.url,
            source_snapshot_hash: snapshotHash,
            retrieved_at: new Date().toISOString(),
            ingestion_run_id: runId,
            updated_at: new Date().toISOString(),
          })
          .eq("id", existing.id);

        await supabase.from("jurisdiction_indicator_change").insert({
          jurisdiction_indicator_id: existing.id,
          jurisdiction_id: jurId,
          indicator_type: "FATF_STATUS",
          old_value_json: existing.value_json,
          new_value_json: newValue,
          old_effective_date: existing.effective_date,
          new_effective_date: publicationDate,
          source_name: "FATF",
          source_url: listDef.url,
          source_snapshot_hash: snapshotHash,
          ingestion_run_id: runId,
        });

        affectedJurisdictionIds.add(jurId);
        totalChanged++;
        totalProcessed++;
      }

      // ── RETAINED (refresh timestamp, detect date changes) ──
      for (const jurId of retained) {
        const existing = existingById[jurId];
        if (!existing) continue;

        const valueJson = { status: statusValue };
        const dateChanged = existing.effective_date !== publicationDate;
        const hashChanged = existing.source_snapshot_hash !== snapshotHash;

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

        if (dateChanged || hashChanged) {
          await supabase.from("jurisdiction_indicator_change").insert({
            jurisdiction_indicator_id: existing.id,
            jurisdiction_id: jurId,
            indicator_type: "FATF_STATUS",
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

        affectedJurisdictionIds.add(jurId);
        totalProcessed++;
      }
    }

    // ── Update jurisdiction.last_refreshed_at for affected jurisdictions ──
    if (affectedJurisdictionIds.size > 0) {
      const now = new Date().toISOString();
      for (const jurId of affectedJurisdictionIds) {
        await supabase
          .from("jurisdiction")
          .update({ last_refreshed_at: now, updated_at: now })
          .eq("id", jurId);
      }
    }

    // ── Finalize run ──
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
