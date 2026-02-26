import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Pencil } from "lucide-react";
import { toast } from "sonner";

const CATEGORIES = ["Sanctions", "PEP", "Adverse Media", "Corporate Registry", "Litigation", "Offshore Leaks", "Trade", "Other"];
const TIERS = ["Core", "Pro", "Bank-grade"];
const ACCESS_TYPES = ["Manual Portal", "API", "CSV Download", "Other"];
const COST_LEVELS = ["Free", "Paid", "Enterprise"];
const PACKAGES = ["Core", "Enhanced", "Premium"];
const JURISDICTIONS = ["GB", "US", "EU", "CH", "SG", "HK", "AE", "KY", "BVI", "JE", "GG", "IM", "LU", "IE", "NL", "DE", "FR", "AU", "CA", "JP", "Global"];

type Source = {
  id: string;
  source_name: string;
  category: string;
  tier: string;
  jurisdictions_covered: string[];
  access_type: string;
  cost_level: string;
  permitted_use_notes: string | null;
  enabled: boolean;
  linked_package: string;
};

const emptyForm = {
  source_name: "",
  category: "Other",
  tier: "Core",
  jurisdictions_covered: [] as string[],
  access_type: "Manual Portal",
  cost_level: "Free",
  permitted_use_notes: "",
  enabled: true,
  linked_package: "Core",
};

export default function SourceRegistryPage() {
  const { canQuote } = useAuth();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);

  const { data: sources = [], isLoading } = useQuery({
    queryKey: ["research-sources"],
    queryFn: async () => {
      const { data, error } = await supabase.from("research_sources").select("*").order("source_name");
      if (error) throw error;
      return data as Source[];
    },
  });

  const upsert = useMutation({
    mutationFn: async (payload: typeof form & { id?: string }) => {
      const { id, ...rest } = payload;
      if (id) {
        const { error } = await supabase.from("research_sources").update({ ...rest, updated_at: new Date().toISOString() }).eq("id", id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("research_sources").insert(rest);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["research-sources"] });
      setOpen(false);
      setEditId(null);
      setForm(emptyForm);
      toast.success(editId ? "Source updated" : "Source added");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const toggleEnabled = useMutation({
    mutationFn: async ({ id, enabled }: { id: string; enabled: boolean }) => {
      const { error } = await supabase.from("research_sources").update({ enabled, updated_at: new Date().toISOString() }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["research-sources"] }),
    onError: (e: any) => toast.error(e.message),
  });

  const openEdit = (s: Source) => {
    setEditId(s.id);
    setForm({
      source_name: s.source_name,
      category: s.category,
      tier: s.tier,
      jurisdictions_covered: s.jurisdictions_covered,
      access_type: s.access_type,
      cost_level: s.cost_level,
      permitted_use_notes: s.permitted_use_notes || "",
      enabled: s.enabled,
      linked_package: s.linked_package,
    });
    setOpen(true);
  };

  const openNew = () => {
    setEditId(null);
    setForm(emptyForm);
    setOpen(true);
  };

  const tierColor = (t: string) => {
    if (t === "Bank-grade") return "destructive";
    if (t === "Pro") return "default";
    return "secondary";
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">Source Registry</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage approved research sources for the assurance team</p>
        </div>
        {canQuote && (
          <Button onClick={openNew} size="sm">
            <Plus className="h-4 w-4 mr-1.5" /> Add Source
          </Button>
        )}
      </div>

      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Source</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Tier</TableHead>
              <TableHead>Access</TableHead>
              <TableHead>Cost</TableHead>
              <TableHead>Package</TableHead>
              <TableHead>Jurisdictions</TableHead>
              <TableHead>Enabled</TableHead>
              {canQuote && <TableHead className="w-10" />}
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={9} className="text-center text-muted-foreground py-8">Loading…</TableCell></TableRow>
            ) : sources.length === 0 ? (
              <TableRow><TableCell colSpan={9} className="text-center text-muted-foreground py-8">No sources registered yet</TableCell></TableRow>
            ) : sources.map((s) => (
              <TableRow key={s.id} className={!s.enabled ? "opacity-50" : ""}>
                <TableCell className="font-medium">{s.source_name}</TableCell>
                <TableCell><Badge variant="outline" className="text-xs">{s.category}</Badge></TableCell>
                <TableCell><Badge variant={tierColor(s.tier)} className="text-xs">{s.tier}</Badge></TableCell>
                <TableCell className="text-xs text-muted-foreground">{s.access_type}</TableCell>
                <TableCell className="text-xs">{s.cost_level}</TableCell>
                <TableCell className="text-xs">{s.linked_package}</TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {s.jurisdictions_covered.slice(0, 3).map((j) => (
                      <Badge key={j} variant="secondary" className="text-[10px]">{j}</Badge>
                    ))}
                    {s.jurisdictions_covered.length > 3 && (
                      <Badge variant="secondary" className="text-[10px]">+{s.jurisdictions_covered.length - 3}</Badge>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  {canQuote ? (
                    <Switch checked={s.enabled} onCheckedChange={(v) => toggleEnabled.mutate({ id: s.id, enabled: v })} />
                  ) : (
                    <Badge variant={s.enabled ? "default" : "secondary"} className="text-xs">{s.enabled ? "On" : "Off"}</Badge>
                  )}
                </TableCell>
                {canQuote && (
                  <TableCell>
                    <Button variant="ghost" size="icon" onClick={() => openEdit(s)}><Pencil className="h-3.5 w-3.5" /></Button>
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editId ? "Edit Source" : "Add Source"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div>
              <Label>Source Name</Label>
              <Input value={form.source_name} onChange={(e) => setForm({ ...form, source_name: e.target.value })} placeholder="e.g. World-Check One" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Category</Label>
                <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Tier</Label>
                <Select value={form.tier} onValueChange={(v) => setForm({ ...form, tier: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{TIERS.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Access Type</Label>
                <Select value={form.access_type} onValueChange={(v) => setForm({ ...form, access_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{ACCESS_TYPES.map((a) => <SelectItem key={a} value={a}>{a}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Cost Level</Label>
                <Select value={form.cost_level} onValueChange={(v) => setForm({ ...form, cost_level: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{COST_LEVELS.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Linked Package</Label>
              <Select value={form.linked_package} onValueChange={(v) => setForm({ ...form, linked_package: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{PACKAGES.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Jurisdictions Covered</Label>
              <div className="flex flex-wrap gap-1.5 mt-1.5">
                {JURISDICTIONS.map((j) => (
                  <Badge
                    key={j}
                    variant={form.jurisdictions_covered.includes(j) ? "default" : "outline"}
                    className="cursor-pointer text-xs"
                    onClick={() => setForm({
                      ...form,
                      jurisdictions_covered: form.jurisdictions_covered.includes(j)
                        ? form.jurisdictions_covered.filter((x) => x !== j)
                        : [...form.jurisdictions_covered, j],
                    })}
                  >
                    {j}
                  </Badge>
                ))}
              </div>
            </div>
            <div>
              <Label>Permitted Use Notes</Label>
              <Textarea value={form.permitted_use_notes} onChange={(e) => setForm({ ...form, permitted_use_notes: e.target.value })} rows={3} placeholder="Usage restrictions, licensing notes…" />
            </div>
            <Button
              onClick={() => upsert.mutate(editId ? { ...form, id: editId } : form)}
              disabled={!form.source_name.trim() || upsert.isPending}
              className="w-full"
            >
              {upsert.isPending ? "Saving…" : editId ? "Update Source" : "Add Source"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
