import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from "@/components/ui/accordion";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import {
  Shield, Plus, Search, CheckCircle2, Scale, Eye, Lock, Info, BookTemplate,
} from "lucide-react";
import {
  INTEREST_CHIPS, DATA_SUBJECT_OPTIONS, DATA_CATEGORY_OPTIONS,
  SOURCE_OPTIONS, MITIGATION_OPTIONS,
} from "@/components/lia/LiaFormTypes";
import { SEED_TEMPLATES } from "@/lib/lia-seed-templates";

interface MasterLiaTemplate {
  id: string;
  org_id: string;
  name: string;
  purpose_category: string;
  lawful_basis: string;
  legitimate_interest: string | null;
  necessity: string | null;
  less_intrusive: string | null;
  balancing_fields: any;
  safeguards: string | null;
  retention_months: number | null;
  outcome: string | null;
  conditions: string | null;
  status: string;
  approved_by: string | null;
  approved_by_name: string | null;
  approved_at: string | null;
  created_at: string;
  updated_at: string;
  version_number: number;
  effective_date: string | null;
  scope_summary: string | null;
  document_url: string | null;
  superseded_by: string | null;
}

interface TemplateFormState {
  name: string;
  purpose_category: string;
  lawful_basis: string;
  legitimate_interest: string;
  legitimate_interest_chips: string[];
  necessity: string;
  less_intrusive: string;
  data_subjects: string[];
  data_categories: string[];
  sources: string[];
  balancing_reasonable_expectations: string;
  balancing_likely_impact: string;
  balancing_nature_of_processing: string;
  balancing_mitigations: string[];
  balancing_notes: string;
  safeguards: string;
  safeguards_access_limited: boolean;
  safeguards_redaction: boolean;
  safeguards_evidence_stored: boolean;
  retention_months: number | null;
  outcome: string;
  conditions: string;
  // New versioning fields
  scope_summary: string;
  effective_date: string;
  approved_by_name: string;
}

const INITIAL_FORM: TemplateFormState = {
  name: "",
  purpose_category: "",
  lawful_basis: "legitimate_interests",
  legitimate_interest: "",
  legitimate_interest_chips: [],
  necessity: "",
  less_intrusive: "",
  data_subjects: [],
  data_categories: [],
  sources: [],
  balancing_reasonable_expectations: "",
  balancing_likely_impact: "",
  balancing_nature_of_processing: "",
  balancing_mitigations: [],
  balancing_notes: "",
  safeguards: "",
  safeguards_access_limited: false,
  safeguards_redaction: false,
  safeguards_evidence_stored: false,
  retention_months: null,
  outcome: "",
  conditions: "",
  scope_summary: "",
  effective_date: "",
  approved_by_name: "",
};

const PURPOSES = [
  "Third-party due diligence",
  "Supplier onboarding",
  "Annual refresh",
  "Incident response",
  "Regulatory compliance",
  "M&A / strategic partnership",
  "General assurance",
];

