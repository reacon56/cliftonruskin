import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Layers, Plus, Search, Building2, Globe, AlertTriangle } from "lucide-react";
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

export default function MasterEntitiesPage() {
  const [entities, setEntities] = useState<MasterEntity[]>([]);
  const [search, setSearch] = useState("");
  const [jurisdictionFilter, setJurisdictionFilter] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState({ canonical_name: "", jurisdiction_incorporation: "", canonical_registration_number: "", website: "", notes_internal: "" });
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => { load(); }, []);

  const load = async () => {
    const { data } = await (supabase as any)
      .from("master_entities")
      .select("*")
      .order("canonical_name");

    if (!data) return;

    // Get linked entity counts + conflict counts
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

    setEntities((data as any[]).map((d: any) => ({
      ...d,
      linked_count: countMap[d.id]?.linked ?? 0,
      conflict_count: countMap[d.id]?.conflicts ?? 0,
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
      load();
    }
  };

  const jurisdictions = [...new Set(entities.map((e) => e.jurisdiction_incorporation).filter(Boolean))] as string[];

  const filtered = entities.filter((e) => {
    const matchesSearch = e.canonical_name.toLowerCase().includes(search.toLowerCase()) ||
      (e.jurisdiction_incorporation ?? "").toLowerCase().includes(search.toLowerCase());
    const matchesJurisdiction = !jurisdictionFilter || e.jurisdiction_incorporation === jurisdictionFilter;
    return matchesSearch && matchesJurisdiction;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold text-foreground flex items-center gap-2">
            <Layers className="h-6 w-6 text-primary" />
            Master Entities
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Canonical entity records maintained by Clifton Ruskin
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)} size="sm" className="gap-1.5">
          <Plus className="h-4 w-4" /> New Master Entity
        </Button>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by name or jurisdiction…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {filtered.length === 0 ? (
        <div className="fvc-card text-center py-16">
          <Layers className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">
            {entities.length === 0 ? "No master entities yet. Create one to start linking client records." : "No results match your search."}
          </p>
        </div>
      ) : (
        <div className="grid gap-3">
          {filtered.map((me) => (
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
                    <span className="flex items-center gap-1">
                      <Globe className="h-3 w-3" /> {me.jurisdiction_incorporation}
                    </span>
                  )}
                  {me.canonical_registration_number && (
                    <span>Reg: {me.canonical_registration_number}</span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                {me.conflict_count! > 0 && (
                  <Badge variant="destructive" className="gap-1 text-[10px]">
                    <AlertTriangle className="h-3 w-3" /> {me.conflict_count} conflict{me.conflict_count !== 1 ? "s" : ""}
                  </Badge>
                )}
                <Badge variant="secondary" className="text-[10px]">
                  {me.linked_count} linked
                </Badge>
              </div>
            </button>
          ))}
        </div>
      )}

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
