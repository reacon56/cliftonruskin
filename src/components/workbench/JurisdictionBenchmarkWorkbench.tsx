import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { FileText, Globe, Plus, Trash2 } from "lucide-react";
import PartnerTaskDialog from "./PartnerTaskDialog";

interface Props {
  caseModule: any;
  caseData: any;
  entityName: string;
  onComplete: () => void;
}

interface IndexRef {
  id: string;
  title: string;
  url: string;
  as_of_date: string;
}

export default function JurisdictionBenchmarkWorkbench({ caseModule, caseData, entityName, onComplete }: Props) {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const [generating, setGenerating] = useState(false);
  const [partnerOpen, setPartnerOpen] = useState(false);

  // Jurisdiction profile
  const [country, setCountry] = useState(caseData.entity_country || "");
  const [sector, setSector] = useState("");
  const [environmentSummary, setEnvironmentSummary] = useState("");

  // Normal vs Abnormal
  const [normalPatterns, setNormalPatterns] = useState("");
  const [abnormalPatterns, setAbnormalPatterns] = useState("");
  const [enforcementNotes, setEnforcementNotes] = useState("");

  // Practical guidance
  const [practicalGuidance, setPracticalGuidance] = useState("");

  // Indices
  const [indices, setIndices] = useState<IndexRef[]>([]);
  const [overallConfidence, setOverallConfidence] = useState("med");
  const [limitations, setLimitations] = useState("");

  const addIndex = () => {
    setIndices((prev) => [...prev, { id: crypto.randomUUID(), title: "", url: "", as_of_date: "" }]);
  };

  const updateIndex = (id: string, field: string, value: string) => {
    setIndices((prev) => prev.map((idx) => idx.id === id ? { ...idx, [field]: value } : idx));
  };

  const removeIndex = (id: string) => {
    setIndices((prev) => prev.filter((idx) => idx.id !== id));
  };

  const handleGenerate = useCallback(async () => {
    if (!country.trim()) {
      toast({ title: "Country required", description: "Please enter the jurisdiction country.", variant: "destructive" });
      return;
    }
    if (!user || !profile) return;

    setGenerating(true);

    try {
      // Save to jurisdiction_benchmark_inputs
      await supabase.from("jurisdiction_benchmark_inputs").insert({
        case_module_id: caseModule.id,
        jurisdiction_country: country,
        sector: sector || null,
        normal_patterns: normalPatterns || null,
        abnormal_patterns: abnormalPatterns || null,
        enforcement_reality_notes: enforcementNotes || null,
        practical_guidance: practicalGuidance || null,
        indices_used: indices.map(({ title, url, as_of_date }) => ({ title, url, as_of_date })),
        confidence: overallConfidence,
      });

      // Create deliverable
      const { data: del } = await supabase.from("deliverables").insert({
        case_id: caseData.id,
        title: `Jurisdiction & Sector Benchmark — ${country}${sector ? ` / ${sector}` : ""} — ${entityName}`,
        deliverable_type: "addendum",
        version: 1,
      }).select("id").single();

      // Build executive summary
      const execSummary = [
        environmentSummary && `Environment: ${environmentSummary}`,
        normalPatterns && `Normal patterns: ${normalPatterns.slice(0, 200)}`,
        abnormalPatterns && `Red flags: ${abnormalPatterns.slice(0, 200)}`,
        practicalGuidance && `Guidance: ${practicalGuidance.slice(0, 200)}`,
      ].filter(Boolean).join("\n\n") || `Jurisdiction and sector benchmark for ${country} completed.`;

      // Create module_output
      await supabase.from("module_outputs").insert({
        case_module_id: caseModule.id,
        deliverable_id: del?.id ?? null,
        executive_summary: execSummary,
        confidence_level: overallConfidence,
        limitations: limitations || "Based on publicly available indices and regulatory sources. Indices are as-of the dates cited.",
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
          metadata: { case_id: caseData.id, module_code: "JURISDICTION_BENCHMARK", entity_name: entityName, country },
        },
        {
          user_id: user.id,
          org_id: profile.org_id,
          action_type: "MODULE_DELIVERED",
          object_type: "case_module",
          object_id: caseModule.id,
          metadata: { case_id: caseData.id, module_code: "JURISDICTION_BENCHMARK", deliverable_id: del?.id, entity_name: entityName },
        },
      ]);

      toast({ title: "Benchmark Addendum generated", description: "Deliverable v1 created and stored in the Evidence Vault." });
      onComplete();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setGenerating(false);
    }
  }, [country, sector, environmentSummary, normalPatterns, abnormalPatterns, enforcementNotes, practicalGuidance, indices, overallConfidence, limitations, caseModule, caseData, entityName, user, profile, onComplete, toast]);

  return (
    <div className="space-y-8">
      {/* Jurisdiction Profile */}
      <div className="fvc-card">
        <h3 className="fvc-heading-3 text-foreground mb-4">Jurisdiction Profile</h3>
        <div className="fvc-gold-rule mb-4" />
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="space-y-1.5">
            <Label>Country *</Label>
            <Input value={country} onChange={(e) => setCountry(e.target.value)} placeholder="e.g., Nigeria" />
          </div>
          <div className="space-y-1.5">
            <Label>Sector</Label>
            <Input value={sector} onChange={(e) => setSector(e.target.value)} placeholder="e.g., Oil & Gas Services" />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label>State of the Environment</Label>
          <Textarea
            value={environmentSummary}
            onChange={(e) => setEnvironmentSummary(e.target.value)}
            rows={4}
            className="resize-none"
            placeholder="A concise paragraph describing the operating environment, regulatory landscape, and key risk factors for this jurisdiction and sector…"
          />
        </div>
      </div>

      {/* Normal vs Abnormal */}
      <div className="fvc-card">
        <h3 className="fvc-heading-3 text-foreground mb-4">Normal vs Abnormal Patterns</h3>
        <div className="fvc-gold-rule mb-4" />
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Normal Patterns</Label>
            <Textarea
              value={normalPatterns}
              onChange={(e) => setNormalPatterns(e.target.value)}
              rows={3}
              className="resize-none"
              placeholder="Standard business practices, typical payment terms, expected corporate structures, regulatory norms…"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Abnormal / Red Flag Patterns</Label>
            <Textarea
              value={abnormalPatterns}
              onChange={(e) => setAbnormalPatterns(e.target.value)}
              rows={3}
              className="resize-none"
              placeholder="Unusual practices that would indicate heightened risk, e.g., shell companies, unusual payment routing…"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Enforcement Reality Notes</Label>
            <Textarea
              value={enforcementNotes}
              onChange={(e) => setEnforcementNotes(e.target.value)}
              rows={3}
              className="resize-none"
              placeholder="Gap between regulation and enforcement, recent enforcement actions, practical compliance reality…"
            />
          </div>
        </div>
      </div>

      {/* Practical Guidance */}
      <div className="fvc-card">
        <h3 className="fvc-heading-3 text-foreground mb-4">Practical Guidance</h3>
        <div className="fvc-gold-rule mb-4" />
        <div className="space-y-1.5">
          <Label>Contracting & Operational Controls</Label>
          <Textarea
            value={practicalGuidance}
            onChange={(e) => setPracticalGuidance(e.target.value)}
            rows={4}
            className="resize-none"
            placeholder="Tailored recommendations: contract protections, operational controls, monitoring triggers, escalation protocols specific to this jurisdiction/sector…"
          />
        </div>
      </div>

      {/* Indices & References */}
      <div className="fvc-card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="fvc-heading-3 text-foreground">Indices & References</h3>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => setPartnerOpen(true)}>
              <Globe size={13} className="mr-1" /> Request In-Country Input
            </Button>
            <Button size="sm" onClick={addIndex}>
              <Plus size={13} className="mr-1" /> Add Reference
            </Button>
          </div>
        </div>
        <div className="fvc-gold-rule mb-4" />
        <p className="text-xs text-muted-foreground mb-4">
          Cite sources with as-of dates. Do not make ungrounded claims — reference specific indices and reports.
        </p>
        {indices.length === 0 ? (
          <div className="text-center py-6 text-sm text-muted-foreground">
            No references added. Click "Add Reference" to cite CPI scores, governance indicators, or regulatory sources.
          </div>
        ) : (
          <div className="space-y-3">
            {indices.map((idx) => (
              <div key={idx.id} className="border border-border rounded-lg p-3 bg-card flex gap-3 items-start">
                <div className="flex-1 grid grid-cols-3 gap-2">
                  <div className="space-y-1">
                    <Label className="text-[11px]">Title / Index</Label>
                    <Input
                      value={idx.title}
                      onChange={(e) => updateIndex(idx.id, "title", e.target.value)}
                      className="h-8 text-xs"
                      placeholder="e.g., TI Corruption Perceptions Index"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[11px]">URL</Label>
                    <Input
                      value={idx.url}
                      onChange={(e) => updateIndex(idx.id, "url", e.target.value)}
                      className="h-8 text-xs"
                      placeholder="https://…"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[11px]">As-of Date</Label>
                    <Input
                      type="date"
                      value={idx.as_of_date}
                      onChange={(e) => updateIndex(idx.id, "as_of_date", e.target.value)}
                      className="h-8 text-xs"
                    />
                  </div>
                </div>
                <Button variant="ghost" size="sm" onClick={() => removeIndex(idx.id)} className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive shrink-0 mt-5">
                  <Trash2 size={13} />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Confidence & Limitations */}
      <div className="fvc-card">
        <h3 className="fvc-heading-3 text-foreground mb-4">Assessment</h3>
        <div className="fvc-gold-rule mb-4" />
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
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
        <div className="space-y-1.5 mt-4">
          <Label>Limitations & Methodology Notes</Label>
          <Textarea
            value={limitations}
            onChange={(e) => setLimitations(e.target.value)}
            rows={2}
            className="resize-none"
            placeholder="Based on publicly available indices and regulatory sources. Indices are as-of the dates cited."
          />
        </div>
      </div>

      {/* Generate */}
      <div className="flex items-center justify-between p-6 rounded-lg border-2 border-accent/30 bg-accent/5">
        <div>
          <h3 className="font-display text-lg font-semibold text-foreground">Generate Deliverable</h3>
          <p className="text-sm text-muted-foreground mt-1">Creates a versioned Jurisdiction & Sector Benchmark Addendum in the Evidence Vault.</p>
        </div>
        <Button
          onClick={handleGenerate}
          disabled={generating || !country.trim()}
          className="px-6"
        >
          <FileText size={14} className="mr-2" />
          {generating ? "Generating…" : "Generate Benchmark Addendum (v1)"}
        </Button>
      </div>

      <PartnerTaskDialog
        open={partnerOpen}
        onOpenChange={setPartnerOpen}
        caseModuleId={caseModule.id}
        defaultCountry={country}
      />
    </div>
  );
}