export default function LiaLibraryPage() {
  const { profile, user, hasRole } = useAuth();
  const { toast } = useToast();
  const [templates, setTemplates] = useState<MasterLiaTemplate[]>([]);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [createOpen, setCreateOpen] = useState(false);
  const [editTemplate, setEditTemplate] = useState<MasterLiaTemplate | null>(null);
  const [form, setForm] = useState<TemplateFormState>(INITIAL_FORM);
  const [saving, setSaving] = useState(false);
  const [seeding, setSeeding] = useState(false);

  const isAdmin = hasRole("client_admin");
  const canEdit = isAdmin;

  useEffect(() => {
    if (profile?.org_id) loadTemplates();
  }, [profile?.org_id]);

  const loadTemplates = async () => {
    const { data } = await supabase
      .from("master_lia_templates" as any)
      .select("*")
      .eq("org_id", profile!.org_id!)
      .order("created_at", { ascending: false });
    setTemplates((data as any[]) ?? []);
  };

  const formToDb = (f: TemplateFormState) => ({
    name: f.name,
    purpose_category: f.purpose_category,
    lawful_basis: f.lawful_basis,
    legitimate_interest: f.legitimate_interest || null,
    necessity: f.necessity || null,
    less_intrusive: f.less_intrusive || null,
    balancing_fields: {
      reasonable_expectations: f.balancing_reasonable_expectations,
      likely_impact: f.balancing_likely_impact,
      nature_of_processing: f.balancing_nature_of_processing,
      mitigations: f.balancing_mitigations,
      notes: f.balancing_notes,
      data_subjects: f.data_subjects,
      data_categories: f.data_categories,
      sources: f.sources,
      interest_chips: f.legitimate_interest_chips,
      safeguards_access_limited: f.safeguards_access_limited,
      safeguards_redaction: f.safeguards_redaction,
      safeguards_evidence_stored: f.safeguards_evidence_stored,
    },
    safeguards: f.safeguards || null,
    retention_months: f.retention_months,
    outcome: f.outcome || null,
    conditions: f.conditions || null,
    scope_summary: f.scope_summary || null,
    effective_date: f.effective_date || null,
    approved_by_name: f.approved_by_name || null,
  });

  const dbToForm = (t: MasterLiaTemplate): TemplateFormState => {
    const bf = t.balancing_fields || {};
    return {
      name: t.name,
      purpose_category: t.purpose_category || "",
      lawful_basis: t.lawful_basis || "legitimate_interests",
      legitimate_interest: t.legitimate_interest || "",
      legitimate_interest_chips: Array.isArray(bf.interest_chips) ? bf.interest_chips : [],
      necessity: t.necessity || "",
      less_intrusive: t.less_intrusive || "",
      data_subjects: Array.isArray(bf.data_subjects) ? bf.data_subjects : [],
      data_categories: Array.isArray(bf.data_categories) ? bf.data_categories : [],
      sources: Array.isArray(bf.sources) ? bf.sources : [],
      balancing_reasonable_expectations: bf.reasonable_expectations || "",
      balancing_likely_impact: bf.likely_impact || "",
      balancing_nature_of_processing: bf.nature_of_processing || "",
      balancing_mitigations: Array.isArray(bf.mitigations) ? bf.mitigations : [],
      balancing_notes: bf.notes || "",
      safeguards: t.safeguards || "",
      safeguards_access_limited: bf.safeguards_access_limited ?? false,
      safeguards_redaction: bf.safeguards_redaction ?? false,
      safeguards_evidence_stored: bf.safeguards_evidence_stored ?? false,
      retention_months: t.retention_months,
      outcome: t.outcome || "",
      conditions: t.conditions || "",
      scope_summary: t.scope_summary || "",
      effective_date: t.effective_date || "",
      approved_by_name: t.approved_by_name || "",
    };
  };

  const handleCreate = async (status: "draft" | "final") => {
    if (!profile?.org_id || !user) return;
    setSaving(true);
    const newVersion = supersedingId ? supersedingVersion + 1 : 1;
    const record = {
      ...formToDb(form),
      org_id: profile.org_id,
      status,
      version_number: newVersion,
      updated_at: new Date().toISOString(),
      ...(status === "final" ? { approved_by: user.id, approved_at: new Date().toISOString() } : {}),
    };

    const { data, error } = await supabase.from("master_lia_templates" as any).insert(record as any).select("id").single();
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      await supabase.from("audit_events").insert({
        user_id: user.id, org_id: profile.org_id,
        action_type: status === "final" ? "MASTER_LIA_FINALISED" : "MASTER_LIA_CREATED",
        object_type: "master_lia_template", object_id: (data as any)?.id,
        metadata: { name: form.name, purpose: form.purpose_category },
      });
      // If superseding, mark old one
      if (supersedingId && status === "final") {
        await supabase.from("master_lia_templates" as any)
          .update({ status: "superseded", superseded_by: (data as any)?.id } as any)
          .eq("id", supersedingId);
      }
      toast({ title: status === "final" ? "Master LIA finalised" : "Template saved as draft" });
      setCreateOpen(false);
      setForm(INITIAL_FORM);
      setSupersedingId(null);
      setSupersedingVersion(0);
      loadTemplates();
    }
    setSaving(false);
  };

  const handleUpdate = async (status: "draft" | "final") => {
    if (!editTemplate || !user || !profile) return;
    setSaving(true);
    const record = {
      ...formToDb(form),
      status,
      updated_at: new Date().toISOString(),
      ...(status === "final" && !editTemplate.approved_at ? { approved_by: user.id, approved_at: new Date().toISOString() } : {}),
    };

    const { error } = await supabase.from("master_lia_templates" as any).update(record as any).eq("id", editTemplate.id);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      await supabase.from("audit_events").insert({
        user_id: user.id, org_id: profile.org_id,
        action_type: status === "final" ? "MASTER_LIA_FINALISED" : "MASTER_LIA_UPDATED",
        object_type: "master_lia_template", object_id: editTemplate.id,
        metadata: { name: form.name },
      });
      toast({ title: status === "final" ? "Master LIA finalised" : "Template updated" });
      setEditTemplate(null);
      setForm(INITIAL_FORM);
      loadTemplates();
    }
    setSaving(false);
  };

  const openEdit = (t: MasterLiaTemplate) => {
    setForm(dbToForm(t));
    setEditTemplate(t);
  };

  const filtered = templates.filter((t) => {
    if (search && !t.name.toLowerCase().includes(search.toLowerCase()) && !(t.purpose_category || "").toLowerCase().includes(search.toLowerCase())) return false;
    if (filterStatus !== "all" && t.status !== filterStatus) return false;
    return true;
  });

  const set = (patch: Partial<TemplateFormState>) => setForm((prev) => ({ ...prev, ...patch }));
  const toggleArrayItem = (field: keyof TemplateFormState, value: string) => {
    const arr = form[field] as string[];
    const next = arr.includes(value) ? arr.filter((v) => v !== value) : [...arr, value];
    set({ [field]: next } as any);
  };

  const levelOptions = [
    { value: "low", label: "Low" },
    { value: "medium", label: "Medium" },
    { value: "high", label: "High" },
  ];
  const processingNature = [
    { value: "limited", label: "Limited" },
    { value: "moderate", label: "Moderate" },
    { value: "extensive", label: "Extensive" },
  ];

  const sectionComplete = {
    purpose: !!(form.name && form.purpose_category && form.legitimate_interest),
    necessity: !!form.necessity,
    balancing: !!(form.balancing_reasonable_expectations && form.balancing_likely_impact && form.balancing_nature_of_processing),
    safeguards: !!(form.safeguards_access_limited || form.safeguards_redaction || form.safeguards_evidence_stored || form.safeguards),
    outcome: !!form.outcome,
  };
  const completedCount = Object.values(sectionComplete).filter(Boolean).length;

  const isDialogReadOnly = editTemplate?.status === "final" && !isAdmin;

  const handleCreateNewVersion = async (t: MasterLiaTemplate) => {
    // Supersede the current template and open a new version
    const newForm = dbToForm(t);
    newForm.scope_summary = "";
    newForm.effective_date = new Date().toISOString().split("T")[0];
    setForm(newForm);
    // Store the template being superseded
    setSupersedingId(t.id);
    setSupersedingVersion(t.version_number);
    setCreateOpen(true);
  };

  const [supersedingId, setSupersedingId] = useState<string | null>(null);
  const [supersedingVersion, setSupersedingVersion] = useState<number>(0);

  const renderTemplateForm = (readOnly: boolean) => (
    <div className="space-y-4">
      {/* Version & Scope */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label className="text-xs">Effective Date</Label>
          <Input type="date" value={form.effective_date} onChange={(e) => set({ effective_date: e.target.value })} disabled={readOnly} />
        </div>
        <div className="space-y-2">
          <Label className="text-xs">Approved By (Name/Role)</Label>
          <Input value={form.approved_by_name} onChange={(e) => set({ approved_by_name: e.target.value })} placeholder="e.g. Jane Smith, DPO" disabled={readOnly} />
        </div>
      </div>
      <div className="space-y-2">
        <Label className="text-xs">Scope Summary</Label>
        <Textarea rows={2} value={form.scope_summary} onChange={(e) => set({ scope_summary: e.target.value })} placeholder="Describe the scope of this LIA version…" disabled={readOnly} />
      </div>

      {/* Template name */}
      <div className="space-y-2">
        <Label className="text-xs">Template name</Label>
        <Input value={form.name} onChange={(e) => set({ name: e.target.value })} placeholder="e.g., Standard Supplier Due Diligence" disabled={readOnly} />
      </div>

      {/* Progress */}
      <div className="flex items-center gap-3 mb-2">
        <Shield size={16} className="text-accent" />
        <div className="flex-1">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-medium text-foreground">Template Progress</span>
            <span className="text-[10px] text-muted-foreground">{completedCount}/5 sections</span>
          </div>
          <div className="h-1.5 bg-muted rounded-full overflow-hidden">
            <div className="h-full bg-accent rounded-full transition-all duration-500" style={{ width: `${(completedCount / 5) * 100}%` }} />
          </div>
        </div>
      </div>

      <Accordion type="multiple" defaultValue={["purpose", "necessity", "balancing", "safeguards", "outcome"]} className="space-y-2">
        {/* Purpose */}
        <AccordionItem value="purpose" className="border border-border rounded-lg px-4 overflow-hidden">
          <AccordionTrigger className="text-sm font-medium text-foreground hover:no-underline py-3">
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${sectionComplete.purpose ? "bg-accent" : "bg-muted-foreground/30"}`} />
              Purpose &amp; Legitimate Interest
            </div>
          </AccordionTrigger>
          <AccordionContent className="pb-4 space-y-4">
            <div className="space-y-2">
              <Label className="text-xs">Purpose category</Label>
              <Select value={form.purpose_category} onValueChange={(v) => set({ purpose_category: v })} disabled={readOnly}>
                <SelectTrigger className="text-xs"><SelectValue placeholder="Select…" /></SelectTrigger>
                <SelectContent>
                  {PURPOSES.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-xs">What legitimate interest are you pursuing?</Label>
              <div className="flex flex-wrap gap-1.5 mb-2">
                {INTEREST_CHIPS.map((chip) => {
                  const selected = form.legitimate_interest_chips.includes(chip);
                  return (
                    <Badge key={chip} variant={selected ? "default" : "outline"}
                      className={`cursor-pointer text-[10px] transition-all ${selected ? "bg-accent text-accent-foreground" : "hover:bg-muted/50"} ${readOnly ? "pointer-events-none" : ""}`}
                      onClick={() => !readOnly && toggleArrayItem("legitimate_interest_chips", chip)}
                    >{chip}</Badge>
                  );
                })}
              </div>
              <Textarea rows={2} value={form.legitimate_interest} onChange={(e) => set({ legitimate_interest: e.target.value })} placeholder="Describe the specific interest…" disabled={readOnly} />
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Necessity */}
        <AccordionItem value="necessity" className="border border-border rounded-lg px-4 overflow-hidden">
          <AccordionTrigger className="text-sm font-medium text-foreground hover:no-underline py-3">
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${sectionComplete.necessity ? "bg-accent" : "bg-muted-foreground/30"}`} />
              Necessity Test
            </div>
          </AccordionTrigger>
          <AccordionContent className="pb-4 space-y-4">
            <div className="space-y-2">
              <Label className="text-xs">Why is processing personal data necessary?</Label>
              <Textarea rows={2} value={form.necessity} onChange={(e) => set({ necessity: e.target.value })} placeholder="Explain necessity…" disabled={readOnly} />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Why can't the objective be met with less intrusive means?</Label>
              <Textarea rows={2} value={form.less_intrusive} onChange={(e) => set({ less_intrusive: e.target.value })} placeholder="Explain why alternatives are insufficient…" disabled={readOnly} />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Data subjects</Label>
              <div className="flex flex-wrap gap-1.5">
                {DATA_SUBJECT_OPTIONS.map((ds) => (
                  <Badge key={ds} variant={form.data_subjects.includes(ds) ? "default" : "outline"}
                    className={`cursor-pointer text-[10px] transition-all ${form.data_subjects.includes(ds) ? "bg-primary/80 text-primary-foreground" : "hover:bg-muted/50"} ${readOnly ? "pointer-events-none" : ""}`}
                    onClick={() => !readOnly && toggleArrayItem("data_subjects", ds)}
                  >{ds}</Badge>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Data categories</Label>
              <div className="grid grid-cols-2 gap-1.5">
                {DATA_CATEGORY_OPTIONS.map((cat) => (
                  <label key={cat.value} className="flex items-center gap-2 cursor-pointer text-xs">
                    <Checkbox checked={form.data_categories.includes(cat.value)} onCheckedChange={() => !readOnly && toggleArrayItem("data_categories", cat.value)} disabled={readOnly} />
                    <span className="text-foreground">{cat.label}</span>
                  </label>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Sources</Label>
              <div className="flex flex-wrap gap-1.5">
                {SOURCE_OPTIONS.map((src) => (
                  <Badge key={src} variant={form.sources.includes(src) ? "default" : "outline"}
                    className={`cursor-pointer text-[10px] transition-all ${form.sources.includes(src) ? "bg-primary/80 text-primary-foreground" : "hover:bg-muted/50"} ${readOnly ? "pointer-events-none" : ""}`}
                    onClick={() => !readOnly && toggleArrayItem("sources", src)}
                  >{src}</Badge>
                ))}
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Balancing */}
        <AccordionItem value="balancing" className="border border-border rounded-lg px-4 overflow-hidden">
          <AccordionTrigger className="text-sm font-medium text-foreground hover:no-underline py-3">
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${sectionComplete.balancing ? "bg-accent" : "bg-muted-foreground/30"}`} />
              <Scale size={14} className="text-muted-foreground" /> Balancing Test
            </div>
          </AccordionTrigger>
          <AccordionContent className="pb-4 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label className="text-xs flex items-center gap-1.5"><Eye size={11} /> Reasonable expectations</Label>
                <Select value={form.balancing_reasonable_expectations} onValueChange={(v) => set({ balancing_reasonable_expectations: v })} disabled={readOnly}>
                  <SelectTrigger className="text-xs"><SelectValue placeholder="Select…" /></SelectTrigger>
                  <SelectContent>{levelOptions.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Likely impact on individuals</Label>
                <Select value={form.balancing_likely_impact} onValueChange={(v) => set({ balancing_likely_impact: v })} disabled={readOnly}>
                  <SelectTrigger className="text-xs"><SelectValue placeholder="Select…" /></SelectTrigger>
                  <SelectContent>{levelOptions.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Nature of processing</Label>
                <Select value={form.balancing_nature_of_processing} onValueChange={(v) => set({ balancing_nature_of_processing: v })} disabled={readOnly}>
                  <SelectTrigger className="text-xs"><SelectValue placeholder="Select…" /></SelectTrigger>
                  <SelectContent>{processingNature.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-xs flex items-center gap-1.5"><Lock size={11} /> Mitigations</Label>
              <div className="grid grid-cols-2 gap-1.5">
                {MITIGATION_OPTIONS.map((m) => (
                  <label key={m.value} className="flex items-center gap-2 cursor-pointer text-xs">
                    <Checkbox checked={form.balancing_mitigations.includes(m.value)} onCheckedChange={() => !readOnly && toggleArrayItem("balancing_mitigations", m.value)} disabled={readOnly} />
                    <span className="text-foreground">{m.label}</span>
                  </label>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Additional notes</Label>
              <Textarea rows={2} value={form.balancing_notes} onChange={(e) => set({ balancing_notes: e.target.value })} placeholder="Any additional considerations…" disabled={readOnly} />
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Safeguards */}
        <AccordionItem value="safeguards" className="border border-border rounded-lg px-4 overflow-hidden">
          <AccordionTrigger className="text-sm font-medium text-foreground hover:no-underline py-3">
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${sectionComplete.safeguards ? "bg-accent" : "bg-muted-foreground/30"}`} />
              Safeguards &amp; Retention
            </div>
          </AccordionTrigger>
          <AccordionContent className="pb-4 space-y-4">
            <div className="space-y-3">
              <label className="flex items-center gap-2 cursor-pointer text-sm">
                <Checkbox checked={form.safeguards_access_limited} onCheckedChange={(v) => set({ safeguards_access_limited: !!v })} disabled={readOnly} />
                <span className="text-foreground">Access limited to authorised personnel only</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer text-sm">
                <Checkbox checked={form.safeguards_redaction} onCheckedChange={(v) => set({ safeguards_redaction: !!v })} disabled={readOnly} />
                <span className="text-foreground">Redaction applied where appropriate</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer text-sm">
                <Checkbox checked={form.safeguards_evidence_stored} onCheckedChange={(v) => set({ safeguards_evidence_stored: !!v })} disabled={readOnly} />
                <span className="text-foreground">Evidence/time-stamped sources stored securely</span>
              </label>
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Safeguards summary</Label>
              <Textarea rows={2} value={form.safeguards} onChange={(e) => set({ safeguards: e.target.value })} placeholder="Describe additional safeguards…" disabled={readOnly} />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Retention period</Label>
              <Select value={form.retention_months?.toString() ?? ""} onValueChange={(v) => set({ retention_months: v ? Number(v) : null })} disabled={readOnly}>
                <SelectTrigger className="text-xs"><SelectValue placeholder="Select…" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="6">6 months</SelectItem>
                  <SelectItem value="12">12 months</SelectItem>
                  <SelectItem value="24">24 months</SelectItem>
                  <SelectItem value="0">Per organisational policy</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Outcome */}
        <AccordionItem value="outcome" className="border border-border rounded-lg px-4 overflow-hidden">
          <AccordionTrigger className="text-sm font-medium text-foreground hover:no-underline py-3">
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${sectionComplete.outcome ? "bg-accent" : "bg-muted-foreground/30"}`} />
              Outcome
            </div>
          </AccordionTrigger>
          <AccordionContent className="pb-4 space-y-4">
            <div className="space-y-2">
              <Label className="text-xs">Assessment outcome</Label>
              <Select value={form.outcome} onValueChange={(v) => set({ outcome: v })} disabled={readOnly}>
                <SelectTrigger className="text-xs"><SelectValue placeholder="Select outcome…" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="proceed">Proceed</SelectItem>
                  <SelectItem value="proceed_with_conditions">Proceed with conditions</SelectItem>
                  <SelectItem value="do_not_proceed">Do not proceed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {form.outcome === "proceed_with_conditions" && (
              <div className="space-y-2">
                <Label className="text-xs">Conditions</Label>
                <Textarea rows={2} value={form.conditions} onChange={(e) => set({ conditions: e.target.value })} placeholder="Specify conditions…" disabled={readOnly} />
              </div>
            )}
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );

  return (
    <div>
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="fvc-heading-1 text-foreground">Master LIA Templates</h1>
          <div className="fvc-gold-rule mt-3 mb-2" />
          <p className="text-sm text-muted-foreground">Organisation-level Legitimate Interests Assessments — finalise once, reference per case</p>
        </div>
        {canEdit && (
          <Button onClick={() => { setForm(INITIAL_FORM); setCreateOpen(true); }} className="gap-1.5">
            <Plus size={14} /> New Template
          </Button>
        )}
      </div>

      {/* Info banner */}
      <div className="flex items-start gap-3 p-3.5 rounded-lg border border-border bg-muted/30 mb-6">
        <Info size={14} className="text-muted-foreground shrink-0 mt-0.5" />
        <p className="text-[11px] text-muted-foreground leading-relaxed">
          Master LIA templates are completed once by Client Admin and referenced during case commissioning. Individual cases use a lightweight DP Declaration that links to these templates.
        </p>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 mb-6">
        <div className="relative flex-1 max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search templates…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 text-sm" />
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-40 text-sm"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="final">Active</SelectItem>
            <SelectItem value="superseded">Superseded</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <div className="fvc-card text-center py-12">
          <Shield size={32} className="mx-auto text-muted-foreground/30 mb-3" />
          <h3 className="fvc-heading-3 text-foreground mb-1">No templates yet</h3>
          <p className="text-sm text-muted-foreground">
            {canEdit ? "Create your first Master LIA template to get started." : "No Master LIA templates have been created."}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((t) => (
            <div
              key={t.id}
              className="fvc-card flex items-center justify-between cursor-pointer hover:bg-muted/30 transition-colors"
              onClick={() => openEdit(t)}
            >
              <div className="flex-1 min-w-0 mr-4">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-medium text-foreground truncate">{t.name || "Untitled template"}</span>
                  <Badge className="text-[10px] bg-muted text-muted-foreground">v{(t as any).version_number || 1}</Badge>
                  <Badge className={`fvc-status-badge text-[10px] ${
                    t.status === "final" ? "bg-success/10 text-success" :
                    t.status === "superseded" ? "bg-muted text-muted-foreground/60" :
                    "bg-warning/10 text-warning"
                  }`}>
                    {t.status === "final" ? "Active" : t.status === "superseded" ? "Superseded" : "Draft"}
                  </Badge>
                  {t.outcome && (
                    <Badge variant="outline" className="text-[10px] capitalize">{t.outcome.replace(/_/g, " ")}</Badge>
                  )}
                </div>
                <div className="text-[11px] text-muted-foreground">
                  {t.purpose_category || "No purpose set"}
                  {" · "}{t.lawful_basis === "legitimate_interests" ? "Legitimate interests" : t.lawful_basis}
                  {(t as any).effective_date ? ` · Effective ${new Date((t as any).effective_date).toLocaleDateString()}` : ` · Created ${new Date(t.created_at).toLocaleDateString()}`}
                  {(t as any).approved_by_name && ` · Approved by ${(t as any).approved_by_name}`}
                </div>
                {(t as any).scope_summary && (
                  <div className="text-[11px] text-muted-foreground/70 mt-0.5 truncate">{(t as any).scope_summary}</div>
                )}
              </div>
              {canEdit && t.status === "final" && (
                <Button variant="outline" size="sm" className="text-xs shrink-0" onClick={(e) => { e.stopPropagation(); handleCreateNewVersion(t); }}>
                  New Version
                </Button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Create Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display text-xl flex items-center gap-2">
              <Shield size={18} className="text-accent" /> New Master LIA Template
            </DialogTitle>
          </DialogHeader>
          {renderTemplateForm(false)}
          <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-border">
            <Button variant="outline" onClick={() => handleCreate("draft")} disabled={saving}>Save Draft</Button>
            <Button onClick={() => handleCreate("final")} disabled={saving || !form.name || !form.outcome}>
              Finalise &amp; Approve
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editTemplate} onOpenChange={(o) => !o && setEditTemplate(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display text-xl flex items-center gap-2">
              <Shield size={18} className="text-accent" /> {isDialogReadOnly ? "View" : "Edit"} Master LIA Template
            </DialogTitle>
          </DialogHeader>
          {renderTemplateForm(!!isDialogReadOnly)}
          {!isDialogReadOnly && (
            <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-border">
              <Button variant="outline" onClick={() => handleUpdate("draft")} disabled={saving}>Save Draft</Button>
              <Button onClick={() => handleUpdate("final")} disabled={saving || !form.name || !form.outcome}>
                {editTemplate?.status === "final" ? "Update" : "Finalise & Approve"}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
