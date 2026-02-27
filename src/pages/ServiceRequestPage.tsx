import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useEntitlements } from "@/hooks/use-entitlements";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import {
  Zap, Clock, CheckCircle2, FileText, ArrowRight, ShoppingCart,
  AlertTriangle, Package, Sparkles,
} from "lucide-react";

interface Product {
  id: string;
  product_name: string;
  product_type: string;
  base_price: number;
  pricing_unit: string;
  sla_default_days: number | null;
  included_in_packages: string[];
  enabled: boolean;
  description: string;
}

interface EntityOption {
  id: string;
  name: string;
  risk_tier: string;
  country: string | null;
}

type RequestType = "interim" | "fastball" | "addon";

const REQUEST_LABELS: Record<RequestType, { label: string; desc: string; icon: React.ReactNode }> = {
  interim: {
    label: "Interim Review",
    desc: "Mid-cycle assessment triggered by a material change or emerging risk.",
    icon: <Clock size={18} />,
  },
  fastball: {
    label: "Fastball Report",
    desc: "Urgent, expedited due diligence with shortened SLA.",
    icon: <Zap size={18} />,
  },
  addon: {
    label: "Add-on Service",
    desc: "Request an additional service from the product catalogue.",
    icon: <Package size={18} />,
  },
};

export default function ServiceRequestPage() {
  const { profile, user } = useAuth();
  const navigate = useNavigate();
  const { canAccessReportTier, canUseAddon, entitlements } = useEntitlements();

  const [step, setStep] = useState(0); // 0=type, 1=entity, 2=product, 3=review
  const [requestType, setRequestType] = useState<RequestType | null>(null);
  const [entityId, setEntityId] = useState("");
  const [selectedProductId, setSelectedProductId] = useState("");
  const [notes, setNotes] = useState("");
  const [entities, setEntities] = useState<EntityOption[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (profile?.org_id) {
      supabase.from("entities").select("id, name, risk_tier, country")
        .eq("org_id", profile.org_id).eq("status", "active").order("name")
        .then(({ data }) => setEntities(data ?? []));
      supabase.from("products").select("*").eq("enabled", true).order("product_name")
        .then(({ data }) => setProducts((data as any as Product[]) ?? []));
    }
  }, [profile?.org_id]);

  // Determine pricing
  const selectedProduct = products.find(p => p.id === selectedProductId);

  function getAutoPrice(): { price: number; sla: number; auto: boolean } | null {
    if (!requestType || !selectedProduct) return null;

    const basePrice = Number(selectedProduct.base_price);
    if (basePrice <= 0) return null; // Bespoke pricing required

    if (requestType === "fastball") {
      return { price: Math.round(basePrice * 1.5), sla: Math.min(selectedProduct.sla_default_days ?? 5, 5), auto: true };
    }
    if (requestType === "interim") {
      return { price: basePrice, sla: selectedProduct.sla_default_days ?? 10, auto: true };
    }
    // Add-on
    return { price: basePrice, sla: selectedProduct.sla_default_days ?? 10, auto: true };
  }

  const pricing = getAutoPrice();
  const isBespoke = requestType && selectedProduct && !pricing;

  // Filter products based on request type
  const filteredProducts = products.filter(p => {
    if (requestType === "addon") return p.product_type === "Add-on" || p.product_type === "Monitoring";
    return p.product_type === "Report" || p.product_type === "Subscription";
  });

  // Default product for non-addon requests
  useEffect(() => {
    if (requestType === "interim" || requestType === "fastball") {
      const defaultProd = products.find(p =>
        p.product_type === "Report" && p.product_name.toLowerCase().includes(
          requestType === "fastball" ? "fastball" : "interim"
        )
      ) || products.find(p => p.product_type === "Report");
      if (defaultProd) setSelectedProductId(defaultProd.id);
    } else {
      setSelectedProductId("");
    }
  }, [requestType, products]);

  async function handleSubmit() {
    if (!profile?.org_id || !user || !entityId || !requestType) return;
    setSubmitting(true);

    const entity = entities.find(e => e.id === entityId);
    const caseType = requestType === "fastball" ? "fastball" : "interim";
    const priority = requestType === "fastball" ? "rush" : "standard";
    const status = pricing?.auto ? "quoted" : "new"; // auto-priced → quoted, bespoke → new (needs manager pricing)

    // Create the case
    const { data: newCase, error } = await supabase.from("cases").insert({
      org_id: profile.org_id,
      entity_id: entityId,
      requested_by: user.id,
      product_type: selectedProduct?.product_name ?? "Assurance Note",
      case_type: caseType,
      priority,
      scope_notes: notes,
      status,
      price_estimate: pricing?.price ?? null,
      sla_days: pricing?.sla ?? null,
      report_tier: "standard",
    } as any).select("id").single();

    if (error || !newCase) {
      toast({ title: "Error", description: error?.message ?? "Failed to create request", variant: "destructive" });
      setSubmitting(false);
      return;
    }

    // If auto-priced, also create a quote and work order
    if (pricing?.auto && selectedProduct) {
      // Create quote
      await supabase.from("quotes").insert({
        case_id: newCase.id,
        org_id: profile.org_id,
        status: "sent",
        subtotal: pricing.price,
        vat_amount: selectedProduct ? Math.round(pricing.price * 0.2) : 0,
        total_price: Math.round(pricing.price * 1.2),
        discount_pct: 0,
        rate_card_version: 1,
        locked: false,
      } as any);
    }

    // Audit event
    await supabase.from("audit_events").insert({
      user_id: user.id,
      org_id: profile.org_id,
      action_type: pricing?.auto ? "SELF_SERVICE_AUTO_PRICED" : "SELF_SERVICE_QUOTE_REQUIRED",
      object_type: "case",
      object_id: newCase.id,
      metadata: {
        request_type: requestType,
        product: selectedProduct?.product_name,
        auto_priced: pricing?.auto ?? false,
        price: pricing?.price ?? null,
        entity_name: entity?.name,
      },
    });

    // If bespoke, notify manager via edge function
    if (!pricing?.auto) {
      try {
        await supabase.functions.invoke("notify-quote-ready", {
          body: {
            caseId: newCase.id,
            entityName: entity?.name,
            requestType,
            message: `Client self-service request requires bespoke pricing: ${requestType} for ${entity?.name}`,
          },
        });
      } catch { /* notification is best-effort */ }
    }

    toast({
      title: pricing?.auto ? "✓ Request submitted with instant pricing" : "✓ Request submitted — quote required",
      description: pricing?.auto
        ? `${selectedProduct?.product_name} for ${entity?.name} at £${pricing.price.toLocaleString()}. Awaiting your approval.`
        : `CR will review and provide a bespoke quote for ${entity?.name}.`,
    });

    navigate(`/cases/${newCase.id}`);
  }

  const STEPS = ["Request Type", "Select Entity", requestType === "addon" ? "Select Service" : "Product", "Review & Submit"];

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-foreground">Service Request</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Request an interim review, fastball report, or add-on service
        </p>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-1.5">
        {STEPS.map((s, i) => (
          <div key={s} className="flex items-center gap-1.5">
            <div className={`flex items-center justify-center w-7 h-7 rounded-full text-xs font-medium transition-all ${
              i < step ? "bg-accent text-accent-foreground"
                : i === step ? "bg-primary text-primary-foreground ring-2 ring-primary/20 ring-offset-2 ring-offset-background"
                : "bg-muted text-muted-foreground"
            }`}>
              {i < step ? <CheckCircle2 size={13} /> : i + 1}
            </div>
            {i < STEPS.length - 1 && <ArrowRight size={12} className={i < step ? "text-accent/60" : "text-muted-foreground/30"} />}
          </div>
        ))}
      </div>

      {/* Step content */}
      <Card className="animate-scale-in" key={step}>
        <CardHeader>
          <CardTitle className="text-lg">{STEPS[step]}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {step === 0 && (
            <div className="space-y-3">
              {(Object.entries(REQUEST_LABELS) as [RequestType, typeof REQUEST_LABELS["interim"]][]).map(([key, meta]) => (
                <button
                  key={key}
                  onClick={() => { setRequestType(key); setStep(1); }}
                  className={`w-full text-left rounded-lg border p-5 transition-all hover:border-primary/30 hover:bg-primary/5 ${
                    requestType === key ? "border-primary bg-primary/5" : "border-border"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-primary">{meta.icon}</span>
                    <div>
                      <div className="font-medium text-sm text-foreground">{meta.label}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">{meta.desc}</div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}

          {step === 1 && (
            <div className="space-y-3">
              <Label>Select entity for this request</Label>
              <Select value={entityId} onValueChange={setEntityId}>
                <SelectTrigger><SelectValue placeholder="Choose an entity…" /></SelectTrigger>
                <SelectContent>
                  {entities.map(e => (
                    <SelectItem key={e.id} value={e.id}>
                      {e.name} <span className="text-muted-foreground ml-1">({e.risk_tier})</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-3">
              {requestType === "addon" ? (
                <>
                  <Label>Select add-on service</Label>
                  <div className="space-y-2">
                    {filteredProducts.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No add-on products available.</p>
                    ) : filteredProducts.map(p => (
                      <button
                        key={p.id}
                        onClick={() => setSelectedProductId(p.id)}
                        className={`w-full text-left rounded-lg border p-4 transition-all ${
                          selectedProductId === p.id ? "border-primary bg-primary/5" : "border-border hover:border-muted-foreground/30"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-medium text-sm text-foreground">{p.product_name}</div>
                            <div className="text-xs text-muted-foreground mt-0.5">{p.description}</div>
                          </div>
                          <div className="text-right">
                            {Number(p.base_price) > 0 ? (
                              <div className="text-sm font-medium text-foreground">£{Number(p.base_price).toLocaleString()}</div>
                            ) : (
                              <Badge variant="outline" className="text-[10px]">Quote Required</Badge>
                            )}
                            {p.sla_default_days && (
                              <div className="text-[10px] text-muted-foreground mt-0.5">{p.sla_default_days}d SLA</div>
                            )}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </>
              ) : (
                <div className="space-y-3">
                  <div className="rounded-lg border border-border p-4 bg-muted/20">
                    <div className="flex items-center gap-2">
                      <FileText size={16} className="text-primary" />
                      <span className="font-medium text-sm text-foreground">
                        {selectedProduct?.product_name ?? (requestType === "fastball" ? "Fastball Report" : "Interim Review")}
                      </span>
                    </div>
                    {selectedProduct && (
                      <div className="text-xs text-muted-foreground mt-1">{selectedProduct.description}</div>
                    )}
                  </div>
                  <Label>Additional notes or context</Label>
                  <Textarea
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                    placeholder="Describe the trigger for this request, any specific concerns…"
                    rows={3}
                  />
                </div>
              )}
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Request Type</span>
                  <span className="font-medium text-foreground">{REQUEST_LABELS[requestType!]?.label}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Entity</span>
                  <span className="font-medium text-foreground">{entities.find(e => e.id === entityId)?.name}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Product</span>
                  <span className="font-medium text-foreground">{selectedProduct?.product_name ?? "—"}</span>
                </div>
              </div>

              <div className="border-t border-border pt-4">
                {pricing?.auto ? (
                  <div className="rounded-lg border border-accent/30 bg-accent/5 p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Sparkles size={16} className="text-accent" />
                      <span className="font-medium text-sm text-foreground">Instant Pricing Available</span>
                    </div>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <span className="text-muted-foreground">Price (ex. VAT)</span>
                        <div className="font-display text-lg font-bold text-foreground">£{pricing.price.toLocaleString()}</div>
                      </div>
                      <div>
                        <span className="text-muted-foreground">SLA</span>
                        <div className="font-display text-lg font-bold text-foreground">{pricing.sla} days</div>
                      </div>
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-2">
                      A quote will be created automatically. You can approve it from the case detail page.
                    </p>
                  </div>
                ) : (
                  <div className="rounded-lg border border-warning/30 bg-warning/5 p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <AlertTriangle size={16} className="text-warning" />
                      <span className="font-medium text-sm text-foreground">Bespoke Pricing Required</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      This service requires a tailored quote. Clifton Ruskin will review your request and provide pricing.
                      No work will begin until a quote is approved.
                    </p>
                  </div>
                )}
              </div>

              {requestType === "addon" && notes === "" && (
                <div className="space-y-2">
                  <Label>Additional notes (optional)</Label>
                  <Textarea
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                    placeholder="Any special instructions…"
                    rows={2}
                  />
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex justify-between">
        <Button
          variant="outline"
          onClick={() => setStep(Math.max(0, step - 1))}
          disabled={step === 0}
        >
          Back
        </Button>
        {step < 3 ? (
          <Button
            onClick={() => setStep(step + 1)}
            disabled={
              (step === 0 && !requestType) ||
              (step === 1 && !entityId) ||
              (step === 2 && !selectedProductId)
            }
            className="gap-1.5"
          >
            Continue <ArrowRight size={14} />
          </Button>
        ) : (
          <Button
            onClick={handleSubmit}
            disabled={submitting}
            className="gap-1.5"
          >
            <ShoppingCart size={14} />
            {submitting ? "Submitting…" : pricing?.auto ? "Submit & Generate Quote" : "Submit Request"}
          </Button>
        )}
      </div>
    </div>
  );
}
