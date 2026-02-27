import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// OFAC Sanctions List Service – consolidated XML (SDN + non-SDN + SSI + all programmes)
const OFAC_SLS_XML_URL =
  "https://sanctionslistservice.ofac.treas.gov/api/PublicationPreview/exports/ADVANCED_XML";

// Fallback: SDN CSV if XML fails
const OFAC_SDN_CSV_URL =
  "https://www.treasury.gov/ofac/downloads/sdn.csv";

// OFAC programme → comprehensive vs targeted
const COMPREHENSIVE_PROGRAMMES = new Set([
  "cuba", "iran", "north korea", "dprk", "syria", "crimea",
  "donetsk", "luhansk", "russia", "russian",
]);

// Country name → ISO-2
const NAME_TO_ISO2: Record<string, string> = {
  "afghanistan": "AF", "albania": "AL", "algeria": "DZ", "angola": "AO",
  "argentina": "AR", "armenia": "AM", "azerbaijan": "AZ",
  "bahamas": "BS", "bahrain": "BH", "bangladesh": "BD",
  "belarus": "BY", "belgium": "BE", "belize": "BZ",
  "bosnia and herzegovina": "BA", "brazil": "BR", "brunei": "BN",
  "bulgaria": "BG", "burkina faso": "BF", "burma": "MM", "myanmar": "MM",
  "burundi": "BI", "cambodia": "KH", "cameroon": "CM",
  "central african republic": "CF", "chad": "TD", "chile": "CL",
  "china": "CN", "colombia": "CO", "comoros": "KM", "congo": "CG",
  "costa rica": "CR", "croatia": "HR", "cuba": "CU", "cyprus": "CY",
  "czech republic": "CZ", "czechia": "CZ",
  "democratic republic of the congo": "CD", "drc": "CD",
  "denmark": "DK", "djibouti": "DJ", "dominican republic": "DO",
  "ecuador": "EC", "egypt": "EG", "el salvador": "SV",
  "eritrea": "ER", "estonia": "EE", "ethiopia": "ET",
  "france": "FR", "gabon": "GA", "gambia": "GM", "georgia": "GE",
  "germany": "DE", "ghana": "GH", "greece": "GR", "guatemala": "GT",
  "guinea": "GN", "guinea-bissau": "GW", "guyana": "GY",
  "haiti": "HT", "honduras": "HN", "hong kong": "HK", "hungary": "HU",
  "india": "IN", "indonesia": "ID", "iran": "IR", "iraq": "IQ",
  "ireland": "IE", "israel": "IL", "italy": "IT", "jamaica": "JM",
  "japan": "JP", "jordan": "JO", "kazakhstan": "KZ", "kenya": "KE",
  "kuwait": "KW", "kyrgyzstan": "KG", "laos": "LA", "latvia": "LV",
  "lebanon": "LB", "liberia": "LR", "libya": "LY", "lithuania": "LT",
  "luxembourg": "LU", "madagascar": "MG", "malawi": "MW", "malaysia": "MY",
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
  "tajikistan": "TJ", "tanzania": "TZ", "thailand": "TH",
  "trinidad and tobago": "TT", "tunisia": "TN",
  "turkey": "TR", "türkiye": "TR", "turkiye": "TR",
  "turkmenistan": "TM", "uganda": "UG", "ukraine": "UA",
  "united arab emirates": "AE", "uae": "AE",
  "united kingdom": "GB", "uk": "GB",
  "united states": "US", "usa": "US",
  "uruguay": "UY", "uzbekistan": "UZ", "vanuatu": "VU",
  "venezuela": "VE", "vietnam": "VN", "viet nam": "VN",
  "yemen": "YE", "zambia": "ZM", "zimbabwe": "ZW",
  "crimea": "UA", "hong kong, china": "HK",
  "british virgin islands": "VG", "cayman islands": "KY",
  "bermuda": "BM", "jersey": "JE", "guernsey": "GG",
  "isle of man": "IM", "gibraltar": "GI",
};

function resolveCountryCode(name: string): string | null {
  if (!name) return null;
  const cleaned = name.trim().toLowerCase().replace(/\s+/g, " ");
  if (NAME_TO_ISO2[cleaned]) return NAME_TO_ISO2[cleaned];
  if (/^[A-Z]{2}$/.test(name.trim())) return name.trim();
  return null;
}

