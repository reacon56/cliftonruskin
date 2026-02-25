import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Shield, Info, Scale, Eye, Lock } from "lucide-react";
import {
  type LiaFormState,
  INTEREST_CHIPS,
  DATA_SUBJECT_OPTIONS,
  DATA_CATEGORY_OPTIONS,
  SOURCE_OPTIONS,
  MITIGATION_OPTIONS,
} from "./LiaFormTypes";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

interface Props {
  form: LiaFormState;
  onChange: (form: LiaFormState) => void;
  readOnly?: boolean;
}

export default function MiniLiaForm({ form, onChange, readOnly }: Props) {
  const set = (patch: Partial<LiaFormState>) => onChange({ ...form, ...patch });

  const toggleArrayItem = (field: keyof LiaFormState, value: string) => {
    const arr = form[field] as string[];
    const next = arr.includes(value)
      ? arr.filter((v) => v !== value)
      : [...arr, value];
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

  // Count completed sections for progress
  const sectionComplete = {
    purpose: !!(form.purpose && form.legitimate_interest),
    necessity: !!form.necessity,
    balancing: !!(form.balancing_reasonable_expectations && form.balancing_likely_impact && form.balancing_nature_of_processing),
    safeguards: !!(form.safeguards_access_limited || form.safeguards_redaction || form.safeguards_evidence_stored || form.safeguards),
    outcome: !!form.outcome,
  };
  const completedCount = Object.values(sectionComplete).filter(Boolean).length;

  return (
    <div className="space-y-4">
      {/* Progress indicator */}
      <div className="flex items-center gap-3 mb-2">
        <Shield size={16} className="text-accent" />
        <div className="flex-1">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-medium text-foreground">Mini-LIA Progress</span>
            <span className="text-[10px] text-muted-foreground">{completedCount}/5 sections</span>
          </div>
          <div className="h-1.5 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-accent rounded-full transition-all duration-500"
              style={{ width: `${(completedCount / 5) * 100}%` }}
            />
          </div>
        </div>
      </div>

      <Accordion type="multiple" defaultValue={["purpose", "necessity", "balancing", "safeguards", "outcome"]} className="space-y-2">
        {/* Section 1: Purpose & Interest */}
        <AccordionItem value="purpose" className="border border-border rounded-lg px-4 overflow-hidden">
          <AccordionTrigger className="text-sm font-medium text-foreground hover:no-underline py-3">
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${sectionComplete.purpose ? "bg-accent" : "bg-muted-foreground/30"}`} />
              Purpose &amp; Legitimate Interest
            </div>
          </AccordionTrigger>
          <AccordionContent className="pb-4 space-y-4">
            <div className="space-y-2">
              <Label className="text-xs">Why are you requesting this check?</Label>
              <p className="text-[10px] text-muted-foreground">e.g., Supplier onboarding governance; third-party risk assurance; contractual due diligence.</p>
              <Textarea
                rows={2}
                value={form.purpose}
                onChange={(e) => set({ purpose: e.target.value })}
                placeholder="Describe the purpose of processing…"
                disabled={readOnly}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">What legitimate interest are you pursuing?</Label>
              <div className="flex flex-wrap gap-1.5 mb-2">
                {INTEREST_CHIPS.map((chip) => {
                  const selected = form.legitimate_interest_chips.includes(chip);
                  return (
                    <Badge
                      key={chip}
                      variant={selected ? "default" : "outline"}
                      className={`cursor-pointer text-[10px] transition-all ${
                        selected ? "bg-accent text-accent-foreground" : "hover:bg-muted/50"
                      } ${readOnly ? "pointer-events-none" : ""}`}
                      onClick={() => !readOnly && toggleArrayItem("legitimate_interest_chips", chip)}
                    >
                      {chip}
                    </Badge>
                  );
                })}
              </div>
              <Textarea
                rows={2}
                value={form.legitimate_interest}
                onChange={(e) => set({ legitimate_interest: e.target.value })}
                placeholder="Describe the specific interest…"
                disabled={readOnly}
              />
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Section 2: Necessity */}
        <AccordionItem value="necessity" className="border border-border rounded-lg px-4 overflow-hidden">
          <AccordionTrigger className="text-sm font-medium text-foreground hover:no-underline py-3">
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${sectionComplete.necessity ? "bg-accent" : "bg-muted-foreground/30"}`} />
              Necessity Test
            </div>
          </AccordionTrigger>
          <AccordionContent className="pb-4 space-y-4">
            <div className="space-y-2">
              <Label className="text-xs">Why is processing personal data necessary for this purpose?</Label>
              <Textarea
                rows={2}
                value={form.necessity}
                onChange={(e) => set({ necessity: e.target.value })}
                placeholder="Explain why personal data processing is required…"
                disabled={readOnly}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Why can't the objective be met with less intrusive means?</Label>
              <Textarea
                rows={2}
                value={form.necessity_alternatives}
                onChange={(e) => set({ necessity_alternatives: e.target.value })}
                placeholder="Explain why alternatives are insufficient…"
                disabled={readOnly}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Data subjects</Label>
              <div className="flex flex-wrap gap-1.5">
                {DATA_SUBJECT_OPTIONS.map((ds) => {
                  const selected = form.data_subjects.includes(ds);
                  return (
                    <Badge
                      key={ds}
                      variant={selected ? "default" : "outline"}
                      className={`cursor-pointer text-[10px] transition-all ${
                        selected ? "bg-primary/80 text-primary-foreground" : "hover:bg-muted/50"
                      } ${readOnly ? "pointer-events-none" : ""}`}
                      onClick={() => !readOnly && toggleArrayItem("data_subjects", ds)}
                    >
                      {ds}
                    </Badge>
                  );
                })}
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Data categories</Label>
              <div className="grid grid-cols-2 gap-1.5">
                {DATA_CATEGORY_OPTIONS.map((cat) => (
                  <label key={cat.value} className="flex items-center gap-2 cursor-pointer text-xs">
                    <Checkbox
                      checked={form.data_categories.includes(cat.value)}
                      onCheckedChange={() => !readOnly && toggleArrayItem("data_categories", cat.value)}
                      disabled={readOnly}
                    />
                    <span className="text-foreground">{cat.label}</span>
                  </label>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Sources</Label>
              <div className="flex flex-wrap gap-1.5">
                {SOURCE_OPTIONS.map((src) => {
                  const selected = form.sources.includes(src);
                  return (
                    <Badge
                      key={src}
                      variant={selected ? "default" : "outline"}
                      className={`cursor-pointer text-[10px] transition-all ${
                        selected ? "bg-primary/80 text-primary-foreground" : "hover:bg-muted/50"
                      } ${readOnly ? "pointer-events-none" : ""}`}
                      onClick={() => !readOnly && toggleArrayItem("sources", src)}
                    >
                      {src}
                    </Badge>
                  );
                })}
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Section 3: Balancing Test */}
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
                <Label className="text-xs flex items-center gap-1.5">
                  <Eye size={11} /> Reasonable expectations
                </Label>
                <Select value={form.balancing_reasonable_expectations} onValueChange={(v) => set({ balancing_reasonable_expectations: v })} disabled={readOnly}>
                  <SelectTrigger className="text-xs"><SelectValue placeholder="Select…" /></SelectTrigger>
                  <SelectContent>
                    {levelOptions.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Likely impact on individuals</Label>
                <Select value={form.balancing_likely_impact} onValueChange={(v) => set({ balancing_likely_impact: v })} disabled={readOnly}>
                  <SelectTrigger className="text-xs"><SelectValue placeholder="Select…" /></SelectTrigger>
                  <SelectContent>
                    {levelOptions.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Nature of processing</Label>
                <Select value={form.balancing_nature_of_processing} onValueChange={(v) => set({ balancing_nature_of_processing: v })} disabled={readOnly}>
                  <SelectTrigger className="text-xs"><SelectValue placeholder="Select…" /></SelectTrigger>
                  <SelectContent>
                    {processingNature.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-xs flex items-center gap-1.5">
                <Lock size={11} /> Mitigations in place
              </Label>
              <div className="grid grid-cols-2 gap-1.5">
                {MITIGATION_OPTIONS.map((m) => (
                  <label key={m.value} className="flex items-center gap-2 cursor-pointer text-xs">
                    <Checkbox
                      checked={form.balancing_mitigations.includes(m.value)}
                      onCheckedChange={() => !readOnly && toggleArrayItem("balancing_mitigations", m.value)}
                      disabled={readOnly}
                    />
                    <span className="text-foreground">{m.label}</span>
                  </label>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Additional notes</Label>
              <Textarea
                rows={2}
                value={form.balancing_notes}
                onChange={(e) => set({ balancing_notes: e.target.value })}
                placeholder="Any additional considerations…"
                disabled={readOnly}
              />
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Section 4: Safeguards & Retention */}
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
                <Checkbox
                  checked={form.safeguards_access_limited}
                  onCheckedChange={(v) => set({ safeguards_access_limited: !!v })}
                  disabled={readOnly}
                />
                <span className="text-foreground">Access limited to authorised personnel only</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer text-sm">
                <Checkbox
                  checked={form.safeguards_redaction}
                  onCheckedChange={(v) => set({ safeguards_redaction: !!v })}
                  disabled={readOnly}
                />
                <span className="text-foreground">Redaction applied where appropriate</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer text-sm">
                <Checkbox
                  checked={form.safeguards_evidence_stored}
                  onCheckedChange={(v) => set({ safeguards_evidence_stored: !!v })}
                  disabled={readOnly}
                />
                <span className="text-foreground">Evidence/time-stamped sources stored securely</span>
              </label>
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Safeguards summary</Label>
              <Textarea
                rows={2}
                value={form.safeguards}
                onChange={(e) => set({ safeguards: e.target.value })}
                placeholder="Describe additional safeguards…"
                disabled={readOnly}
              />
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

        {/* Section 5: Outcome */}
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
                <Textarea
                  rows={2}
                  value={form.conditions}
                  onChange={(e) => set({ conditions: e.target.value })}
                  placeholder="e.g., exclude social media; exclude criminal offence data"
                  disabled={readOnly}
                />
              </div>
            )}
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      {/* Disclaimer */}
      <div className="flex items-start gap-3 p-3 rounded-lg border border-border bg-muted/30 mt-2">
        <Info size={13} className="text-muted-foreground shrink-0 mt-0.5" />
        <p className="text-[10px] text-muted-foreground leading-relaxed">
          Far View &amp; Chase provides structured governance tooling. Clients remain responsible for confirming their lawful basis and compliance obligations.
        </p>
      </div>
    </div>
  );
}
