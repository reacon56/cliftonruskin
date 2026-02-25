import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Shield, Plus, Search, FileText, CheckCircle2, Download } from "lucide-react";
import MiniLiaForm from "@/components/lia/MiniLiaForm";
import LiaExportView from "@/components/lia/LiaExportView";
import { LIA_INITIAL, type LiaFormState } from "@/components/lia/LiaFormTypes";

export default function LiaLibraryPage() {
  const { profile, user, hasRole } = useAuth();
  const { toast } = useToast();
  const [lias, setLias] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [filterOutcome, setFilterOutcome] = useState("all");
  const [createOpen, setCreateOpen] = useState(false);
  const [editLia, setEditLia] = useState<any>(null);
  const [exportLia, setExportLia] = useState<any>(null);
  const [liaForm, setLiaForm] = useState<LiaFormState>(LIA_INITIAL);
  const [saving, setSaving] = useState(false);

  const canEdit = hasRole("client_admin") || hasRole("client_requester");
  const isAuditor = hasRole("client_auditor");

  useEffect(() => {
    if (profile?.org_id) loadLias();
  }, [profile?.org_id]);

  const loadLias = async () => {
    const { data } = await supabase
      .from("lia_assessments" as any)
      .select("*")
      .eq("org_id", profile!.org_id!)
      .order("created_at", { ascending: false });
    setLias((data as any[]) ?? []);
  };

  const formToDbRecord = (form: LiaFormState) => ({
    purpose: form.purpose,
    legitimate_interest: form.legitimate_interest,
    necessity: form.necessity,
    data_subjects: form.data_subjects,
    data_categories: form.data_categories,
    sources: form.sources,
    special_category_requested: form.data_categories.includes("special_category"),
    criminal_offence_requested: form.data_categories.includes("criminal_offence"),
    safeguards: form.safeguards,
    balancing_test_factors: {
      reasonable_expectations: form.balancing_reasonable_expectations,
      likely_impact: form.balancing_likely_impact,
      nature_of_processing: form.balancing_nature_of_processing,
      mitigations: form.balancing_mitigations,
      notes: form.balancing_notes,
    },
    outcome: form.outcome || null,
    conditions: form.conditions || null,
    retention_months: form.retention_months,
  });

  const dbToForm = (lia: any): LiaFormState => {
    const bt = lia.balancing_test_factors || {};
    return {
      ...LIA_INITIAL,
      purpose: lia.purpose || "",
      legitimate_interest: lia.legitimate_interest || "",
      legitimate_interest_chips: [],
      necessity: lia.necessity || "",
      necessity_alternatives: "",
      data_subjects: Array.isArray(lia.data_subjects) ? lia.data_subjects : [],
      data_categories: Array.isArray(lia.data_categories) ? lia.data_categories : [],
      sources: Array.isArray(lia.sources) ? lia.sources : [],
      special_category_requested: lia.special_category_requested ?? false,
      criminal_offence_requested: lia.criminal_offence_requested ?? false,
      balancing_reasonable_expectations: bt.reasonable_expectations || "",
      balancing_likely_impact: bt.likely_impact || "",
      balancing_nature_of_processing: bt.nature_of_processing || "",
      balancing_mitigations: Array.isArray(bt.mitigations) ? bt.mitigations : [],
      balancing_notes: bt.notes || "",
      safeguards: lia.safeguards || "",
      safeguards_access_limited: false,
      safeguards_redaction: false,
      safeguards_evidence_stored: false,
      retention_months: lia.retention_months,
      outcome: lia.outcome || "",
      conditions: lia.conditions || "",
    };
  };

  const handleCreate = async (status: "draft" | "final") => {
    if (!profile?.org_id || !user) return;
    setSaving(true);
    const record = {
      ...formToDbRecord(liaForm),
      org_id: profile.org_id,
      created_by_user_id: user.id,
      status,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase.from("lia_assessments" as any).insert(record as any).select("id").single();
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      await supabase.from("audit_events").insert({
        user_id: user.id,
        org_id: profile.org_id,
        action_type: status === "final" ? "LIA_FINALISED" : "LIA_CREATED",
        object_type: "lia_assessment",
        object_id: (data as any)?.id,
        metadata: { purpose: liaForm.purpose, outcome: liaForm.outcome },
      });
      toast({ title: status === "final" ? "Mini-LIA finalised" : "Mini-LIA saved as draft" });
      setCreateOpen(false);
      setLiaForm(LIA_INITIAL);
      loadLias();
    }
    setSaving(false);
  };

  const handleUpdate = async (status: "draft" | "final") => {
    if (!editLia || !user || !profile) return;
    setSaving(true);
    const record = {
      ...formToDbRecord(liaForm),
      status,
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase.from("lia_assessments" as any).update(record as any).eq("id", editLia.id);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      await supabase.from("audit_events").insert({
        user_id: user.id,
        org_id: profile.org_id,
        action_type: status === "final" ? "LIA_FINALISED" : "LIA_UPDATED",
        object_type: "lia_assessment",
        object_id: editLia.id,
        metadata: { purpose: liaForm.purpose, outcome: liaForm.outcome },
      });
      toast({ title: status === "final" ? "Mini-LIA finalised" : "Mini-LIA updated" });
      setEditLia(null);
      setLiaForm(LIA_INITIAL);
      loadLias();
    }
    setSaving(false);
  };

  const handleApprove = async (lia: any) => {
    if (!user || !profile) return;
    await supabase.from("lia_assessments" as any).update({
      approved_by_user_id: user.id,
      approved_at: new Date().toISOString(),
    } as any).eq("id", lia.id);
    await supabase.from("audit_events").insert({
      user_id: user.id,
      org_id: profile.org_id,
      action_type: "LIA_APPROVED",
      object_type: "lia_assessment",
      object_id: lia.id,
    });
    toast({ title: "Mini-LIA approved" });
    loadLias();
  };

  const openEdit = (lia: any) => {
    setLiaForm(dbToForm(lia));
    setEditLia(lia);
  };

  const filtered = lias.filter((l) => {
    if (search && !(l.purpose || "").toLowerCase().includes(search.toLowerCase()) && !(l.legitimate_interest || "").toLowerCase().includes(search.toLowerCase())) return false;
    if (filterOutcome !== "all" && l.outcome !== filterOutcome) return false;
    return true;
  });

  return (
    <div>
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="fvc-heading-1 text-foreground">Mini-LIA Library</h1>
          <div className="fvc-gold-rule mt-3 mb-2" />
          <p className="text-sm text-muted-foreground">Legitimate Interests Assessments for audit readiness</p>
        </div>
        {canEdit && (
          <Button onClick={() => { setLiaForm(LIA_INITIAL); setCreateOpen(true); }} className="gap-1.5">
            <Plus size={14} /> New Assessment
          </Button>
        )}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 mb-6">
        <div className="relative flex-1 max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by purpose or interest…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 text-sm"
          />
        </div>
        <Select value={filterOutcome} onValueChange={setFilterOutcome}>
          <SelectTrigger className="w-44 text-sm"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All outcomes</SelectItem>
            <SelectItem value="proceed">Proceed</SelectItem>
            <SelectItem value="proceed_with_conditions">With conditions</SelectItem>
            <SelectItem value="do_not_proceed">Do not proceed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <div className="fvc-card text-center py-12">
          <Shield size={32} className="mx-auto text-muted-foreground/30 mb-3" />
          <h3 className="fvc-heading-3 text-foreground mb-1">No assessments yet</h3>
          <p className="text-sm text-muted-foreground">
            {canEdit ? "Create your first Mini-LIA to get started." : "No Mini-LIA assessments have been recorded."}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((lia) => (
            <div
              key={lia.id}
              className="fvc-card flex items-center justify-between cursor-pointer hover:bg-muted/30 transition-colors"
              onClick={() => isAuditor ? setExportLia(lia) : openEdit(lia)}
            >
              <div className="flex-1 min-w-0 mr-4">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-medium text-foreground truncate">{lia.purpose || "Untitled assessment"}</span>
                  <Badge className={`fvc-status-badge text-[10px] ${
                    lia.status === "final" ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"
                  }`}>
                    {lia.status}
                  </Badge>
                  {lia.outcome && (
                    <Badge variant="outline" className="text-[10px] capitalize">
                      {lia.outcome.replace(/_/g, " ")}
                    </Badge>
                  )}
                  {lia.approved_at && (
                    <Badge className="bg-accent/10 text-accent text-[10px] gap-1">
                      <CheckCircle2 size={9} /> Approved
                    </Badge>
                  )}
                </div>
                <div className="text-[11px] text-muted-foreground">
                  {lia.legitimate_interest ? lia.legitimate_interest.slice(0, 80) : "No interest specified"}
                  {lia.case_id ? ` · Case ${String(lia.case_id).slice(0, 8).toUpperCase()}` : " · Standalone"}
                  {" · "}{new Date(lia.created_at).toLocaleDateString()}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 text-xs text-muted-foreground"
                  onClick={(e) => { e.stopPropagation(); setExportLia(lia); }}
                >
                  <Download size={12} className="mr-1" /> Export
                </Button>
                {canEdit && hasRole("client_admin") && lia.status === "final" && !lia.approved_at && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs"
                    onClick={(e) => { e.stopPropagation(); handleApprove(lia); }}
                  >
                    <CheckCircle2 size={12} className="mr-1" /> Approve
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display text-xl flex items-center gap-2">
              <Shield size={18} className="text-accent" /> New Mini-LIA
            </DialogTitle>
          </DialogHeader>
          <MiniLiaForm form={liaForm} onChange={setLiaForm} />
          <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-border">
            <Button variant="outline" onClick={() => handleCreate("draft")} disabled={saving}>Save Draft</Button>
            <Button onClick={() => handleCreate("final")} disabled={saving || !liaForm.purpose || !liaForm.outcome}>
              Finalise Mini-LIA
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editLia} onOpenChange={(o) => !o && setEditLia(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display text-xl flex items-center gap-2">
              <Shield size={18} className="text-accent" /> {editLia?.status === "final" ? "View" : "Edit"} Mini-LIA
            </DialogTitle>
          </DialogHeader>
          <MiniLiaForm form={liaForm} onChange={setLiaForm} readOnly={editLia?.status === "final" && !hasRole("client_admin")} />
          {(editLia?.status !== "final" || hasRole("client_admin")) && (
            <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-border">
              <Button variant="outline" onClick={() => handleUpdate("draft")} disabled={saving}>Save Draft</Button>
              <Button onClick={() => handleUpdate("final")} disabled={saving || !liaForm.purpose || !liaForm.outcome}>
                {editLia?.status === "final" ? "Update" : "Finalise"} Mini-LIA
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Export Dialog */}
      <Dialog open={!!exportLia} onOpenChange={(o) => !o && setExportLia(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display text-xl">LIA Export</DialogTitle>
          </DialogHeader>
          {exportLia && <LiaExportView lia={exportLia} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}
