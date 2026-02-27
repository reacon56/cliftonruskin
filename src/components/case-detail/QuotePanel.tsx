import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Tooltip, TooltipContent, TooltipTrigger,
} from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import {
  CheckCircle2, XCircle, FileText, Plus, Trash2, Edit3, Send,
  Info, Lock, Package,
} from "lucide-react";

interface Props {
  caseId: string;
  caseStatus: string;
  onStatusChange: () => void;
  entityName?: string;
  orgId?: string;
}

interface Product {
  id: string;
  product_name: string;
  base_price: number;
  pricing_unit: string;
  vat_applicability: string;
}

interface LineItem {
  id?: string;
  product_id: string | null;
  description: string;
  quantity: number;
  unit_price: number;
  discount_pct: number;
  vat_applicability: string;
  line_total: number;
  sort_order: number;
}

interface Quote {
  id: string;
  status: string;
  scope_notes: string | null;
  subtotal: number;
  vat_amount: number;
  total_price: number;
  discount_pct: number;
  discount_reason: string | null;
  rate_card_id: string | null;
  rate_card_version: number | null;
  sla_days: number | null;
  sent_at: string | null;
  expires_at: string | null;
  locked: boolean;
  created_at: string;
  rejection_reason: string | null;
}

interface RateCard {
  id: string;
  name: string;
  version: number;
  discount_pct: number;
}

const VAT_RATE = 0.2;

function computeLineTotal(qty: number, price: number, discPct: number) {
  return qty * price * (1 - discPct / 100);
}

function computeVat(lines: LineItem[]) {
  return lines.reduce((sum, li) => {
    if (li.vat_applicability === "VATable") return sum + li.line_total * VAT_RATE;
    return sum;
  }, 0);
}

