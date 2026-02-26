import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format } from "date-fns";

interface CaseRetrievalLogsProps {
  caseId: string;
}

const outcomeColor = (o: string): "default" | "destructive" | "outline" | "secondary" => {
  if (o === "Match") return "destructive";
  if (o === "Partial") return "default";
  if (o === "Error") return "outline";
  return "secondary";
};

export default function CaseRetrievalLogs({ caseId }: CaseRetrievalLogsProps) {
  const { data: logs = [], isLoading } = useQuery({
    queryKey: ["case-retrieval-logs", caseId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("retrieval_logs")
        .select("*, research_sources(source_name, category)")
        .eq("case_id", caseId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  if (isLoading) return <p className="text-sm text-muted-foreground text-center py-6">Loading…</p>;
  if (logs.length === 0) return <p className="text-sm text-muted-foreground text-center py-6">No research checks run for this case yet.</p>;

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Time</TableHead>
          <TableHead>Source</TableHead>
          <TableHead>Purpose</TableHead>
          <TableHead>Outcome</TableHead>
          <TableHead>Notes</TableHead>
          <TableHead>Promoted</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {logs.map((log: any) => (
          <TableRow key={log.id}>
            <TableCell className="text-xs text-muted-foreground whitespace-nowrap">{format(new Date(log.created_at), "dd MMM HH:mm")}</TableCell>
            <TableCell className="text-sm font-medium">{(log.research_sources as any)?.source_name}</TableCell>
            <TableCell><Badge variant="outline" className="text-[10px]">{log.purpose_of_search}</Badge></TableCell>
            <TableCell><Badge variant={outcomeColor(log.outcome_status)} className="text-[10px]">{log.outcome_status}</Badge></TableCell>
            <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">{log.notes_internal || "—"}</TableCell>
            <TableCell>{log.promoted_to ? <Badge variant="default" className="text-[10px]">{log.promoted_to}</Badge> : "—"}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
