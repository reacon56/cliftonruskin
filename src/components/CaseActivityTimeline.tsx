import { useMemo } from "react";
import {
  Send, CheckCircle2, Play, Clock, FileText, MessageSquare,
  AlertTriangle, XCircle, Package,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface TimelineEvent {
  id: string;
  type: "status" | "message" | "deliverable";
  timestamp: string;
  title: string;
  description?: string;
  icon: React.ElementType;
  color: string;
  actor?: string;
  isCurrentUser?: boolean;
}

interface Props {
  caseData: any;
  messages: any[];
  deliverables: any[];
  auditEvents: any[];
  currentUserId?: string;
}

const STATUS_META: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  CASE_SUBMITTED:   { label: "Case submitted",        icon: Send,          color: "text-accent" },
  CASE_APPROVED:    { label: "Case approved",          icon: CheckCircle2,  color: "text-success" },
  CASE_REJECTED:    { label: "Case rejected",          icon: XCircle,       color: "text-destructive" },
  CASE_WORK_STARTED:{ label: "Work started",           icon: Play,          color: "text-primary" },
  CASE_COMPLETED:   { label: "Case completed",         icon: FileText,      color: "text-success" },
  CASE_AWAITING:    { label: "Awaiting client input",  icon: Clock,         color: "text-warning" },
};

export default function CaseActivityTimeline({
  caseData,
  messages,
  deliverables,
  auditEvents,
  currentUserId,
}: Props) {
  const events = useMemo<TimelineEvent[]>(() => {
    const items: TimelineEvent[] = [];

    // Case created event
    items.push({
      id: `created-${caseData.id}`,
      type: "status",
      timestamp: caseData.created_at,
      title: "Case commissioned",
      description: `${caseData.product_type} · ${caseData.priority} priority`,
      icon: Package,
      color: "text-accent",
    });

    // Audit events → status changes
    auditEvents.forEach((ae) => {
      const meta = STATUS_META[ae.action_type];
      if (!meta) return;
      const entityName = ae.metadata?.entity_name;
      const comment = ae.metadata?.comment;
      items.push({
        id: ae.id,
        type: "status",
        timestamp: ae.created_at,
        title: meta.label,
        description: comment || (entityName ? `Entity: ${entityName}` : undefined),
        icon: meta.icon,
        color: meta.color,
      });
    });

    // Messages
    messages.forEach((m) => {
      const isMe = m.sender_user_id === currentUserId;
      items.push({
        id: m.id,
        type: "message",
        timestamp: m.created_at,
        title: isMe ? "You sent a message" : "Analyst sent a message",
        description: m.message,
        icon: MessageSquare,
        color: isMe ? "text-accent" : "text-muted-foreground",
        isCurrentUser: isMe,
      });
    });

    // Deliverables
    deliverables.forEach((d) => {
      items.push({
        id: d.id,
        type: "deliverable",
        timestamp: d.created_at,
        title: "Deliverable uploaded",
        description: `${d.title} · v${d.version}`,
        icon: FileText,
        color: "text-success",
      });
    });

    // Sort chronologically
    items.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    return items;
  }, [caseData, messages, deliverables, auditEvents, currentUserId]);

  if (events.length === 0) {
    return <p className="text-sm text-muted-foreground">No activity recorded yet.</p>;
  }

  return (
    <div className="relative">
      {/* Vertical line */}
      <div className="absolute left-[15px] top-2 bottom-2 w-px bg-border" />

      <div className="space-y-0">
        {events.map((event, idx) => {
          const Icon = event.icon;
          const isLast = idx === events.length - 1;
          return (
            <div key={event.id} className="relative flex gap-3 pb-5 last:pb-0">
              {/* Dot */}
              <div className={`relative z-10 flex items-center justify-center w-[31px] h-[31px] rounded-full border-2 shrink-0 ${
                isLast
                  ? "border-primary bg-primary/10"
                  : "border-border bg-card"
              }`}>
                <Icon size={13} className={event.color} />
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0 pt-0.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-medium text-foreground">{event.title}</span>
                  <Badge
                    variant="outline"
                    className={`text-[9px] px-1.5 py-0 h-4 font-normal capitalize ${
                      event.type === "status"
                        ? "border-accent/30 text-accent"
                        : event.type === "deliverable"
                        ? "border-success/30 text-success"
                        : "border-border text-muted-foreground"
                    }`}
                  >
                    {event.type}
                  </Badge>
                </div>
                {event.description && (
                  <p className={`text-xs mt-0.5 leading-relaxed ${
                    event.type === "message"
                      ? "text-foreground/80 bg-muted/40 rounded-md px-2.5 py-1.5 mt-1.5 border border-border/50"
                      : "text-muted-foreground"
                  }`}>
                    {event.description}
                  </p>
                )}
                <span className="text-[10px] text-muted-foreground/60 mt-1 block">
                  {new Date(event.timestamp).toLocaleDateString("en-GB", {
                    day: "numeric", month: "short", year: "numeric",
                  })}{" "}
                  at{" "}
                  {new Date(event.timestamp).toLocaleTimeString("en-GB", {
                    hour: "2-digit", minute: "2-digit",
                  })}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
