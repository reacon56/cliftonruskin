import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Shield, Plus, Trash2, FileText, Globe, Download } from "lucide-react";
import PartnerTaskDialog from "./PartnerTaskDialog";

interface Props {
  caseModule: any;
  caseData: any;
  entityName: string;
  onComplete: () => void;
}

interface PostureInput {
  id: string;
  reference_type: string;
  source_category: string;
  note_text: string;
  confidence: string;
  is_anonymised: boolean;
  attachment_url: string;
}

const REF_TYPES = [
  { value: "trade_ref", label: "Trade Reference" },
  { value: "supplier_theme", label: "Supplier Theme" },
  { value: "customer_theme", label: "Customer Theme" },
  { value: "payment_signal", label: "Payment Signal" },
  { value: "dispute_posture", label: "Dispute Posture" },
  { value: "other", label: "Other" },
];

const SOURCE_CATS = [
  { value: "client_provided", label: "Client Provided" },
  { value: "public", label: "Public" },
  { value: "partner_network", label: "Partner Network" },
];

export default function CommercialPostureWorkbench({ caseModule, caseData, entityName, onComplete }: Props) {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const [guardrailsAcked, setGuardrailsAcked] = useState(false);
  const [inputs, setInputs] = useState<PostureInput[]>([]);
  const [generating, setGenerating] = useState(false);
  const [partnerOpen, setPartnerOpen] = useState(false);

  // Synthesis fields
  const [themesSummary, setThemesSummary] = useState("");
  const [clientMeaning, setClientMeaning] = useState("");
  const [recommendedControls, setRecommendedControls] = useState("");
  const [limitations, setLimitations] = useState("");
  const [overallConfidence, setOverallConfidence] = useState("med");

  const addInput = () => {
    setInputs((prev) => [...prev, {
      id: crypto.randomUUID(),
      reference_type: "trade_ref",
      source_category: "public",
      note_text: "",
      confidence: "med",
      is_anonymised: true,
      attachment_url: "",
    }]);
  };

  const updateInput = (id: string, field: string, value: any) => {
    setInputs((prev) => prev.map((inp) => inp.id === id ? { ...inp, [field]: value } : inp));
  };

  const removeInput = (id: string) => {
    setInputs((prev) => prev.filter((inp) => inp.id !== id));
  };

  const handleGenerate = useCallback(async () => {
    if (!guardrailsAcked) {
      toast({ title: "Guardrails required", description: "Please acknowledge the guardrails before generating.", variant: "destructive" });
      return;
    }
    if (inputs.length === 0) {
      toast({ title: "No inputs", description: "Add at least one input entry.", variant: "destructive" });
      return;
    }
    if (!user || !profile) return;

    setGenerating(true);

    try {
      // Save inputs to DB
      for (const inp of inputs) {
        await supabase.from("commercial_posture_inputs").insert({
          case_module_id: caseModule.id,
          reference_type: inp.reference_type,
          source_category: inp.source_category,
          note_text: inp.note_text,
          confidence: inp.confidence,
          is_anonymised: inp.is_anonymised,
          attachment_url: inp.attachment_url || null,
        });
      }

      // Create deliverable
      const { data: del } = await supabase.from("deliverables").insert({
        case_id: caseData.id,
        title: `Commercial Posture Note — ${entityName}`,
        deliverable_type: "addendum",
        version: 1,
      }).select("id").single();

      // Build executive summary from synthesis
      const execSummary = [
        themesSummary && `Key themes: ${themesSummary}`,
        clientMeaning && `Implication: ${clientMeaning}`,
        recommendedControls && `Controls: ${recommendedControls}`,
      ].filter(Boolean).join("\n\n") || "Commercial posture analysis complete. See detailed findings in the attached addendum.";

      // Create module_output
      await supabase.from("module_outputs").insert({
        case_module_id: caseModule.id,
        deliverable_id: del?.id ?? null,
        executive_summary: execSummary,
        confidence_level: overallConfidence,
        limitations: limitations || "Based on available data at the date of analysis.",
      });

      // Update module status
      await supabase.from("case_modules").update({ status: "complete" }).eq("id", caseModule.id);

      // Audit events
      await supabase.from("audit_events").insert([
        {
          user_id: user.id,
          org_id: profile.org_id,
          action_type: "MODULE_COMPLETED",
          object_type: "case_module",
          object_id: caseModule.id,
          metadata: { case_id: caseData.id, module_code: "COMMERCIAL_POSTURE", entity_name: entityName, inputs_count: inputs.length },
        },
        {
          user_id: user.id,
          org_id: profile.org_id,
          action_type: "MODULE_DELIVERED",
          object_type: "case_module",
          object_id: caseModule.id,
          metadata: { case_id: caseData.id, module_code: "COMMERCIAL_POSTURE", deliverable_id: del?.id, entity_name: entityName },
        },
      ]);

      toast({ title: "Commercial Posture Note generated", description: "Deliverable v1 created and stored in the Evidence Vault." });
      onComplete();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setGenerating(false);
    }
  }, [guardrailsAcked, inputs, themesSummary, clientMeaning, recommendedControls, limitations, overallConfidence, caseModule, caseData, entityName, user, profile, onComplete, toast]);

  return (
    <div className="space-y-8">
      {/* Scope & Guardrails */}
      <div className="fvc-card border-warning/20">
        <div className="flex items-center gap-2 mb-4">
          <Shield size={18} className="text-warning" />
          <h3 className="fvc-heading-3 text-foreground">Scope & Guardrails</h3>
        </div>
        <div className="fvc-gold-rule mb-4" />
        <div className="space-y-2 text-sm text-foreground/80 leading-relaxed mb-4">
          <p>• <strong>No deception</strong> — do not misrepresent identity or purpose when gathering information.</p>
          <p>• <strong>No trespass</strong> — all information must be obtained through lawful and ethical channels.</p>
          <p>• <strong>No defamatory claims</strong> — report findings factually; do not make unsupported characterisations.</p>
          <p>• <strong>Anonymise sources by default</strong> — protect identities of trade references and network contacts.</p>
          <p>• <strong>Record method and date/time</strong> — every input must carry a clear audit trail of how and when it was obtained.</p>
        </div>
        <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 border border-border">
          <Checkbox
            checked={guardrailsAcked}
            onCheckedChange={(c) => setGuardrailsAcked(!!c)}
            id="guardrails-ack"
          />
          <label htmlFor="guardrails-ack" className="text-sm font-medium text-foreground cursor-pointer">
            I acknowledge and will comply with the above guardrails
          </label>
        </div>
      </div>

      {/* Inputs Capture */}
      <div className="fvc-card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="fvc-heading-3 text-foreground">Intelligence Inputs</h3>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => setPartnerOpen(true)}>
              <Globe size={13} className="mr-1" /> Request In-Country Input
            </Button>
            <Button size="sm" onClick={addInput}>
              <Plus size={13} className="mr-1" /> Add Entry
            </Button>
          </div>
        </div>
        <div className="fvc-gold-rule mb-4" />

        {inputs.length === 0 ? (
          <div className="text-center py-8 text-sm text-muted-foreground">
            No inputs yet. Click "Add Entry" to capture trade references, payment signals, or other intelligence.
          </div>
        ) : (
          <div className="space-y-4">
            {inputs.map((inp, idx) => (
              <div key={inp.id} className="border border-border rounded-lg p-4 bg-card">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Entry {idx + 1}</span>
                  <Button variant="ghost" size="sm" onClick={() => removeInput(inp.id)} className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive">
                    <Trash2 size={13} />
                  </Button>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-3">
                  <div className="space-y-1">
                    <Label className="text-[11px]">Reference Type</Label>
                    <Select value={inp.reference_type} onValueChange={(v) => updateInput(inp.id, "reference_type", v)}>
                      <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {REF_TYPES.map((r) => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[11px]">Source</Label>
                    <Select value={inp.source_category} onValueChange={(v) => updateInput(inp.id, "source_category", v)}>
                      <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {SOURCE_CATS.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[11px]">Confidence</Label>
                    <Select value={inp.confidence} onValueChange={(v) => updateInput(inp.id, "confidence", v)}>
                      <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="med">Medium</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-1 mb-3">
                  <Label className="text-[11px]">Note</Label>
                  <Textarea
                    value={inp.note_text}
                    onChange={(e) => updateInput(inp.id, "note_text", e.target.value)}
                    rows={2}
                    className="resize-none text-sm"
                    placeholder="Record the finding, including method and date obtained…"
                  />
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      checked={inp.is_anonymised}
                      onCheckedChange={(c) => updateInput(inp.id, "is_anonymised", !!c)}
                      id={`anon-${inp.id}`}
                    />
                    <label htmlFor={`anon-${inp.id}`} className="text-[11px] text-muted-foreground cursor-pointer">Anonymised</label>
                  </div>
                  <div className="flex-1">
                    <Input
                      value={inp.attachment_url}
                      onChange={(e) => updateInput(inp.id, "attachment_url", e.target.value)}
                      placeholder="Attachment URL (optional)"
                      className="h-7 text-xs"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Themes Synthesis */}
      <div className="fvc-card">
        <h3 className="fvc-heading-3 text-foreground mb-4">Themes Synthesis</h3>
        <div className="fvc-gold-rule mb-4" />
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Key Themes Summary</Label>
            <Textarea
              value={themesSummary}
              onChange={(e) => setThemesSummary(e.target.value)}
              rows={4}
              className="resize-none"
              placeholder="• Payment terms consistently extended beyond 60 days&#10;• Two trade references reported delayed settlement&#10;• No active disputes identified"
            />
          </div>
          <div className="space-y-1.5">
            <Label>What This Means for the Client</Label>
            <Textarea
              value={clientMeaning}
              onChange={(e) => setClientMeaning(e.target.value)}
              rows={3}
              className="resize-none"
              placeholder="The payment posture suggests moderate latency risk. The client should consider…"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Recommended Controls</Label>
            <Textarea
              value={recommendedControls}
              onChange={(e) => setRecommendedControls(e.target.value)}
              rows={3}
              className="resize-none"
              placeholder="Payment terms (e.g., 30 days), milestone-based payments, audit rights, termination triggers…"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Limitations & Methodology Notes</Label>
            <Textarea
              value={limitations}
              onChange={(e) => setLimitations(e.target.value)}
              rows={2}
              className="resize-none"
              placeholder="Based on publicly available data and client-provided references. Further verification may be warranted."
            />
          </div>
          <div className="space-y-1.5 max-w-xs">
            <Label>Overall Confidence Level</Label>
            <Select value={overallConfidence} onValueChange={setOverallConfidence}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="med">Medium</SelectItem>
                <SelectItem value="high">High</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Generate */}
      <div className="flex items-center justify-between p-6 rounded-lg border-2 border-accent/30 bg-accent/5">
        <div>
          <h3 className="font-display text-lg font-semibold text-foreground">Generate Deliverable</h3>
          <p className="text-sm text-muted-foreground mt-1">Creates a versioned Commercial Posture Note in the Evidence Vault.</p>
        </div>
        <Button
          onClick={handleGenerate}
          disabled={generating || !guardrailsAcked || inputs.length === 0}
          className="px-6"
        >
          <FileText size={14} className="mr-2" />
          {generating ? "Generating…" : "Generate Commercial Posture Note (v1)"}
        </Button>
      </div>

      <PartnerTaskDialog
        open={partnerOpen}
        onOpenChange={setPartnerOpen}
        caseModuleId={caseModule.id}
        defaultCountry={caseData.entity_country || ""}
      />
    </div>
  );
}
