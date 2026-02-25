import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle2, XCircle, FileText, Plus, Trash2, Edit3, Send } from "lucide-react";

interface Props {
  caseId: string;
  caseStatus: string;
  onStatusChange: () => void;
  entityName?: string;
}

interface LineItem {
  description: string;
  amount: number;
}

interface Quote {
  id: string;
  total_price: number;
  scope_notes: string | null;
  line_items: LineItem[];
  status: string;
  created_at: string;
}

export default function QuotePanel({ caseId, caseStatus, onStatusChange, entityName }: Props) {
  const { user, profile, hasRole, isInternal, canQuote } = useAuth();
  const { toast } = useToast();
  const [quote, setQuote] = useState<Quote | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);

  // Editable form state
  const [lineItems, setLineItems] = useState<LineItem[]>([{ description: "", amount: 0 }]);
  const [scopeNotes, setScopeNotes] = useState("");
  const [slaOverride, setSlaOverride] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadQuote();
  }, [caseId]);

  const loadQuote = async () => {
    const { data } = await supabase
      .from("quotes" as any)
      .select("*")
      .eq("case_id", caseId)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();
    const q = data as any as Quote | null;
    setQuote(q);
    if (q) {
      setLineItems(Array.isArray(q.line_items) && q.line_items.length > 0 ? q.line_items : [{ description: "", amount: 0 }]);
      setScopeNotes(q.scope_notes ?? "");
    }
    setLoading(false);
  };

  const totalPrice = lineItems.reduce((s, li) => s + (Number(li.amount) || 0), 0);

  const addLine = () => setLineItems((prev) => [...prev, { description: "", amount: 0 }]);
  const removeLine = (idx: number) => setLineItems((prev) => prev.filter((_, i) => i !== idx));
  const updateLine = (idx: number, field: keyof LineItem, val: string | number) =>
    setLineItems((prev) => prev.map((li, i) => i === idx ? { ...li, [field]: val } : li));

  // Assurance Manager creates/edits and sends quote → case moves to Quoted
  const handleSaveAndSendQuote = async () => {
    if (!user || !profile) return;
    const filtered = lineItems.filter((li) => li.description.trim());
    if (filtered.length === 0) {
      toast({ title: "Add at least one line item", variant: "destructive" });
      return;
    }
    setSubmitting(true);

    if (quote) {
      // Update existing quote
      await supabase.from("quotes" as any).update({
        line_items: filtered,
        total_price: totalPrice,
        scope_notes: scopeNotes || null,
        status: "sent",
        updated_at: new Date().toISOString(),
      }).eq("id", quote.id);
    } else {
      // Create new quote
      await supabase.from("quotes" as any).insert({
        case_id: caseId,
        created_by: user.id,
        line_items: filtered,
        total_price: totalPrice,
        scope_notes: scopeNotes || null,
        status: "sent",
      });
    }

    // Update case price and SLA
    const caseUpdate: Record<string, any> = {
      status: "quoted",
      price_estimate: totalPrice,
    };
    if (slaOverride) caseUpdate.sla_days = Number(slaOverride);
    await supabase.from("cases").update(caseUpdate).eq("id", caseId);

    // Audit
    await supabase.from("audit_events").insert({
      user_id: user.id,
      org_id: profile.org_id,
      action_type: "CASE_QUOTED",
      object_type: "case",
      object_id: caseId,
      metadata: {
        total_price: totalPrice,
        line_item_count: filtered.length,
        from_status: caseStatus,
        to_status: "quoted",
      },
    });

    // Fire-and-forget notification to client admins
    supabase.functions.invoke("notify-quote-ready", {
      body: { case_id: caseId, total_price: totalPrice, entity_name: entityName },
    }).catch(console.error);

    toast({ title: "Quote sent", description: "Case moved to Quoted — awaiting client approval." });
    setEditing(false);
    setSubmitting(false);
    onStatusChange();
    loadQuote();
  };

  const handleApproveQuote = async () => {
    if (!quote || !user || !profile) return;

    await supabase.from("quotes" as any).update({ status: "approved" }).eq("id", quote.id);
    await supabase.from("cases").update({ status: "approved", approved_by: user.id }).eq("id", caseId);

    await supabase.from("audit_events").insert({
      user_id: user.id,
      org_id: profile.org_id,
      action_type: "CASE_APPROVED",
      object_type: "case",
      object_id: caseId,
      metadata: { quote_id: quote.id, total_price: quote.total_price, via: "quote_approval", from_status: "quoted", to_status: "approved" },
    });

    // Fire-and-forget notification to FVC internal staff
    supabase.functions.invoke("notify-quote-approved", {
      body: {
        case_id: caseId,
        total_price: quote.total_price,
        entity_name: entityName,
        approved_by_name: profile.full_name,
      },
    }).catch(console.error);

    toast({ title: "Quote approved", description: "Case approved — ready for assignment." });
    onStatusChange();
    loadQuote();
  };

  const handleRejectQuote = async () => {
    if (!quote || !user || !profile) return;

    await supabase.from("quotes" as any).update({ status: "rejected" }).eq("id", quote.id);
    await supabase.from("cases").update({ status: "closed" }).eq("id", caseId);

    await supabase.from("audit_events").insert({
      user_id: user.id,
      org_id: profile.org_id,
      action_type: "CASE_REJECTED",
      object_type: "case",
      object_id: caseId,
      metadata: { quote_id: quote.id, via: "quote_rejection", from_status: "quoted", to_status: "closed" },
    });

    toast({ title: "Quote rejected", description: "Case has been closed." });
    onStatusChange();
    loadQuote();
  };

  if (loading) return null;

  // Show creation form for Assurance Manager on scheduled cases with no quote
  const showCreateForm = canQuote && caseStatus === "scheduled" && !quote;
  const showEditForm = canQuote && (caseStatus === "scheduled" || caseStatus === "quoted") && editing;
  const canApprove = hasRole("client_admin") && caseStatus === "quoted";

  // Nothing to show if no quote and not a quoting user
  if (!quote && !showCreateForm) return null;

  // Editing / Creating mode
  if (showCreateForm || showEditForm) {
    return (
      <div className="fvc-card">
        <h3 className="fvc-heading-3 text-foreground flex items-center gap-2 mb-3">
          <FileText size={16} className="text-accent" /> {quote ? "Edit Quote" : "Generate Quote"}
        </h3>
        <div className="fvc-gold-rule mb-4" />

        <div className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label className="text-xs font-medium">Line Items</Label>
              <Button size="sm" variant="ghost" onClick={addLine} className="h-6 px-2 text-xs">
                <Plus size={11} className="mr-1" /> Add
              </Button>
            </div>
            {lineItems.map((li, i) => (
              <div key={i} className="flex gap-2 mb-2">
                <Input
                  value={li.description}
                  onChange={(e) => updateLine(i, "description", e.target.value)}
                  placeholder="Description"
                  className="flex-1 text-sm"
                />
                <Input
                  type="number"
                  value={li.amount || ""}
                  onChange={(e) => updateLine(i, "amount", Number(e.target.value))}
                  placeholder="£"
                  className="w-24 text-sm"
                />
                {lineItems.length > 1 && (
                  <Button variant="ghost" size="sm" onClick={() => removeLine(i)} className="h-9 w-9 p-0 shrink-0 text-muted-foreground hover:text-destructive">
                    <Trash2 size={13} />
                  </Button>
                )}
              </div>
            ))}
            <div className="flex justify-between items-baseline border-t border-border pt-2 mt-2">
              <span className="text-sm font-medium text-foreground">Total</span>
              <span className="text-accent font-display text-lg font-semibold">£{totalPrice.toLocaleString()}</span>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Scope Notes</Label>
            <Textarea
              value={scopeNotes}
              onChange={(e) => setScopeNotes(e.target.value)}
              placeholder="Scope of work, assumptions, deliverables…"
              rows={3}
              className="resize-none text-sm"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">SLA (business days)</Label>
            <Input
              type="number"
              value={slaOverride}
              onChange={(e) => setSlaOverride(e.target.value)}
              placeholder="Leave blank to keep current"
              className="w-32 text-sm"
            />
          </div>

          <div className="flex gap-2 pt-2">
            <Button onClick={handleSaveAndSendQuote} disabled={submitting} className="flex-1">
              <Send size={14} className="mr-1" /> {submitting ? "Sending…" : "Send Quote to Client"}
            </Button>
            {editing && (
              <Button variant="outline" onClick={() => setEditing(false)}>Cancel</Button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Read-only display
  if (!quote) return null;
  const displayItems = Array.isArray(quote.line_items) ? quote.line_items : [];

  return (
    <div className="fvc-card">
      <div className="flex items-center justify-between mb-3">
        <h3 className="fvc-heading-3 text-foreground flex items-center gap-2">
          <FileText size={16} className="text-accent" /> Quote
        </h3>
        <div className="flex items-center gap-2">
          {canQuote && (caseStatus === "quoted" || caseStatus === "scheduled") && (
            <Button size="sm" variant="ghost" onClick={() => setEditing(true)} className="h-7 px-2 text-xs">
              <Edit3 size={11} className="mr-1" /> Edit
            </Button>
          )}
          <Badge className={`fvc-status-badge capitalize ${
            quote.status === "approved" ? "bg-success/10 text-success" :
            quote.status === "rejected" ? "bg-destructive/10 text-destructive" :
            "bg-primary/10 text-primary"
          }`}>
            {quote.status}
          </Badge>
        </div>
      </div>
      <div className="fvc-gold-rule mb-4" />

      {displayItems.length > 0 && (
        <div className="space-y-1.5 mb-4">
          {displayItems.map((item: any, i: number) => (
            <div key={i} className="flex justify-between text-sm">
              <span className="text-muted-foreground">{item.description || item.label}</span>
              <span className="text-foreground font-medium">£{Number(item.amount ?? 0).toLocaleString()}</span>
            </div>
          ))}
          <div className="border-t border-border pt-2 mt-2 flex justify-between items-baseline">
            <span className="text-sm font-medium text-foreground">Total</span>
            <span className="text-accent font-display text-lg font-semibold">
              £{quote.total_price.toLocaleString()}
            </span>
          </div>
        </div>
      )}

      {!displayItems.length && (
        <div className="flex justify-between items-baseline mb-4">
          <span className="text-sm text-muted-foreground">Total price</span>
          <span className="text-accent font-display text-lg font-semibold">
            £{quote.total_price.toLocaleString()}
          </span>
        </div>
      )}

      {quote.scope_notes && (
        <div className="mb-4">
          <span className="fvc-label block mb-1">Scope</span>
          <p className="text-sm text-foreground leading-relaxed">{quote.scope_notes}</p>
        </div>
      )}

      {canApprove && (
        <div className="flex gap-2">
          <Button className="flex-1" onClick={handleApproveQuote}>
            <CheckCircle2 size={14} className="mr-1" /> Approve Quote
          </Button>
          <Button variant="outline" className="flex-1" onClick={handleRejectQuote}>
            <XCircle size={14} className="mr-1" /> Reject
          </Button>
        </div>
      )}
    </div>
  );
}
