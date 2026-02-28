import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ExternalLink, FileSearch, Clock, Calendar, Hash, Info } from "lucide-react";
import { format } from "date-fns";

interface SourceViewerProps {
  /** Button / trigger element — if omitted, renders a default "View source" button */
  trigger?: React.ReactNode;
  sourceName: string | null;
  sourceUrl: string | null;
  retrievedAt: string | null;
  effectiveDate: string | null;
  snapshotHash?: string | null;
  /** Raw parsed data from value_json */
  valueJson: any;
  indicatorLabel?: string;
}

/** Limit the JSON preview to avoid overwhelming the modal */
function truncateJson(obj: any, maxKeys = 12): any {
  if (obj === null || obj === undefined) return null;
  if (typeof obj !== "object") return obj;
  if (Array.isArray(obj)) return obj.slice(0, maxKeys);
  const keys = Object.keys(obj);
  const limited: Record<string, any> = {};
  for (const k of keys.slice(0, maxKeys)) {
    limited[k] = obj[k];
  }
  if (keys.length > maxKeys) {
    limited["…"] = `(${keys.length - maxKeys} more fields)`;
  }
  return limited;
}

export default function SourceViewer({
  trigger,
  sourceName,
  sourceUrl,
  retrievedAt,
  effectiveDate,
  snapshotHash,
  valueJson,
  indicatorLabel,
}: SourceViewerProps) {
  const [open, setOpen] = useState(false);
  const truncated = truncateJson(valueJson);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button variant="ghost" size="sm" className="h-6 px-2 text-[10px] gap-1 text-primary hover:text-primary">
            <FileSearch className="h-3 w-3" /> View source
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-base flex items-center gap-2">
            <FileSearch className="h-4 w-4 text-primary" />
            Source Detail
            {indicatorLabel && (
              <Badge variant="outline" className="text-[10px] ml-1">{indicatorLabel}</Badge>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          {/* Provenance metadata */}
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="space-y-0.5">
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Source</span>
              <div className="font-medium text-foreground">
                {sourceUrl ? (
                  <a
                    href={sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline inline-flex items-center gap-1"
                  >
                    {sourceName ?? "External source"} <ExternalLink className="h-3 w-3" />
                  </a>
                ) : (
                  <span>{sourceName ?? "Not recorded"}</span>
                )}
              </div>
            </div>

            <div className="space-y-0.5">
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                <Calendar className="h-3 w-3" /> Effective Date
              </span>
              <div className="font-medium text-foreground">
                {effectiveDate ? format(new Date(effectiveDate), "dd MMM yyyy") : "—"}
              </div>
            </div>

            <div className="space-y-0.5">
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                <Clock className="h-3 w-3" /> Retrieved
              </span>
              <div className="font-medium text-foreground">
                {retrievedAt ? format(new Date(retrievedAt), "dd MMM yyyy HH:mm") : "—"}
              </div>
            </div>

            {snapshotHash && (
              <div className="space-y-0.5">
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                  <Hash className="h-3 w-3" /> Snapshot Hash
                </span>
                <div className="font-mono text-[11px] text-foreground truncate" title={snapshotHash}>
                  {snapshotHash.slice(0, 16)}…
                </div>
              </div>
            )}
          </div>

          <Separator />

          {/* Raw parsed snippet */}
          <div>
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5 block">
              Parsed Data Snippet
            </span>
            {truncated ? (
              <pre className="rounded-lg border bg-muted/30 p-3 text-xs font-mono text-foreground overflow-x-auto max-h-[240px] overflow-y-auto leading-relaxed">
                {JSON.stringify(truncated, null, 2)}
              </pre>
            ) : (
              <p className="text-sm text-muted-foreground italic">No parsed data available</p>
            )}
          </div>

          <Separator />

          {/* Disclaimer */}
          <div className="flex items-start gap-2 rounded-md border border-primary/20 bg-primary/5 p-3">
            <Info className="h-4 w-4 text-primary mt-0.5 shrink-0" />
            <p className="text-xs text-muted-foreground leading-relaxed">
              Source links are provided for transparency; Clifton Ruskin interpretation
              is in the risk assessment. Raw data shown here is a limited preview of the
              ingested record and may not reflect the full source document.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
