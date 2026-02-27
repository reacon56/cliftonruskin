import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Globe, Plus, Pencil, Calendar, FileText, Shield, Scale, AlertTriangle, Database, Search } from "lucide-react";
import JurisdictionAlertsPanel from "@/components/JurisdictionAlertsPanel";
import { toast } from "sonner";
import { format } from "date-fns";

const UPDATE_CATEGORIES = ["Regulatory", "Enforcement", "Registry Change", "Political Risk", "AML Reform", "Other"];

type JurisdictionProfile = {
  id: string;
  country_code: string;
  country_name: string;
  incorporation_regime_summary: string | null;
  beneficial_ownership_transparency_level: string | null;
  public_registry_depth: string | null;
  enforcement_environment_notes: string | null;
  sanctions_exposure_notes: string | null;
  source_availability_notes: string | null;
  created_at: string;
  updated_at: string;
};

type JurisdictionUpdate = {
  id: string;
  jurisdiction_id: string;
  update_date: string;
  title: string;
  factual_summary: string | null;
  category: string;
  internal_source_reference: string | null;
  created_at: string;
};

const COMMON_JURISDICTIONS = [
  { code: "GB", name: "United Kingdom" }, { code: "US", name: "United States" },
  { code: "DE", name: "Germany" }, { code: "FR", name: "France" },
  { code: "CH", name: "Switzerland" }, { code: "SG", name: "Singapore" },
  { code: "HK", name: "Hong Kong" }, { code: "AE", name: "United Arab Emirates" },
  { code: "KY", name: "Cayman Islands" }, { code: "BVI", name: "British Virgin Islands" },
  { code: "JE", name: "Jersey" }, { code: "GG", name: "Guernsey" },
  { code: "IM", name: "Isle of Man" }, { code: "LU", name: "Luxembourg" },
  { code: "IE", name: "Ireland" }, { code: "NL", name: "Netherlands" },
  { code: "AU", name: "Australia" }, { code: "CA", name: "Canada" },
  { code: "JP", name: "Japan" }, { code: "CN", name: "China" },
  { code: "IN", name: "India" }, { code: "BR", name: "Brazil" },
  { code: "ZA", name: "South Africa" }, { code: "RU", name: "Russia" },
  { code: "PA", name: "Panama" }, { code: "CY", name: "Cyprus" },
  { code: "MT", name: "Malta" }, { code: "MU", name: "Mauritius" },
];

