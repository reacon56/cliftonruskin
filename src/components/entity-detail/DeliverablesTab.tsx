import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useNavigate } from "react-router-dom";
import { FileText, Download } from "lucide-react";
import { getSignedFileUrl } from "@/lib/signed-urls";
import { useToast } from "@/hooks/use-toast";

interface Props {
  deliverables: any[];
  changeLogs: any[];
  cases: any[];
}

export default function DeliverablesTab({ deliverables, changeLogs, cases }: Props) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [typeFilter, setTypeFilter] = useState("all");

  const openSignedFile = async (fileUrl: string) => {
    // If it looks like a relative storage path, get signed URL
    // Otherwise fall back to direct link (legacy)
    if (fileUrl.startsWith("http")) {
      window.open(fileUrl, "_blank");
      return;
    }
    const url = await getSignedFileUrl("deliverables", fileUrl);
    if (url) {
      window.open(url, "_blank");
    } else {
      toast({ title: "Access denied", description: "Could not retrieve file.", variant: "destructive" });
    }
  };

  const allItems = [
    ...deliverables.map((d) => ({ ...d, _kind: "deliverable" as const })),
    ...changeLogs.map((cl) => ({ ...cl, _kind: "changelog" as const, deliverable_type: "change_log" })),
  ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  const types = [...new Set(allItems.map((i) => i.deliverable_type || i._kind))];

  const filtered = typeFilter === "all" ? allItems : allItems.filter((i) => (i.deliverable_type || i._kind) === typeFilter);

  const caseMap = Object.fromEntries(cases.map((c) => [c.id, c]));

  return (
    <div className="space-y-4 fvc-stagger">
      <div className="flex items-center gap-3 mb-2">
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-48"><SelectValue placeholder="Filter by type" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All types</SelectItem>
            {types.map((t) => (
              <SelectItem key={t} value={t}>{t.replace(/_/g, " ")}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span className="text-xs text-muted-foreground">{filtered.length} items</span>
      </div>

      {filtered.length === 0 ? (
        <div className="fvc-card text-center py-10 text-sm text-muted-foreground">No deliverables or evidence found.</div>
      ) : (
        <div className="space-y-0 fvc-card p-0 overflow-hidden">
          {filtered.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between px-5 py-3.5 border-b border-border/60 last:border-0 hover:bg-muted/30 transition-colors"
            >
              <div className="flex items-center gap-3 min-w-0">
                <FileText size={14} className="text-accent shrink-0" />
                <div className="min-w-0">
                  <div className="text-sm font-medium text-foreground truncate">
                    {item._kind === "changelog" ? item.summary : item.title}
                  </div>
                  <div className="text-[10px] text-muted-foreground mt-0.5 flex items-center gap-2">
                    <span className="capitalize">{(item.deliverable_type || "").replace(/_/g, " ")}</span>
                    {item._kind === "deliverable" && <span>· v{item.version}</span>}
                    <span>· {new Date(item.created_at).toLocaleDateString()}</span>
                    {item.case_id && caseMap[item.case_id] && (
                      <button
                        onClick={(e) => { e.stopPropagation(); navigate(`/cases/${item.case_id}`); }}
                        className="fvc-link text-[10px]"
                      >
                        Case →
                      </button>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {item._kind === "changelog" && (
                  <Badge className={`fvc-status-badge ${
                    item.confidence_level === "high" ? "bg-success/10 text-success"
                    : item.confidence_level === "med" ? "bg-warning/10 text-warning"
                    : "bg-muted text-muted-foreground"
                  }`}>
                    {item.confidence_level}
                  </Badge>
                )}
                {item.file_url && (
                  <button onClick={() => openSignedFile(item.file_url)} className="text-accent hover:text-accent/80" title="Download">
                    <Download size={14} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <p className="text-[10px] text-muted-foreground italic">
        Evidence vault showing deliverables and change logs. Auditors have read-only access.
      </p>
    </div>
  );
}
