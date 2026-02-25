import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, Building2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

export default function EntitiesPage() {
  const { profile, hasRole } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [entities, setEntities] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [filterTier, setFilterTier] = useState<string>("all");
  const [filterType, setFilterType] = useState<string>("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({
    name: "", entity_type: "supplier", country: "", website: "",
    registration_number: "", risk_tier: "B",
  });

  useEffect(() => {
    if (profile?.org_id) loadEntities();
  }, [profile?.org_id]);

  const loadEntities = async () => {
    let query = supabase.from("entities").select("*").eq("org_id", profile!.org_id!).order("name");
    const { data } = await query;
    setEntities(data ?? []);
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile?.org_id) return;
    const { error } = await supabase.from("entities").insert({
      ...form, org_id: profile.org_id, owner_user_id: profile.user_id,
    });
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Entity added" });
      setDialogOpen(false);
      setForm({ name: "", entity_type: "supplier", country: "", website: "", registration_number: "", risk_tier: "B" });
      loadEntities();
    }
  };

  const filtered = entities.filter((e) => {
    const matchSearch = e.name.toLowerCase().includes(search.toLowerCase()) ||
      (e.country || "").toLowerCase().includes(search.toLowerCase());
    const matchTier = filterTier === "all" || e.risk_tier === filterTier;
    const matchType = filterType === "all" || e.entity_type === filterType;
    return matchSearch && matchTier && matchType;
  });

  const tierColor = (tier: string) => {
    if (tier === "A") return "bg-destructive/10 text-destructive";
    if (tier === "B") return "bg-warning/10 text-warning";
    return "bg-success/10 text-success";
  };

  const canAdd = hasRole("client_admin") || hasRole("client_requester");

  return (
    <div>
      <div className="flex items-center justify-between mb-10">
        <div>
          <h1 className="fvc-heading-1 text-foreground">Entity Register</h1>
          <div className="fvc-gold-rule mt-3 mb-2" />
          <p className="text-sm text-muted-foreground">Third parties under due diligence</p>
        </div>
        {canAdd && (
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button><Plus size={15} className="mr-2" />Add Entity</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle className="font-display text-xl">Add Entity</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleAdd} className="space-y-4 mt-2">
                <div className="space-y-2">
                  <Label>Name</Label>
                  <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Type</Label>
                    <Select value={form.entity_type} onValueChange={(v) => setForm({ ...form, entity_type: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="supplier">Supplier</SelectItem>
                        <SelectItem value="partner">Partner</SelectItem>
                        <SelectItem value="target">Target</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Risk Tier</Label>
                    <Select value={form.risk_tier} onValueChange={(v) => setForm({ ...form, risk_tier: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="A">A — High</SelectItem>
                        <SelectItem value="B">B — Medium</SelectItem>
                        <SelectItem value="C">C — Low</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Country</Label>
                    <Input value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label>Website</Label>
                    <Input value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Registration number</Label>
                  <Input value={form.registration_number} onChange={(e) => setForm({ ...form, registration_number: e.target.value })} />
                </div>
                <Button type="submit" className="w-full">Add Entity</Button>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/60" />
          <Input placeholder="Search entities…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={filterTier} onValueChange={setFilterTier}>
          <SelectTrigger className="w-36"><SelectValue placeholder="Risk tier" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All tiers</SelectItem>
            <SelectItem value="A">Tier A</SelectItem>
            <SelectItem value="B">Tier B</SelectItem>
            <SelectItem value="C">Tier C</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-36"><SelectValue placeholder="Entity type" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All types</SelectItem>
            <SelectItem value="supplier">Supplier</SelectItem>
            <SelectItem value="partner">Partner</SelectItem>
            <SelectItem value="target">Target</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="fvc-card text-center py-16">
          <Building2 size={36} className="mx-auto text-muted-foreground/30 mb-4" />
          <p className="text-sm text-muted-foreground">No entities found. Add your first third party to begin.</p>
        </div>
      ) : (
        <div className="border rounded-lg overflow-hidden bg-card" style={{ boxShadow: "var(--shadow-card)" }}>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/40">
                <th className="text-left px-5 py-3 fvc-label">Name</th>
                <th className="text-left px-5 py-3 fvc-label">Type</th>
                <th className="text-left px-5 py-3 fvc-label">Country</th>
                <th className="text-left px-5 py-3 fvc-label">Risk</th>
                <th className="text-left px-5 py-3 fvc-label">Status</th>
                <th className="text-left px-5 py-3 fvc-label">Next Review</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((e) => (
                <tr
                  key={e.id}
                  className="fvc-table-row"
                  onClick={() => navigate(`/entities/${e.id}`)}
                >
                  <td className="px-5 py-3.5 font-medium text-foreground">{e.name}</td>
                  <td className="px-5 py-3.5 capitalize text-muted-foreground">{e.entity_type}</td>
                  <td className="px-5 py-3.5 text-muted-foreground">{e.country || "—"}</td>
                  <td className="px-5 py-3.5">
                    <Badge className={`fvc-status-badge ${tierColor(e.risk_tier)}`}>Tier {e.risk_tier}</Badge>
                  </td>
                  <td className="px-5 py-3.5 capitalize text-muted-foreground">{e.status}</td>
                  <td className="px-5 py-3.5 text-muted-foreground">
                    {e.next_review_date ? new Date(e.next_review_date).toLocaleDateString() : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
