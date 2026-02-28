import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Globe, Search } from "lucide-react";
import CountryCard from "@/components/CountryCard";

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

  const getQuickBadges = (jId: string) => {
    const jInd = indicatorMap.get(jId);
    if (!jInd) return null;
    const badges: React.ReactNode[] = [];
    const fatf = jInd.get("FATF_STATUS");
    if (fatf) {
      const variant = fatf.status === "MONITORING" || fatf.status === "BLACKLISTED" || fatf.status === "SUSPENDED" ? "destructive" as const : "secondary" as const;
      badges.push(<Badge key="fatf" variant={variant} className="text-[10px]">FATF: {fatf.status}</Badge>);
    }
    const cpi = jInd.get("CPI_SCORE");
    if (cpi?.score != null) {
      badges.push(<Badge key="cpi" variant="outline" className="text-[10px]">CPI: {cpi.score}</Badge>);
    }
    const sanctions = ["SANCTIONS_UK_PROGRAMME", "SANCTIONS_EU_PROGRAMME", "SANCTIONS_US_OFAC_PROGRAMME"]
      .filter((k) => jInd.get(k)?.status === "active");
    if (sanctions.length > 0) {
      badges.push(<Badge key="sanc" variant="destructive" className="text-[10px]"><AlertTriangle className="h-3 w-3 mr-0.5" />{sanctions.length} sanctions</Badge>);
    }
    return badges.length > 0 ? badges : null;
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="font-display text-2xl font-bold text-foreground flex items-center gap-2">
          <Globe className="h-6 w-6 text-primary" /> Jurisdictions
        </h1>
        <p className="text-sm text-muted-foreground mt-1">Explore jurisdiction risk indicators and intelligence profiles</p>
      </div>

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
          {filtered.map((j) => {
            const badges = getQuickBadges(j.id);
            return (
              <Card
                key={j.id}
                className="cursor-pointer hover:border-primary/40 transition-colors group"
                onClick={() => navigate(`/jurisdictions/${j.id}`)}
              >
                <CardContent className="pt-4 pb-3 px-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="text-2xl">{countryCodeToFlag(j.country_code) || "🌐"}</span>
                      <div className="min-w-0">
                        <div className="text-sm font-medium truncate">{j.country_name}</div>
                        <div className="text-[10px] text-muted-foreground uppercase tracking-wider">{j.country_code}</div>
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground/40 group-hover:text-primary transition-colors" />
                  </div>
                  {badges && <div className="flex flex-wrap gap-1 mt-2.5">{badges}</div>}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
