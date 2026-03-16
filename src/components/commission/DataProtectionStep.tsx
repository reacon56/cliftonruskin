import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { AlertTriangle, Shield, Info } from "lucide-react";
import { RegChangeAlertBanner } from "@/components/insight/RegChangeAlertBanner";
import { KnowledgePanelWidget } from "@/components/insight/KnowledgePanel";
import type { KnowledgeSection } from "@/components/insight/KnowledgePanel";
import MiniLiaForm from "@/components/lia/MiniLiaForm";
import { LIA_INITIAL, type LiaFormState } from "@/components/lia/LiaFormTypes";

export interface DpFormState {
  requires_personal_data: boolean;
  processing_purpose: string;
  processing_purpose_detail: string;
  lawful_basis: string;
  lia_summary: string;
  lia_form: LiaFormState;
  data_categories: string[];
  minimisation_confirmed: boolean;
  exclude_special_category: boolean;
  exclude_criminal_offence: boolean;
  retention_months: number | null;
}

export const DP_INITIAL: DpFormState = {
  requires_personal_data: false,
  processing_purpose: "",
  processing_purpose_detail: "",
  lawful_basis: "",
  lia_summary: "",
  lia_form: LIA_INITIAL,
  data_categories: [],
  minimisation_confirmed: false,
  exclude_special_category: true,
  exclude_criminal_offence: true,
  retention_months: null,
};

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

const LAWFUL_BASES = [
  { value: "legitimate_interests", label: "Legitimate interests (Art. 6(1)(f))" },
  { value: "contract", label: "Performance of a contract (Art. 6(1)(b))" },
  { value: "legal_obligation", label: "Legal obligation (Art. 6(1)(c))" },
  { value: "consent", label: "Consent (Art. 6(1)(a))" },
  { value: "public_task", label: "Public task (Art. 6(1)(e))" },
  { value: "vital_interests", label: "Vital interests (Art. 6(1)(d))" },
];

const DATA_CATEGORIES = [
  { value: "identity", label: "Identity details", warning: false },
  { value: "roles", label: "Directorships / roles", warning: false },
  { value: "sanctions_pep", label: "Sanctions / PEP screening", warning: false },
  { value: "adverse_media", label: "Adverse media", warning: false },
  { value: "litigation", label: "Litigation / court records", warning: false },
  { value: "social_media", label: "Social media / online presence", warning: true, warningText: "Must be necessary and proportionate" },
  { value: "criminal_offence", label: "Criminal offence data", warning: true, warningText: "Requires extra safeguards" },
  { value: "special_category", label: "Special category data", warning: true, warningText: "Art. 9 — restricted processing" },
];

interface Props {
  form: DpFormState;
  onChange: (form: DpFormState) => void;
}

export function computeDpRiskLevel(form: DpFormState): { level: string; reviewRequired: boolean } {
  if (!form.requires_personal_data) return { level: "low", reviewRequired: false };
  const hasCriminal = form.data_categories.includes("criminal_offence");
  const hasSpecial = form.data_categories.includes("special_category");
  if (hasCriminal || hasSpecial) return { level: "high", reviewRequired: true };
  if (form.data_categories.includes("social_media") || form.lawful_basis === "consent") return { level: "medium", reviewRequired: false };
  return { level: "low", reviewRequired: false };
}

