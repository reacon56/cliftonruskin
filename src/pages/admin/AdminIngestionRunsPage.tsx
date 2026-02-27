import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Server, Clock, AlertCircle, CheckCircle2, ExternalLink } from "lucide-react";
import { format } from "date-fns";

type IngestionRun = {
  id: string;
  data_source_id: string | null;
  started_at: string;
  finished_at: string | null;
  status: string;
  records_processed: number;
  records_changed: number;
  metadata: Record<string, unknown> | null;
};

type DataSource = { id: string; name: string };

export default function AdminIngestionRunsPage() {
  const navigate = useNavigate();

  const { data: runs = [], isLoading } = useQuery({
    queryKey: ["admin-ingestion-runs"],
    queryFn: async () => {
      const { data, error } = await (supabase.from("ingestion_run") as any)
        .select("*")
        .order("started_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data as IngestionRun[];
    },
  });

  const { data: sources = [] } = useQuery({
    queryKey: ["admin-data-sources-lookup"],
    queryFn: async () => {
      const { data, error } = await (supabase.from("data_source") as any).select("id, name");
      if (error) throw error;
      return data as DataSource[];
    },
  });

  const sourceMap = new Map(sources.map((s) => [s.id, s.name]));

  const statusIcon = (status: string) => {
    switch (status) {
      case "completed": return <CheckCircle2 className="h-3.5 w-3.5 text-primary" />;
      case "failed": return <AlertCircle className="h-3.5 w-3.5 text-destructive" />;
      default: return <Clock className="h-3.5 w-3.5 text-accent-foreground animate-pulse" />;
    }
  };

  const statusBadge = (status: string): "default" | "destructive" | "secondary" => {
    switch (status) {
      case "completed": return "default";
      case "failed": return "destructive";
      default: return "secondary";
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="font-display text-2xl font-bold text-foreground flex items-center gap-2">
          <Server className="h-6 w-6 text-primary" /> Ingestion Runs
        </h1>
        <p className="text-sm text-muted-foreground mt-1">Monitor ingestion pipeline execution history</p>
      </div>

      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Status</TableHead>
              <TableHead>Source</TableHead>
              <TableHead>Started</TableHead>
              <TableHead>Finished</TableHead>
              <TableHead>Duration</TableHead>
              <TableHead>Processed</TableHead>
              <TableHead>Changed</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">Loading…</TableCell></TableRow>
            ) : runs.length === 0 ? (
              <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">No ingestion runs recorded</TableCell></TableRow>
            ) : runs.map((r) => {
              const duration = r.finished_at
                ? Math.round((new Date(r.finished_at).getTime() - new Date(r.started_at).getTime()) / 1000)
                : null;
              return (
                <TableRow
                  key={r.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => navigate(`/admin/ingestion-runs/${r.id}`)}
                >
                  <TableCell>
                    <div className="flex items-center gap-1.5">
                      {statusIcon(r.status)}
                      <Badge variant={statusBadge(r.status)} className="text-[10px]">{r.status}</Badge>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm">
                    {r.data_source_id ? sourceMap.get(r.data_source_id) || "Unknown" : "Manual"}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {format(new Date(r.started_at), "dd MMM yyyy HH:mm:ss")}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {r.finished_at ? format(new Date(r.finished_at), "HH:mm:ss") : "—"}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {duration != null ? `${duration}s` : "—"}
                  </TableCell>
                  <TableCell className="text-sm font-medium">{r.records_processed}</TableCell>
                  <TableCell className="text-sm font-medium">{r.records_changed}</TableCell>
                  <TableCell>
                    <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
