import { useState, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Upload, Download, FileSpreadsheet, CheckCircle2, AlertTriangle, XCircle, Loader2 } from "lucide-react";
import * as XLSX from "xlsx";

/* ── Template columns ─────────────────────────────────────── */
const REQUIRED_COLS = ["entity_name", "entity_type", "jurisdiction_incorporation"] as const;
const OPTIONAL_COLS = [
  "registration_number", "registered_address", "hq_address",
  "website_domain", "aliases", "relationship_type", "criticality_tier", "notes",
] as const;
const ALL_COLS = [...REQUIRED_COLS, ...OPTIONAL_COLS];

const VALID_ENTITY_TYPES = ["company", "individual", "other"];
const VALID_RELATIONSHIP_TYPES = ["supplier", "customer", "agent", "partner", "other"];
const VALID_TIERS = ["a", "b", "c"];

/* ── Row validation ───────────────────────────────────────── */
type RowStatus = "ready" | "warning" | "error";

interface ParsedRow {
  rowNum: number;
  data: Record<string, string>;
  status: RowStatus;
  issues: string[];
}

function validateRow(raw: Record<string, string>, rowNum: number): ParsedRow {
  const issues: string[] = [];
  let status: RowStatus = "ready";

  // Required
  if (!raw.entity_name?.trim()) { issues.push("entity_name is required"); status = "error"; }
  if (!raw.entity_type?.trim()) {
    issues.push("entity_type is required"); status = "error";
  } else if (!VALID_ENTITY_TYPES.includes(raw.entity_type.trim().toLowerCase())) {
    issues.push(`entity_type must be Company, Individual, or Other`); status = "error";
  }
  if (!raw.jurisdiction_incorporation?.trim()) { issues.push("jurisdiction_incorporation is required"); status = "error"; }

  // Optional warnings
  if (status !== "error") {
    if (!raw.registration_number?.trim()) { issues.push("registration_number recommended"); status = "warning"; }
    if (!raw.registered_address?.trim() && !raw.hq_address?.trim()) { issues.push("No address provided"); status = "warning"; }
    if (raw.criticality_tier?.trim() && !VALID_TIERS.includes(raw.criticality_tier.trim().toLowerCase())) {
      issues.push("criticality_tier must be A, B, or C"); status = "error";
    }
    if (raw.relationship_type?.trim() && !VALID_RELATIONSHIP_TYPES.includes(raw.relationship_type.trim().toLowerCase())) {
      issues.push("relationship_type invalid"); status = "error";
    }
  }

  return { rowNum, data: raw, status, issues };
}

/* ── Template download ────────────────────────────────────── */
function downloadTemplate() {
  const ws = XLSX.utils.aoa_to_sheet([
    ALL_COLS,
    ["Acme Corp", "Company", "GB", "12345678", "10 High Street, London", "", "acme.com", "", "Supplier", "B", ""],
  ]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Entities");
  XLSX.writeFile(wb, "CR_Entity_Upload_Template.xlsx");
}

/* ── Component ────────────────────────────────────────────── */
interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImportComplete: () => void;
}

