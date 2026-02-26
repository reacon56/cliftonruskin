import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Layers, Plus, Search, Building2, Globe, AlertTriangle, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface MasterEntity {
  id: string;
  canonical_name: string;
  canonical_registration_number: string | null;
  jurisdiction_incorporation: string | null;
  registered_country: string | null;
  hq_country: string | null;
  website: string | null;
  notes_internal: string | null;
  created_at: string;
  linked_count?: number;
  conflict_count?: number;
}

interface ClientEntity {
  id: string;
  name: string;
  country: string | null;
  incorporation_country_name: string | null;
  registration_number: string | null;
  risk_tier: string;
  status: string;
  org_id: string;
  org_name: string;
  master_entity_id: string | null;
  has_master_conflict: boolean;
}

export default function MasterEntitiesPage() {
  const [masterEntities, setMasterEntities] = useState<MasterEntity[]>([]);
  const [clientEntities, setClientEntities] = useState<ClientEntity[]>([]);
  const [search, setSearch] = useState("");
  const [jurisdictionFilter, setJurisdictionFilter] = useState("");
  const [clientFilter, setClientFilter] = useState("");
  const [linkStatusFilter, setLinkStatusFilter] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState({ canonical_name: "", jurisdiction_incorporation: "", canonical_registration_number: "", website: "", notes_internal: "" });
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => { loadAll(); }, []);

  const loadAll = async () => {
    await Promise.all([loadMasters(), loadClientEntities()]);
  };

  const loadMasters = async () => {
    const { data } = await (supabase as any)
      .from("master_entities")
      .select("*")
      .order("canonical_name");

    if (!data) return;

    const ids = (data as any[]).map((d: any) => d.id);
    const { data: linked } = ids.length > 0
      ? await (supabase as any).from("entities").select("master_entity_id, has_master_conflict").in("master_entity_id", ids)
      : { data: [] as any[] };

    const countMap: Record<string, { linked: number; conflicts: number }> = {};
    ((linked ?? []) as any[]).forEach((e: any) => {
      if (!e.master_entity_id) return;
      if (!countMap[e.master_entity_id]) countMap[e.master_entity_id] = { linked: 0, conflicts: 0 };
      countMap[e.master_entity_id].linked++;
      if (e.has_master_conflict) countMap[e.master_entity_id].conflicts++;
    });

    setMasterEntities((data as any[]).map((d: any) => ({
      ...d,
      linked_count: countMap[d.id]?.linked ?? 0,
      conflict_count: countMap[d.id]?.conflicts ?? 0,
    })));
  };

  const loadClientEntities = async () => {
    // Internal users can see all entities across all orgs via RLS
    const { data: entities } = await supabase
      .from("entities")
      .select("id, name, country, incorporation_country_name, registration_number, risk_tier, status, org_id, master_entity_id, has_master_conflict")
      .order("name");

    if (!entities) return;

    // Get all org names
    const orgIds = [...new Set((entities as any[]).map((e: any) => e.org_id).filter(Boolean))];
    const { data: orgs } = orgIds.length > 0
      ? await supabase.from("organisations").select("id, name").in("id", orgIds)
      : { data: [] };
    const orgMap: Record<string, string> = {};
    (orgs ?? []).forEach((o: any) => { orgMap[o.id] = o.name; });

    setClientEntities((entities as any[]).map((e: any) => ({
      ...e,
      org_name: orgMap[e.org_id] || "Unknown",
      has_master_conflict: e.has_master_conflict ?? false,
    })));
  };

  const handleCreate = async () => {
    if (!form.canonical_name.trim()) return;
    const { error } = await (supabase as any).from("master_entities").insert(form);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Master entity created" });
      setCreateOpen(false);
      setForm({ canonical_name: "", jurisdiction_incorporation: "", canonical_registration_number: "", website: "", notes_internal: "" });
      loadAll();
    }
  };

  // Derived filter options
  const masterJurisdictions = [...new Set(masterEntities.map((e) => e.jurisdiction_incorporation).filter(Boolean))] as string[];
  const clientOrgs = [...new Set(clientEntities.map((e) => e.org_name).filter(Boolean))].sort();
  const clientJurisdictions = [...new Set(clientEntities.map((e) => e.incorporation_country_name ?? e.country).filter(Boolean))] as string[];
  const allJurisdictions = [...new Set([...masterJurisdictions, ...clientJurisdictions])].sort();

  const filteredMasters = masterEntities.filter((e) => {
    const matchesSearch = e.canonical_name.toLowerCase().includes(search.toLowerCase()) ||
      (e.jurisdiction_incorporation ?? "").toLowerCase().includes(search.toLowerCase());
    const matchesJurisdiction = !jurisdictionFilter || e.jurisdiction_incorporation === jurisdictionFilter;
    return matchesSearch && matchesJurisdiction;
  });

  const filteredClients = clientEntities.filter((e) => {
    const matchesSearch = e.name.toLowerCase().includes(search.toLowerCase());
    const juris = e.incorporation_country_name ?? e.country ?? "";
    const matchesJurisdiction = !jurisdictionFilter || juris === jurisdictionFilter;
    const matchesClient = !clientFilter || e.org_name === clientFilter;
    return matchesSearch && matchesJurisdiction && matchesClient;
  });

  const conflictCount = clientEntities.filter((e) => e.has_master_conflict).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold text-foreground flex items-center gap-2">
            <Layers className="h-6 w-6 text-primary" />
            Master Entities
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Canonical records &amp; cross-client entity view
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)} size="sm" className="gap-1.5">
          <Plus className="h-4 w-4" /> New Master Entity
        </Button>
      </div>

      <div className="flex items-center gap-3 text-xs">
        <Badge variant="secondary">{masterEntities.length} master records</Badge>
        <Badge variant="secondary">{clientEntities.length} client entities</Badge>
        {conflictCount > 0 && (
          <Badge variant="destructive" className="gap-1">
            <AlertTriangle className="h-3 w-3" /> {conflictCount} conflicts
          </Badge>
        )}
      </div>

      <Tabs defaultValue="all-entities">
        <TabsList className="bg-muted/50">
          <TabsTrigger value="all-entities">All Client Entities</TabsTrigger>
          <TabsTrigger value="master-records">Master Records</TabsTrigger>
        </TabsList>

        {/* ── All Client Entities Tab ── */}
        <TabsContent value="all-entities" className="mt-4 space-y-4">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search entities…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
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
                {allJurisdictions.map((j) => <SelectItem key={j} value={j}>{j}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {filteredClients.length === 0 ? (
            <div className="fvc-card text-center py-12">
              <Building2 className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">No entities match your filters.</p>
            </div>
          ) : (
            <div className="grid gap-2">
              {filteredClients.map((ce) => (
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
                    <Badge variant="outline" className="text-[10px]">Tier {ce.risk_tier}</Badge>
                    {ce.has_master_conflict && (
                      <Badge variant="destructive" className="text-[10px] gap-0.5">
                        <AlertTriangle className="h-3 w-3" /> Conflict
                      </Badge>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </TabsContent>

        {/* ── Master Records Tab ── */}
        <TabsContent value="master-records" className="mt-4 space-y-4">
          <div className="flex items-center gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search master records…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
            </div>
            <Select value={jurisdictionFilter} onValueChange={(v) => setJurisdictionFilter(v === "all" ? "" : v)}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="All jurisdictions" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All jurisdictions</SelectItem>
                {masterJurisdictions.sort().map((j) => <SelectItem key={j} value={j}>{j}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {filteredMasters.length === 0 ? (
            <div className="fvc-card text-center py-12">
              <Layers className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">
                {masterEntities.length === 0 ? "No master entities yet." : "No results match your search."}
              </p>
            </div>
          ) : (
            <div className="grid gap-2">
              {filteredMasters.map((me) => (
                <button
                  key={me.id}
                  onClick={() => navigate(`/master-entities/${me.id}`)}
                  className="fvc-card flex items-center gap-4 p-4 text-left hover:bg-muted/30 transition-colors w-full"
                >
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Building2 className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-foreground truncate">{me.canonical_name}</div>
                    <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                      {me.jurisdiction_incorporation && (
                        <span className="flex items-center gap-1"><Globe className="h-3 w-3" /> {me.jurisdiction_incorporation}</span>
                      )}
                      {me.canonical_registration_number && <span>Reg: {me.canonical_registration_number}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {me.conflict_count! > 0 && (
                      <Badge variant="destructive" className="gap-1 text-[10px]">
                        <AlertTriangle className="h-3 w-3" /> {me.conflict_count}
                      </Badge>
                    )}
                    <Badge variant="secondary" className="text-[10px]">{me.linked_count} linked</Badge>
                  </div>
                </button>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Create Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display text-xl">Create Master Entity</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="space-y-1.5">
              <Label>Canonical Name *</Label>
              <Input value={form.canonical_name} onChange={(e) => setForm({ ...form, canonical_name: e.target.value })} placeholder="e.g. Acme Corporation Ltd" />
            </div>
            <div className="space-y-1.5">
              <Label>Jurisdiction of Incorporation</Label>
              <Input value={form.jurisdiction_incorporation} onChange={(e) => setForm({ ...form, jurisdiction_incorporation: e.target.value })} placeholder="e.g. United Kingdom" />
            </div>
            <div className="space-y-1.5">
              <Label>Registration Number</Label>
              <Input value={form.canonical_registration_number} onChange={(e) => setForm({ ...form, canonical_registration_number: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Website</Label>
              <Input value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Internal Notes</Label>
              <Input value={form.notes_internal} onChange={(e) => setForm({ ...form, notes_internal: e.target.value })} />
            </div>
            <Button onClick={handleCreate} className="w-full" disabled={!form.canonical_name.trim()}>
              Create Master Entity
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
