import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, Server, Clock, AlertCircle, CheckCircle2 } from "lucide-react";
import { format } from "date-fns";

export default function AdminIngestionRunDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: run, isLoading: runLoading } = useQuery({
    queryKey: ["admin-ingestion-run", id],
    queryFn: async () => {
      const { data, error } = await (supabase.from("ingestion_run") as any)
        .select("*")
        .eq("id", id!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const { data: source } = useQuery({
    queryKey: ["admin-run-source", run?.data_source_id],
    queryFn: async () => {
      const { data, error } = await (supabase.from("data_source") as any)
        .select("id, name, source_type")
        .eq("id", run.data_source_id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!run?.data_source_id,
  });

  const { data: errors = [], isLoading: errorsLoading } = useQuery({
    queryKey: ["admin-ingestion-errors", id],
    queryFn: async () => {
      const { data, error } = await (supabase.from("ingestion_error") as any)
        .select("*")
        .eq("ingestion_run_id", id!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  if (runLoading) {
    return <div className="flex items-center justify-center h-64 text-muted-foreground text-sm">Loading…</div>;
  }

  if (!run) {
    return <div className="flex items-center justify-center h-64 text-muted-foreground text-sm">Run not found</div>;
  }

  const duration = run.finished_at
    ? Math.round((new Date(run.finished_at).getTime() - new Date(run.started_at).getTime()) / 1000)
    : null;

  const statusIcon = run.status === "completed"
    ? <CheckCircle2 className="h-5 w-5 text-primary" />
    : run.status === "failed"
    ? <AlertCircle className="h-5 w-5 text-destructive" />
    : <Clock className="h-5 w-5 text-accent-foreground animate-pulse" />;

  const statusBadge = run.status === "completed" ? "default" as const
    : run.status === "failed" ? "destructive" as const : "secondary" as const;

  return (
    <div className="space-y-6 animate-fade-in">
      <Button variant="ghost" size="sm" onClick={() => navigate("/admin/ingestion-runs")}>
        <ArrowLeft className="h-4 w-4 mr-1" /> Back to Runs
      </Button>

      {/* Header */}
      <div className="flex items-center gap-3">
        {statusIcon}
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground flex items-center gap-2">
            Ingestion Run
            <Badge variant={statusBadge} className="text-xs">{run.status}</Badge>
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {source ? source.name : "Manual run"} · {format(new Date(run.started_at), "dd MMM yyyy HH:mm:ss")}
          </p>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card>
          <CardContent className="pt-4 pb-3 px-4">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Records Processed</p>
            <p className="text-2xl font-bold text-foreground mt-1">{run.records_processed}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 px-4">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Records Changed</p>
            <p className="text-2xl font-bold text-foreground mt-1">{run.records_changed}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 px-4">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Duration</p>
            <p className="text-2xl font-bold text-foreground mt-1">{duration != null ? `${duration}s` : "—"}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 px-4">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Errors</p>
            <p className={`text-2xl font-bold mt-1 ${errors.length > 0 ? "text-destructive" : "text-foreground"}`}>{errors.length}</p>
          </CardContent>
        </Card>
      </div>

      {/* Metadata */}
      {run.metadata && Object.keys(run.metadata).length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Metadata</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="text-xs text-muted-foreground bg-muted/50 rounded p-3 overflow-auto max-h-40">
              {JSON.stringify(run.metadata, null, 2)}
            </pre>
          </CardContent>
        </Card>
      )}

      {/* Errors */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-destructive" /> Errors ({errors.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {errorsLoading ? (
            <p className="text-sm text-muted-foreground text-center py-6">Loading…</p>
          ) : errors.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">No errors for this run</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Time</TableHead>
                  <TableHead>Error Message</TableHead>
                  <TableHead>Details</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {errors.map((e: any) => (
                  <TableRow key={e.id}>
                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                      {format(new Date(e.created_at), "HH:mm:ss")}
                    </TableCell>
                    <TableCell className="text-sm text-destructive font-medium">{e.error_message}</TableCell>
                    <TableCell>
                      {e.error_detail && Object.keys(e.error_detail).length > 0 ? (
                        <pre className="text-[11px] text-muted-foreground bg-muted/50 rounded p-2 overflow-auto max-h-24 max-w-sm">
                          {JSON.stringify(e.error_detail, null, 2)}
                        </pre>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
