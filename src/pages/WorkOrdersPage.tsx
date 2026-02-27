import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Truck, Clock, Check, AlertCircle, FileText } from "lucide-react";

interface WorkOrder {
  id: string;
  case_id: string;
  delivery_status: string;
  delivery_date: string | null;
  qa_required: boolean;
  invoice_status: string;
  external_invoice_reference: string | null;
  total_value: number;
  created_at: string;
}

const DELIVERY_LABELS: Record<string, string> = {
  not_started: "Not Started",
  in_progress: "In Progress",
  delivered: "Delivered",
};

const DELIVERY_ICONS: Record<string, React.ReactNode> = {
  not_started: <Clock size={14} />,
  in_progress: <Truck size={14} />,
  delivered: <Check size={14} />,
};

/**
 * Client-facing work orders view.
 * Shows delivered items and invoice references but NOT internal billing data.
 */
export default function WorkOrdersPage() {
  const { isInternal } = useAuth();
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from("work_orders")
      .select("id, case_id, delivery_status, delivery_date, qa_required, invoice_status, external_invoice_reference, total_value, created_at")
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        setWorkOrders((data as any[]) ?? []);
        setLoading(false);
      });
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-foreground">Work Orders</h1>
        <p className="text-sm text-muted-foreground mt-1">Track delivery progress for commissioned work</p>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Work Order</TableHead>
                <TableHead>Delivery Status</TableHead>
                <TableHead>Delivery Date</TableHead>
                <TableHead className="text-right">Value</TableHead>
                {!isInternal && <TableHead>Invoice Ref</TableHead>}
                <TableHead>Created</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">Loading…</TableCell>
                </TableRow>
              ) : workOrders.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                    <AlertCircle className="inline mr-2" size={16} /> No work orders yet
                  </TableCell>
                </TableRow>
              ) : (
                workOrders.map((wo) => (
                  <TableRow key={wo.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <FileText size={14} className="text-muted-foreground" />
                        <span className="font-mono text-xs">{wo.id.slice(0, 8)}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="gap-1">
                        {DELIVERY_ICONS[wo.delivery_status]}
                        {DELIVERY_LABELS[wo.delivery_status] ?? wo.delivery_status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">{wo.delivery_date ?? "—"}</TableCell>
                    <TableCell className="text-right font-medium">£{Number(wo.total_value).toLocaleString("en-GB", { minimumFractionDigits: 2 })}</TableCell>
                    {!isInternal && (
                      <TableCell className="text-sm">{wo.external_invoice_reference || "—"}</TableCell>
                    )}
                    <TableCell className="text-sm text-muted-foreground">{new Date(wo.created_at).toLocaleDateString("en-GB")}</TableCell>
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