function classifyProgramme(prog: string): "COMPREHENSIVE" | "TARGETED" | "NONE" {
  if (!prog) return "NONE";
  const lower = prog.toLowerCase();
  for (const r of COMPREHENSIVE_PROGRAMMES) {
    if (lower.includes(r)) return "COMPREHENSIVE";
  }
  return "TARGETED";
}

async function computeHash(content: string): Promise<string> {
  const data = new TextEncoder().encode(content);
  const buf = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

// ── Minimal XML helpers ──
function extractTagValues(xml: string, tag: string): string[] {
  const results: string[] = [];
  const regex = new RegExp(`<${tag}[^>]*>([^<]*)</${tag}>`, "gi");
  let m: RegExpExecArray | null;
  while ((m = regex.exec(xml)) !== null) {
    if (m[1].trim()) results.push(m[1].trim());
  }
  return results;
}

function extractFirstTag(xml: string, tag: string): string {
  const m = xml.match(new RegExp(`<${tag}[^>]*>([^<]*)</${tag}>`, "i"));
  return m ? m[1].trim() : "";
}

function extractAttr(xml: string, tag: string, attr: string): string {
  const m = xml.match(new RegExp(`<${tag}[^>]*\\s${attr}="([^"]*)"`, "i"));
  return m ? m[1].trim() : "";
}

function splitByTag(xml: string, tag: string): string[] {
  const parts: string[] = [];
  const openRe = new RegExp(`<${tag}[\\s>]`, "gi");
  const closeRe = new RegExp(`</${tag}>`, "gi");
  let startM: RegExpExecArray | null;
  while ((startM = openRe.exec(xml)) !== null) {
    closeRe.lastIndex = startM.index;
    const endM = closeRe.exec(xml);
    if (endM) parts.push(xml.substring(startM.index, endM.index + endM[0].length));
  }
  return parts;
}

interface OfacEntity {
  uid: string;
  sdnType: string;
  primaryName: string;
  aliases: string[];
  countryCodes: string[];
  nationalityCodes: string[];
  programmes: string[];
  regimeType: "COMPREHENSIVE" | "TARGETED" | "NONE";
  dateOfBirth: string | null;
  remarks: string;
  rawBlock: string;
}

function parseXmlEntities(xmlText: string): { entities: OfacEntity[]; publishDate: string } {
  // Try to find publish date
  const publishDate =
    extractFirstTag(xmlText, "Publish_Date") ||
    extractFirstTag(xmlText, "publshInformation") ||
    extractAttr(xmlText, "sanctionsData", "date") ||
    new Date().toISOString();

  // The SLS advanced XML uses <sdnEntry> blocks
  let entityBlocks = splitByTag(xmlText, "sdnEntry");

  // Fallback: try <sanctionEntry> or <entry> tags
  if (entityBlocks.length === 0) entityBlocks = splitByTag(xmlText, "sanctionEntry");
  if (entityBlocks.length === 0) entityBlocks = splitByTag(xmlText, "entry");

  const entities: OfacEntity[] = [];

  for (const block of entityBlocks) {
    const uid =
      extractFirstTag(block, "uid") ||
      extractAttr(block, "sdnEntry", "uid") ||
      extractFirstTag(block, "uniqueId") ||
      "";

    if (!uid) continue;

    const sdnType =
      extractFirstTag(block, "sdnType") ||
      extractFirstTag(block, "type") ||
      "Individual";

    // Names
    const lastName = extractFirstTag(block, "lastName") || extractFirstTag(block, "name");
    const firstName = extractFirstTag(block, "firstName");
    const primaryName = [firstName, lastName].filter(Boolean).join(" ").trim();

    if (!primaryName) continue;

    // Aliases
    const akaBlocks = splitByTag(block, "aka");
    const aliases: string[] = [];
    for (const aka of akaBlocks) {
      const akaLast = extractFirstTag(aka, "lastName") || extractFirstTag(aka, "name");
      const akaFirst = extractFirstTag(aka, "firstName");
      const full = [akaFirst, akaLast].filter(Boolean).join(" ").trim();
      if (full && full !== primaryName) aliases.push(full);
    }

    // Programmes
    const programmes = extractTagValues(block, "program");

    // Addresses → country codes
    const addressBlocks = splitByTag(block, "address");
    const countryCodes: string[] = [];
    for (const addr of addressBlocks) {
      const country = extractFirstTag(addr, "country");
      if (country) {
        const code = resolveCountryCode(country);
        if (code && !countryCodes.includes(code)) countryCodes.push(code);
      }
    }

    // Nationality
    const natBlocks = splitByTag(block, "nationality");
    const nationalityCodes: string[] = [];
    for (const nb of natBlocks) {
      const country = extractFirstTag(nb, "country");
      if (country) {
        const code = resolveCountryCode(country);
        if (code && !nationalityCodes.includes(code)) nationalityCodes.push(code);
      }
    }

    // Date of birth
    const dobBlock = splitByTag(block, "dateOfBirthItem")[0] || "";
    const dob = extractFirstTag(dobBlock, "dateOfBirth") || null;

    // Remarks
    const remarks = extractFirstTag(block, "remarks");

    // Classify regime from all programmes
    let regimeType: "COMPREHENSIVE" | "TARGETED" | "NONE" = "NONE";
    for (const prog of programmes) {
      const t = classifyProgramme(prog);
      if (t === "COMPREHENSIVE") { regimeType = "COMPREHENSIVE"; break; }
      if (t === "TARGETED") regimeType = "TARGETED";
    }

    entities.push({
      uid,
      sdnType: sdnType.toLowerCase().includes("individual") ? "Individual" : "Entity",
      primaryName: primaryName.substring(0, 500),
      aliases: aliases.slice(0, 20),
      countryCodes,
      nationalityCodes,
      programmes,
      regimeType,
      dateOfBirth: dob,
      remarks,
      rawBlock: block.substring(0, 5000),
    });
  }

  return { entities, publishDate };
}

// ── Fallback CSV parser (SDN.csv) ──
function parseSDNCsv(csvText: string): OfacEntity[] {
  // SDN.csv columns: uid, name, sdnType, program, title, ...address..., remarks, ...
  const lines = csvText.split("\n");
  const entities: OfacEntity[] = [];

  for (const line of lines) {
    if (!line.trim()) continue;
    const cols = parseCSVLine(line);
    if (cols.length < 4) continue;

    const uid = cols[0]?.trim();
    const name = cols[1]?.trim();
    const sdnType = cols[2]?.trim() || "Individual";
    const program = cols[3]?.trim() || "";

    if (!uid || !name || !/^\d+$/.test(uid)) continue;

    const programmes = program.split(";").map((p) => p.trim()).filter(Boolean);
    let regimeType: "COMPREHENSIVE" | "TARGETED" | "NONE" = "NONE";
    for (const p of programmes) {
      const t = classifyProgramme(p);
      if (t === "COMPREHENSIVE") { regimeType = "COMPREHENSIVE"; break; }
      if (t === "TARGETED") regimeType = "TARGETED";
    }

    const remarks = cols.length > 5 ? cols[cols.length - 1]?.trim() || "" : "";

    entities.push({
      uid,
      sdnType: sdnType.toLowerCase().includes("individual") ? "Individual" : "Entity",
      primaryName: name.substring(0, 500),
      aliases: [],
      countryCodes: [],
      nationalityCodes: [],
      programmes,
      regimeType,
      dateOfBirth: null,
      remarks,
      rawBlock: line.substring(0, 5000),
    });
  }

  return entities;
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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceRoleKey);

  const body = await req.json().catch(() => ({}));
  const dataSourceId: string | undefined = body.data_source_id;

  const { data: run, error: runErr } = await supabase
    .from("ingestion_run")
    .insert({
      data_source_id: dataSourceId || null,
      status: "running",
      records_processed: 0,
      records_changed: 0,
      metadata: { connector: "ofac_sls", triggered_at: new Date().toISOString() },
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
  let sourceUrl = OFAC_SLS_XML_URL;
  let usedFallback = false;

  try {
    // ── 1. Fetch data (try XML first, fallback to CSV) ──
    console.log("[OFAC] Fetching SLS Advanced XML…");
    let entities: OfacEntity[] = [];
    let publishDate = new Date().toISOString();
    let rawText: string;

    try {
      const xmlResp = await fetch(OFAC_SLS_XML_URL, {
        headers: { "User-Agent": "CliftonRuskin-OFACIngest/1.0", Accept: "application/xml" },
      });
      if (!xmlResp.ok) throw new Error(`HTTP ${xmlResp.status}`);
      rawText = await xmlResp.text();
      const parsed = parseXmlEntities(rawText);
      entities = parsed.entities;
      publishDate = parsed.publishDate;
      console.log(`[OFAC] XML parsed: ${entities.length} entities, published ${publishDate}`);
    } catch (xmlErr) {
      console.warn("[OFAC] XML fetch failed, falling back to SDN CSV:", xmlErr);
      usedFallback = true;
      sourceUrl = OFAC_SDN_CSV_URL;
      const csvResp = await fetch(OFAC_SDN_CSV_URL, {
        headers: { "User-Agent": "CliftonRuskin-OFACIngest/1.0" },
      });
      if (!csvResp.ok) throw new Error(`HTTP ${csvResp.status} fetching SDN CSV`);
      rawText = await csvResp.text();
      entities = parseSDNCsv(rawText);
      console.log(`[OFAC] CSV fallback parsed: ${entities.length} entities`);
    }

    const snapshotHash = await computeHash(rawText!);

    if (entities.length === 0) {
      throw new Error("No entities parsed from OFAC data");
    }

    // ── 2. Mark existing OFAC entities as potentially stale ──
    await supabase
      .from("sanctions_entity")
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq("source_list", "OFAC");

    // ── 3. Batch upsert ──
    const BATCH_SIZE = 100;
    const progCountryMap: Map<string, Set<string>> = new Map();

    for (let batch = 0; batch < entities.length; batch += BATCH_SIZE) {
      const chunk = entities.slice(batch, batch + BATCH_SIZE);
      const rows: Array<Record<string, unknown>> = [];

      for (const e of chunk) {
        // Track programme → countries
        for (const prog of e.programmes) {
          if (!progCountryMap.has(prog)) progCountryMap.set(prog, new Set());
          for (const cc of e.countryCodes) progCountryMap.get(prog)!.add(cc);
          const progCode = resolveCountryCode(prog);
          if (progCode) progCountryMap.get(prog)!.add(progCode);
        }

        rows.push({
          source_list: "OFAC",
          source_entity_id: e.uid,
          entity_type: e.sdnType,
          primary_name: e.primaryName,
          aliases: e.aliases,
          nationality_codes: e.nationalityCodes,
          country_codes: e.countryCodes,
          regime_name: e.programmes.join("; ") || null,
          regime_type: e.regimeType,
          designation_date: null,
          designation_source: "US OFAC Sanctions List Service",
          raw_data: { remarks: e.remarks, dob: e.dateOfBirth, programmes: e.programmes },
          ingestion_run_id: runId,
          source_url: sourceUrl,
          source_snapshot_hash: snapshotHash,
          retrieved_at: new Date().toISOString(),
          is_active: true,
          updated_at: new Date().toISOString(),
        });

        totalProcessed++;
      }

      if (rows.length > 0) {
        const { error: insertErr } = await supabase
          .from("sanctions_entity")
          .upsert(rows as any, { onConflict: "id", ignoreDuplicates: false });

        if (insertErr) {
          console.error(`[OFAC] Batch insert error:`, insertErr);
          await supabase.from("ingestion_error").insert({
            ingestion_run_id: runId,
            error_message: `Batch insert error at offset ${batch}: ${insertErr.message}`,
            error_detail: { batch_offset: batch, error: insertErr },
          });
        }
      }
    }

    console.log(`[OFAC] Processed ${totalProcessed} entities across ${progCountryMap.size} programmes`);

    // ── 4. Derive SANCTIONS_US_OFAC_PROGRAMME jurisdiction indicators ──
    const countryStatus: Map<string, "COMPREHENSIVE" | "TARGETED"> = new Map();

    for (const [prog, codes] of progCountryMap) {
      const type = classifyProgramme(prog);
      for (const code of codes) {
        const current = countryStatus.get(code);
        if (type === "COMPREHENSIVE" || !current) {
          countryStatus.set(code, type === "COMPREHENSIVE" ? "COMPREHENSIVE" : (current || "TARGETED"));
        }
      }
    }

    for (const [prog] of progCountryMap) {
      const code = resolveCountryCode(prog);
      if (code) {
        const type = classifyProgramme(prog);
        const current = countryStatus.get(code);
        if (type === "COMPREHENSIVE" || !current) {
          countryStatus.set(code, type === "COMPREHENSIVE" ? "COMPREHENSIVE" : (current || "TARGETED"));
        }
      }
    }

    console.log(`[OFAC] Derived indicators for ${countryStatus.size} countries`);

    const { data: existingIndicators } = await supabase
      .from("jurisdiction_indicator")
      .select("*, jurisdiction:jurisdiction_id(country_code)")
      .eq("indicator_type", "SANCTIONS_US_OFAC_PROGRAMME");

    const existingByCode: Record<string, any> = {};
    for (const ind of existingIndicators || []) {
      const code = (ind as any).jurisdiction?.country_code;
      if (code) existingByCode[code] = ind;
    }

    const today = new Date().toISOString().split("T")[0];
    const newCodes = new Set(countryStatus.keys());
    const existingCodes = new Set(Object.keys(existingByCode));

    for (const [code, status] of countryStatus) {
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
        entity_count: 0,
        source: "OFAC",
        publish_date: publishDate,
        used_fallback: usedFallback,
      };

      const existing = existingByCode[code];
      const oldStatus = existing ? (existing.value_json as any)?.programme_status : null;
      const isNew = !existing;
      const isChanged = existing && oldStatus !== status;

      const { data: indicator } = await supabase
        .from("jurisdiction_indicator")
        .upsert(
          {
            jurisdiction_id: jur.id,
            indicator_type: "SANCTIONS_US_OFAC_PROGRAMME",
            value_json: valueJson,
            effective_date: today,
            source_name: "US OFAC",
            source_url: sourceUrl,
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
          indicator_type: "SANCTIONS_US_OFAC_PROGRAMME",
          old_value_json: existing?.value_json || null,
          new_value_json: valueJson,
          old_effective_date: existing?.effective_date || null,
          new_effective_date: today,
          source_name: "US OFAC",
          source_url: sourceUrl,
          source_snapshot_hash: snapshotHash,
          ingestion_run_id: runId,
        });
        totalChanged++;
      }
    }

    // REMOVED
    for (const code of existingCodes) {
      if (!newCodes.has(code)) {
        const existing = existingByCode[code];
        const removedValue = {
          programme_status: "NONE",
          entity_count: 0,
          source: "OFAC",
          delisted_date: today,
        };

        await supabase
          .from("jurisdiction_indicator")
          .update({
            value_json: removedValue,
            effective_date: today,
            source_url: sourceUrl,
            source_snapshot_hash: snapshotHash,
            retrieved_at: new Date().toISOString(),
            ingestion_run_id: runId,
            updated_at: new Date().toISOString(),
          })
          .eq("id", existing.id);

        await supabase.from("jurisdiction_indicator_change").insert({
          jurisdiction_indicator_id: existing.id,
          jurisdiction_id: existing.jurisdiction_id,
          indicator_type: "SANCTIONS_US_OFAC_PROGRAMME",
          old_value_json: existing.value_json,
          new_value_json: removedValue,
          old_effective_date: existing.effective_date,
          new_effective_date: today,
          source_name: "US OFAC",
          source_url: sourceUrl,
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
        metadata: {
          connector: "ofac_sls",
          triggered_at: (run.metadata as any)?.triggered_at,
          publish_date: publishDate,
          snapshot_hash: snapshotHash,
          used_fallback: usedFallback,
        },
      })
      .eq("id", runId);

    if (dataSourceId) {
      await supabase
        .from("data_source")
        .update({ last_run_at: new Date().toISOString(), last_run_status: "completed" })
        .eq("id", dataSourceId);
    }

    console.log(`[OFAC] Complete: ${totalProcessed} entities, ${totalChanged} indicator changes`);

    return new Response(
      JSON.stringify({
        success: true,
        run_id: runId,
        records_processed: totalProcessed,
        records_changed: totalChanged,
        programmes_found: progCountryMap.size,
        countries_with_indicators: countryStatus.size,
        publish_date: publishDate,
        used_fallback: usedFallback,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[OFAC] Fatal error:", error);

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
