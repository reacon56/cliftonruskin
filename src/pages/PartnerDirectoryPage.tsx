import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Plus, Search, Star, MapPin, Briefcase, Phone, Mail, Pencil,
  ChevronRight, Shield, FileText,
} from "lucide-react";

const DD_STATUSES = ["pending", "in_progress", "approved", "rejected"] as const;
const DD_STATUS_COLORS: Record<string, string> = {
  pending: "bg-muted text-muted-foreground",
  in_progress: "bg-accent/10 text-accent",
  approved: "bg-success/10 text-success",
  rejected: "bg-destructive/10 text-destructive",
};

interface Partner {
  id: string;
  name: string;
  country: string | null;
  capability_tags: string[] | null;
  rate_card: any;
  active: boolean;
  jurisdictions_covered: string[];
  services_offered: string[];
  sla_terms: string | null;
  rate_structure: string | null;
  compliance_document_url: string | null;
  dd_status: string;
  internal_rating: number | null;
  contact_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  notes_internal: string | null;
  created_at: string;
}

const emptyForm = {
  name: "",
  country: "",
  jurisdictions_covered: "",
  services_offered: "",
  sla_terms: "",
  rate_structure: "",
  dd_status: "pending",
  internal_rating: "",
  contact_name: "",
  contact_email: "",
  contact_phone: "",
  notes_internal: "",
};