export default function DataProtectionStep({ form, onChange }: Props) {
  const set = (patch: Partial<DpFormState>) => onChange({ ...form, ...patch });

  const toggleCategory = (cat: string) => {
    const next = form.data_categories.includes(cat)
      ? form.data_categories.filter((c) => c !== cat)
      : [...form.data_categories, cat];
    set({ data_categories: next });
  };

  const isCategoryDisabled = (cat: string) => {
    if (cat === "special_category" && form.exclude_special_category) return true;
    if (cat === "criminal_offence" && form.exclude_criminal_offence) return true;
    return false;
  };

  const dpRisk = computeDpRiskLevel(form);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Disclaimer */}
      <div className="flex items-start gap-3 p-3.5 rounded-lg border border-border bg-muted/30">
        <Info size={14} className="text-muted-foreground shrink-0 mt-0.5" />
        <p className="text-[11px] text-muted-foreground leading-relaxed">
          This information is recorded for audit and governance. Clients remain responsible for confirming their lawful basis and necessity.
        </p>
      </div>

      {/* PII toggle */}
      <div>
        <Label className="text-sm font-medium">Does this case require processing personal data (PII)?</Label>
        <div className="mt-3 space-y-2">
          {([false, true] as const).map((val) => (
            <label
              key={String(val)}
              className={`block rounded-lg border p-4 cursor-pointer transition-all duration-300 ${
                form.requires_personal_data === val
                  ? "border-accent/50 bg-accent/5"
                  : "border-border hover:bg-muted/30"
              }`}
              style={form.requires_personal_data === val ? { boxShadow: "var(--shadow-gold-glow)" } : undefined}
            >
              <input
                type="radio"
                name="requires_pii"
                className="sr-only"
                checked={form.requires_personal_data === val}
                onChange={() => set({ requires_personal_data: val })}
              />
              <div className="text-sm font-medium text-foreground">{val ? "Yes" : "No"}</div>
              <div className="text-[11px] text-muted-foreground mt-0.5">
                {val ? "This case will process personal data — provide details below" : "No personal data processing required (default)"}
              </div>
            </label>
          ))}
        </div>
      </div>

      {form.requires_personal_data && (
        <>
          {/* Purpose */}
          <div className="space-y-2">
            <Label>Processing purpose</Label>
            <Select value={form.processing_purpose} onValueChange={(v) => set({ processing_purpose: v })}>
              <SelectTrigger><SelectValue placeholder="Select purpose…" /></SelectTrigger>
              <SelectContent>
                {PURPOSES.map((p) => (
                  <SelectItem key={p} value={p}>{p}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {form.processing_purpose === "Other" && (
              <Textarea
                rows={2}
                placeholder="Describe the purpose…"
                value={form.processing_purpose_detail}
                onChange={(e) => set({ processing_purpose_detail: e.target.value })}
                className="mt-2"
              />
            )}
          </div>

          {/* Lawful basis */}
          <div className="space-y-2">
            <Label>Lawful basis (GDPR Article 6)</Label>
            <Select value={form.lawful_basis} onValueChange={(v) => set({ lawful_basis: v })}>
              <SelectTrigger><SelectValue placeholder="Select lawful basis…" /></SelectTrigger>
              <SelectContent>
                {LAWFUL_BASES.map((b) => (
                  <SelectItem key={b.value} value={b.value}>{b.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Mini-LIA for legitimate interests */}
          {form.lawful_basis === "legitimate_interests" && (
            <div className="space-y-3 border-l-2 border-accent/30 pl-4">
              <div className="flex items-center gap-2">
                <Shield size={14} className="text-accent" />
                <Label className="text-xs font-medium">Mini Legitimate Interests Assessment</Label>
              </div>
              <p className="text-[11px] text-muted-foreground">Complete the structured assessment below to record a defensible LIA.</p>
              <MiniLiaForm
                form={form.lia_form}
                onChange={(liaForm) => set({ lia_form: liaForm })}
              />
            </div>
          )}

          {/* Data categories */}
          <div className="space-y-3">
            <Label>Data categories requested</Label>
            <div className="space-y-2">
              {DATA_CATEGORIES.map((cat) => {
                const disabled = isCategoryDisabled(cat.value);
                const checked = form.data_categories.includes(cat.value);
                return (
                  <label
                    key={cat.value}
                    className={`flex items-start gap-3 rounded-lg border p-3 transition-all ${
                      disabled
                        ? "opacity-40 cursor-not-allowed border-border"
                        : checked
                        ? "border-accent/40 bg-accent/5 cursor-pointer"
                        : "border-border hover:bg-muted/30 cursor-pointer"
                    }`}
                  >
                    <Checkbox
                      checked={checked && !disabled}
                      onCheckedChange={() => !disabled && toggleCategory(cat.value)}
                      disabled={disabled}
                      className="mt-0.5"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-foreground">{cat.label}</div>
                      {cat.warning && (
                        <div className="flex items-center gap-1 mt-0.5">
                          <AlertTriangle size={10} className="text-warning shrink-0" />
                          <span className="text-[10px] text-warning">{cat.warningText}</span>
                        </div>
                      )}
                      {disabled && (
                        <span className="text-[10px] text-muted-foreground">Excluded by safeguard toggle below</span>
                      )}
                    </div>
                  </label>
                );
              })}
            </div>
          </div>

          {/* Minimisation & safeguards */}
          <div className="space-y-4 border-t border-border pt-4">
            <div className="flex items-center gap-2 mb-1">
              <Shield size={14} className="text-accent" />
              <Label className="text-sm font-medium">Minimisation &amp; Safeguards</Label>
            </div>

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

            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-foreground">Exclude special category data</div>
                <div className="text-[10px] text-muted-foreground">Art. 9 — racial/ethnic origin, health, biometric, etc.</div>
              </div>
              <Switch
                checked={form.exclude_special_category}
                onCheckedChange={(v) => {
                  const patch: Partial<DpFormState> = { exclude_special_category: v };
                  if (v) patch.data_categories = form.data_categories.filter((c) => c !== "special_category");
                  set(patch);
                }}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-foreground">Exclude criminal offence data</div>
                <div className="text-[10px] text-muted-foreground">Art. 10 — requires additional safeguards</div>
              </div>
              <Switch
                checked={form.exclude_criminal_offence}
                onCheckedChange={(v) => {
                  const patch: Partial<DpFormState> = { exclude_criminal_offence: v };
                  if (v) patch.data_categories = form.data_categories.filter((c) => c !== "criminal_offence");
                  set(patch);
                }}
              />
            </div>

            {/* High risk warning */}
            {dpRisk.level === "high" && (
              <div className="flex items-start gap-3 p-3.5 rounded-lg border border-destructive/30 bg-destructive/5 mt-2">
                <AlertTriangle size={14} className="text-destructive shrink-0 mt-0.5" />
                <div>
                  <div className="text-sm font-medium text-foreground">High DP risk</div>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    Requesting criminal offence or special category data will require Client Admin approval and FV&amp;C Data Protection Review before work begins.
                  </p>
                </div>
              </div>
            )}
          </div>

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
        </>
      )}
    </div>
  );
}
