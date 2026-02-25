import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { ChevronRight, Check } from "lucide-react";

const STEPS = ["Select Entity", "Product", "Priority", "Scope Notes", "Estimate", "Review & Submit"];

const PRICING: Record<string, Record<string, number>> = {
  "Assurance Note": { standard: 1500, rush: 2250 },
  "Assurance Dossier": { standard: 4500, rush: 6750 },
  "Refresh Note": { standard: 950, rush: 1425 },
};

export default function CommissionPage() {
  const { profile, user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const [step, setStep] = useState(0);
  const [entities, setEntities] = useState<any[]>([]);
  const [form, setForm] = useState({
    entity_id: searchParams.get("entity") || "",
    product_type: "Assurance Note",
    priority: "standard",
    scope_notes: "",
  });

  useEffect(() => {
    if (profile?.org_id) {
      supabase.from("entities").select("id, name").eq("org_id", profile.org_id).order("name")
        .then(({ data }) => setEntities(data ?? []));
    }
  }, [profile?.org_id]);

  const estimate = PRICING[form.product_type]?.[form.priority] ?? 0;

  const handleSubmit = async () => {
    if (!profile?.org_id || !user) return;
    const { error } = await supabase.from("cases").insert({
      org_id: profile.org_id,
      entity_id: form.entity_id,
      requested_by: user.id,
      product_type: form.product_type,
      priority: form.priority,
      scope_notes: form.scope_notes,
      status: "submitted",
      price_estimate: estimate,
      sla_days: form.priority === "rush" ? 5 : 10,
    });
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Case submitted", description: "Your commission has been submitted for approval." });
      navigate("/dashboard");
    }
  };

  const canNext = () => {
    if (step === 0) return !!form.entity_id;
    if (step === 1) return !!form.product_type;
    return true;
  };

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="fvc-heading-1 text-foreground mb-1">Commission a Check</h1>
      <div className="fvc-gold-rule mt-3 mb-2" />
      <p className="text-sm text-muted-foreground mb-10">
        Request a new due diligence engagement
      </p>

      {/* Step indicator */}
      <div className="flex items-center gap-1.5 mb-8">
        {STEPS.map((s, i) => (
          <div key={s} className="flex items-center gap-1.5">
            <div
              className={`flex items-center justify-center w-7 h-7 rounded-full text-xs font-medium transition-all duration-300 ${
                i < step
                  ? "bg-accent text-accent-foreground scale-100"
                  : i === step
                  ? "bg-primary text-primary-foreground ring-2 ring-primary/20 ring-offset-2 ring-offset-background"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              {i < step ? <Check size={13} strokeWidth={2.5} /> : i + 1}
            </div>
            {i < STEPS.length - 1 && (
              <ChevronRight size={12} className={`transition-colors duration-300 ${i < step ? "text-accent/60" : "text-muted-foreground/30"}`} />
            )}
          </div>
        ))}
      </div>

      <div className="fvc-card-elevated animate-scale-in" key={step}>
        <h2 className="fvc-heading-3 text-foreground mb-5">{STEPS[step]}</h2>

        {step === 0 && (
          <div className="space-y-3 animate-fade-in">
            <Label>Select entity</Label>
            <Select value={form.entity_id} onValueChange={(v) => setForm({ ...form, entity_id: v })}>
              <SelectTrigger><SelectValue placeholder="Choose an entity…" /></SelectTrigger>
              <SelectContent>
                {entities.map((e) => (
                  <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-3 animate-fade-in">
            {(["Assurance Note", "Assurance Dossier", "Refresh Note"] as const).map((p) => (
              <label
                key={p}
                className={`block rounded-lg border p-5 cursor-pointer transition-all duration-300 ${
                  form.product_type === p
                    ? "border-accent/50 bg-accent/5"
                    : "border-border hover:border-border hover:bg-muted/30"
                }`}
                style={form.product_type === p ? { boxShadow: "var(--shadow-gold-glow)" } : undefined}
              >
                <input
                  type="radio"
                  name="product"
                  className="sr-only"
                  checked={form.product_type === p}
                  onChange={() => setForm({ ...form, product_type: p })}
                />
                <div className="font-medium text-foreground text-sm">{p}</div>
                <div className="text-[12px] text-muted-foreground mt-1.5 leading-relaxed">
                  {p === "Assurance Note" && "Concise due diligence summary with key risk indicators."}
                  {p === "Assurance Dossier" && "Comprehensive investigation report with evidence pack."}
                  {p === "Refresh Note" && "Update an existing assessment with new findings."}
                </div>
              </label>
            ))}
          </div>
        )}

        {step === 2 && (
          <div className="space-y-3 animate-fade-in">
            {(["standard", "rush"] as const).map((p) => (
              <label
                key={p}
                className={`block rounded-lg border p-5 cursor-pointer transition-all duration-300 ${
                  form.priority === p
                    ? "border-accent/50 bg-accent/5"
                    : "border-border hover:border-border hover:bg-muted/30"
                }`}
                style={form.priority === p ? { boxShadow: "var(--shadow-gold-glow)" } : undefined}
              >
                <input
                  type="radio"
                  name="priority"
                  className="sr-only"
                  checked={form.priority === p}
                  onChange={() => setForm({ ...form, priority: p })}
                />
                <div className="font-medium text-foreground text-sm capitalize">{p}</div>
                <div className="text-[12px] text-muted-foreground mt-1.5">
                  {p === "standard" ? "10 business days SLA" : "5 business days SLA (+50% surcharge)"}
                </div>
              </label>
            ))}
          </div>
        )}

        {step === 3 && (
          <div className="space-y-3 animate-fade-in">
            <Label>Scope notes &amp; special instructions</Label>
            <Textarea
              rows={5}
              value={form.scope_notes}
              onChange={(e) => setForm({ ...form, scope_notes: e.target.value })}
              placeholder="Describe the scope, any specific concerns, or supporting context…"
              className="resize-none"
            />
          </div>
        )}

        {step === 4 && (
          <div className="space-y-4 animate-fade-in">
            <div className="flex justify-between text-sm py-1">
              <span className="text-muted-foreground">Product</span>
              <span className="text-foreground font-medium">{form.product_type}</span>
            </div>
            <div className="flex justify-between text-sm py-1">
              <span className="text-muted-foreground">Priority</span>
              <span className="capitalize text-foreground font-medium">{form.priority}</span>
            </div>
            <div className="fvc-divider" />
            <div className="flex justify-between items-baseline py-1">
              <span className="text-sm font-medium text-foreground">Estimated fee</span>
              <span className="text-accent font-display text-2xl font-semibold tracking-tight">
                £{estimate.toLocaleString()}
              </span>
            </div>
            <p className="text-[10px] text-muted-foreground leading-relaxed">
              Final fee may vary based on complexity. This is an indicative estimate.
            </p>
          </div>
        )}

        {step === 5 && (
          <div className="space-y-4 text-sm animate-fade-in">
            <div className="flex justify-between py-1"><span className="text-muted-foreground">Entity</span><span className="text-foreground font-medium">{entities.find((e) => e.id === form.entity_id)?.name}</span></div>
            <div className="flex justify-between py-1"><span className="text-muted-foreground">Product</span><span className="text-foreground font-medium">{form.product_type}</span></div>
            <div className="flex justify-between py-1"><span className="text-muted-foreground">Priority</span><span className="capitalize text-foreground font-medium">{form.priority}</span></div>
            <div className="flex justify-between py-1"><span className="text-muted-foreground">Estimated fee</span><span className="text-accent font-semibold font-display text-lg">£{estimate.toLocaleString()}</span></div>
            {form.scope_notes && (
              <div className="pt-2">
                <span className="text-muted-foreground block mb-1.5 text-[11px] uppercase tracking-wider font-medium">Scope notes</span>
                <p className="text-foreground leading-relaxed">{form.scope_notes}</p>
              </div>
            )}
          </div>
        )}

        <div className="flex justify-between mt-8 pt-6 border-t border-border/50">
          {step > 0 ? (
            <Button variant="outline" onClick={() => setStep(step - 1)} className="px-6">Back</Button>
          ) : <div />}
          {step < STEPS.length - 1 ? (
            <Button onClick={() => setStep(step + 1)} disabled={!canNext()} className="px-6">Continue</Button>
          ) : (
            <Button onClick={handleSubmit} className="px-8">Submit Commission</Button>
          )}
        </div>
      </div>
    </div>
  );
}