export default function PartnerDirectoryPage() {
  const { toast } = useToast();
  const [partners, setPartners] = useState<Partner[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [detailPartner, setDetailPartner] = useState<Partner | null>(null);

  const load = async () => {
    const { data } = await supabase
      .from("partners" as any)
      .select("*")
      .order("name");
    setPartners((data as any) ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openEdit = (p: Partner) => {
    setEditingId(p.id);
    setForm({
      name: p.name,
      country: p.country ?? "",
      jurisdictions_covered: (p.jurisdictions_covered ?? []).join(", "),
      services_offered: (p.services_offered ?? []).join(", "),
      sla_terms: p.sla_terms ?? "",
      rate_structure: p.rate_structure ?? "",
      dd_status: p.dd_status ?? "pending",
      internal_rating: p.internal_rating?.toString() ?? "",
      contact_name: p.contact_name ?? "",
      contact_email: p.contact_email ?? "",
      contact_phone: p.contact_phone ?? "",
      notes_internal: p.notes_internal ?? "",
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast({ title: "Name required", variant: "destructive" });
      return;
    }
    setSubmitting(true);

    const payload = {
      name: form.name.trim(),
      country: form.country.trim() || null,
      jurisdictions_covered: form.jurisdictions_covered
        .split(",").map((s) => s.trim()).filter(Boolean),
      services_offered: form.services_offered
        .split(",").map((s) => s.trim()).filter(Boolean),
      sla_terms: form.sla_terms || null,
      rate_structure: form.rate_structure || null,
      dd_status: form.dd_status,
      internal_rating: form.internal_rating ? parseInt(form.internal_rating) : null,
      contact_name: form.contact_name || null,
      contact_email: form.contact_email || null,
      contact_phone: form.contact_phone || null,
      notes_internal: form.notes_internal || null,
      updated_at: new Date().toISOString(),
    };

    let error;
    if (editingId) {
      ({ error } = await supabase
        .from("partners" as any)
        .update(payload)
        .eq("id", editingId));
    } else {
      ({ error } = await supabase.from("partners" as any).insert(payload));
    }

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: editingId ? "Partner updated" : "Partner created" });
      setDialogOpen(false);
      load();
    }
    setSubmitting(false);
  };

  const filtered = partners.filter((p) => {
    const q = search.toLowerCase();
    return (
      p.name.toLowerCase().includes(q) ||
      (p.country ?? "").toLowerCase().includes(q) ||
      (p.jurisdictions_covered ?? []).some((j) => j.toLowerCase().includes(q)) ||
      (p.services_offered ?? []).some((s) => s.toLowerCase().includes(q))
    );
  });

  const renderStars = (rating: number | null) => {
    if (!rating) return <span className="text-xs text-muted-foreground">Unrated</span>;
    return (
      <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map((i) => (
          <Star
            key={i}
            size={12}
            className={i <= rating ? "text-accent fill-accent" : "text-muted-foreground/30"}
          />
        ))}
      </div>
    );
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <h1 className="fvc-heading-1 text-foreground">Partner Directory</h1>
        <Button size="sm" onClick={openCreate} className="gap-1.5">
          <Plus size={14} /> Add Partner
        </Button>
      </div>
      <div className="fvc-gold-rule mt-3 mb-2" />
      <p className="text-sm text-muted-foreground mb-6">
        Manage in-country research partners, capabilities, and due diligence status.
      </p>

      <div className="relative mb-6">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search by name, country, jurisdiction, or service…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {loading ? (
        <div className="text-sm text-muted-foreground py-20 text-center">Loading…</div>
      ) : filtered.length === 0 ? (
        <div className="fvc-card text-center py-12">
          <Briefcase size={24} className="mx-auto text-muted-foreground/40 mb-3" />
          <p className="text-sm text-muted-foreground">
            {search ? "No partners match your search." : "No partners registered yet."}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((p) => (
            <div
              key={p.id}
              className="fvc-card flex items-start justify-between cursor-pointer hover:shadow-md transition-shadow group"
              onClick={() => setDetailPartner(p)}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-medium text-foreground">{p.name}</span>
                  <Badge className={`fvc-status-badge text-[10px] capitalize ${DD_STATUS_COLORS[p.dd_status] || DD_STATUS_COLORS.pending}`}>
                    {p.dd_status?.replace("_", " ")}
                  </Badge>
                  {!p.active && (
                    <Badge variant="outline" className="text-[10px] text-muted-foreground">Inactive</Badge>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                  {p.country && (
                    <span className="flex items-center gap-1"><MapPin size={11} /> {p.country}</span>
                  )}
                  {(p.jurisdictions_covered ?? []).length > 0 && (
                    <span>{p.jurisdictions_covered.length} jurisdiction{p.jurisdictions_covered.length > 1 ? "s" : ""}</span>
                  )}
                  {(p.services_offered ?? []).length > 0 && (
                    <span>{p.services_offered.length} service{p.services_offered.length > 1 ? "s" : ""}</span>
                  )}
                  {renderStars(p.internal_rating)}
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0 ml-4">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0"
                  onClick={(e) => { e.stopPropagation(); openEdit(p); }}
                >
                  <Pencil size={13} />
                </Button>
                <ChevronRight size={14} className="text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Detail drawer ── */}
      <Dialog open={!!detailPartner} onOpenChange={() => setDetailPartner(null)}>
        <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
          {detailPartner && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 font-display text-xl">
                  <Briefcase size={18} className="text-accent" /> {detailPartner.name}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-2">
                <div className="flex items-center gap-3">
                  <Badge className={`fvc-status-badge text-[10px] capitalize ${DD_STATUS_COLORS[detailPartner.dd_status] || DD_STATUS_COLORS.pending}`}>
                    DD: {detailPartner.dd_status?.replace("_", " ")}
                  </Badge>
                  {renderStars(detailPartner.internal_rating)}
                </div>

                {detailPartner.country && (
                  <div>
                    <Label className="text-xs text-muted-foreground">Primary Country</Label>
                    <p className="text-sm">{detailPartner.country}</p>
                  </div>
                )}

                {(detailPartner.jurisdictions_covered ?? []).length > 0 && (
                  <div>
                    <Label className="text-xs text-muted-foreground">Jurisdictions Covered</Label>
                    <div className="flex flex-wrap gap-1.5 mt-1">
                      {detailPartner.jurisdictions_covered.map((j) => (
                        <Badge key={j} variant="outline" className="text-[10px]">{j}</Badge>
                      ))}
                    </div>
                  </div>
                )}

                {(detailPartner.services_offered ?? []).length > 0 && (
                  <div>
                    <Label className="text-xs text-muted-foreground">Services Offered</Label>
                    <div className="flex flex-wrap gap-1.5 mt-1">
                      {detailPartner.services_offered.map((s) => (
                        <Badge key={s} variant="secondary" className="text-[10px]">{s}</Badge>
                      ))}
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  {detailPartner.sla_terms && (
                    <div>
                      <Label className="text-xs text-muted-foreground">SLA Terms</Label>
                      <p className="text-sm">{detailPartner.sla_terms}</p>
                    </div>
                  )}
                  {detailPartner.rate_structure && (
                    <div>
                      <Label className="text-xs text-muted-foreground">Rate Structure</Label>
                      <p className="text-sm">{detailPartner.rate_structure}</p>
                    </div>
                  )}
                </div>

                <div className="border-t border-border pt-3">
                  <Label className="text-xs text-muted-foreground">Contact</Label>
                  <div className="space-y-1 mt-1 text-sm">
                    {detailPartner.contact_name && <p>{detailPartner.contact_name}</p>}
                    {detailPartner.contact_email && (
                      <p className="flex items-center gap-1.5 text-muted-foreground">
                        <Mail size={12} /> {detailPartner.contact_email}
                      </p>
                    )}
                    {detailPartner.contact_phone && (
                      <p className="flex items-center gap-1.5 text-muted-foreground">
                        <Phone size={12} /> {detailPartner.contact_phone}
                      </p>
                    )}
                  </div>
                </div>

                {detailPartner.notes_internal && (
                  <div className="border-t border-border pt-3">
                    <Label className="text-xs text-muted-foreground">Internal Notes</Label>
                    <p className="text-sm mt-1 whitespace-pre-wrap">{detailPartner.notes_internal}</p>
                  </div>
                )}

                {detailPartner.compliance_document_url && (
                  <div className="border-t border-border pt-3">
                    <Label className="text-xs text-muted-foreground">Compliance Documents</Label>
                    <a
                      href={detailPartner.compliance_document_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 text-sm text-primary hover:underline mt-1"
                    >
                      <FileText size={12} /> View Document
                    </a>
                  </div>
                )}
              </div>
              <DialogFooter className="mt-4">
                <Button variant="outline" onClick={() => { setDetailPartner(null); openEdit(detailPartner); }}>
                  <Pencil size={13} className="mr-1.5" /> Edit
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Create / Edit dialog ── */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display text-xl">
              {editingId ? "Edit Partner" : "Add Partner"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="space-y-1.5">
              <Label>Company Name *</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Primary Country</Label>
                <Input value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>DD Status</Label>
                <select
                  value={form.dd_status}
                  onChange={(e) => setForm({ ...form, dd_status: e.target.value })}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  {DD_STATUSES.map((s) => (
                    <option key={s} value={s}>{s.replace("_", " ")}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Jurisdictions Covered</Label>
              <Input
                value={form.jurisdictions_covered}
                onChange={(e) => setForm({ ...form, jurisdictions_covered: e.target.value })}
                placeholder="e.g. Nigeria, Ghana, Kenya"
              />
              <p className="text-[10px] text-muted-foreground">Comma-separated list</p>
            </div>
            <div className="space-y-1.5">
              <Label>Services Offered</Label>
              <Input
                value={form.services_offered}
                onChange={(e) => setForm({ ...form, services_offered: e.target.value })}
                placeholder="e.g. Site Visits, Trade References, Court Checks"
              />
              <p className="text-[10px] text-muted-foreground">Comma-separated list</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>SLA Terms</Label>
                <Input
                  value={form.sla_terms}
                  onChange={(e) => setForm({ ...form, sla_terms: e.target.value })}
                  placeholder="e.g. 5 business days"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Rate Structure</Label>
                <Input
                  value={form.rate_structure}
                  onChange={(e) => setForm({ ...form, rate_structure: e.target.value })}
                  placeholder="e.g. Per-task fixed fee"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Internal Rating (1–5)</Label>
              <Input
                type="number"
                min={1}
                max={5}
                value={form.internal_rating}
                onChange={(e) => setForm({ ...form, internal_rating: e.target.value })}
              />
            </div>
            <div className="border-t border-border pt-3">
              <Label className="text-xs text-muted-foreground mb-2 block">Contact Details</Label>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Name</Label>
                  <Input value={form.contact_name} onChange={(e) => setForm({ ...form, contact_name: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label>Email</Label>
                  <Input type="email" value={form.contact_email} onChange={(e) => setForm({ ...form, contact_email: e.target.value })} />
                </div>
              </div>
              <div className="space-y-1.5 mt-3">
                <Label>Phone</Label>
                <Input value={form.contact_phone} onChange={(e) => setForm({ ...form, contact_phone: e.target.value })} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Internal Notes</Label>
              <Textarea
                value={form.notes_internal}
                onChange={(e) => setForm({ ...form, notes_internal: e.target.value })}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={submitting || !form.name.trim()}>
              {submitting ? "Saving…" : editingId ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
