import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Building2, Save, Globe, AlertTriangle, Link2 } from "lucide-react";

interface LinkedEntity {
  id: string;
  name: string;
  org_name?: string;
  has_master_conflict: boolean;
  country: string | null;
}

export default function MasterEntityDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [entity, setEntity] = useState<any>(null);
  const [form, setForm] = useState<any>({});
  const [linked, setLinked] = useState<LinkedEntity[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => { if (id) load(); }, [id]);

  const load = async () => {
    const { data } = await supabase
      .from("master_entities" as any)
      .select("*")
      .eq("id", id!)
      .single();

    if (!data) return;
    setEntity(data);
    setForm({ ...data });

    // Load linked client entities
    const { data: linkedData } = await supabase
      .from("entities")
      .select("id, name, has_master_conflict, country, org_id")
      .eq("master_entity_id" as any, id!);

    if (linkedData) {
      // Get org names
      const orgIds = [...new Set((linkedData as any[]).map((e: any) => e.org_id).filter(Boolean))];
      const { data: orgs } = orgIds.length > 0
        ? await supabase.from("organisations").select("id, name").in("id", orgIds)
        : { data: [] };
      const orgMap: Record<string, string> = {};
      (orgs ?? []).forEach((o: any) => { orgMap[o.id] = o.name; });

      setLinked((linkedData as any[]).map((e: any) => ({
        id: e.id,
        name: e.name,
        org_name: orgMap[e.org_id] || "Unknown",
        has_master_conflict: e.has_master_conflict ?? false,
        country: e.country,
      })));
    }
  };

  const handleSave = async () => {
    setSaving(true);
    const { canonical_name, jurisdiction_incorporation, canonical_registration_number, website, notes_internal,
      registered_address_line1, registered_city, registered_country, registered_postcode,
      hq_address_line1, hq_city, hq_country, hq_postcode } = form;

    const { error } = await supabase.from("master_entities" as any).update({
      canonical_name, jurisdiction_incorporation, canonical_registration_number, website, notes_internal,
      registered_address_line1, registered_city, registered_country, registered_postcode,
      hq_address_line1, hq_city, hq_country, hq_postcode, updated_at: new Date().toISOString(),
    } as any).eq("id", id!);

    setSaving(false);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Master entity updated" });
      load();
    }
  };

  if (!entity) {
    return <div className="flex items-center justify-center py-20"><div className="text-muted-foreground text-sm">Loading…</div></div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate("/master-entities")} className="h-8 w-8">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h1 className="font-display text-2xl font-semibold text-foreground flex items-center gap-2">
            <Building2 className="h-6 w-6 text-primary" />
            {entity.canonical_name}
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">Master Entity Record</p>
        </div>
        <Button onClick={handleSave} disabled={saving} size="sm" className="gap-1.5">
          <Save className="h-4 w-4" /> {saving ? "Saving…" : "Save"}
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main form */}
        <div className="lg:col-span-2 space-y-6">
          <div className="fvc-card p-5 space-y-4">
            <h3 className="text-[10px] uppercase tracking-[0.08em] text-muted-foreground font-semibold">Core Details</h3>
            <div className="space-y-1.5">
              <Label>Canonical Name</Label>
              <Input value={form.canonical_name || ""} onChange={(e) => setForm({ ...form, canonical_name: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Jurisdiction of Incorporation</Label>
                <Input value={form.jurisdiction_incorporation || ""} onChange={(e) => setForm({ ...form, jurisdiction_incorporation: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Registration Number</Label>
                <Input value={form.canonical_registration_number || ""} onChange={(e) => setForm({ ...form, canonical_registration_number: e.target.value })} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Website</Label>
              <Input value={form.website || ""} onChange={(e) => setForm({ ...form, website: e.target.value })} />
            </div>
          </div>

          <div className="fvc-card p-5 space-y-4">
            <h3 className="text-[10px] uppercase tracking-[0.08em] text-muted-foreground font-semibold">Registered Address</h3>
            <Input placeholder="Address" value={form.registered_address_line1 || ""} onChange={(e) => setForm({ ...form, registered_address_line1: e.target.value })} />
            <div className="grid grid-cols-3 gap-3">
              <Input placeholder="City" value={form.registered_city || ""} onChange={(e) => setForm({ ...form, registered_city: e.target.value })} />
              <Input placeholder="Postcode" value={form.registered_postcode || ""} onChange={(e) => setForm({ ...form, registered_postcode: e.target.value })} />
              <Input placeholder="Country" value={form.registered_country || ""} onChange={(e) => setForm({ ...form, registered_country: e.target.value })} />
            </div>
          </div>

          <div className="fvc-card p-5 space-y-4">
            <h3 className="text-[10px] uppercase tracking-[0.08em] text-muted-foreground font-semibold">HQ Address</h3>
            <Input placeholder="Address" value={form.hq_address_line1 || ""} onChange={(e) => setForm({ ...form, hq_address_line1: e.target.value })} />
            <div className="grid grid-cols-3 gap-3">
              <Input placeholder="City" value={form.hq_city || ""} onChange={(e) => setForm({ ...form, hq_city: e.target.value })} />
              <Input placeholder="Postcode" value={form.hq_postcode || ""} onChange={(e) => setForm({ ...form, hq_postcode: e.target.value })} />
              <Input placeholder="Country" value={form.hq_country || ""} onChange={(e) => setForm({ ...form, hq_country: e.target.value })} />
            </div>
          </div>

          <div className="fvc-card p-5 space-y-4">
            <h3 className="text-[10px] uppercase tracking-[0.08em] text-muted-foreground font-semibold">Internal Notes</h3>
            <Textarea rows={4} value={form.notes_internal || ""} onChange={(e) => setForm({ ...form, notes_internal: e.target.value })} placeholder="Internal-only notes about this entity…" />
          </div>
        </div>

        {/* Linked entities sidebar */}
        <div className="space-y-4">
          <div className="fvc-card p-5">
            <h3 className="text-[10px] uppercase tracking-[0.08em] text-muted-foreground font-semibold mb-3 flex items-center gap-1.5">
              <Link2 className="h-3.5 w-3.5" /> Linked Client Entities
            </h3>
            {linked.length === 0 ? (
              <p className="text-sm text-muted-foreground">No client entities linked yet.</p>
            ) : (
              <div className="space-y-2">
                {linked.map((le) => (
                  <button
                    key={le.id}
                    onClick={() => navigate(`/entities/${le.id}`)}
                    className="w-full text-left p-3 rounded-md border border-border hover:bg-muted/30 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-foreground truncate">{le.name}</span>
                      {le.has_master_conflict && (
                        <AlertTriangle className="h-3.5 w-3.5 text-destructive flex-shrink-0" />
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                      <span>{le.org_name}</span>
                      {le.country && (
                        <span className="flex items-center gap-0.5">
                          <Globe className="h-3 w-3" /> {le.country}
                        </span>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
