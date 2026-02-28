import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, BookOpen, Pencil, Send, Clock } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { useAuth } from "@/contexts/AuthContext";

export default function MethodologyAdminPage() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const [docDialogOpen, setDocDialogOpen] = useState(false);
  const [versionDialogOpen, setVersionDialogOpen] = useState(false);
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null);
  const [docForm, setDocForm] = useState({ name: "", audience: "CLIENT" as "CLIENT" | "INTERNAL" });
  const [versionForm, setVersionForm] = useState({ content_markdown: "", change_summary: "" });

  const { data: docs = [], isLoading } = useQuery({
    queryKey: ["methodology-docs-admin"],
    queryFn: async () => {
      const { data: docRows, error: dErr } = await supabase
        .from("methodology_document")
        .select("*")
        .order("created_at", { ascending: false });
      if (dErr) throw dErr;

      const { data: verRows, error: vErr } = await supabase
        .from("methodology_version")
        .select("*")
        .order("version", { ascending: false });
      if (vErr) throw vErr;

      return (docRows || []).map((d: any) => ({
        ...d,
        methodology_version: (verRows || []).filter((v: any) => v.methodology_document_id === d.id),
      }));
    },
  });
    },
  });

  const createDocMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("methodology_document").insert({
        name: docForm.name,
        audience: docForm.audience,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Document created");
      qc.invalidateQueries({ queryKey: ["methodology-docs-admin"] });
      setDocDialogOpen(false);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const publishVersionMutation = useMutation({
    mutationFn: async () => {
      if (!selectedDocId) throw new Error("No document selected");
      const doc = docs.find((d: any) => d.id === selectedDocId);
      const versions: any[] = doc?.methodology_version || [];
      const nextVersion = versions.length > 0 ? Math.max(...versions.map((v: any) => v.version)) + 1 : 1;

      // Create version
      const { data: newVersion, error: vErr } = await supabase
        .from("methodology_version")
        .insert({
          methodology_document_id: selectedDocId,
          version: nextVersion,
          content_markdown: versionForm.content_markdown,
          change_summary: versionForm.change_summary || null,
          published_by: user?.id || null,
        })
        .select("id")
        .single();
      if (vErr) throw vErr;

      // Update document to point to this version
      const { error: dErr } = await supabase
        .from("methodology_document")
        .update({ current_version_id: newVersion.id })
        .eq("id", selectedDocId);
      if (dErr) throw dErr;
    },
    onSuccess: () => {
      toast.success("Version published");
      qc.invalidateQueries({ queryKey: ["methodology-docs-admin"] });
      setVersionDialogOpen(false);
    },
    onError: (e: any) => toast.error(e.message),
  });

  function openPublishDialog(docId: string) {
    setSelectedDocId(docId);
    const doc = docs.find((d: any) => d.id === docId);
    const currentV = doc?.current_version_id
      ? (doc as any).methodology_version?.find((v: any) => v.id === doc.current_version_id)
      : null;
    setVersionForm({
      content_markdown: currentV?.content_markdown || "",
      change_summary: "",
    });
    setVersionDialogOpen(true);
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-primary" /> Methodology Editor
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage and publish methodology documents for clients and internal use.
          </p>
        </div>
        <Button size="sm" onClick={() => { setDocForm({ name: "", audience: "CLIENT" }); setDocDialogOpen(true); }}>
          <Plus className="h-4 w-4 mr-1" /> New Document
        </Button>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground text-center py-8">Loading…</p>
      ) : docs.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            No methodology documents yet. Create one to get started.
          </CardContent>
        </Card>
      ) : (
        docs.map((doc: any) => {
          const versions: any[] = doc.methodology_version || [];
          const sorted = [...versions].sort((a, b) => b.version - a.version);
          const current = doc.current_version_id
            ? versions.find((v) => v.id === doc.current_version_id)
            : null;

          return (
            <Card key={doc.id}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    {doc.name}
                    <Badge variant={doc.audience === "CLIENT" ? "default" : "secondary"} className="text-[10px]">
                      {doc.audience}
                    </Badge>
                    {current && (
                      <Badge variant="outline" className="text-[10px]">v{current.version}</Badge>
                    )}
                  </CardTitle>
                  <Button size="sm" variant="outline" onClick={() => openPublishDialog(doc.id)}>
                    <Send className="h-3.5 w-3.5 mr-1" /> Publish New Version
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {sorted.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">No versions published yet</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-20">Version</TableHead>
                        <TableHead>Change Summary</TableHead>
                        <TableHead>Published</TableHead>
                        <TableHead className="w-20">Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sorted.map((v: any) => (
                        <TableRow key={v.id}>
                          <TableCell className="font-mono text-sm">v{v.version}</TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {v.change_summary || "—"}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {format(new Date(v.published_at), "dd MMM yyyy HH:mm")}
                          </TableCell>
                          <TableCell>
                            {v.id === doc.current_version_id ? (
                              <Badge className="text-[9px] bg-success/10 text-success">Current</Badge>
                            ) : (
                              <Badge variant="outline" className="text-[9px]">Archived</Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          );
        })
      )}

      {/* Create Document Dialog */}
      <Dialog open={docDialogOpen} onOpenChange={setDocDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>New Methodology Document</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Name</Label>
              <Input
                placeholder="e.g. Risk Methodology"
                value={docForm.name}
                onChange={(e) => setDocForm({ ...docForm, name: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Audience</Label>
              <Select value={docForm.audience} onValueChange={(v) => setDocForm({ ...docForm, audience: v as any })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="CLIENT">Client</SelectItem>
                  <SelectItem value="INTERNAL">Internal</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDocDialogOpen(false)}>Cancel</Button>
            <Button onClick={() => createDocMutation.mutate()} disabled={!docForm.name || createDocMutation.isPending}>
              {createDocMutation.isPending ? "Creating…" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Publish Version Dialog */}
      <Dialog open={versionDialogOpen} onOpenChange={setVersionDialogOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Publish New Version</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Content (Markdown)</Label>
              <Textarea
                placeholder="# Risk Methodology&#10;&#10;Write the full methodology content here…"
                value={versionForm.content_markdown}
                onChange={(e) => setVersionForm({ ...versionForm, content_markdown: e.target.value })}
                rows={16}
                className="font-mono text-xs"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Change Summary</Label>
              <Input
                placeholder="Brief summary of what changed in this version"
                value={versionForm.change_summary}
                onChange={(e) => setVersionForm({ ...versionForm, change_summary: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setVersionDialogOpen(false)}>Cancel</Button>
            <Button
              onClick={() => publishVersionMutation.mutate()}
              disabled={!versionForm.content_markdown || publishVersionMutation.isPending}
            >
              {publishVersionMutation.isPending ? "Publishing…" : "Publish"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
