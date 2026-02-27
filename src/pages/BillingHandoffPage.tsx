import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Download, FileText, Check, Truck, Clock, AlertCircle } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface WorkOrder {
  id: string;
  org_id: string;
  quote_id: string | null;
  case_id: string;
  assigned_officer: string | null;
  delivery_status: string;
  delivery_date: string | null;
  qa_required: boolean;
  invoice_status: string;
  external_invoice_reference: string | null;
  total_value: number;
  partner_cost: number;
  notes: string | null;
  created_at: string;
}

const DELIVERY_LABELS: Record<string, string> = {
  not_started: "Not Started",
  in_progress: "In Progress",
  delivered: "Delivered",
};

const INVOICE_LABELS: Record<string, string> = {
  not_invoiced: "Not Invoiced",
  invoiced: "Invoiced",
  paid: "Paid",
};

const DELIVERY_ICONS: Record<string, React.ReactNode> = {
  not_started: <Clock size={14} />,
  in_progress: <Truck size={14} />,
  delivered: <Check size={14} />,
};

export default function BillingHandoffPage() {
  const { user, profile } = useAuth();
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingRef, setEditingRef] = useState<string | null>(null);
  const [refValue, setRefValue] = useState("");
  const [filter, setFilter] = useState<"all" | "ready" | "invoiced">("ready");

  useEffect(() => {
    fetchWorkOrders();
  }, []);

  async function fetchWorkOrders() {
    const { data } = await supabase
      .from("work_orders")
      .select("*")
      .order("created_at", { ascending: false });
    setWorkOrders((data as any[]) ?? []);
    setLoading(false);
  }

  const filtered = workOrders.filter((wo) => {
    if (filter === "ready") return wo.delivery_status === "delivered" && wo.invoice_status === "not_invoiced";
    if (filter === "invoiced") return wo.invoice_status === "invoiced" || wo.invoice_status === "paid";
    return true;
  });

  async function handleInvoiceStatusChange(woId: string, status: string) {
    await supabase.from("work_orders").update({ invoice_status: status, updated_at: new Date().toISOString() } as any).eq("id", woId);
    await supabase.from("audit_events").insert({
      user_id: user!.id,
      org_id: profile?.org_id,
      object_type: "work_order",
      object_id: woId,
      action_type: "WORK_ORDER_INVOICE_STATUS",
      metadata: { new_status: status },
    } as any);
    toast({ title: "Invoice status updated" });
    fetchWorkOrders();
  }

  async function handleSaveRef(woId: string) {
    await supabase.from("work_orders").update({ external_invoice_reference: refValue, updated_at: new Date().toISOString() } as any).eq("id", woId);
    setEditingRef(null);
    toast({ title: "Invoice reference saved" });
    fetchWorkOrders();
  }

  function exportCsv() {
    const rows = filtered.map((wo) => ({
      work_order_id: wo.id,
      case_id: wo.case_id,
      delivery_status: DELIVERY_LABELS[wo.delivery_status] ?? wo.delivery_status,
      delivery_date: wo.delivery_date ?? "",
      total_value: wo.total_value,
      partner_cost: wo.partner_cost,
      net_value: Number(wo.total_value) - Number(wo.partner_cost),
      invoice_status: INVOICE_LABELS[wo.invoice_status] ?? wo.invoice_status,
      invoice_reference: wo.external_invoice_reference ?? "",
      created_at: wo.created_at,
    }));

    const headers = Object.keys(rows[0] || {});
    const csv = [
      headers.join(","),
      ...rows.map((r) => headers.map((h) => `"${(r as any)[h]}"`).join(",")),
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `billing-handoff-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: "CSV exported" });
  }

  const readyCount = workOrders.filter((wo) => wo.delivery_status === "delivered" && wo.invoice_status === "not_invoiced").length;
  const totalReady = workOrders
    .filter((wo) => wo.delivery_status === "delivered" && wo.invoice_status === "not_invoiced")
    .reduce((s, wo) => s + Number(wo.total_value), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">Billing Handoff</h1>
          <p className="text-sm text-muted-foreground mt-1">Delivered work orders ready for invoicing</p>
        </div>
        <Button onClick={exportCsv} disabled={filtered.length === 0} className="gap-2">
          <Download size={16} /> Export CSV
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Ready to Invoice</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{readyCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Uninvoiced Value</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">£{totalReady.toLocaleString("en-GB", { minimumFractionDigits: 2 })}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Work Orders</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{workOrders.length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filter */}
      <div className="flex gap-2">
        {(["ready", "invoiced", "all"] as const).map((f) => (
          <Button
            key={f}
            variant={filter === f ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter(f)}
          >
            {f === "ready" ? "Ready to Invoice" : f === "invoiced" ? "Invoiced / Paid" : "All"}
          </Button>
        ))}
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Work Order</TableHead>
                <TableHead>Delivery</TableHead>
                <TableHead>Delivery Date</TableHead>
                <TableHead className="text-right">Value</TableHead>
                <TableHead className="text-right">Partner Cost</TableHead>
                <TableHead>Invoice Status</TableHead>
                <TableHead>Invoice Ref</TableHead>
                <TableHead>QA</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground py-8">Loading…</TableCell>
                </TableRow>
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                    <AlertCircle className="inline mr-2" size={16} /> No work orders match this filter
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((wo) => (
                  <TableRow key={wo.id}>
                    <TableCell>
                      <span className="font-mono text-xs text-muted-foreground">{wo.id.slice(0, 8)}</span>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="gap-1">
                        {DELIVERY_ICONS[wo.delivery_status]}
                        {DELIVERY_LABELS[wo.delivery_status] ?? wo.delivery_status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">{wo.delivery_date ?? "—"}</TableCell>
                    <TableCell className="text-right font-medium">£{Number(wo.total_value).toLocaleString("en-GB", { minimumFractionDigits: 2 })}</TableCell>
                    <TableCell className="text-right text-sm text-muted-foreground">£{Number(wo.partner_cost).toLocaleString("en-GB", { minimumFractionDigits: 2 })}</TableCell>
                    <TableCell>
                      <Select
                        value={wo.invoice_status}
                        onValueChange={(v) => handleInvoiceStatusChange(wo.id, v)}
                      >
                        <SelectTrigger className="w-[140px] h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="not_invoiced">Not Invoiced</SelectItem>
                          <SelectItem value="invoiced">Invoiced</SelectItem>
                          <SelectItem value="paid">Paid</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      {editingRef === wo.id ? (
                        <div className="flex gap-1">
                          <Input
                            value={refValue}
                            onChange={(e) => setRefValue(e.target.value)}
                            className="h-8 w-32 text-xs"
                            placeholder="INV-001"
                          />
                          <Button size="sm" variant="ghost" onClick={() => handleSaveRef(wo.id)}>
                            <Check size={14} />
                          </Button>
                        </div>
                      ) : (
                        <button
                          className="text-xs text-muted-foreground hover:text-foreground"
                          onClick={() => { setEditingRef(wo.id); setRefValue(wo.external_invoice_reference ?? ""); }}
                        >
                          {wo.external_invoice_reference || <span className="italic">Add ref…</span>}
                        </button>
                      )}
                    </TableCell>
                    <TableCell>
                      {wo.qa_required ? (
                        <Badge variant="secondary" className="text-xs">Required</Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
