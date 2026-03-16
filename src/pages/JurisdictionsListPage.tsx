import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Globe, Search } from "lucide-react";
import CountryCard from "@/components/CountryCard";
import { RegChangeAlertBanner } from "@/components/insight/RegChangeAlertBanner";
import { KnowledgePanelWidget } from "@/components/insight/KnowledgePanel";
import type { KnowledgeSection } from "@/components/insight/KnowledgePanel";

const JURISDICTION_KNOWLEDGE_SECTIONS: KnowledgeSection[] = [
  {
    title: "What the Score Means",
    content: "The CR-JURIS-1.0 composite score is a starting point, not a conclusion. A High score means enhanced scrutiny is required, not that you cannot engage.",
  },
  {
    title: "FATF Grey List",
    content: "Jurisdictions under increased monitoring have identified strategic deficiencies. Engagement is not prohibited but requires documented enhanced due diligence.",
  },
  {
    title: "FATF Black List (High-Risk Third Countries)",
    content: "UK regulators treat these as requiring the highest level of EDD. For most regulated firms, business with these jurisdictions requires senior sign-off.",
  },
  {
    title: "What Changes When a Jurisdiction is Listed",
    content: "Existing entities in that jurisdiction are flagged for immediate review. New commissions trigger the Enhanced DD pathway automatically.",
  },
  {
    title: "Quick Reference",
    type: "keyvalue",
    pairs: [
      { key: "Lists", value: "FATF Grey List | FATF Black List" },
      { key: "Regulation", value: "MLR 2017 Regulation 33" },
      { key: "Engine", value: "CR-JURIS-1.0 Spec" },
    ],
  },
];

type Jurisdiction = {
  id: string;
  country_code: string;
  country_name: string;
  updated_at: string;
};

type Indicator = {
  jurisdiction_id: string;
  indicator_type: string;
  value_json: any;
};

const FATF_OPTIONS = ["Any", "COMPLIANT", "MONITORING", "BLACKLISTED", "SUSPENDED", "REMOVED"];
const EU_HRTC_OPTIONS = ["Any", "Yes", "No"];
const SANCTIONS_OPTIONS = ["Any", "UK", "EU", "US OFAC"];

