import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Upload, FileText, Trash2, Download, Image, File } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

interface EvidenceLockerProps {
  caseId: string;
  isManager: boolean;
}

export default function EvidenceLocker({ caseId, isManager }: EvidenceLockerProps) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const folderPath = `cases/${caseId}`;

  const { data: files = [], isLoading, refetch } = useQuery({
    queryKey: ["case-evidence", caseId],
    queryFn: async () => {
      const { data, error } = await supabase.storage.from("case-evidence").list(folderPath, { sortBy: { column: "created_at", order: "desc" } });
      if (error) throw error;
      return data || [];
    },
  });

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setUploading(true);
    const filePath = `${folderPath}/${Date.now()}_${file.name}`;
    const { error } = await supabase.storage.from("case-evidence").upload(filePath, file);
    if (error) {
      toast.error(error.message);
    } else {
      // Audit
      await supabase.from("audit_events").insert({
        object_type: "case_evidence",
        action_type: "evidence_uploaded",
        object_id: caseId,
        user_id: user.id,
        metadata: { file_name: file.name },
      });
      toast.success("Evidence uploaded");
      refetch();
    }
    setUploading(false);
    if (fileRef.current) fileRef.current.value = "";
  };

  const handleDelete = async (name: string) => {
    const { error } = await supabase.storage.from("case-evidence").remove([`${folderPath}/${name}`]);
    if (error) toast.error(error.message);
    else { toast.success("File removed"); refetch(); }
  };

  const handleDownload = async (name: string) => {
    const { data, error } = await supabase.storage.from("case-evidence").createSignedUrl(`${folderPath}/${name}`, 60);
    if (error || !data?.signedUrl) { toast.error("Could not generate link"); return; }
    window.open(data.signedUrl, "_blank");
  };

  const fileIcon = (name: string) => {
    if (/\.(jpg|jpeg|png|gif|webp)$/i.test(name)) return <Image className="h-4 w-4 text-primary" />;
    if (/\.(pdf)$/i.test(name)) return <FileText className="h-4 w-4 text-destructive" />;
    return <File className="h-4 w-4 text-muted-foreground" />;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">{files.length} file{files.length !== 1 ? "s" : ""}</span>
        <div>
          <input ref={fileRef} type="file" className="hidden" onChange={handleUpload} />
          <Button size="sm" variant="outline" onClick={() => fileRef.current?.click()} disabled={uploading}>
            <Upload className="h-3.5 w-3.5 mr-1.5" /> {uploading ? "Uploading…" : "Upload"}
          </Button>
        </div>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground text-center py-6">Loading…</p>
      ) : files.length === 0 ? (
        <div className="text-center py-8 border-2 border-dashed rounded-lg">
          <Upload className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">No evidence files yet</p>
          <p className="text-xs text-muted-foreground mt-1">Upload documents, screenshots, or PDFs</p>
        </div>
      ) : (
        <div className="space-y-1.5">
          {files.map((f: any) => (
            <div key={f.name} className="flex items-center gap-3 rounded-lg border p-2.5 hover:bg-muted/30 transition-colors">
              {fileIcon(f.name)}
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-foreground truncate">{f.name.replace(/^\d+_/, "")}</div>
                <div className="text-[10px] text-muted-foreground">
                  {f.metadata?.size ? `${(f.metadata.size / 1024).toFixed(0)} KB` : ""} · {format(new Date(f.created_at), "dd MMM yyyy HH:mm")}
                </div>
              </div>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleDownload(f.name)}>
                <Download className="h-3.5 w-3.5" />
              </Button>
              {isManager && (
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleDelete(f.name)}>
                  <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                </Button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
