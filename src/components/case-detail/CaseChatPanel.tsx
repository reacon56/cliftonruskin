import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Send, Megaphone, Paperclip, Lock, MessageSquare } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface CaseChatPanelProps {
  caseId: string;
  orgId: string;
}

export default function CaseChatPanel({ caseId, orgId }: CaseChatPanelProps) {
  const { user, isInternal, canQuote, primaryRoleLabel, profile } = useAuth();
  const isManager = canQuote;
  const { toast } = useToast();

  const [channel, setChannel] = useState<"internal" | "client">(isInternal ? "internal" : "client");
  const [messages, setMessages] = useState<any[]>([]);
  const [notices, setNotices] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [noticeSubject, setNoticeSubject] = useState("");
  const [noticeBody, setNoticeBody] = useState("");
  const [noticeOpen, setNoticeOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadMessages();
    loadNotices();
  }, [caseId, channel]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const loadMessages = async () => {
    let query = supabase
      .from("case_messages")
      .select("*")
      .eq("case_id", caseId)
      .order("created_at");

    // Internal users filter by selected channel; clients only see client channel (enforced by RLS too)
    if (isInternal) {
      query = query.eq("channel", channel);
    }

    const { data } = await query;
    setMessages(data ?? []);
  };

  const loadNotices = async () => {
    const { data } = await supabase
      .from("all_stations_notices")
      .select("*")
      .eq("case_id", caseId)
      .order("created_at", { ascending: false });
    setNotices(data ?? []);
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !user || !profile) return;
    const { error } = await supabase.from("case_messages").insert({
      case_id: caseId,
      sender_user_id: user.id,
      message: newMessage,
      channel,
    } as any);

    if (error) {
      toast({ title: "Failed to send", description: error.message, variant: "destructive" });
      return;
    }

    // Audit log
    await supabase.from("audit_events").insert({
      user_id: user.id,
      org_id: profile.org_id,
      action_type: channel === "internal" ? "INTERNAL_MESSAGE_SENT" : "CLIENT_MESSAGE_SENT",
      object_type: "case",
      object_id: caseId,
      metadata: { channel },
    });

    setNewMessage("");
    loadMessages();
  };

  const sendNotice = async () => {
    if (!noticeSubject.trim() || !noticeBody.trim() || !user) return;
    const { error } = await supabase.from("all_stations_notices").insert({
      case_id: caseId,
      org_id: orgId,
      sender_user_id: user.id,
      subject: noticeSubject,
      body: noticeBody,
    } as any);

    if (error) {
      toast({ title: "Failed to send notice", description: error.message, variant: "destructive" });
      return;
    }

    await supabase.from("audit_events").insert({
      user_id: user.id,
      org_id: profile?.org_id,
      action_type: "ALL_STATIONS_NOTICE",
      object_type: "case",
      object_id: caseId,
      metadata: { subject: noticeSubject },
    });

    toast({ title: "All Stations Notice sent" });
    setNoticeSubject("");
    setNoticeBody("");
    setNoticeOpen(false);
    loadNotices();
  };

  return (
    <div className="rounded-lg border bg-card p-4 space-y-4">
      {/* Channel toggle — internal users only */}
      <div className="flex items-center justify-between">
        <div className="flex gap-1">
          {isInternal ? (
            <>
              <Button size="sm" variant={channel === "internal" ? "default" : "outline"} className="text-xs h-7 gap-1" onClick={() => setChannel("internal")}>
                <Lock className="h-3 w-3" /> Internal Chat
              </Button>
              <Button size="sm" variant={channel === "client" ? "default" : "outline"} className="text-xs h-7 gap-1" onClick={() => setChannel("client")}>
                <MessageSquare className="h-3 w-3" /> Client Thread
              </Button>
            </>
          ) : (
            <span className="text-xs font-medium text-muted-foreground flex items-center gap-1">
              <MessageSquare className="h-3.5 w-3.5" /> Case Messages
            </span>
          )}
        </div>

        {/* All Stations Notice — manager only */}
        {isManager && (
          <Dialog open={noticeOpen} onOpenChange={setNoticeOpen}>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline" className="text-xs h-7 gap-1">
                <Megaphone className="h-3 w-3" /> All Stations
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle className="font-display text-base">All Stations Notice</DialogTitle>
              </DialogHeader>
              <p className="text-xs text-muted-foreground">This formal notice will be visible to the client and all internal staff on this case.</p>
              <Input placeholder="Subject" value={noticeSubject} onChange={(e) => setNoticeSubject(e.target.value)} />
              <Textarea placeholder="Notice body…" rows={4} value={noticeBody} onChange={(e) => setNoticeBody(e.target.value)} />
              <Button onClick={sendNotice} disabled={!noticeSubject.trim() || !noticeBody.trim()} className="gap-1">
                <Megaphone className="h-3.5 w-3.5" /> Send Notice
              </Button>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Channel indicator */}
      {isInternal && channel === "internal" && (
        <div className="flex items-center gap-1.5 text-[10px] font-medium text-destructive bg-destructive/5 border border-destructive/20 rounded px-2 py-1">
          <Lock className="h-3 w-3" /> Internal only — not visible to clients
        </div>
      )}

      {/* All Stations Notices */}
      {notices.length > 0 && (
        <div className="space-y-2">
          {notices.slice(0, 3).map((n) => (
            <div key={n.id} className="border border-primary/20 bg-primary/5 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-1">
                <Megaphone className="h-3.5 w-3.5 text-primary" />
                <span className="text-xs font-semibold text-foreground">{n.subject}</span>
                <span className="text-[10px] text-muted-foreground ml-auto">{new Date(n.created_at).toLocaleDateString()}</span>
              </div>
              <p className="text-sm text-foreground">{n.body}</p>
            </div>
          ))}
        </div>
      )}

      {/* Messages */}
      <div ref={scrollRef} className="space-y-3 max-h-[400px] overflow-y-auto">
        {messages.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">No messages in this thread yet.</p>
        ) : messages.map((m) => {
          const isMe = m.sender_user_id === user?.id;
          return (
            <div key={m.id} className={`border rounded-lg p-3 ${isMe ? "border-accent/20 bg-accent/5" : ""}`}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-medium text-foreground">{isMe ? "You" : primaryRoleLabel}</span>
                <span className="text-[10px] text-muted-foreground">{new Date(m.created_at).toLocaleString()}</span>
              </div>
              <p className="text-sm text-foreground">{m.message}</p>
              {m.attachments && (m.attachments as any[]).length > 0 && (
                <div className="flex gap-1 mt-2">
                  {(m.attachments as any[]).map((a: any, i: number) => (
                    <Badge key={i} variant="secondary" className="text-[10px] gap-1">
                      <Paperclip className="h-2.5 w-2.5" /> {a.name || `File ${i + 1}`}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Compose */}
      <div className="flex gap-2">
        <Textarea value={newMessage} onChange={(e) => setNewMessage(e.target.value)} placeholder={channel === "internal" ? "Internal message…" : "Message to client…"} rows={2} className="flex-1" onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }} />
        <Button onClick={sendMessage} disabled={!newMessage.trim()} size="sm" className="self-end gap-1">
          <Send size={14} /> Send
        </Button>
      </div>
    </div>
  );
}
