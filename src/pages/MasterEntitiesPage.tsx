import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Layers, Search, Building2, Globe, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface ClientEntity {
  id: string;
  name: string;
  country: string | null;
  incorporation_country_name: string | null;
  registration_number: string | null;
  risk_tier: string;
  status: string;
  entity_type: string;
  org_id: string;
  org_name: string;
}

export default function MasterEntitiesPage() {
  const [clientEntities, setClientEntities] = useState<ClientEntity[]>([]);
  const [search, setSearch] = useState("");
  const [jurisdictionFilter, setJurisdictionFilter] = useState("");
  const [clientFilter, setClientFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const navigate = useNavigate();

  useEffect(() => { loadClientEntities(); }, []);

  const loadClientEntities = async () => {
    const { data: entities } = await supabase
      .from("entities")
      .select("id, name, country, incorporation_country_name, registration_number, risk_tier, status, org_id, entity_type")
      .order("name");

    if (!entities) return;

    const orgIds = [...new Set((entities as any[]).map((e: any) => e.org_id).filter(Boolean))];
    const { data: orgs } = orgIds.length > 0
      ? await supabase.from("organisations").select("id, name").in("id", orgIds)
      : { data: [] };
    const orgMap: Record<string, string> = {};
    (orgs ?? []).forEach((o: any) => { orgMap[o.id] = o.name; });

    setClientEntities((entities as any[]).map((e: any) => ({
      ...e,
      org_name: orgMap[e.org_id] || "Unknown",
    })));
  };

  const clientOrgs = [...new Set(clientEntities.map((e) => e.org_name).filter(Boolean))].sort();
  const jurisdictions = [...new Set(clientEntities.map((e) => e.incorporation_country_name ?? e.country).filter(Boolean))] as string[];
  const entityTypes = [...new Set(clientEntities.map((e) => e.entity_type).filter(Boolean))].sort();

  const filtered = clientEntities.filter((e) => {
    const matchesSearch = e.name.toLowerCase().includes(search.toLowerCase()) ||
      (e.registration_number ?? "").toLowerCase().includes(search.toLowerCase());
    const juris = e.incorporation_country_name ?? e.country ?? "";
    const matchesJurisdiction = !jurisdictionFilter || juris === jurisdictionFilter;
    const matchesClient = !clientFilter || e.org_name === clientFilter;
    const matchesType = !typeFilter || e.entity_type === typeFilter;
    return matchesSearch && matchesJurisdiction && matchesClient && matchesType;
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold text-foreground flex items-center gap-2">
          <Layers className="h-6 w-6 text-primary" />
          Master Entity Register
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          All entities across all client organisations
        </p>
      </div>

      <div className="flex items-center gap-3 text-xs">
        <Badge variant="secondary">{clientEntities.length} total entities</Badge>
        <Badge variant="secondary">{clientOrgs.length} clients</Badge>
        <Badge variant="secondary">{jurisdictions.length} jurisdictions</Badge>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search by name or reg number…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={clientFilter} onValueChange={(v) => setClientFilter(v === "all" ? "" : v)}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="All clients" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All clients</SelectItem>
            {clientOrgs.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={jurisdictionFilter} onValueChange={(v) => setJurisdictionFilter(v === "all" ? "" : v)}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="All jurisdictions" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All jurisdictions</SelectItem>
            {jurisdictions.sort().map((j) => <SelectItem key={j} value={j}>{j}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v === "all" ? "" : v)}>
          <SelectTrigger className="w-36">
            <SelectValue placeholder="All types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All types</SelectItem>
            {entityTypes.map((t) => <SelectItem key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <div className="fvc-card text-center py-12">
          <Building2 className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">No entities match your filters.</p>
        </div>
      ) : (
        <div className="grid gap-2">
          {filtered.map((ce) => (
            <button
              key={ce.id}
              onClick={() => navigate(`/entities/${ce.id}`)}
              className="fvc-card flex items-center gap-4 p-4 text-left hover:bg-muted/30 transition-colors w-full"
            >
              <div className="h-9 w-9 rounded-lg bg-muted/60 flex items-center justify-center flex-shrink-0">
                <Building2 className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-foreground truncate text-sm">{ce.name}</div>
                <div className="flex items-center gap-3 mt-0.5 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Users className="h-3 w-3" /> {ce.org_name}
                  </span>
                  {(ce.incorporation_country_name || ce.country) && (
                    <span className="flex items-center gap-1">
                      <Globe className="h-3 w-3" /> {ce.incorporation_country_name || ce.country}
                    </span>
                  )}
                  {ce.registration_number && <span>Reg: {ce.registration_number}</span>}
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <Badge variant="outline" className="text-[10px]">{ce.entity_type}</Badge>
                <Badge variant="outline" className="text-[10px]">Tier {ce.risk_tier}</Badge>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
