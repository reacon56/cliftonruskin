import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// EU Financial Sanctions Files (FSF) – consolidated XML
const EU_FSF_XML_URL =
  "https://webgate.ec.europa.eu/fsd/fsf/public/files/xmlFullSanctionsList_1_1/content?token=dG9rZW4tMjAxNw";

// ── Country name → ISO-2 mapping (subset; extend as needed) ──
const NAME_TO_ISO2: Record<string, string> = {
  "afghanistan": "AF", "albania": "AL", "algeria": "DZ", "angola": "AO",
  "belarus": "BY", "bosnia and herzegovina": "BA", "burma": "MM", "myanmar": "MM",
  "burundi": "BI", "cambodia": "KH", "central african republic": "CF",
  "chad": "TD", "china": "CN", "comoros": "KM", "congo": "CG",
  "cuba": "CU", "democratic republic of the congo": "CD", "drc": "CD",
  "egypt": "EG", "eritrea": "ER", "ethiopia": "ET",
  "guinea": "GN", "guinea-bissau": "GW", "haiti": "HT",
  "iran": "IR", "iraq": "IQ", "lebanon": "LB", "libya": "LY",
  "mali": "ML", "moldova": "MD", "nicaragua": "NI", "niger": "NE",
  "north korea": "KP", "dprk": "KP", "russia": "RU", "russian federation": "RU",
  "rwanda": "RW", "somalia": "SO", "south sudan": "SS", "sudan": "SD",
  "syria": "SY", "syrian arab republic": "SY", "tunisia": "TN",
  "turkey": "TR", "türkiye": "TR", "turkiye": "TR",
  "ukraine": "UA", "venezuela": "VE", "yemen": "YE", "zimbabwe": "ZW",
  "united kingdom": "GB", "uk": "GB", "united states": "US", "usa": "US",
  "france": "FR", "germany": "DE", "italy": "IT", "spain": "ES",
  "netherlands": "NL", "belgium": "BE", "poland": "PL", "romania": "RO",
  "greece": "GR", "portugal": "PT", "sweden": "SE", "austria": "AT",
  "finland": "FI", "denmark": "DK", "ireland": "IE", "croatia": "HR",
  "bulgaria": "BG", "czech republic": "CZ", "czechia": "CZ",
  "hungary": "HU", "slovakia": "SK", "slovenia": "SI",
  "estonia": "EE", "latvia": "LV", "lithuania": "LT",
  "luxembourg": "LU", "malta": "MT", "cyprus": "CY",
  "saudi arabia": "SA", "united arab emirates": "AE", "uae": "AE",
  "pakistan": "PK", "india": "IN", "japan": "JP", "south korea": "KR",
  "hong kong": "HK", "singapore": "SG", "brazil": "BR", "mexico": "MX",
  "south africa": "ZA", "nigeria": "NG", "kenya": "KE", "tanzania": "TZ",
  "colombia": "CO", "argentina": "AR", "chile": "CL", "peru": "PE",
};

// EU comprehensive sanctions regimes
const COMPREHENSIVE_REGIMES = new Set([
  "russia", "syria", "north korea", "dprk", "iran", "belarus", "myanmar", "burma",
  "libya", "cuba", "somalia", "south sudan", "yemen",
  "central african republic", "democratic republic of the congo", "drc",
  "mali", "guinea", "haiti", "nicaragua", "zimbabwe", "afghanistan",
]);

function resolveCountryCode(name: string): string | null {
  if (!name) return null;
  const cleaned = name.trim().toLowerCase().replace(/\s+/g, " ");
  if (NAME_TO_ISO2[cleaned]) return NAME_TO_ISO2[cleaned];
  if (/^[A-Z]{2}$/.test(name.trim())) return name.trim();
  return null;
}

function classifyRegime(regimeName: string): "COMPREHENSIVE" | "TARGETED" | "NONE" {
  if (!regimeName) return "NONE";
  const lower = regimeName.toLowerCase();
  for (const r of COMPREHENSIVE_REGIMES) {
    if (lower.includes(r)) return "COMPREHENSIVE";
  }
  return "TARGETED";
}