export default function JurisdictionsListPage() {
  const [search, setSearch] = useState("");
  const [fatfFilter, setFatfFilter] = useState("Any");
  const [euHrtcFilter, setEuHrtcFilter] = useState("Any");
  const [sanctionsFilter, setSanctionsFilter] = useState("Any");
  const [cpiRange, setCpiRange] = useState<[number, number]>([0, 100]);

  const { data: jurisdictions = [], isLoading } = useQuery({
    queryKey: ["jurisdictions-list"],
    queryFn: async () => {
      const { data, error } = await supabase.from("jurisdiction").select("*").order("country_name");
      if (error) throw error;
      return data as Jurisdiction[];
    },
  });

  const { data: indicators = [] } = useQuery({
    queryKey: ["jurisdictions-indicators-all"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("jurisdiction_indicator")
        .select("jurisdiction_id, indicator_type, value_json");
      if (error) throw error;
      return data as Indicator[];
    },
  });

  // Group indicators by jurisdiction
  const indicatorMap = useMemo(() => {
    const map = new Map<string, Map<string, any>>();
    for (const ind of indicators) {
      if (!map.has(ind.jurisdiction_id)) map.set(ind.jurisdiction_id, new Map());
      map.get(ind.jurisdiction_id)!.set(ind.indicator_type, ind.value_json);
    }
    return map;
  }, [indicators]);

  const filtered = useMemo(() => {
    return jurisdictions.filter((j) => {
      // Text search
      if (search && !j.country_name.toLowerCase().includes(search.toLowerCase()) && !j.country_code.toLowerCase().includes(search.toLowerCase())) return false;

      const jInd = indicatorMap.get(j.id);

      // FATF filter
      if (fatfFilter !== "Any") {
        const fatf = jInd?.get("FATF_STATUS");
        if (!fatf || (fatf.status?.toUpperCase() !== fatfFilter)) return false;
      }

      // EU AML HRTC
      if (euHrtcFilter !== "Any") {
        const hrtc = jInd?.get("EU_AML_HRTC");
        if (euHrtcFilter === "Yes" && !hrtc) return false;
        if (euHrtcFilter === "No" && hrtc) return false;
      }

      // Sanctions
      if (sanctionsFilter !== "Any") {
        const typeMap: Record<string, string> = { UK: "SANCTIONS_UK_PROGRAMME", EU: "SANCTIONS_EU_PROGRAMME", "US OFAC": "SANCTIONS_US_OFAC_PROGRAMME" };
        const key = typeMap[sanctionsFilter];
        const sanc = jInd?.get(key);
        if (!sanc || sanc.status !== "active") return false;
      }

      // CPI range
      const cpi = jInd?.get("CPI_SCORE");
      if (cpi?.score != null) {
        if (cpi.score < cpiRange[0] || cpi.score > cpiRange[1]) return false;
      }

      return true;
    });
  }, [jurisdictions, search, fatfFilter, euHrtcFilter, sanctionsFilter, cpiRange, indicatorMap]);

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="font-display text-2xl font-bold text-foreground flex items-center gap-2">
          <Globe className="h-6 w-6 text-primary" /> Jurisdictions
        </h1>
        <p className="text-sm text-muted-foreground mt-1">Explore jurisdiction risk indicators and intelligence profiles</p>
      </div>

      <RegChangeAlertBanner
        alertId="fatf-grey-feb-2025"
        text="FATF Grey List — February 2025 Update: FATF updated its list of jurisdictions under increased monitoring in February 2025. Review your entity register for exposure to newly listed jurisdictions. Grey list status triggers a risk floor of High in CR-JURIS-1.0."
        dateText="Updated: Feb 2025"
      />

      <KnowledgePanelWidget
        pageId="jurisdiction-library-profiles"
        title="How to Read a Jurisdiction Profile"
        sections={JURISDICTION_KNOWLEDGE_SECTIONS}
      />

      {/* Filters */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        <div className="relative lg:col-span-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={fatfFilter} onValueChange={setFatfFilter}>
          <SelectTrigger><SelectValue placeholder="FATF Status" /></SelectTrigger>
          <SelectContent>
            {FATF_OPTIONS.map((o) => <SelectItem key={o} value={o}>{o === "Any" ? "FATF: Any" : o}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={euHrtcFilter} onValueChange={setEuHrtcFilter}>
          <SelectTrigger><SelectValue placeholder="EU AML HRTC" /></SelectTrigger>
          <SelectContent>
            {EU_HRTC_OPTIONS.map((o) => <SelectItem key={o} value={o}>{o === "Any" ? "EU HRTC: Any" : `EU HRTC: ${o}`}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={sanctionsFilter} onValueChange={setSanctionsFilter}>
          <SelectTrigger><SelectValue placeholder="Sanctions" /></SelectTrigger>
          <SelectContent>
            {SANCTIONS_OPTIONS.map((o) => <SelectItem key={o} value={o}>{o === "Any" ? "Sanctions: Any" : `Sanctions: ${o}`}</SelectItem>)}
          </SelectContent>
        </Select>
        <div className="space-y-1">
          <div className="flex items-center justify-between text-[10px] text-muted-foreground">
            <span>CPI Range</span>
            <span>{cpiRange[0]}–{cpiRange[1]}</span>
          </div>
          <Slider min={0} max={100} step={1} value={cpiRange} onValueChange={(v) => setCpiRange(v as [number, number])} />
        </div>
      </div>

      {/* Results */}
      {isLoading ? (
        <p className="text-sm text-muted-foreground text-center py-12">Loading jurisdictions…</p>
      ) : filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-12">No jurisdictions match filters</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map((j) => (
            <CountryCard
              key={j.id}
              jurisdictionId={j.id}
              preloaded={{
                countryCode: j.country_code,
                countryName: j.country_name,
                indicators: indicatorMap.get(j.id),
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
