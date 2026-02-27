import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// EU Financial Sanctions Files (FSF) – consolidated XML
const EU_FSF_XML_URL =
  "https://webgate.ec.europa.eu/fsd/fsf/public/files/xmlFullSanctionsList_1_1/content?token=dG9rZW4tMjAxNw";

// EU comprehensive sanctions regimes
const COMPREHENSIVE_REGIMES = new Set([
  "russia", "syria", "north korea", "dprk", "iran", "belarus", "myanmar", "burma",
  "libya", "cuba", "somalia", "south sudan", "yemen",
  "central african republic", "democratic republic of the congo", "drc",
  "mali", "guinea", "haiti", "nicaragua", "zimbabwe", "afghanistan",
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
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function jsonChanged(a: unknown, b: unknown): boolean {
  return JSON.stringify(a) !== JSON.stringify(b);
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

// ── Parsing ──

interface EuFsfEntity {
  logicalId: string;
  entityType: string;
  primaryName: string;
  aliases: string[];
  countryCodes: string[];
  nationalityCodes: string[];
  addresses: Array<{ country: string; city?: string; countryCode?: string }>;
  regimeName: string;
  regimeType: "COMPREHENSIVE" | "TARGETED" | "NONE";
  designationDate: string | null;
  identifiers: Array<{ type: string; value: string }>;
  remark: string;
  rawXml: string;
}

function parseEntitiesFromXml(xmlText: string): {
  entities: EuFsfEntity[];
  schemaVersion: string;
  generationDate: string;
} {
  const schemaVersion =
    extractAttr(xmlText, "export:fullSanctionsList", "xsi:schemaLocation") ||
    extractFirstTag(xmlText, "export:schemaVersion") ||
    "1.1";
  const generationDate =
    extractAttr(xmlText, "export:fullSanctionsList", "generationDate") ||
    extractFirstTag(xmlText, "globalFileDate") ||
    new Date().toISOString();

  const entityBlocks = splitByTag(xmlText, "sanctionEntity");
  const entities: EuFsfEntity[] = [];

  for (const block of entityBlocks) {
    const logicalId =
      extractAttr(block, "sanctionEntity", "logicalId") ||
      extractAttr(block, "sanctionEntity", "euReferenceNumber") ||
      extractFirstTag(block, "logicalId") ||
      "";
    if (!logicalId) continue;

    const subjectType =
      extractFirstTag(block, "subjectType") ||
      extractAttr(block, "sanctionEntity", "subjectType") ||
      extractAttr(block, "nameAlias", "subjectType") ||
      "";

    // Names
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
      const firstName = extractFirstTag(block, "firstName");
      const lastName = extractFirstTag(block, "lastName");
      primaryName = [firstName, lastName].filter(Boolean).join(" ");
    }
    if (!primaryName) continue;

    // Citizenship
    const citizenshipBlocks = splitByTag(block, "citizenship");
    const nationalityCodes: string[] = [];
    for (const cb of citizenshipBlocks) {
      const cc = extractAttr(cb, "citizenship", "countryIso2Code");
      if (cc) nationalityCodes.push(cc.toUpperCase());
    }

    // Addresses
    const addressBlocks = splitByTag(block, "address");
    const countryCodes: string[] = [];
    const addresses: Array<{ country: string; city?: string; countryCode?: string }> = [];
    for (const ab of addressBlocks) {
      const cc = extractAttr(ab, "address", "countryIso2Code");
      const countryDesc = extractAttr(ab, "address", "countryDescription");
      const city = extractAttr(ab, "address", "city");
      const resolvedCode = cc?.toUpperCase() || resolveCountryCode(countryDesc) || undefined;
      if (resolvedCode && !countryCodes.includes(resolvedCode)) countryCodes.push(resolvedCode);
      if (countryDesc || resolvedCode) {
        addresses.push({ country: countryDesc || resolvedCode || "", city: city || undefined, countryCode: resolvedCode });
      }
    }

    // Identifiers (EU reference, passport, etc.)
    const idBlocks = splitByTag(block, "identification");
    const identifiers: Array<{ type: string; value: string }> = [];
    for (const idBlock of idBlocks) {
      const idType = extractAttr(idBlock, "identification", "identificationTypeDescription") ||
        extractAttr(idBlock, "identification", "identificationType");
      const idNumber = extractAttr(idBlock, "identification", "number") ||
        extractFirstTag(idBlock, "number");
      if (idType && idNumber) identifiers.push({ type: idType, value: idNumber });
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
      if (!isNaN(parsed.getTime())) designationDate = parsed.toISOString().split("T")[0];
    }

    const remark = extractFirstTag(block, "remark");

    entities.push({
      logicalId,
      entityType: subjectType.toLowerCase().includes("person") ? "Individual" : "Entity",
      primaryName: primaryName.substring(0, 500),
      aliases: aliases.slice(0, 20),
      countryCodes,
      nationalityCodes,
      addresses,
      regimeName,
      regimeType,
      designationDate,
      identifiers,
      remark,
      rawXml: block.substring(0, 5000),
    });
  }

  return { entities, schemaVersion, generationDate };
}

// ── Handler ──

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
      headers: { "User-Agent": "CliftonRuskin-EuFsfIngest/1.0", Accept: "application/xml" },
    });
    if (!xmlResponse.ok) throw new Error(`HTTP ${xmlResponse.status} fetching EU FSF XML`);

    const xmlText = await xmlResponse.text();
    const snapshotHash = await computeHash(xmlText);
    console.log(`[EU FSF] Fetched ${(xmlText.length / 1024 / 1024).toFixed(1)} MB`);

    // ── 2. Parse ──
    const { entities, schemaVersion, generationDate } = parseEntitiesFromXml(xmlText);
    console.log(`[EU FSF] Parsed ${entities.length} entities (schema ${schemaVersion}, date ${generationDate})`);

    if (entities.length === 0) throw new Error("No entities parsed from EU FSF data");

    // ── 3. Load existing EU_FSF entities for diff ──
    const existingMap = new Map<string, any>();
    let page = 0;
    const PAGE_SIZE = 1000;
    while (true) {
      const { data: rows } = await supabase
        .from("sanctions_entity")
        .select("*")
        .eq("source", "EU_FSF")
        .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);
      if (!rows || rows.length === 0) break;
      for (const r of rows) existingMap.set(r.source_record_id, r);
      if (rows.length < PAGE_SIZE) break;
      page++;
    }

    const seenIds = new Set<string>();
    const now = new Date().toISOString();

    // ── 4. Batch upsert with change tracking ──
    const BATCH_SIZE = 100;
    const regimeCountryMap: Map<string, Set<string>> = new Map();
    const touchedCountryCodes = new Set<string>();

    for (let batch = 0; batch < entities.length; batch += BATCH_SIZE) {
      const chunk = entities.slice(batch, batch + BATCH_SIZE);

      for (const e of chunk) {
        seenIds.add(e.logicalId);

        // Track regime → countries for jurisdiction indicators
        if (e.regimeName) {
          if (!regimeCountryMap.has(e.regimeName)) regimeCountryMap.set(e.regimeName, new Set());
          for (const cc of e.countryCodes) {
            regimeCountryMap.get(e.regimeName)!.add(cc);
            touchedCountryCodes.add(cc);
          }
          const regimeCode = resolveCountryCode(e.regimeName);
          if (regimeCode) {
            regimeCountryMap.get(e.regimeName)!.add(regimeCode);
            touchedCountryCodes.add(regimeCode);
          }
        }
        for (const cc of e.countryCodes) touchedCountryCodes.add(cc);

        const newRow = {
          source: "EU_FSF" as const,
          source_record_id: e.logicalId,
          list_name: e.regimeName || "EU FSF",
          name: e.primaryName,
          entity_type: e.entityType,
          country_json: e.addresses.length > 0 ? e.addresses : e.countryCodes.map(c => ({ country_code: c })),
          dob_json: e.designationDate ? [{ designation_date: e.designationDate }] : [],
          identifiers_json: e.identifiers,
          addresses_json: e.addresses,
          programmes_json: e.regimeName ? [{ name: e.regimeName, type: e.regimeType }] : [],
          raw_json: {
            remark: e.remark,
            aliases: e.aliases,
            nationality_codes: e.nationalityCodes,
            eu_reference_number: e.logicalId,
            xml_excerpt: e.rawXml,
          },
          active: true,
          last_seen_at: now,
        };

        const existing = existingMap.get(e.logicalId);

        if (existing) {
          const changed = jsonChanged(
            { name: existing.name, entity_type: existing.entity_type, country_json: existing.country_json, programmes_json: existing.programmes_json, identifiers_json: existing.identifiers_json },
            { name: newRow.name, entity_type: newRow.entity_type, country_json: newRow.country_json, programmes_json: newRow.programmes_json, identifiers_json: newRow.identifiers_json }
          );

          const { error: updateErr } = await supabase
            .from("sanctions_entity")
            .update({ ...newRow, updated_at: now })
            .eq("id", existing.id);

          if (updateErr) {
            console.error(`[EU FSF] Update error for ${e.logicalId}:`, updateErr);
          } else if (changed) {
            await supabase.from("sanctions_entity_change").insert({
              sanctions_entity_id: existing.id,
              change_type: "UPDATED",
              old_json: { name: existing.name, entity_type: existing.entity_type, country_json: existing.country_json, programmes_json: existing.programmes_json },
              new_json: { name: newRow.name, entity_type: newRow.entity_type, country_json: newRow.country_json, programmes_json: newRow.programmes_json },
              ingestion_run_id: runId,
            });
            totalChanged++;
          }
        } else {
          const { data: inserted, error: insertErr } = await supabase
            .from("sanctions_entity")
            .insert({ ...newRow, first_seen_at: now, created_at: now, updated_at: now })
            .select("id")
            .single();

          if (insertErr) {
            console.error(`[EU FSF] Insert error for ${e.logicalId}:`, insertErr);
            await supabase.from("ingestion_error").insert({
              ingestion_run_id: runId,
              error_message: `Insert error for ${e.logicalId}: ${insertErr.message}`,
              error_detail: { logicalId: e.logicalId, error: insertErr },
            });
          } else if (inserted) {
            await supabase.from("sanctions_entity_change").insert({
              sanctions_entity_id: inserted.id,
              change_type: "ADDED",
              old_json: null,
              new_json: { name: newRow.name, entity_type: newRow.entity_type, programmes_json: newRow.programmes_json },
              ingestion_run_id: runId,
            });
            totalChanged++;
          }
        }

        totalProcessed++;
      }
    }

    // ── 5. Soft-remove entities not seen in this run ──
    for (const [recordId, existing] of existingMap) {
      if (!seenIds.has(recordId) && existing.active) {
        await supabase
          .from("sanctions_entity")
          .update({ active: false, updated_at: now })
          .eq("id", existing.id);

        await supabase.from("sanctions_entity_change").insert({
          sanctions_entity_id: existing.id,
          change_type: "REMOVED",
          old_json: { name: existing.name, active: true },
          new_json: { name: existing.name, active: false },
          ingestion_run_id: runId,
        });
        totalChanged++;
      }
    }

    console.log(`[EU FSF] Processed ${totalProcessed} entities, ${totalChanged} changes across ${regimeCountryMap.size} regimes`);

    // ── 6. Derive SANCTIONS_EU_PROGRAMME jurisdiction indicators ──
    const countryStatus: Map<string, "COMPREHENSIVE" | "TARGETED"> = new Map();

    for (const [regime, codes] of regimeCountryMap) {
      const type = classifyRegime(regime);
      for (const code of codes) {
        const current = countryStatus.get(code);
        if (type === "COMPREHENSIVE" || !current) {
          countryStatus.set(code, type === "COMPREHENSIVE" ? "COMPREHENSIVE" : (current || "TARGETED"));
        }
      }
    }

    for (const [regime] of regimeCountryMap) {
      const code = resolveCountryCode(regime);
      if (code) {
        const type = classifyRegime(regime);
        const current = countryStatus.get(code);
        if (type === "COMPREHENSIVE" || !current) {
          countryStatus.set(code, type === "COMPREHENSIVE" ? "COMPREHENSIVE" : (current || "TARGETED"));
        }
      }
    }

    console.log(`[EU FSF] Derived indicators for ${countryStatus.size} countries`);

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
            retrieved_at: now,
            ingestion_run_id: runId,
            updated_at: now,
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

    // REMOVED indicators
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
            retrieved_at: now,
            ingestion_run_id: runId,
            updated_at: now,
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

    // ── 7. Update jurisdiction.last_refreshed_at for touched countries ──
    for (const code of touchedCountryCodes) {
      await supabase
        .from("jurisdiction")
        .update({ last_refreshed_at: now, updated_at: now })
        .eq("country_code", code);
    }

    // ── 8. Finalize ──
    await supabase
      .from("ingestion_run")
      .update({
        status: "completed",
        finished_at: now,
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
        .update({ last_run_at: now, last_run_status: "completed" })
        .eq("id", dataSourceId);
    }

    console.log(`[EU FSF] Complete: ${totalProcessed} entities, ${totalChanged} changes`);

    return new Response(
      JSON.stringify({
        success: true,
        run_id: runId,
        records_processed: totalProcessed,
        records_changed: totalChanged,
        regimes_found: regimeCountryMap.size,
        countries_with_indicators: countryStatus.size,
        jurisdictions_refreshed: touchedCountryCodes.size,
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
