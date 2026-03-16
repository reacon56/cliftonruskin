import { useState, useEffect } from "react";
import { X, Info, ThumbsUp, ThumbsDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

export interface KnowledgeSection {
  title: string;
  content?: string;
  type?: "text" | "quote" | "keyvalue";
  /** For keyvalue type */
  pairs?: { key: string; value: string }[];
}

function RenderContent({ content, className }: { content?: string; className?: string }) {
  if (!content) return null;
  const paragraphs = content.split("\n\n");
  return (
    <div className={className}>
      {paragraphs.map((p, i) => (
        <p key={i} className={i > 0 ? "mt-2" : ""}>{p}</p>
      ))}
    </div>
  );
}

interface KnowledgePanelProps {
  pageId: string;
  title: string;
  sections: KnowledgeSection[];
}

function storageKey(pageId: string) {
  return `cr-knowledge-panel-${pageId}`;
}
function visitedKey(pageId: string) {
  return `cr-knowledge-visited-${pageId}`;
}

export function KnowledgePanelTrigger({
  pageId,
  onClick,
}: {
  pageId: string;
  onClick: () => void;
}) {
  const [hasVisited, setHasVisited] = useState(
    () => localStorage.getItem(visitedKey(pageId)) === "1"
  );

  return (
    <button
      onClick={onClick}
      className="inline-flex items-center gap-1.5 text-[12px] text-muted-foreground hover:text-accent transition-colors relative"
    >
      <Info size={13} />
      <span>About this feature</span>
      {!hasVisited && (
        <span className="absolute -top-0.5 -right-1.5 w-2 h-2 rounded-full bg-accent animate-pulse" />
      )}
    </button>
  );
}

export function KnowledgePanel({
  pageId,
  title,
  sections,
}: KnowledgePanelProps) {
  const [open, setOpen] = useState(
    () => localStorage.getItem(storageKey(pageId)) === "open"
  );
  const [feedback, setFeedback] = useState<"yes" | "no" | null>(null);

  useEffect(() => {
    localStorage.setItem(storageKey(pageId), open ? "open" : "closed");
    if (open) {
      localStorage.setItem(visitedKey(pageId), "1");
    }
  }, [open, pageId]);

  return (
    <>
      {/* Trigger is rendered separately via KnowledgePanelTrigger */}

      {/* Slide-over panel */}
      {open && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40 bg-background/20"
            onClick={() => setOpen(false)}
          />
          {/* Panel */}
          <div className="fixed top-0 right-0 z-50 h-full w-80 border-l border-border bg-card shadow-xl animate-in slide-in-from-right duration-300 flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <div className="flex items-center gap-2 min-w-0">
                <h3 className="text-sm font-semibold text-foreground truncate font-display">
                  {title}
                </h3>
                <Badge className="text-[9px] bg-accent/15 text-accent border-accent/30 shrink-0">
                  CR Knowledge
                </Badge>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="text-muted-foreground hover:text-foreground transition-colors p-1"
              >
                <X size={14} />
              </button>
            </div>

            {/* Body */}
            <ScrollArea className="flex-1 px-4 py-4">
              <div className="space-y-5">
                {sections.map((section, i) => (
                  <div key={i}>
                    <h4 className="text-[11px] font-bold uppercase tracking-wider text-foreground mb-2">
                      {section.title}
                    </h4>
                    {section.type === "quote" ? (
                      <RenderContent content={section.content} className="border-l-2 border-accent/50 pl-3 text-[12px] text-muted-foreground leading-relaxed italic" />
                    ) : section.type === "keyvalue" && section.pairs ? (
                      <div className="space-y-1.5">
                        {section.pairs.map((p, j) => (
                          <div key={j} className="flex gap-2 text-[12px]">
                            <span className="text-muted-foreground font-medium shrink-0">
                              {p.key}:
                            </span>
                            <span className="text-foreground">{p.value}</span>
                          </div>
                        ))}
                      </div>
                    ) : section.title === "Disclaimer" ? (
                      <RenderContent content={section.content} className="text-[11px] text-muted-foreground/70 leading-relaxed" />
                    ) : (
                      <RenderContent content={section.content} className="text-[12px] text-muted-foreground leading-relaxed" />
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>

            {/* Footer */}
            <div className="px-4 py-3 border-t border-border">
              {feedback ? (
                <p className="text-[11px] text-muted-foreground text-center">
                  Thanks for your feedback.
                </p>
              ) : (
                <div className="flex items-center justify-center gap-3">
                  <span className="text-[11px] text-muted-foreground">
                    Was this helpful?
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-xs gap-1"
                    onClick={() => setFeedback("yes")}
                  >
                    <ThumbsUp size={12} /> Yes
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-xs gap-1"
                    onClick={() => setFeedback("no")}
                  >
                    <ThumbsDown size={12} /> No
                  </Button>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </>
  );
}

/** Wrapper that combines trigger + panel */
export function KnowledgePanelWidget(props: KnowledgePanelProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <KnowledgePanelTrigger
        pageId={props.pageId}
        onClick={() => setOpen(true)}
      />
      {open && (
        <KnowledgePanelInline {...props} onClose={() => setOpen(false)} />
      )}
    </>
  );
}

function KnowledgePanelInline(
  props: KnowledgePanelProps & { onClose: () => void }
) {
  const { pageId, title, sections, onClose } = props;
  const [feedback, setFeedback] = useState<"yes" | "no" | null>(null);

  useEffect(() => {
    localStorage.setItem(visitedKey(pageId), "1");
  }, [pageId]);

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-background/20"
        onClick={onClose}
      />
      <div className="fixed top-0 right-0 z-50 h-full w-80 border-l border-border bg-card shadow-xl animate-in slide-in-from-right duration-300 flex flex-col">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <div className="flex items-center gap-2 min-w-0">
            <h3 className="text-sm font-semibold text-foreground truncate font-display">
              {title}
            </h3>
            <Badge className="text-[9px] bg-accent/15 text-accent border-accent/30 shrink-0">
              CR Knowledge
            </Badge>
          </div>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground transition-colors p-1"
          >
            <X size={14} />
          </button>
        </div>
        <ScrollArea className="flex-1 px-4 py-4">
          <div className="space-y-5">
            {sections.map((section, i) => (
              <div key={i}>
                <h4 className="text-[11px] font-bold uppercase tracking-wider text-foreground mb-2">
                  {section.title}
                </h4>
                {section.type === "quote" ? (
                  <RenderContent content={section.content} className="border-l-2 border-accent/50 pl-3 text-[12px] text-muted-foreground leading-relaxed italic" />
                ) : section.type === "keyvalue" && section.pairs ? (
                  <div className="space-y-1.5">
                    {section.pairs.map((p, j) => (
                      <div key={j} className="flex gap-2 text-[12px]">
                        <span className="text-muted-foreground font-medium shrink-0">
                          {p.key}:
                        </span>
                        <span className="text-foreground">{p.value}</span>
                      </div>
                    ))}
                  </div>
                ) : section.title === "Disclaimer" ? (
                  <RenderContent content={section.content} className="text-[11px] text-muted-foreground/70 leading-relaxed" />
                ) : (
                  <RenderContent content={section.content} className="text-[12px] text-muted-foreground leading-relaxed" />
                )}
              </div>
            ))}
          </div>
        </ScrollArea>
        <div className="px-4 py-3 border-t border-border">
          {feedback ? (
            <p className="text-[11px] text-muted-foreground text-center">
              Thanks for your feedback.
            </p>
          ) : (
            <div className="flex items-center justify-center gap-3">
              <span className="text-[11px] text-muted-foreground">
                Was this helpful?
              </span>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs gap-1"
                onClick={() => setFeedback("yes")}
              >
                <ThumbsUp size={12} /> Yes
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs gap-1"
                onClick={() => setFeedback("no")}
              >
                <ThumbsDown size={12} /> No
              </Button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