async function computeHash(content: string): Promise<string> {
  const data = new TextEncoder().encode(content);
  const buf = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

// ── Minimal XML helpers (no external deps) ──

/** Extract all occurrences of a tag's inner text from XML string */
function extractTagValues(xml: string, tag: string): string[] {
  const results: string[] = [];
  const regex = new RegExp(`<${tag}[^>]*>([^<]*)</${tag}>`, "gi");
  let match: RegExpExecArray | null;
  while ((match = regex.exec(xml)) !== null) {
    if (match[1].trim()) results.push(match[1].trim());
  }
  return results;
}

/** Extract first occurrence of a tag's inner text */
function extractFirstTag(xml: string, tag: string): string {
  const match = xml.match(new RegExp(`<${tag}[^>]*>([^<]*)</${tag}>`, "i"));
  return match ? match[1].trim() : "";
}

/** Extract attribute value from a tag */
function extractAttr(xml: string, tag: string, attr: string): string {
  const match = xml.match(new RegExp(`<${tag}[^>]*\\s${attr}="([^"]*)"`, "i"));
  return match ? match[1].trim() : "";
}

/** Split XML into blocks by a given tag */
function splitByTag(xml: string, tag: string): string[] {
  const parts: string[] = [];
  const regex = new RegExp(`<${tag}[\\s>]`, "gi");
  const endRegex = new RegExp(`</${tag}>`, "gi");
  let startMatch: RegExpExecArray | null;
  while ((startMatch = regex.exec(xml)) !== null) {
    // Find the corresponding closing tag
    endRegex.lastIndex = startMatch.index;
    const endMatch = endRegex.exec(xml);
    if (endMatch) {
      parts.push(xml.substring(startMatch.index, endMatch.index + endMatch[0].length));
    }
  }
  return parts;
}

interface ParsedEntity {
  logicalId: string;
  subjectType: string;
  primaryName: string;
  aliases: string[];
  countryCodes: string[];
  nationalityCodes: string[];
  regimeName: string;
  regimeType: "COMPREHENSIVE" | "TARGETED" | "NONE";
  designationDate: string | null;
  remark: string;
  rawXml: string;
}

function parseEntitiesFromXml(xmlText: string): { entities: ParsedEntity[]; schemaVersion: string; generationDate: string } {
  // Extract schema version and generation date from header
  const schemaVersion =
    extractAttr(xmlText, "export:sanctionEntity", "xsi:schemaLocation") ||
    extractFirstTag(xmlText, "export:schemaVersion") ||
    extractAttr(xmlText, "export:fullSanctionsList", "generationDate") ||
    "1.1";
  const generationDate =
    extractAttr(xmlText, "export:fullSanctionsList", "generationDate") ||
    extractFirstTag(xmlText, "globalFileDate") ||
    new Date().toISOString();

  // The EU FSF XML uses <sanctionEntity> blocks
  const entityBlocks = splitByTag(xmlText, "sanctionEntity");
  const entities: ParsedEntity[] = [];

  for (const block of entityBlocks) {
    // Logical ID
    const logicalId =
      extractAttr(block, "sanctionEntity", "logicalId") ||
      extractAttr(block, "sanctionEntity", "euReferenceNumber") ||
      extractFirstTag(block, "logicalId") ||
      "";

    if (!logicalId) continue;

    // Subject type (person / entity / vessel)
    const subjectType =
      extractFirstTag(block, "subjectType") ||
      extractAttr(block, "sanctionEntity", "subjectType") ||
      extractAttr(block, "nameAlias", "subjectType") ||
      "";

    // Names — EU XML uses <nameAlias> elements
    const nameAliasBlocks = splitByTag(block, "nameAlias");
    let primaryName = "";
    const aliases: string[] = [];

    for (const na of nameAliasBlocks) {
      const wholeName = extractAttr(na, "nameAlias", "wholeName");
      const isStrong = extractAttr(na, "nameAlias", "strong") === "true";

      if (!wholeName) continue;

      if (!primaryName || isStrong) {
        if (primaryName) aliases.push(primaryName);
        primaryName = wholeName;
      } else {
        aliases.push(wholeName);
      }
    }

    if (!primaryName) {
      // Fallback to firstName/lastName tags
      const firstName = extractFirstTag(block, "firstName");
      const lastName = extractFirstTag(block, "lastName");
      primaryName = [firstName, lastName].filter(Boolean).join(" ");
    }

    if (!primaryName) continue;

    // Citizenship / country
    const citizenshipBlocks = splitByTag(block, "citizenship");
    const nationalityCodes: string[] = [];
    for (const cb of citizenshipBlocks) {
      const cc = extractAttr(cb, "citizenship", "countryIso2Code");
      if (cc) nationalityCodes.push(cc.toUpperCase());
    }

    // Address country codes
    const addressBlocks = splitByTag(block, "address");
    const countryCodes: string[] = [];
    for (const ab of addressBlocks) {
      const cc = extractAttr(ab, "address", "countryIso2Code");
      if (cc && !countryCodes.includes(cc.toUpperCase())) {
        countryCodes.push(cc.toUpperCase());
      }
      // Also try country description
      const countryDesc = extractAttr(ab, "address", "countryDescription");
      if (countryDesc) {
        const resolved = resolveCountryCode(countryDesc);
        if (resolved && !countryCodes.includes(resolved)) {
          countryCodes.push(resolved);
        }
      }
    }

    // Regime / programme
    const regimeName =
      extractFirstTag(block, "programme") ||
      extractAttr(block, "sanctionEntity", "programme") ||
      extractFirstTag(block, "regulationSummary") ||
      "";

    const regimeType = classifyRegime(regimeName);

    // Designation date
    let designationDate: string | null = null;
    const dateStr =
      extractFirstTag(block, "designationDate") ||
      extractAttr(block, "regulation", "publicationDate") ||
      "";
    if (dateStr) {
      const parsed = new Date(dateStr);
      if (!isNaN(parsed.getTime())) {
        designationDate = parsed.toISOString().split("T")[0];
      }
    }

    // Remark
    const remark = extractFirstTag(block, "remark");

    entities.push({
      logicalId,
      subjectType: subjectType.toLowerCase().includes("person") ? "Individual" : "Entity",
      primaryName: primaryName.substring(0, 500),
      aliases: aliases.slice(0, 20),
      countryCodes,
      nationalityCodes,
      regimeName,
      regimeType,
      designationDate,
      remark,
      rawXml: block.substring(0, 5000), // Truncate for storage
    });
  }

  return { entities, schemaVersion, generationDate };
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
      metadata: { connector: "eu_fsf", triggered_at: new Date().toISOString() },
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
    // ── 1. Fetch XML ──
    console.log("[EU FSF] Fetching XML…");
    const xmlResponse = await fetch(EU_FSF_XML_URL, {
      headers: { "User-Agent": "CliftonRuskin-SanctionsIngest/1.0", Accept: "application/xml" },
    });

    if (!xmlResponse.ok) {
      throw new Error(`HTTP ${xmlResponse.status} fetching EU FSF XML`);
    }

    const xmlText = await xmlResponse.text();
    const snapshotHash = await computeHash(xmlText);
    console.log(`[EU FSF] Fetched ${(xmlText.length / 1024 / 1024).toFixed(1)} MB`);

    // ── 2. Parse ──
    const { entities, schemaVersion, generationDate } = parseEntitiesFromXml(xmlText);
    console.log(`[EU FSF] Parsed ${entities.length} entities (schema ${schemaVersion}, date ${generationDate})`);

    // ── 3. Mark existing EU_FSF entities as potentially stale ──
    await supabase
      .from("sanctions_entity")
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq("source_list", "EU_FSF");

    // ── 4. Batch upsert ──
    const BATCH_SIZE = 100;
    const regimeCountryMap: Map<string, Set<string>> = new Map();

    for (let batch = 0; batch < entities.length; batch += BATCH_SIZE) {
      const chunk = entities.slice(batch, batch + BATCH_SIZE);
      const rows: Array<Record<string, unknown>> = [];

      for (const e of chunk) {
        // Track regime → countries
        if (e.regimeName) {
          if (!regimeCountryMap.has(e.regimeName)) regimeCountryMap.set(e.regimeName, new Set());
          for (const cc of e.countryCodes) regimeCountryMap.get(e.regimeName)!.add(cc);
          const regimeCode = resolveCountryCode(e.regimeName);
          if (regimeCode) regimeCountryMap.get(e.regimeName)!.add(regimeCode);
        }

        rows.push({
          source_list: "EU_FSF",
          source_entity_id: e.logicalId,
          entity_type: e.subjectType,
          primary_name: e.primaryName,
          aliases: e.aliases,
          nationality_codes: e.nationalityCodes,
          country_codes: e.countryCodes,
          regime_name: e.regimeName || null,
          regime_type: e.regimeType,
          designation_date: e.designationDate,
          designation_source: "EU Financial Sanctions Files",
          raw_data: { remark: e.remark, xml_excerpt: e.rawXml },
          ingestion_run_id: runId,
          source_url: EU_FSF_XML_URL,
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
          console.error(`[EU FSF] Batch insert error:`, insertErr);
          await supabase.from("ingestion_error").insert({
            ingestion_run_id: runId,
            error_message: `Batch insert error at offset ${batch}: ${insertErr.message}`,
            error_detail: { batch_offset: batch, error: insertErr },
          });
        }
      }
    }

    console.log(`[EU FSF] Processed ${totalProcessed} entities across ${regimeCountryMap.size} regimes`);

    // ── 5. Derive SANCTIONS_EU_PROGRAMME jurisdiction indicators ──
    const countryRegimeStatus: Map<string, "COMPREHENSIVE" | "TARGETED"> = new Map();

    for (const [regime, codes] of regimeCountryMap) {
      const type = classifyRegime(regime);
      for (const code of codes) {
        const current = countryRegimeStatus.get(code);
        if (type === "COMPREHENSIVE" || !current) {
          countryRegimeStatus.set(code, type === "COMPREHENSIVE" ? "COMPREHENSIVE" : (current || "TARGETED"));
        }
      }
    }

    // Also resolve regime name itself
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

    console.log(`[EU FSF] Derived indicators for ${countryRegimeStatus.size} countries`);

    // Get existing EU indicators
    const { data: existingIndicators } = await supabase
      .from("jurisdiction_indicator")
      .select("*, jurisdiction:jurisdiction_id(country_code)")
      .eq("indicator_type", "SANCTIONS_EU_PROGRAMME");

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
        source: "EU_FSF",
        schema_version: schemaVersion,
        generation_date: generationDate,
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
            indicator_type: "SANCTIONS_EU_PROGRAMME",
            value_json: valueJson,
            effective_date: today,
            source_name: "EU FSF",
            source_url: EU_FSF_XML_URL,
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
          indicator_type: "SANCTIONS_EU_PROGRAMME",
          old_value_json: existing?.value_json || null,
          new_value_json: valueJson,
          old_effective_date: existing?.effective_date || null,
          new_effective_date: today,
          source_name: "EU FSF",
          source_url: EU_FSF_XML_URL,
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
          source: "EU_FSF",
          delisted_date: today,
        };

        await supabase
          .from("jurisdiction_indicator")
          .update({
            value_json: removedValue,
            effective_date: today,
            source_url: EU_FSF_XML_URL,
            source_snapshot_hash: snapshotHash,
            retrieved_at: new Date().toISOString(),
            ingestion_run_id: runId,
            updated_at: new Date().toISOString(),
          })
          .eq("id", existing.id);

        await supabase.from("jurisdiction_indicator_change").insert({
          jurisdiction_indicator_id: existing.id,
          jurisdiction_id: existing.jurisdiction_id,
          indicator_type: "SANCTIONS_EU_PROGRAMME",
          old_value_json: existing.value_json,
          new_value_json: removedValue,
          old_effective_date: existing.effective_date,
          new_effective_date: today,
          source_name: "EU FSF",
          source_url: EU_FSF_XML_URL,
          source_snapshot_hash: snapshotHash,
          ingestion_run_id: runId,
        });
        totalChanged++;
      }
    }

    // ── 6. Finalize ──
    await supabase
      .from("ingestion_run")
      .update({
        status: "completed",
        finished_at: new Date().toISOString(),
        records_processed: totalProcessed,
        records_changed: totalChanged,
        metadata: {
          connector: "eu_fsf",
          triggered_at: (run.metadata as any)?.triggered_at,
          schema_version: schemaVersion,
          generation_date: generationDate,
          snapshot_hash: snapshotHash,
        },
      })
      .eq("id", runId);

    if (dataSourceId) {
      await supabase
        .from("data_source")
        .update({ last_run_at: new Date().toISOString(), last_run_status: "completed" })
        .eq("id", dataSourceId);
    }

    console.log(`[EU FSF] Complete: ${totalProcessed} entities, ${totalChanged} indicator changes`);

    return new Response(
      JSON.stringify({
        success: true,
        run_id: runId,
        records_processed: totalProcessed,
        records_changed: totalChanged,
        regimes_found: regimeCountryMap.size,
        countries_with_indicators: countryRegimeStatus.size,
        schema_version: schemaVersion,
        generation_date: generationDate,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[EU FSF] Fatal error:", error);

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
