import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowLeft, CheckCircle2, Upload, MapPin, MessageSquare,
  Send, FileText, Clock, Play, AlertTriangle, Eye, EyeOff,
} from "lucide-react";
import { getSignedFileUrl } from "@/lib/signed-urls";
import {
  PARTNER_STATUS_LABELS, PARTNER_STATUS_COLORS,
  type PartnerTaskStatus,
} from "@/lib/partner-statuses";

interface TaskItem {
  id: string;
  sort_order: number;
  label: string;
  description: string | null;
  is_completed: boolean;
  completed_at: string | null;
  file_url: string | null;
  file_name: string | null;
  geo_lat: number | null;
  geo_lng: number | null;
  geo_label: string | null;
  notes: string | null;
  is_client_shareable: boolean;
}

interface Clarification {
  id: string;
  message: string;
  sender_role: string;
  created_at: string;
  item_id: string | null;
}

export default function PartnerTaskDetailPage() {
  const { taskId } = useParams<{ taskId: string }>();
  const navigate = useNavigate();
  const { user, isInternal } = useAuth();
  const { toast } = useToast();

  const [task, setTask] = useState<any>(null);
  const [items, setItems] = useState<TaskItem[]>([]);
  const [clarifications, setClarifications] = useState<Clarification[]>([]);
  const [newClarification, setNewClarification] = useState("");
  const [methodStatement, setMethodStatement] = useState("");
  const [uploading, setUploading] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!taskId) return;
    // Partners: only select fields they need. No org_id, no case details, no client info.
    // RLS ensures they can only see tasks assigned to them.
    const taskSelect = isInternal
      ? "*"
      : "id, title, country, deadline, status, questions, method_statement, created_at";
    const [taskRes, itemsRes, clarsRes] = await Promise.all([
      supabase.from("partner_tasks" as any).select(taskSelect).eq("id", taskId).single(),
      supabase.from("partner_task_items" as any).select("*").eq("task_id", taskId).order("sort_order"),
      supabase.from("partner_task_clarifications" as any).select("*").eq("task_id", taskId).order("created_at"),
    ]);
    setTask(taskRes.data);
    setItems((itemsRes.data as any) ?? []);
    setClarifications((clarsRes.data as any) ?? []);
    setMethodStatement((taskRes.data as any)?.method_statement ?? "");
    setLoading(false);
  }, [taskId]);

  useEffect(() => { load(); }, [load]);

  const updateStatus = async (status: string) => {
    await supabase.from("partner_tasks" as any).update({ status, updated_at: new Date().toISOString() }).eq("id", taskId);
    toast({ title: "Status updated", description: `Task is now: ${PARTNER_STATUS_LABELS[status as PartnerTaskStatus] || status}` });
    load();
  };

  const toggleItemComplete = async (item: TaskItem) => {
    const completed = !item.is_completed;
    await supabase.from("partner_task_items" as any).update({
      is_completed: completed,
      completed_at: completed ? new Date().toISOString() : null,
      completed_by: completed ? user?.id : null,
      updated_at: new Date().toISOString(),
    }).eq("id", item.id);
    load();
  };

  const updateItemField = async (itemId: string, field: string, value: any) => {
    await supabase.from("partner_task_items" as any).update({
      [field]: value,
      updated_at: new Date().toISOString(),
    }).eq("id", itemId);
    load();
  };

  const handleFileUpload = async (itemId: string, file: File) => {
    if (!user) return;
    setUploading(itemId);
    const path = `${taskId}/${itemId}/${file.name}`;
    const { error: uploadErr } = await supabase.storage
      .from("partner-evidence")
      .upload(path, file, { upsert: true });

    if (uploadErr) {
      toast({ title: "Upload failed", description: uploadErr.message, variant: "destructive" });
      setUploading(null);
      return;
    }

    // Store in partner_evidence table (client_shareable defaults to false)
    await supabase.from("partner_evidence" as any).insert({
      partner_task_id: taskId,
      evidence_type: "document",
      file_url: path,
      notes: file.name,
    });

    // Also update the checklist item with file reference
    await supabase.from("partner_task_items" as any).update({
      file_url: path,
      file_name: file.name,
      updated_at: new Date().toISOString(),
    }).eq("id", itemId);

    setUploading(null);
    toast({ title: "File uploaded", description: file.name });
    load();
  };

  const openSignedFile = async (bucket: string, path: string) => {
    const url = await getSignedFileUrl(bucket, path);
    if (url) {
      window.open(url, "_blank");
    } else {
      toast({ title: "Access denied", description: "Could not retrieve file.", variant: "destructive" });
    }
  };

  const addGeoToItem = async (itemId: string) => {
    if (!navigator.geolocation) {
      toast({ title: "Not supported", description: "Geolocation is not available.", variant: "destructive" });
      return;
    }
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        await supabase.from("partner_task_items" as any).update({
          geo_lat: pos.coords.latitude,
          geo_lng: pos.coords.longitude,
          geo_label: `${pos.coords.latitude.toFixed(5)}, ${pos.coords.longitude.toFixed(5)}`,
          updated_at: new Date().toISOString(),
        }).eq("id", itemId);
        toast({ title: "Location captured" });
        load();
      },
      () => toast({ title: "Location error", description: "Could not get position.", variant: "destructive" })
    );
  };

  const saveMethodStatement = async () => {
    await supabase.from("partner_tasks" as any).update({
      method_statement: methodStatement,
      updated_at: new Date().toISOString(),
    }).eq("id", taskId);
    toast({ title: "Method statement saved" });
  };

  const sendClarification = async () => {
    if (!newClarification.trim() || !user) return;
    await supabase.from("partner_task_clarifications" as any).insert({
      task_id: taskId,
      message: newClarification,
      sender_role: isInternal ? "analyst" : "partner",
      sender_user_id: user.id,
    });
    setNewClarification("");
    load();
  };

  if (loading || !task) {
    return <div className="text-sm text-muted-foreground py-20 text-center">Loading…</div>;
  }

  const status = task.status as PartnerTaskStatus;
  const isPartner = !isInternal;
  const canEdit = isPartner && !["completed", "sent"].includes(status);
  const completedCount = items.filter((i) => i.is_completed).length;

  return (
    <div className="max-w-3xl mx-auto">
      <button onClick={() => navigate(isInternal ? -1 as any : "/partner/tasks")} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors">
        <ArrowLeft size={14} /> Back
      </button>

      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="fvc-heading-1 text-foreground">{task.title}</h1>
          <div className="flex items-center gap-3 mt-2 text-sm text-muted-foreground">
            <span className="flex items-center gap-1"><MapPin size={13} /> {task.country}</span>
            {task.deadline && (
              <span className="flex items-center gap-1"><Clock size={13} /> Due {new Date(task.deadline).toLocaleDateString()}</span>
            )}
          </div>
        </div>
        <Badge className={`fvc-status-badge text-sm px-3 py-1 capitalize ${PARTNER_STATUS_COLORS[status] || "bg-muted text-muted-foreground"}`}>
          {PARTNER_STATUS_LABELS[status] || task.status}
        </Badge>
      </div>

      {/* Status actions */}
      {isPartner && status === "sent" && (
        <div className="fvc-card mb-6 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-foreground">New task received</p>
            <p className="text-xs text-muted-foreground">Review the brief and accept to begin work.</p>
          </div>
          <Button onClick={() => updateStatus("accepted")}>
            <CheckCircle2 size={14} className="mr-1" /> Accept Task
          </Button>
        </div>
      )}
      {isPartner && status === "accepted" && (
        <div className="fvc-card mb-6 flex items-center justify-between">
          <p className="text-sm text-muted-foreground">Ready to start work?</p>
          <Button onClick={() => updateStatus("in_progress")}>
            <Play size={14} className="mr-1" /> Begin Work
          </Button>
        </div>
      )}
      {isPartner && status === "clarification_requested" && (
        <div className="flex items-center gap-3 p-4 rounded-lg border border-warning/30 bg-warning/5 mb-6">
          <AlertTriangle size={18} className="text-warning shrink-0" />
          <div>
            <p className="text-sm font-medium text-foreground">Clarification requested</p>
            <p className="text-xs text-muted-foreground">The analyst has questions — see messages below, then resume work.</p>
          </div>
          <Button size="sm" onClick={() => updateStatus("in_progress")} className="shrink-0">
            Resume Work
          </Button>
        </div>
      )}

      {/* Progress */}
      <div className="fvc-card mb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="fvc-heading-3 text-foreground">Checklist</h2>
          <span className="text-xs text-muted-foreground">{completedCount}/{items.length} complete</span>
        </div>
        <div className="fvc-gold-rule mb-4" />

        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">No checklist items have been added yet.</p>
        ) : (
          <div className="space-y-4">
            {items.map((item) => (
              <div key={item.id} className={`border rounded-lg p-4 transition-colors ${item.is_completed ? "border-success/30 bg-success/5" : "border-border"}`}>
                <div className="flex items-start gap-3">
                  <Checkbox
                    checked={item.is_completed}
                    onCheckedChange={() => canEdit && toggleItemComplete(item)}
                    disabled={!canEdit}
                    className="mt-0.5"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`text-sm font-medium ${item.is_completed ? "text-success line-through" : "text-foreground"}`}>
                        {item.label}
                      </span>
                      {item.is_client_shareable ? (
                        <span className="flex items-center gap-1 text-[9px] text-accent"><Eye size={9} /> Client-shareable</span>
                      ) : (
                        <span className="flex items-center gap-1 text-[9px] text-muted-foreground"><EyeOff size={9} /> Internal only</span>
                      )}
                    </div>
                    {item.description && (
                      <p className="text-xs text-muted-foreground mt-1">{item.description}</p>
                    )}

                    {/* Evidence controls */}
                    {canEdit && (
                      <div className="mt-3 space-y-2">
                        {/* File upload */}
                        <div className="flex items-center gap-2">
                          <label className="cursor-pointer">
                            <input
                              type="file"
                              className="sr-only"
                              onChange={(e) => {
                                const f = e.target.files?.[0];
                                if (f) handleFileUpload(item.id, f);
                              }}
                            />
                            <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded border border-border hover:bg-muted/50 transition-colors">
                              <Upload size={11} />
                              {uploading === item.id ? "Uploading…" : "Upload evidence"}
                            </span>
                          </label>
                          <button
                            onClick={() => addGeoToItem(item.id)}
                            className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded border border-border hover:bg-muted/50 transition-colors"
                          >
                            <MapPin size={11} /> Tag location
                          </button>
                        </div>

                        {/* Notes */}
                        <Textarea
                          value={item.notes ?? ""}
                          onChange={(e) => updateItemField(item.id, "notes", e.target.value)}
                          placeholder="Notes for this item…"
                          rows={2}
                          className="text-xs resize-none"
                        />

                        {/* Client-shareable toggle — internal only, partners never control this */}
                        {isInternal && (
                          <div className="flex items-center gap-2">
                            <Switch
                              checked={item.is_client_shareable}
                              onCheckedChange={(v) => updateItemField(item.id, "is_client_shareable", v)}
                            />
                            <Label className="text-xs text-muted-foreground">Client-shareable</Label>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Existing evidence display */}
                    {item.file_url && (
                      <div className="mt-2 flex items-center gap-2 text-xs">
                        <FileText size={11} className="text-accent" />
                        <button onClick={() => openSignedFile("partner-evidence", item.file_url!)} className="text-accent hover:underline">
                          {item.file_name || "Attached file"}
                        </button>
                      </div>
                    )}
                    {item.geo_label && (
                      <div className="mt-1 flex items-center gap-1 text-[10px] text-muted-foreground">
                        <MapPin size={9} /> {item.geo_label}
                      </div>
                    )}
                    {item.completed_at && (
                      <div className="mt-1 text-[10px] text-muted-foreground">
                        Completed {new Date(item.completed_at).toLocaleString()}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Submit button */}
        {isPartner && status === "in_progress" && items.length > 0 && (
          <div className="mt-6 pt-4 border-t border-border">
            <Button
              className="w-full"
              onClick={() => updateStatus("submitted")}
              disabled={completedCount < items.length}
            >
              <Send size={14} className="mr-1" /> Submit Completed Task
            </Button>
            {completedCount < items.length && (
              <p className="text-[10px] text-muted-foreground mt-2 text-center">
                Complete all {items.length} checklist items before submitting.
              </p>
            )}
          </div>
        )}

        {/* Analyst actions */}
        {isInternal && status === "submitted" && (
          <div className="mt-6 pt-4 border-t border-border flex gap-2">
            <Button className="flex-1" onClick={() => updateStatus("completed")}>
              <CheckCircle2 size={14} className="mr-1" /> Mark Completed
            </Button>
            <Button variant="outline" className="flex-1" onClick={() => updateStatus("clarification_requested")}>
              <AlertTriangle size={14} className="mr-1" /> Request Clarification
            </Button>
          </div>
        )}
      </div>

      {/* Method Statement */}
      <div className="fvc-card mb-6">
        <h2 className="fvc-heading-3 text-foreground mb-3">Method Statement</h2>
        <div className="fvc-gold-rule mb-4" />
        {canEdit ? (
          <div className="space-y-3">
            <Textarea
              value={methodStatement}
              onChange={(e) => setMethodStatement(e.target.value)}
              placeholder="Describe the methodology, sources consulted, and approach taken for this enquiry…"
              rows={5}
              className="resize-none"
            />
            <Button variant="outline" size="sm" onClick={saveMethodStatement}>Save</Button>
          </div>
        ) : (
          <p className="text-sm text-foreground whitespace-pre-wrap">
            {methodStatement || "No method statement provided yet."}
          </p>
        )}
      </div>

      {/* Clarifications / Messages */}
      <div className="fvc-card">
        <h2 className="fvc-heading-3 text-foreground mb-3 flex items-center gap-2">
          <MessageSquare size={16} /> Messages
        </h2>
        <div className="fvc-gold-rule mb-4" />

        {clarifications.length === 0 && (
          <p className="text-sm text-muted-foreground mb-4">No messages yet.</p>
        )}

        {clarifications.length > 0 && (
          <div className="space-y-3 mb-4">
            {clarifications.map((c) => (
              <div key={c.id} className={`border rounded-lg p-3 ${c.sender_role === "analyst" ? "border-primary/20 bg-primary/5" : "border-accent/20 bg-accent/5"}`}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium text-foreground capitalize">{c.sender_role}</span>
                  <span className="text-[10px] text-muted-foreground">{new Date(c.created_at).toLocaleString()}</span>
                </div>
                <p className="text-sm text-foreground">{c.message}</p>
              </div>
            ))}
          </div>
        )}

        <div className="flex gap-2">
          <Textarea
            value={newClarification}
            onChange={(e) => setNewClarification(e.target.value)}
            placeholder="Type a message…"
            rows={2}
            className="flex-1"
          />
          <Button onClick={sendClarification} disabled={!newClarification.trim()} size="sm" className="self-end">
            <Send size={14} className="mr-1" /> Send
          </Button>
        </div>
      </div>
    </div>
  );
}