export default function BulkEntityUpload({ open, onOpenChange, onImportComplete }: Props) {
  const { profile } = useAuth();
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);

  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [fileName, setFileName] = useState("");
  const [importing, setImporting] = useState(false);
  const [step, setStep] = useState<"upload" | "preview" | "done">("upload");
  const [result, setResult] = useState<{ created: number; skipped: number; errors: number } | null>(null);

  const reset = useCallback(() => {
    setRows([]);
    setFileName("");
    setStep("upload");
    setResult(null);
    if (fileRef.current) fileRef.current.value = "";
  }, []);

  /* ── Parse uploaded file ──────────────────────────────── */
  const handleFile = useCallback((file: File) => {
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target!.result as ArrayBuffer);
        const wb = XLSX.read(data, { type: "array" });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const json: Record<string, string>[] = XLSX.utils.sheet_to_json(ws, { defval: "" });

        // Normalise header keys
        const normalised = json.map((row) => {
          const out: Record<string, string> = {};
          for (const [k, v] of Object.entries(row)) {
            out[k.trim().toLowerCase().replace(/\s+/g, "_")] = String(v).trim();
          }
          return out;
        });

        // Check required columns exist
        const headers = Object.keys(normalised[0] ?? {});
        const missingCols = REQUIRED_COLS.filter((c) => !headers.includes(c));
        if (missingCols.length > 0) {
          toast({ title: "Missing columns", description: `Required: ${missingCols.join(", ")}`, variant: "destructive" });
          return;
        }

        const parsed = normalised.map((r, i) => validateRow(r, i + 2)); // row 2+ (header is row 1)
        setRows(parsed);
        setStep("preview");
      } catch {
        toast({ title: "Parse error", description: "Could not read the uploaded file.", variant: "destructive" });
      }
    };
    reader.readAsArrayBuffer(file);
  }, [toast]);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  /* ── Import valid rows ────────────────────────────────── */
  const handleImport = async () => {
    if (!profile?.org_id || !profile?.user_id) return;
    setImporting(true);

    const validRows = rows.filter((r) => r.status !== "error");
    const errorRows = rows.filter((r) => r.status === "error");

    let created = 0;
    const errorDetails: { row: number; error: string }[] = errorRows.map((r) => ({
      row: r.rowNum, error: r.issues.join("; "),
    }));

    for (const row of validRows) {
      const d = row.data;
      const entityType = d.relationship_type?.toLowerCase() || "supplier";
      const mappedType = VALID_RELATIONSHIP_TYPES.includes(entityType) ? entityType : "supplier";
      const tier = VALID_TIERS.includes((d.criticality_tier || "b").toLowerCase())
        ? (d.criticality_tier || "B").toUpperCase() : "B";

      const { error } = await supabase.from("entities").insert({
        name: d.entity_name,
        entity_type: mappedType,
        country: d.jurisdiction_incorporation,
        registration_number: d.registration_number || null,
        registered_address_line1: d.registered_address || null,
        head_office_address_line1: d.hq_address || null,
        website: d.website_domain || null,
        risk_tier: tier,
        org_id: profile.org_id,
        owner_user_id: profile.user_id,
      });

      if (error) {
        errorDetails.push({ row: row.rowNum, error: error.message });
      } else {
        created++;
      }
    }

    // Log the import
    await supabase.from("entity_import_logs" as any).insert({
      org_id: profile.org_id,
      uploaded_by: profile.user_id,
      file_name: fileName,
      total_rows: rows.length,
      created_count: created,
      skipped_count: validRows.length - created,
      error_count: errorRows.length + (validRows.length - created),
      error_details: errorDetails,
    });

    setResult({ created, skipped: validRows.length - created, errors: errorRows.length });
    setStep("done");
    setImporting(false);
    onImportComplete();
    toast({ title: "Import complete", description: `${created} entities created.` });
  };

  /* ── Counts ───────────────────────────────────────────── */
  const readyCount = rows.filter((r) => r.status === "ready").length;
  const warnCount = rows.filter((r) => r.status === "warning").length;
  const errorCount = rows.filter((r) => r.status === "error").length;

  const statusIcon = (s: RowStatus) => {
    if (s === "ready") return <CheckCircle2 size={14} className="text-emerald-500" />;
    if (s === "warning") return <AlertTriangle size={14} className="text-amber-500" />;
    return <XCircle size={14} className="text-destructive" />;
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) reset(); onOpenChange(v); }}>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display text-xl flex items-center gap-2">
            <FileSpreadsheet size={20} /> Bulk Entity Upload
          </DialogTitle>
          <DialogDescription>Upload a CSV or XLSX file using the CR Entity Upload Template.</DialogDescription>
        </DialogHeader>

        {/* ── Step: Upload ────────────────────────────────── */}
        {step === "upload" && (
          <div className="space-y-6 mt-4">
            <Button variant="outline" size="sm" onClick={downloadTemplate}>
              <Download size={14} className="mr-2" /> Download Template
            </Button>

            <div
              className="border-2 border-dashed border-border rounded-lg p-12 text-center cursor-pointer hover:border-accent/50 transition-colors"
              onDrop={onDrop}
              onDragOver={(e) => e.preventDefault()}
              onClick={() => fileRef.current?.click()}
            >
              <Upload size={32} className="mx-auto mb-3 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                Drag & drop your file here, or <span className="text-accent underline">browse</span>
              </p>
              <p className="text-xs text-muted-foreground mt-1">Accepts .csv and .xlsx</p>
            </div>
            <input
              ref={fileRef}
              type="file"
              accept=".csv,.xlsx,.xls"
              className="hidden"
              onChange={(e) => { if (e.target.files?.[0]) handleFile(e.target.files[0]); }}
            />
          </div>
        )}

        {/* ── Step: Preview ───────────────────────────────── */}
        {step === "preview" && (
          <div className="space-y-4 mt-4">
            <div className="flex items-center gap-4 text-sm">
              <span className="text-muted-foreground">{fileName}</span>
              <Badge variant="outline" className="gap-1"><CheckCircle2 size={12} className="text-emerald-500" /> {readyCount + warnCount} valid</Badge>
              {warnCount > 0 && <Badge variant="outline" className="gap-1"><AlertTriangle size={12} className="text-amber-500" /> {warnCount} warnings</Badge>}
              {errorCount > 0 && <Badge variant="destructive" className="gap-1"><XCircle size={12} /> {errorCount} errors</Badge>}
            </div>

            <div className="border rounded-lg overflow-auto max-h-[400px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10">#</TableHead>
                    <TableHead className="w-10">Status</TableHead>
                    <TableHead>Entity Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Jurisdiction</TableHead>
                    <TableHead>Issues</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((r) => (
                    <TableRow key={r.rowNum} className={r.status === "error" ? "bg-destructive/5" : ""}>
                      <TableCell className="text-xs text-muted-foreground">{r.rowNum}</TableCell>
                      <TableCell>{statusIcon(r.status)}</TableCell>
                      <TableCell className="font-medium text-sm">{r.data.entity_name || "—"}</TableCell>
                      <TableCell className="text-sm">{r.data.entity_type || "—"}</TableCell>
                      <TableCell className="text-sm">{r.data.jurisdiction_incorporation || "—"}</TableCell>
                      <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">
                        {r.issues.join("; ") || "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className="flex items-center gap-3 justify-end">
              <Button variant="outline" onClick={reset}>Fix & re-upload</Button>
              <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button onClick={handleImport} disabled={importing || (readyCount + warnCount) === 0}>
                {importing ? <><Loader2 size={14} className="mr-2 animate-spin" /> Importing…</> : `Import ${readyCount + warnCount} entities`}
              </Button>
            </div>
          </div>
        )}

        {/* ── Step: Done ──────────────────────────────────── */}
        {step === "done" && result && (
          <div className="space-y-4 mt-4 text-center py-8">
            <CheckCircle2 size={48} className="mx-auto text-emerald-500" />
            <h3 className="font-display text-lg">Import Complete</h3>
            <div className="flex justify-center gap-6 text-sm">
              <div><span className="text-2xl font-bold text-emerald-600">{result.created}</span><br />Created</div>
              {result.skipped > 0 && <div><span className="text-2xl font-bold text-amber-500">{result.skipped}</span><br />Skipped</div>}
              {result.errors > 0 && <div><span className="text-2xl font-bold text-destructive">{result.errors}</span><br />Errors</div>}
            </div>
            <Button variant="outline" onClick={() => { reset(); onOpenChange(false); }}>Close</Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