export default function JurisdictionLibraryPage() {
  const { canQuote } = useAuth();
  const qc = useQueryClient();
  const isManager = canQuote; // canQuote maps to manager/ops_admin

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [profileDialog, setProfileDialog] = useState(false);
  const [editingProfile, setEditingProfile] = useState<JurisdictionProfile | null>(null);
  const [updateDialog, setUpdateDialog] = useState(false);

  // Profile form
  const [pForm, setPForm] = useState({
    country_code: "", country_name: "",
    incorporation_regime_summary: "", beneficial_ownership_transparency_level: "",
    public_registry_depth: "", enforcement_environment_notes: "",
    sanctions_exposure_notes: "", source_availability_notes: "",
  });

  // Update form
  const [uForm, setUForm] = useState({
    update_date: new Date().toISOString().split("T")[0],
    title: "", factual_summary: "", category: "Other", internal_source_reference: "",
  });

  const { data: profiles = [], isLoading } = useQuery({
    queryKey: ["jurisdiction-profiles"],
    queryFn: async () => {
      const { data, error } = await supabase.from("jurisdiction_profiles").select("*").order("country_name");
      if (error) throw error;
      return data as JurisdictionProfile[];
    },
  });

  const selected = profiles.find((p) => p.id === selectedId) || null;

  const { data: updates = [] } = useQuery({
    queryKey: ["jurisdiction-updates", selectedId],
    enabled: !!selectedId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("jurisdiction_updates")
        .select("*")
        .eq("jurisdiction_id", selectedId!)
        .order("update_date", { ascending: false });
      if (error) throw error;
      return data as JurisdictionUpdate[];
    },
  });

  // Linked entities count
  const { data: linkedEntities = [] } = useQuery({
    queryKey: ["jurisdiction-linked-entities", selected?.country_code],
    enabled: !!selected,
    queryFn: async () => {
      const { data } = await supabase
        .from("entities")
        .select("id, name, org_id")
        .eq("incorporation_country_code", selected!.country_code)
        .limit(50);
      return data || [];
    },
  });

  // Linked master entities
  const { data: linkedMasters = [] } = useQuery({
    queryKey: ["jurisdiction-linked-masters", selected?.country_code],
    enabled: !!selected,
    queryFn: async () => {
      const { data } = await supabase
        .from("master_entities")
        .select("id, canonical_name")
        .eq("jurisdiction_incorporation", selected!.country_code)
        .limit(50);
      return data || [];
    },
  });

  const upsertProfile = useMutation({
    mutationFn: async () => {
      if (editingProfile) {
        const { error } = await supabase.from("jurisdiction_profiles")
          .update({ ...pForm, updated_at: new Date().toISOString() })
          .eq("id", editingProfile.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("jurisdiction_profiles").insert(pForm);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["jurisdiction-profiles"] });
      setProfileDialog(false);
      setEditingProfile(null);
      toast.success(editingProfile ? "Profile updated" : "Jurisdiction added");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const addUpdate = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("jurisdiction_updates").insert({
        ...uForm, jurisdiction_id: selectedId!,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["jurisdiction-updates", selectedId] });
      setUpdateDialog(false);
      setUForm({ update_date: new Date().toISOString().split("T")[0], title: "", factual_summary: "", category: "Other", internal_source_reference: "" });
      toast.success("Update added");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const openNewProfile = () => {
    setEditingProfile(null);
    setPForm({ country_code: "", country_name: "", incorporation_regime_summary: "", beneficial_ownership_transparency_level: "", public_registry_depth: "", enforcement_environment_notes: "", sanctions_exposure_notes: "", source_availability_notes: "" });
    setProfileDialog(true);
  };

  const openEditProfile = (p: JurisdictionProfile) => {
    setEditingProfile(p);
    setPForm({
      country_code: p.country_code, country_name: p.country_name,
      incorporation_regime_summary: p.incorporation_regime_summary || "",
      beneficial_ownership_transparency_level: p.beneficial_ownership_transparency_level || "",
      public_registry_depth: p.public_registry_depth || "",
      enforcement_environment_notes: p.enforcement_environment_notes || "",
      sanctions_exposure_notes: p.sanctions_exposure_notes || "",
      source_availability_notes: p.source_availability_notes || "",
    });
    setProfileDialog(true);
  };

  const filtered = profiles.filter((p) =>
    p.country_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.country_code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const categoryIcon = (cat: string) => {
    switch (cat) {
      case "Regulatory": return <Scale className="h-3.5 w-3.5 text-primary" />;
      case "Enforcement": return <Shield className="h-3.5 w-3.5 text-destructive" />;
      case "Political Risk": return <AlertTriangle className="h-3.5 w-3.5 text-accent-foreground" />;
      case "Registry Change": return <Database className="h-3.5 w-3.5 text-primary" />;
      default: return <FileText className="h-3.5 w-3.5 text-muted-foreground" />;
    }
  };

  const categoryColor = (cat: string): "default" | "destructive" | "outline" | "secondary" => {
    switch (cat) {
      case "Regulatory": return "default";
      case "Enforcement": return "destructive";
      case "Political Risk": return "outline";
      default: return "secondary";
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground flex items-center gap-2">
            <Globe className="h-6 w-6 text-primary" /> Jurisdiction Benchmark Library
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Enterprise jurisdiction intelligence profiles maintained by CR Managers</p>
        </div>
        {isManager && (
          <Button onClick={openNewProfile} size="sm">
            <Plus className="h-4 w-4 mr-1.5" /> Add Jurisdiction
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-6">
        {/* ── Left: Jurisdiction List ── */}
        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search jurisdictions…" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-9" />
          </div>
          <div className="space-y-1 max-h-[calc(100vh-280px)] overflow-y-auto">
            {isLoading ? (
              <p className="text-sm text-muted-foreground text-center py-8">Loading…</p>
            ) : filtered.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No jurisdictions found</p>
            ) : filtered.map((p) => (
              <button
                key={p.id}
                onClick={() => setSelectedId(p.id)}
                className={`w-full text-left rounded-lg border px-3 py-2.5 transition-colors ${
                  selectedId === p.id ? "border-primary bg-primary/5" : "border-border hover:bg-muted/50"
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-lg">{getFlagEmoji(p.country_code)}</span>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium truncate">{p.country_name}</div>
                    <div className="text-[10px] text-muted-foreground uppercase tracking-wider">{p.country_code}</div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* ── Right: Profile Detail ── */}
        {selected ? (
          <div className="space-y-5">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-3xl">{getFlagEmoji(selected.country_code)}</span>
                <div>
                  <h2 className="font-display text-xl font-bold text-foreground">{selected.country_name}</h2>
                  <p className="text-xs text-muted-foreground">Last updated {format(new Date(selected.updated_at), "dd MMM yyyy")}</p>
                </div>
              </div>
              {isManager && (
                <Button variant="outline" size="sm" onClick={() => openEditProfile(selected)}>
                  <Pencil className="h-3.5 w-3.5 mr-1.5" /> Edit Profile
                </Button>
              )}
            </div>

            {/* Sidebar: Stable Facts */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FactCard label="Incorporation Regime" value={selected.incorporation_regime_summary} />
              <FactCard label="Beneficial Ownership Transparency" value={selected.beneficial_ownership_transparency_level} />
              <FactCard label="Public Registry Depth" value={selected.public_registry_depth} />
              <FactCard label="Enforcement Environment" value={selected.enforcement_environment_notes} />
              <FactCard label="Sanctions Exposure" value={selected.sanctions_exposure_notes} />
              <FactCard label="Source Availability" value={selected.source_availability_notes} />
            </div>

            {/* Linked Entities */}
            {(linkedMasters.length > 0 || linkedEntities.length > 0) && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Linked Entities</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {linkedMasters.length > 0 && (
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Master Entities</p>
                      <div className="flex flex-wrap gap-1.5">
                        {linkedMasters.map((me: any) => (
                          <Badge key={me.id} variant="outline" className="text-xs">{me.canonical_name}</Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  {linkedEntities.length > 0 && (
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Client Entities ({linkedEntities.length})</p>
                      <div className="flex flex-wrap gap-1.5">
                        {linkedEntities.slice(0, 10).map((e: any) => (
                          <Badge key={e.id} variant="secondary" className="text-xs">{e.name}</Badge>
                        ))}
                        {linkedEntities.length > 10 && (
                          <Badge variant="secondary" className="text-xs">+{linkedEntities.length - 10} more</Badge>
                        )}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Jurisdiction Alerts & Indicators */}
            <JurisdictionAlertsPanel
              jurisdictionId={selected.id}
              countryCode={selected.country_code}
              countryName={selected.country_name}
            />

            <Separator />

            {/* Timeline: Updates */}
            <div className="flex items-center justify-between">
              <h3 className="font-display text-base font-semibold text-foreground">Intelligence Timeline</h3>
              {isManager && (
                <Button size="sm" variant="outline" onClick={() => setUpdateDialog(true)}>
                  <Plus className="h-3.5 w-3.5 mr-1" /> Add Update
                </Button>
              )}
            </div>

            {updates.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">No updates recorded yet</p>
            ) : (
              <div className="relative pl-6 space-y-4">
                {/* Timeline line */}
                <div className="absolute left-[11px] top-2 bottom-2 w-px bg-border" />
                {updates.map((u) => (
                  <div key={u.id} className="relative">
                    {/* Dot */}
                    <div className="absolute -left-6 top-1.5 w-[9px] h-[9px] rounded-full border-2 border-primary bg-background" />
                    <div className="rounded-lg border p-3 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {categoryIcon(u.category)}
                          <span className="text-sm font-medium">{u.title}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={categoryColor(u.category)} className="text-[10px]">{u.category}</Badge>
                          <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                            <Calendar className="h-3 w-3" /> {format(new Date(u.update_date), "dd MMM yyyy")}
                          </span>
                        </div>
                      </div>
                      {u.factual_summary && (
                        <p className="text-xs text-muted-foreground leading-relaxed">{u.factual_summary}</p>
                      )}
                      {u.internal_source_reference && (
                        <p className="text-[10px] text-muted-foreground/60 italic">Source: {u.internal_source_reference}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="flex items-center justify-center h-64 text-muted-foreground">
            <div className="text-center">
              <Globe className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm">Select a jurisdiction to view its profile</p>
            </div>
          </div>
        )}
      </div>

      {/* ── Profile Dialog ── */}
      <Dialog open={profileDialog} onOpenChange={setProfileDialog}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingProfile ? "Edit Jurisdiction Profile" : "Add Jurisdiction"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            {!editingProfile && (
              <div>
                <Label>Jurisdiction</Label>
                <Select value={pForm.country_code} onValueChange={(v) => {
                  const j = COMMON_JURISDICTIONS.find((x) => x.code === v);
                  setPForm({ ...pForm, country_code: v, country_name: j?.name || v });
                }}>
                  <SelectTrigger><SelectValue placeholder="Select jurisdiction…" /></SelectTrigger>
                  <SelectContent>
                    {COMMON_JURISDICTIONS.filter((j) => !profiles.some((p) => p.country_code === j.code)).map((j) => (
                      <SelectItem key={j.code} value={j.code}>{getFlagEmoji(j.code)} {j.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div>
              <Label>Incorporation Regime Summary</Label>
              <Textarea value={pForm.incorporation_regime_summary} onChange={(e) => setPForm({ ...pForm, incorporation_regime_summary: e.target.value })} rows={2} placeholder="Overview of the incorporation regime…" />
            </div>
            <div>
              <Label>Beneficial Ownership Transparency Level</Label>
              <Input value={pForm.beneficial_ownership_transparency_level} onChange={(e) => setPForm({ ...pForm, beneficial_ownership_transparency_level: e.target.value })} placeholder="e.g. High / Medium / Low with context" />
            </div>
            <div>
              <Label>Public Registry Depth</Label>
              <Textarea value={pForm.public_registry_depth} onChange={(e) => setPForm({ ...pForm, public_registry_depth: e.target.value })} rows={2} placeholder="Available public registries and depth of data…" />
            </div>
            <div>
              <Label>Enforcement Environment</Label>
              <Textarea value={pForm.enforcement_environment_notes} onChange={(e) => setPForm({ ...pForm, enforcement_environment_notes: e.target.value })} rows={2} placeholder="Enforcement landscape notes…" />
            </div>
            <div>
              <Label>Sanctions Exposure</Label>
              <Textarea value={pForm.sanctions_exposure_notes} onChange={(e) => setPForm({ ...pForm, sanctions_exposure_notes: e.target.value })} rows={2} placeholder="Sanctions risk notes…" />
            </div>
            <div>
              <Label>Source Availability</Label>
              <Textarea value={pForm.source_availability_notes} onChange={(e) => setPForm({ ...pForm, source_availability_notes: e.target.value })} rows={2} placeholder="Available intelligence sources for this jurisdiction…" />
            </div>
            <Button onClick={() => upsertProfile.mutate()} disabled={(!editingProfile && !pForm.country_code) || upsertProfile.isPending} className="w-full">
              {upsertProfile.isPending ? "Saving…" : editingProfile ? "Update Profile" : "Create Profile"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Update Dialog ── */}
      <Dialog open={updateDialog} onOpenChange={setUpdateDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Intelligence Update</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Date</Label>
                <Input type="date" value={uForm.update_date} onChange={(e) => setUForm({ ...uForm, update_date: e.target.value })} />
              </div>
              <div>
                <Label>Category</Label>
                <Select value={uForm.category} onValueChange={(v) => setUForm({ ...uForm, category: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{UPDATE_CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Title</Label>
              <Input value={uForm.title} onChange={(e) => setUForm({ ...uForm, title: e.target.value })} placeholder="Brief headline…" />
            </div>
            <div>
              <Label>Factual Summary</Label>
              <Textarea value={uForm.factual_summary} onChange={(e) => setUForm({ ...uForm, factual_summary: e.target.value })} rows={3} placeholder="Objective summary of the change…" />
            </div>
            <div>
              <Label>Internal Source Reference</Label>
              <Input value={uForm.internal_source_reference} onChange={(e) => setUForm({ ...uForm, internal_source_reference: e.target.value })} placeholder="e.g. FATF Report 2025-Q1" />
            </div>
            <Button onClick={() => addUpdate.mutate()} disabled={!uForm.title.trim() || addUpdate.isPending} className="w-full">
              {addUpdate.isPending ? "Saving…" : "Add Update"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/** Stable facts card */
function FactCard({ label, value }: { label: string; value: string | null }) {
  return (
    <Card className={!value ? "opacity-50" : ""}>
      <CardContent className="pt-4 pb-3 px-4">
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5">{label}</p>
        <p className="text-sm text-foreground leading-relaxed">{value || "Not yet documented"}</p>
      </CardContent>
    </Card>
  );
}

/** Convert country code to flag emoji */
function getFlagEmoji(code: string): string {
  if (!code || code.length !== 2) return "🌐";
  const codePoints = code.toUpperCase().split("").map((c) => 127397 + c.charCodeAt(0));
  return String.fromCodePoint(...codePoints);
}
