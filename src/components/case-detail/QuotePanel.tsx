import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle2, XCircle, FileText } from "lucide-react";

interface Props {
  caseId: string;
  caseStatus: string;
  onStatusChange: () => void;
}

interface Quote {
  id: string;
  total_price: number;
  scope_notes: string | null;
  line_items: any[];
  status: string;
  created_at: string;
}

export default function QuotePanel({ caseId, caseStatus, onStatusChange }: Props) {
  const { user, profile, hasRole, isInternal } = useAuth();
  const { toast } = useToast();
  const [quote, setQuote] = useState<Quote | null>(null);
  const [loading, setLoading] = useState(true);

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
    setQuote(data as any);
    setLoading(false);
  };

  const handleApproveQuote = async () => {
    if (!quote || !user || !profile) return;

    // Update quote status
    await supabase.from("quotes" as any).update({ status: "approved" }).eq("id", quote.id);

    // Transition case to approved
    await supabase.from("cases").update({ status: "approved", approved_by: user.id }).eq("id", caseId);

    // Audit
    await supabase.from("audit_events").insert({
      user_id: user.id,
      org_id: profile.org_id,
      action_type: "CASE_APPROVED",
      object_type: "case",
      object_id: caseId,
      metadata: { quote_id: quote.id, total_price: quote.total_price, via: "quote_approval" },
    });

    toast({ title: "Quote approved", description: "The case has been approved and will be assigned." });
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
      metadata: { quote_id: quote.id, via: "quote_rejection" },
    });

    toast({ title: "Quote rejected", description: "The case has been closed." });
    onStatusChange();
    loadQuote();
  };

  if (loading) return null;
  if (!quote) return null;

  const lineItems = Array.isArray(quote.line_items) ? quote.line_items : [];
  const canApprove = hasRole("client_admin") && caseStatus === "quoted";

  return (
    <div className="fvc-card">
      <div className="flex items-center justify-between mb-3">
        <h3 className="fvc-heading-3 text-foreground flex items-center gap-2">
          <FileText size={16} className="text-accent" /> Quote
        </h3>
        <Badge className={`fvc-status-badge capitalize ${
          quote.status === "approved" ? "bg-success/10 text-success" :
          quote.status === "rejected" ? "bg-destructive/10 text-destructive" :
          "bg-primary/10 text-primary"
        }`}>
          {quote.status}
        </Badge>
      </div>
      <div className="fvc-gold-rule mb-4" />

      {/* Line items */}
      {lineItems.length > 0 && (
        <div className="space-y-1.5 mb-4">
          {lineItems.map((item: any, i: number) => (
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

      {!lineItems.length && (
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
