import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Plus, Pencil, Trash2, ExternalLink, Shield } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { countryCodeToFlag } from "@/lib/country-flag";
import { RegChangeAlertBanner } from "@/components/insight/RegChangeAlertBanner";
import { KnowledgePanelWidget } from "@/components/insight/KnowledgePanel";
import type { KnowledgeSection } from "@/components/insight/KnowledgePanel";

const SANCTIONS_KNOWLEDGE: KnowledgeSection[] = [
  {
    title: "The Divergence Point",
    content: "Prior to Brexit, UK sanctions mirrored EU designations. Post-Brexit, OFSI administers UK sanctions independently. The lists have diverged significantly, particularly on Russia, Iran and Belarus.",
  },
  {
    title: "Key Differences Today",
    content: "OFAC operates a 50% rule (entities 50%+ owned by a designated person are automatically sanctioned). The UK OFSI rule is different — ownership alone does not automatically designate unless the entity is separately listed.",
  },
  {
    title: "Why Screening Both is Required",
    content: "For any transaction with a US nexus (USD clearing, US counterparty, US-incorporated entity), OFAC applies regardless of where your firm is based. UK firms with US operations or USD exposure must screen both lists.",
  },
  {
    title: "What CR Screens",
    content: "The platform screens against UK OFSI, UN, EU, and OFAC consolidated lists via OpenSanctions integration. All four are required for a complete screen.",
  },
  {
    title: "Quick Reference",
    type: "keyvalue",
    pairs: [
      { key: "UK", value: "OFSI Consolidated List" },
      { key: "US", value: "OFAC SDN List" },
      { key: "Data", value: "OpenSanctions" },
      { key: "Legislation", value: "Russia Regulations 2019 (as amended)" },
    ],
  },
];

type RegimeRow = {
  id: string;
  authority: "UK" | "EU" | "US";
  jurisdiction_id: string;
  regime_type: "TARGETED" | "COMPREHENSIVE";
  rationale_text: string | null;
  source_url: string | null;
  effective_date: string;
  last_reviewed_at: string;
  created_at: string;
};

type JurisdictionOption = { id: string; country_name: string; country_code: string };

const EMPTY_FORM = {
  authority: "UK" as "UK" | "EU" | "US",
  jurisdiction_id: "",
  regime_type: "TARGETED" as "TARGETED" | "COMPREHENSIVE",
  rationale_text: "",
  source_url: "",
  effective_date: new Date().toISOString().slice(0, 10),
};

export default function SanctionsRegimesPage() {
  const qc = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);

  const { data: regimes = [], isLoading } = useQuery({
    queryKey: ["sanctions-regime-map"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sanctions_regime_map")
        .select("*")
        .order("authority")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as RegimeRow[];
    },
  });

  const { data: jurisdictions = [] } = useQuery({
    queryKey: ["jurisdictions-list-simple"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("jurisdiction")
        .select("id, country_name, country_code")
        .order("country_name");
      if (error) throw error;
      return data as JurisdictionOption[];
    },
  });

  const jurisdictionMap = Object.fromEntries(jurisdictions.map((j) => [j.id, j]));

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        authority: form.authority,
        jurisdiction_id: form.jurisdiction_id,
        regime_type: form.regime_type,
        rationale_text: form.rationale_text || null,
        source_url: form.source_url || null,
        effective_date: form.effective_date,
        last_reviewed_at: new Date().toISOString(),
      };
      if (editingId) {
        const { error } = await supabase.from("sanctions_regime_map").update(payload).eq("id", editingId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("sanctions_regime_map").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(editingId ? "Regime updated" : "Regime added");
      qc.invalidateQueries({ queryKey: ["sanctions-regime-map"] });
      closeDialog();
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("sanctions_regime_map").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Regime deleted");
      qc.invalidateQueries({ queryKey: ["sanctions-regime-map"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  function openCreate() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setDialogOpen(true);
  }

  function openEdit(r: RegimeRow) {
    setEditingId(r.id);
    setForm({
      authority: r.authority,
      jurisdiction_id: r.jurisdiction_id,
      regime_type: r.regime_type,
      rationale_text: r.rationale_text || "",
      source_url: r.source_url || "",
      effective_date: r.effective_date,
    });
    setDialogOpen(true);
  }

  function closeDialog() {
    setDialogOpen(false);
    setEditingId(null);
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" /> Sanctions Regime Classifications
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Curated mapping of sanctions regimes as Targeted or Comprehensive — prevents unsupportable claims.
          </p>
        </div>
        <Button onClick={openCreate} size="sm">
          <Plus className="h-4 w-4 mr-1" /> Add Classification
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">All Classifications</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <p className="text-sm text-muted-foreground text-center py-8">Loading…</p>
          ) : regimes.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No classifications yet</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Jurisdiction</TableHead>
                  <TableHead>Authority</TableHead>
                  <TableHead>Classification</TableHead>
                  <TableHead>Effective</TableHead>
                  <TableHead>Last Reviewed</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead className="w-20" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {regimes.map((r) => {
                  const j = jurisdictionMap[r.jurisdiction_id];
                  return (
                    <TableRow key={r.id}>
                      <TableCell className="text-sm font-medium">
                        {j ? `${countryCodeToFlag(j.country_code) || "🌐"} ${j.country_name}` : r.jurisdiction_id}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-[10px]">{r.authority}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={r.regime_type === "COMPREHENSIVE" ? "destructive" : "secondary"}
                          className="text-[10px]"
                        >
                          {r.regime_type}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {format(new Date(r.effective_date), "dd MMM yyyy")}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {format(new Date(r.last_reviewed_at), "dd MMM yyyy")}
                      </TableCell>
                      <TableCell className="text-xs">
                        {r.source_url ? (
                          <a href={r.source_url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline flex items-center gap-1">
                            Source <ExternalLink className="h-3 w-3" />
                          </a>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(r)}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-destructive"
                            onClick={() => deleteMutation.mutate(r.id)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit" : "Add"} Regime Classification</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Authority</Label>
                <Select value={form.authority} onValueChange={(v) => setForm({ ...form, authority: v as any })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="UK">UK</SelectItem>
                    <SelectItem value="EU">EU</SelectItem>
                    <SelectItem value="US">US</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Classification</Label>
                <Select value={form.regime_type} onValueChange={(v) => setForm({ ...form, regime_type: v as any })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="TARGETED">Targeted</SelectItem>
                    <SelectItem value="COMPREHENSIVE">Comprehensive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Jurisdiction</Label>
              <Select value={form.jurisdiction_id} onValueChange={(v) => setForm({ ...form, jurisdiction_id: v })}>
                <SelectTrigger><SelectValue placeholder="Select jurisdiction" /></SelectTrigger>
                <SelectContent>
                  {jurisdictions.map((j) => (
                    <SelectItem key={j.id} value={j.id}>
                      {countryCodeToFlag(j.country_code)} {j.country_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Effective Date</Label>
              <Input
                type="date"
                value={form.effective_date}
                onChange={(e) => setForm({ ...form, effective_date: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Source URL</Label>
              <Input
                placeholder="https://..."
                value={form.source_url}
                onChange={(e) => setForm({ ...form, source_url: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Rationale</Label>
              <Textarea
                placeholder="Why this classification applies…"
                value={form.rationale_text}
                onChange={(e) => setForm({ ...form, rationale_text: e.target.value })}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>Cancel</Button>
            <Button
              onClick={() => saveMutation.mutate()}
              disabled={!form.jurisdiction_id || saveMutation.isPending}
            >
              {saveMutation.isPending ? "Saving…" : editingId ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
