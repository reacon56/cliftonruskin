import { useEffect, useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { AlertTriangle, Shield, Info, FileCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";

const DEFAULT_DATA_CATEGORIES = [
  { value: "identity", label: "Identity details" },
  { value: "roles", label: "Directorships / roles" },
  { value: "sanctions_pep", label: "Sanctions / PEP screening" },
  { value: "adverse_media", label: "Adverse media" },
  { value: "litigation", label: "Litigation / court records" },
  { value: "social_media", label: "Social media / online presence" },
  { value: "criminal_offence", label: "Criminal offence data" },
  { value: "special_category", label: "Special category data" },
];

const PURPOSES = [
  "New vendor onboarding",
  "Annual refresh",
  "Contract renewal",
  "M&A / JV / strategic partnership",
  "Incident / allegation response",
  "Regulatory / compliance requirement",
  "Litigation support",
  "Other",
];

export interface DpDeclarationState {
  use_master_lia: boolean;
  master_lia_id: string;
  purpose: string;
  data_categories: string[];
  sensitive_criminal_offence: boolean;
  sensitive_special_category: boolean;
  minimisation_confirmed: boolean;
  retention_months: number | null;
}

export const DP_DECLARATION_INITIAL: DpDeclarationState = {
  use_master_lia: true,
  master_lia_id: "",
  purpose: "",
  data_categories: ["identity", "roles", "sanctions_pep"],
  sensitive_criminal_offence: false,
  sensitive_special_category: false,
  minimisation_confirmed: false,
  retention_months: null,
};

export function computeDpDeclarationRisk(form: DpDeclarationState): {
  requiresApproval: boolean;
  reasons: string[];
} {
  const reasons: string[] = [];
  if (form.sensitive_criminal_offence) reasons.push("Criminal offence data requested");
  if (form.sensitive_special_category) reasons.push("Special category data requested");
  if (!form.use_master_lia || !form.master_lia_id) reasons.push("No Master LIA template selected");
  // Purpose deviation: if purpose doesn't match the template we flag it
  // (simplified: we flag if no master LIA is used)
  return { requiresApproval: reasons.length > 0, reasons };
}

interface Props {
  form: DpDeclarationState;
  onChange: (form: DpDeclarationState) => void;
  orgId: string | null;
}

export default function DpDeclarationStep({ form, onChange, orgId }: Props) {
  const [templates, setTemplates] = useState<any[]>([]);
  const set = (patch: Partial<DpDeclarationState>) => onChange({ ...form, ...patch });

  useEffect(() => {
    if (!orgId) return;
    supabase
      .from("master_lia_templates" as any)
      .select("*")
      .eq("org_id", orgId)
      .eq("status", "final")
      .order("name")
      .then(({ data }) => {
        setTemplates((data as any[]) ?? []);
      });
  }, [orgId]);

  const selectedTemplate = templates.find((t: any) => t.id === form.master_lia_id);

  const handleTemplateChange = (templateId: string) => {
    const tpl = templates.find((t: any) => t.id === templateId);
    if (tpl) {
      set({
        master_lia_id: templateId,
        purpose: tpl.purpose_category || form.purpose,
        retention_months: tpl.retention_months ?? form.retention_months,
      });
    } else {
      set({ master_lia_id: templateId });
    }
  };

  const toggleCategory = (cat: string) => {
    const next = form.data_categories.includes(cat)
      ? form.data_categories.filter((c) => c !== cat)
      : [...form.data_categories, cat];
    set({ data_categories: next });
  };

  const risk = computeDpDeclarationRisk(form);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Disclaimer */}
      <div className="flex items-start gap-3 p-3.5 rounded-lg border border-border bg-muted/30">
        <Info size={14} className="text-muted-foreground shrink-0 mt-0.5" />
        <p className="text-[11px] text-muted-foreground leading-relaxed">
          A lightweight DP declaration is recorded per case for audit. Your organisation's Master LIA template covers the detailed legitimate interests assessment.
        </p>
      </div>

      {/* Master LIA toggle */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Shield size={14} className="text-accent" />
          <Label className="text-sm font-medium">Use Master LIA template?</Label>
        </div>
        <div className="space-y-2">
          {([true, false] as const).map((val) => (
            <label
              key={String(val)}
              className={`block rounded-lg border p-4 cursor-pointer transition-all duration-300 ${
                form.use_master_lia === val
                  ? "border-accent/50 bg-accent/5"
                  : "border-border hover:bg-muted/30"
              }`}
              style={form.use_master_lia === val ? { boxShadow: "var(--shadow-gold-glow)" } : undefined}
            >
              <input
                type="radio"
                name="use_master_lia"
                className="sr-only"
                checked={form.use_master_lia === val}
                onChange={() => set({ use_master_lia: val })}
              />
              <div className="text-sm font-medium text-foreground">{val ? "Yes — use approved template" : "No — declare independently"}</div>
              <div className="text-[11px] text-muted-foreground mt-0.5">
                {val ? "Select from your organisation's finalised Master LIA templates" : "This case will require Client Admin approval + CR DP review"}
              </div>
            </label>
          ))}
        </div>
      </div>

      {/* Template selector */}
      {form.use_master_lia && (
        <div className="space-y-2">
          <Label>Master LIA template</Label>
          {templates.length === 0 ? (
            <div className="flex items-start gap-3 p-3.5 rounded-lg border border-warning/30 bg-warning/5">
              <AlertTriangle size={14} className="text-warning shrink-0 mt-0.5" />
              <div>
                <div className="text-sm font-medium text-foreground">No templates available</div>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Your Client Admin needs to create and finalise a Master LIA template first. Go to Data Protection → Master LIA Templates.
                </p>
              </div>
            </div>
          ) : (
            <Select value={form.master_lia_id} onValueChange={handleTemplateChange}>
              <SelectTrigger><SelectValue placeholder="Select a template…" /></SelectTrigger>
              <SelectContent>
                {templates.map((t: any) => (
                  <SelectItem key={t.id} value={t.id}>
                    <div className="flex items-center gap-2">
                      <FileCheck size={12} className="text-accent" />
                      {t.name}
                      {t.approved_at && <Badge className="text-[9px] bg-accent/10 text-accent ml-1">Approved</Badge>}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          {selectedTemplate && (
            <div className="text-[11px] text-muted-foreground border border-border rounded-lg p-3 bg-muted/20 space-y-1">
              <div><span className="font-medium text-foreground">Purpose:</span> {selectedTemplate.purpose_category}</div>
              <div><span className="font-medium text-foreground">Basis:</span> {selectedTemplate.lawful_basis === "legitimate_interests" ? "Legitimate interests (Art. 6(1)(f))" : selectedTemplate.lawful_basis}</div>
              <div><span className="font-medium text-foreground">Outcome:</span> <span className="capitalize">{(selectedTemplate.outcome || "").replace(/_/g, " ")}</span></div>
              {selectedTemplate.retention_months != null && (
                <div><span className="font-medium text-foreground">Retention:</span> {selectedTemplate.retention_months === 0 ? "Per policy" : `${selectedTemplate.retention_months} months`}</div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Purpose */}
      <div className="space-y-2">
        <Label>Processing purpose</Label>
        <Select value={form.purpose} onValueChange={(v) => set({ purpose: v })}>
          <SelectTrigger><SelectValue placeholder="Select purpose…" /></SelectTrigger>
          <SelectContent>
            {PURPOSES.map((p) => (
              <SelectItem key={p} value={p}>{p}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Data categories */}
      <div className="space-y-3">
        <Label>Data categories</Label>
        <div className="space-y-2">
          {DEFAULT_DATA_CATEGORIES.map((cat) => {
            const checked = form.data_categories.includes(cat.value);
            const isSensitive = cat.value === "criminal_offence" || cat.value === "special_category";
            return (
              <label
                key={cat.value}
                className={`flex items-start gap-3 rounded-lg border p-3 transition-all cursor-pointer ${
                  checked
                    ? isSensitive ? "border-destructive/40 bg-destructive/5" : "border-accent/40 bg-accent/5"
                    : "border-border hover:bg-muted/30"
                }`}
              >
                <Checkbox
                  checked={checked}
                  onCheckedChange={() => {
                    toggleCategory(cat.value);
                    if (cat.value === "criminal_offence") set({ sensitive_criminal_offence: !checked });
                    if (cat.value === "special_category") set({ sensitive_special_category: !checked });
                  }}
                  className="mt-0.5"
                />
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-foreground">{cat.label}</div>
                  {isSensitive && checked && (
                    <div className="flex items-center gap-1 mt-0.5">
                      <AlertTriangle size={10} className="text-destructive shrink-0" />
                      <span className="text-[10px] text-destructive">Requires approval + DP review</span>
                    </div>
                  )}
                </div>
              </label>
            );
          })}
        </div>
      </div>

      {/* Minimisation confirmation */}
      <label className="flex items-start gap-3 cursor-pointer">
        <Checkbox
          checked={form.minimisation_confirmed}
          onCheckedChange={(v) => set({ minimisation_confirmed: !!v })}
          className="mt-0.5"
        />
        <span className="text-sm text-foreground leading-relaxed">
          I confirm only necessary personal data will be processed for this purpose
        </span>
      </label>

      {/* Retention */}
      <div className="space-y-2">
        <Label>Data retention period</Label>
        <Select
          value={form.retention_months?.toString() ?? ""}
          onValueChange={(v) => set({ retention_months: v ? Number(v) : null })}
        >
          <SelectTrigger><SelectValue placeholder="Select retention period…" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="6">6 months</SelectItem>
            <SelectItem value="12">12 months</SelectItem>
            <SelectItem value="24">24 months</SelectItem>
            <SelectItem value="0">Per organisational policy</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Approval warning */}
      {risk.requiresApproval && (
        <div className="flex items-start gap-3 p-3.5 rounded-lg border border-destructive/30 bg-destructive/5">
          <AlertTriangle size={14} className="text-destructive shrink-0 mt-0.5" />
          <div>
            <div className="text-sm font-medium text-foreground">Additional approval required</div>
            <ul className="text-[11px] text-muted-foreground mt-1 space-y-0.5">
              {risk.reasons.map((r, i) => (
                <li key={i}>• {r}</li>
              ))}
            </ul>
            <p className="text-[11px] text-muted-foreground mt-1.5">
              Client Admin approval + FV&amp;C Data Protection Review will be required before work begins.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