export default function QuotePanel({ caseId, caseStatus, onStatusChange, entityName, orgId }: Props) {
  const { user, profile, hasRole, isInternal, canQuote } = useAuth();
  const { toast } = useToast();
  const isManager = canQuote;
  const isClientAdmin = hasRole("client_admin");

  const [quote, setQuote] = useState<Quote | null>(null);
  const [lineItems, setLineItems] = useState<LineItem[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [rateCards, setRateCards] = useState<RateCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [scopeNotes, setScopeNotes] = useState("");
  const [slaOverride, setSlaOverride] = useState("");
  const [selectedRateCard, setSelectedRateCard] = useState<string>("");
  const [globalDiscount, setGlobalDiscount] = useState(0);
  const [discountReason, setDiscountReason] = useState("");
  const [rejectionReason, setRejectionReason] = useState("");
  const [showVatInc, setShowVatInc] = useState(false);

  useEffect(() => { loadAll(); }, [caseId]);

  async function loadAll() {
    setLoading(true);
    const [quoteRes, productsRes, rateCardsRes] = await Promise.all([
      supabase.from("quotes" as any).select("*").eq("case_id", caseId).order("created_at", { ascending: false }).limit(1).single(),
      supabase.from("products" as any).select("id, product_name, base_price, pricing_unit, vat_applicability").eq("enabled", true).order("product_name"),
      supabase.from("rate_cards" as any).select("id, name, version, discount_pct").eq("status", "active").order("name"),
    ]);

    setProducts((productsRes.data as any as Product[]) ?? []);
    setRateCards((rateCardsRes.data as any as RateCard[]) ?? []);

    const q = quoteRes.data as any as Quote | null;
    setQuote(q);

    if (q) {
      setScopeNotes(q.scope_notes ?? "");
      setSlaOverride(q.sla_days ? String(q.sla_days) : "");
      setSelectedRateCard(q.rate_card_id ?? "");
      setGlobalDiscount(Number(q.discount_pct) || 0);
      setDiscountReason(q.discount_reason ?? "");

      const { data: items } = await supabase
        .from("quote_line_items" as any).select("*")
        .eq("quote_id", q.id).order("sort_order");
      setLineItems((items as any as LineItem[]) ?? []);
    } else {
      setLineItems([emptyLine(0)]);
    }
    setLoading(false);
  }

  function emptyLine(order: number): LineItem {
    return { product_id: null, description: "", quantity: 1, unit_price: 0, discount_pct: 0, vat_applicability: "VATable", line_total: 0, sort_order: order };
  }

  function addLine() {
    setLineItems(prev => [...prev, emptyLine(prev.length)]);
  }

  function removeLine(idx: number) {
    setLineItems(prev => prev.filter((_, i) => i !== idx));
  }

  function updateLine(idx: number, updates: Partial<LineItem>) {
    setLineItems(prev => prev.map((li, i) => {
      if (i !== idx) return li;
      const merged = { ...li, ...updates };
      merged.line_total = computeLineTotal(merged.quantity, merged.unit_price, merged.discount_pct);
      return merged;
    }));
  }

  function selectProduct(idx: number, productId: string) {
    const p = products.find(pr => pr.id === productId);
    if (!p) return;
    updateLine(idx, {
      product_id: productId,
      description: p.product_name,
      unit_price: Number(p.base_price),
      vat_applicability: p.vat_applicability,
    });
  }

  function applyRateCard(rcId: string) {
    setSelectedRateCard(rcId);
    const rc = rateCards.find(r => r.id === rcId);
    if (rc) setGlobalDiscount(Number(rc.discount_pct) || 0);
  }

  const subtotal = lineItems.reduce((s, li) => s + li.line_total, 0);
  const discountedSubtotal = subtotal * (1 - globalDiscount / 100);
  const vatAmount = showVatInc ? computeVat(lineItems) * (1 - globalDiscount / 100) : computeVat(lineItems) * (1 - globalDiscount / 100);
  const total = discountedSubtotal + vatAmount;

  /* ── Save & Send ── */
  async function handleSaveAndSend() {
    if (!user || !profile) return;
    const filtered = lineItems.filter(li => li.description.trim());
    if (filtered.length === 0) {
      toast({ title: "Add at least one line item", variant: "destructive" });
      return;
    }
    setSubmitting(true);

    const quotePayload: any = {
      case_id: caseId,
      org_id: orgId || profile.org_id,
      created_by: user.id,
      status: "sent",
      scope_notes: scopeNotes || null,
      subtotal: discountedSubtotal,
      vat_amount: vatAmount,
      total_price: total,
      discount_pct: globalDiscount,
      discount_reason: discountReason || null,
      rate_card_id: selectedRateCard || null,
      rate_card_version: selectedRateCard ? (rateCards.find(r => r.id === selectedRateCard)?.version ?? null) : null,
      sla_days: slaOverride ? Number(slaOverride) : null,
      sent_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    let quoteId = quote?.id;

    if (quote) {
      await supabase.from("quotes" as any).update(quotePayload).eq("id", quote.id);
      await supabase.from("quote_line_items" as any).delete().eq("quote_id", quote.id);
    } else {
      const { data } = await supabase.from("quotes" as any).insert(quotePayload).select("id").single();
      quoteId = (data as any)?.id;
    }

    if (quoteId) {
      const itemPayloads = filtered.map((li, i) => ({
        quote_id: quoteId,
        product_id: li.product_id || null,
        description: li.description,
        quantity: li.quantity,
        unit_price: li.unit_price,
        discount_pct: li.discount_pct,
        vat_applicability: li.vat_applicability,
        line_total: li.line_total,
        sort_order: i,
      }));
      await supabase.from("quote_line_items" as any).insert(itemPayloads as any);
    }

    // Update case
    const caseUpdate: Record<string, any> = { status: "quoted", price_estimate: total };
    if (slaOverride) caseUpdate.sla_days = Number(slaOverride);
    await supabase.from("cases").update(caseUpdate).eq("id", caseId);

    // Audit
    await supabase.from("audit_events").insert({
      user_id: user.id, org_id: profile.org_id,
      action_type: "QUOTE_SENT", object_type: "quote", object_id: quoteId,
      metadata: { case_id: caseId, total_price: total, line_count: filtered.length, rate_card_id: selectedRateCard || null, discount_pct: globalDiscount },
    });

    supabase.functions.invoke("notify-quote-ready", {
      body: { case_id: caseId, total_price: total, entity_name: entityName },
    }).catch(console.error);

    toast({ title: "Quote sent", description: "Awaiting client approval." });
    setEditing(false);
    setSubmitting(false);
    onStatusChange();
    loadAll();
  }

  /* ── Client Approve ── */
  async function handleApprove() {
    if (!quote || !user || !profile) return;
    setSubmitting(true);

    await supabase.from("quotes" as any).update({
      status: "approved", approved_by: user.id, approved_at: new Date().toISOString(), locked: true,
    } as any).eq("id", quote.id);

    await supabase.from("cases").update({ status: "approved", approved_by: user.id }).eq("id", caseId);

    await supabase.from("audit_events").insert({
      user_id: user.id, org_id: profile.org_id,
      action_type: "QUOTE_APPROVED", object_type: "quote", object_id: quote.id,
      metadata: { case_id: caseId, total_price: quote.total_price, rate_card_version: quote.rate_card_version },
    });

    supabase.functions.invoke("notify-quote-approved", {
      body: { case_id: caseId, total_price: quote.total_price, entity_name: entityName, approved_by_name: profile.full_name },
    }).catch(console.error);

    toast({ title: "Quote approved", description: "Case approved — ready for assignment." });
    setSubmitting(false);
    onStatusChange();
    loadAll();
  }

  /* ── Client Reject ── */
  async function handleReject() {
    if (!quote || !user || !profile) return;
    setSubmitting(true);

    await supabase.from("quotes" as any).update({
      status: "rejected", rejected_by: user.id, rejected_at: new Date().toISOString(), rejection_reason: rejectionReason || null,
    } as any).eq("id", quote.id);

    await supabase.from("cases").update({ status: "closed" } as any).eq("id", caseId);

    await supabase.from("audit_events").insert({
      user_id: user.id, org_id: profile.org_id,
      action_type: "QUOTE_REJECTED", object_type: "quote", object_id: quote.id,
      metadata: { case_id: caseId, rejection_reason: rejectionReason },
    });

    toast({ title: "Quote rejected", description: "Case has been closed." });
    setSubmitting(false);
    onStatusChange();
    loadAll();
  }

  if (loading) return null;

  const showCreateForm = isManager && (caseStatus === "scheduled" || caseStatus === "new") && !quote;
  const showEditForm = isManager && !quote?.locked && editing;
  const canApprove = isClientAdmin && caseStatus === "quoted" && quote?.status === "sent";

  if (!quote && !showCreateForm) return null;

  /* ═══════ EDITING / CREATING MODE ═══════ */
  if (showCreateForm || showEditForm) {
    return (
      <div className="rounded-lg border border-border bg-card p-4">
        <h3 className="font-display text-sm font-semibold text-foreground flex items-center gap-2 mb-3">
          <FileText size={16} className="text-primary" /> {quote ? "Edit Quote" : "Build Quote"}
        </h3>

        <div className="space-y-4">
          {/* Rate Card selector */}
          {rateCards.length > 0 && (
            <div>
              <Label className="text-xs">Rate Card</Label>
              <Select value={selectedRateCard} onValueChange={applyRateCard}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Select rate card…" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="">None</SelectItem>
                  {rateCards.map(rc => (
                    <SelectItem key={rc.id} value={rc.id}>{rc.name} (v{rc.version}){Number(rc.discount_pct) > 0 ? ` — ${rc.discount_pct}% discount` : ""}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Line Items */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label className="text-xs font-medium">Line Items</Label>
              <Button size="sm" variant="ghost" onClick={addLine} className="h-6 px-2 text-xs">
                <Plus size={11} className="mr-1" /> Add
              </Button>
            </div>

            <div className="space-y-2">
              {lineItems.map((li, i) => (
                <div key={i} className="rounded-md border border-border p-3 space-y-2 bg-muted/20">
                  <div className="flex gap-2">
                    {/* Product selector */}
                    <div className="flex-1">
                      <Select value={li.product_id ?? ""} onValueChange={(v) => selectProduct(i, v)}>
                        <SelectTrigger className="text-xs h-8"><SelectValue placeholder="Select product…" /></SelectTrigger>
                        <SelectContent>
                          {products.map(p => (
                            <SelectItem key={p.id} value={p.id}>
                              {p.product_name} — £{Number(p.base_price).toLocaleString()} {p.pricing_unit}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    {lineItems.length > 1 && (
                      <Button variant="ghost" size="sm" onClick={() => removeLine(i)} className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive">
                        <Trash2 size={13} />
                      </Button>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <Input value={li.description} onChange={(e) => updateLine(i, { description: e.target.value })} placeholder="Description" className="flex-1 text-xs h-8" />
                  </div>

                  <div className="grid grid-cols-4 gap-2">
                    <div>
                      <span className="text-[10px] text-muted-foreground">Qty</span>
                      <Input type="number" min={1} value={li.quantity} onChange={(e) => updateLine(i, { quantity: Number(e.target.value) || 1 })} className="text-xs h-8" />
                    </div>
                    <div>
                      <span className="text-[10px] text-muted-foreground">Unit £</span>
                      <Input type="number" min={0} value={li.unit_price || ""} onChange={(e) => updateLine(i, { unit_price: Number(e.target.value) })} className="text-xs h-8" />
                    </div>
                    <div>
                      <span className="text-[10px] text-muted-foreground">Disc %</span>
                      <Input type="number" min={0} max={100} value={li.discount_pct || ""} onChange={(e) => updateLine(i, { discount_pct: Number(e.target.value) })} className="text-xs h-8" disabled={!isManager} />
                    </div>
                    <div>
                      <span className="text-[10px] text-muted-foreground">VAT</span>
                      <div className="flex items-center gap-1">
                        <Badge variant="outline" className="text-[9px] h-8 flex items-center">{li.vat_applicability}</Badge>
                        <Tooltip>
                          <TooltipTrigger><Info size={10} className="text-muted-foreground/60" /></TooltipTrigger>
                          <TooltipContent className="text-xs max-w-[200px]">VAT treatment depends on client status</TooltipContent>
                        </Tooltip>
                      </div>
                    </div>
                  </div>

                  <div className="text-right text-xs font-medium text-foreground">
                    Line: £{li.line_total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Global discount (manager only) */}
          {isManager && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Global Discount %</Label>
                <Input type="number" min={0} max={100} value={globalDiscount || ""} onChange={(e) => setGlobalDiscount(Number(e.target.value))} className="text-sm" />
              </div>
              <div>
                <Label className="text-xs">Discount Reason</Label>
                <Input value={discountReason} onChange={(e) => setDiscountReason(e.target.value)} placeholder="e.g. Volume commitment" className="text-sm" />
              </div>
            </div>
          )}

          {/* Totals */}
          <div className="border-t border-border pt-3 space-y-1.5">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Subtotal</span>
              <span className="text-foreground">£{subtotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
            {globalDiscount > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Discount ({globalDiscount}%)</span>
                <span className="text-destructive">−£{(subtotal - discountedSubtotal).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
            )}
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground flex items-center gap-1">
                VAT (20%)
                <Tooltip>
                  <TooltipTrigger><Info size={10} className="text-muted-foreground/60" /></TooltipTrigger>
                  <TooltipContent className="text-xs max-w-[220px]">VAT treatment depends on client status (UK domestic, reverse charge, exempt). Amounts shown are indicative.</TooltipContent>
                </Tooltip>
              </span>
              <span className="text-foreground">£{vatAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
            <div className="flex justify-between text-base font-semibold border-t border-border pt-2">
              <span className="text-foreground">Total (inc. VAT)</span>
              <span className="text-primary font-display">£{total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
          </div>

          {/* Scope & SLA */}
          <div className="space-y-1.5">
            <Label className="text-xs">Scope Notes</Label>
            <Textarea value={scopeNotes} onChange={(e) => setScopeNotes(e.target.value)} placeholder="Scope of work, assumptions, deliverables…" rows={3} className="resize-none text-sm" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">SLA (business days)</Label>
            <Input type="number" value={slaOverride} onChange={(e) => setSlaOverride(e.target.value)} placeholder="Leave blank to keep current" className="w-32 text-sm" />
          </div>

          <div className="flex gap-2 pt-2">
            <Button onClick={handleSaveAndSend} disabled={submitting} className="flex-1">
              <Send size={14} className="mr-1" /> {submitting ? "Sending…" : "Send Quote to Client"}
            </Button>
            {editing && <Button variant="outline" onClick={() => setEditing(false)}>Cancel</Button>}
          </div>
        </div>
      </div>
    );
  }

  /* ═══════ READ-ONLY DISPLAY ═══════ */
  if (!quote) return null;

  const statusColor = quote.status === "approved" ? "bg-emerald-500/10 text-emerald-600"
    : quote.status === "rejected" ? "bg-destructive/10 text-destructive"
    : quote.status === "expired" ? "bg-muted text-muted-foreground"
    : "bg-primary/10 text-primary";

  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-display text-sm font-semibold text-foreground flex items-center gap-2">
          <FileText size={16} className="text-primary" /> Quote
          {quote.locked && <Lock size={12} className="text-muted-foreground" />}
        </h3>
        <div className="flex items-center gap-2">
          {isManager && !quote.locked && (caseStatus === "quoted" || caseStatus === "scheduled") && (
            <Button size="sm" variant="ghost" onClick={() => setEditing(true)} className="h-7 px-2 text-xs">
              <Edit3 size={11} className="mr-1" /> Edit
            </Button>
          )}
          <Badge className={`capitalize text-[10px] ${statusColor}`}>{quote.status}</Badge>
        </div>
      </div>

      {/* Line items */}
      {lineItems.length > 0 && (
        <div className="space-y-1.5 mb-3">
          {lineItems.map((li, i) => (
            <div key={i} className="flex justify-between text-sm">
              <span className="text-muted-foreground">
                {li.description}{li.quantity > 1 ? ` × ${li.quantity}` : ""}
                {li.discount_pct > 0 && <span className="text-destructive text-xs ml-1">({li.discount_pct}% off)</span>}
              </span>
              <div className="flex items-center gap-2">
                <span className="text-foreground font-medium font-mono">
                  £{li.line_total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
                <Tooltip>
                  <TooltipTrigger><Badge variant="outline" className="text-[8px] px-1">{li.vat_applicability}</Badge></TooltipTrigger>
                  <TooltipContent className="text-xs">VAT treatment depends on client status</TooltipContent>
                </Tooltip>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Totals */}
      <div className="border-t border-border pt-2 space-y-1">
        {Number(quote.discount_pct) > 0 && (
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">Discount ({quote.discount_pct}%)</span>
            <span className="text-destructive">Applied</span>
          </div>
        )}
        <div className="flex justify-between text-xs">
          <span className="text-muted-foreground">Subtotal (ex. VAT)</span>
          <span className="text-foreground font-mono">£{Number(quote.subtotal).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-muted-foreground flex items-center gap-1">
            VAT
            <Tooltip>
              <TooltipTrigger><Info size={9} className="text-muted-foreground/50" /></TooltipTrigger>
              <TooltipContent className="text-xs max-w-[200px]">VAT treatment depends on client status</TooltipContent>
            </Tooltip>
          </span>
          <span className="text-foreground font-mono">£{Number(quote.vat_amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
        </div>
        <div className="flex justify-between text-sm font-semibold border-t border-border pt-1.5 mt-1.5">
          <span className="text-foreground">Total (inc. VAT)</span>
          <span className="text-primary font-display">£{Number(quote.total_price).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
        </div>
      </div>

      {/* Rate card info */}
      {quote.rate_card_version && (
        <div className="mt-2 flex items-center gap-1.5 text-[10px] text-muted-foreground">
          <Package size={10} /> Rate card v{quote.rate_card_version}
        </div>
      )}

      {quote.scope_notes && (
        <div className="mt-3 pt-3 border-t border-border">
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Scope</span>
          <p className="text-sm text-foreground mt-1 leading-relaxed">{quote.scope_notes}</p>
        </div>
      )}

      {quote.rejection_reason && (
        <div className="mt-3 p-2 rounded bg-destructive/5 border border-destructive/20 text-sm text-destructive">
          <strong>Rejection reason:</strong> {quote.rejection_reason}
        </div>
      )}

      {/* Client approve / reject */}
      {canApprove && (
        <div className="mt-4 space-y-3">
          <div>
            <Label className="text-xs">Rejection reason (if rejecting)</Label>
            <Input value={rejectionReason} onChange={(e) => setRejectionReason(e.target.value)} placeholder="Optional" className="text-sm mt-1" />
          </div>
          <div className="flex gap-2">
            <Button className="flex-1" onClick={handleApprove} disabled={submitting}>
              <CheckCircle2 size={14} className="mr-1" /> Approve Quote
            </Button>
            <Button variant="outline" className="flex-1" onClick={handleReject} disabled={submitting}>
              <XCircle size={14} className="mr-1" /> Reject
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
