import { useState, useEffect } from "react";
import { X, Info, ThumbsUp, ThumbsDown, BookOpen } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

export interface KnowledgeSection {
  title: string;
  content?: string;
  type?: "text" | "quote" | "keyvalue";
  /** For keyvalue type */
  pairs?: { key: string; value: string }[];
}

/* ------------------------------------------------------------------ */
/*  Internal Regulatory Reference dictionary                          */
/* ------------------------------------------------------------------ */
interface RegReference {
  name: string;
  summary: string;
}

const REG_REFERENCES: Record<string, RegReference> = {
  "DUAA 2025 Article 22": {
    name: "Data (Use and Access) Act 2025 — Article 22",
    summary:
      "Article 22 regulates automated decision-making that produces legal or similarly significant effects on data subjects. In a due diligence context, it requires that any AI-assisted finding is subject to documented human review before the decision is recorded in the case file.",
  },
  "DUAA 2025 Art 6(1)(ea)": {
    name: "Data (Use and Access) Act 2025 — Article 6(1)(ea)",
    summary:
      "Introduces Recognised Legitimate Interests as a seventh lawful basis under UK GDPR. Crime prevention and safeguarding qualify without requiring a balancing test, simplifying the lawful basis assessment for regulatory intelligence gathering in due diligence programmes.",
  },
  "UK GDPR Article 22": {
    name: "UK General Data Protection Regulation — Article 22",
    summary:
      "Provides data subjects with rights relating to automated individual decision-making, including profiling. In due diligence, it requires meaningful human intervention before automated outputs are treated as final findings.",
  },
  "UK GDPR Article 6": {
    name: "UK General Data Protection Regulation — Article 6",
    summary:
      "Sets out the six (now seven under DUAA 2025) lawful bases for processing personal data. Every due diligence case must identify and document the applicable lawful basis before processing begins.",
  },
  "ICO Automated Decision-Making": {
    name: "ICO Guidance on Automated Decision-Making and Profiling",
    summary:
      "The ICO's practical guidance on implementing safeguards for automated decisions, including requirements for human review, transparency, and the right to contest automated outcomes in regulated processing activities.",
  },
  "ICO Lawful Basis Guidance": {
    name: "ICO Guidance on Lawful Basis for Processing",
    summary:
      "The ICO's detailed guidance on selecting and documenting the correct lawful basis under UK GDPR. In due diligence, the most commonly applicable bases are legitimate interests, legal obligation, and recognised legitimate interests.",
  },
  "MLR 2017 Regulation 33": {
    name: "Money Laundering Regulations 2017 — Regulation 33",
    summary:
      "Regulation 33 requires relevant persons to apply enhanced due diligence measures in situations presenting a higher risk of money laundering or terrorist financing, including when dealing with high-risk third countries identified by FATF or the EU.",
  },
  "MLR 2017 Regulation 40": {
    name: "Money Laundering Regulations 2017 — Regulation 40",
    summary:
      "Sets out data retention requirements for regulated firms. Customer due diligence records must be retained for five years from the end of the business relationship, after which they must be deleted unless another lawful basis applies.",
  },
  "FCA Financial Crime Guide": {
    name: "FCA Financial Crime Guide",
    summary:
      "The FCA's consolidated guidance on financial crime systems and controls. It sets expectations for proportionate risk assessment, customer due diligence, and ongoing monitoring, and is a primary reference for FCA-regulated firms designing their compliance programmes.",
  },
  "HMRC AML Supervision Guidance": {
    name: "HMRC Anti-Money Laundering Supervision Guidance",
    summary:
      "HMRC's guidance for businesses supervised under the Money Laundering Regulations. It covers risk assessment expectations, due diligence proportionality, and record-keeping requirements relevant to trust and company service providers.",
  },
  "CR Tier Policy": {
    name: "CR Internal Tier Policy",
    summary:
      "The internal Clifton Ruskin policy that maps entity risk factors to due diligence tiers (A, B, C). It determines the review pathway, cadence, approval level, and reporting obligations applicable to each tier classification.",
  },
  "CR PIP Spec": {
    name: "CR Programme Intelligence Profile Specification",
    summary:
      "The internal specification for generating Programme Intelligence Profiles from entity registers. The PIP captures sector exposure, geographic exposure, and risk profile to enable AI-driven relevance scoring for regulatory intelligence.",
  },
  "Regulatory Intelligence Agent Spec": {
    name: "CR Regulatory Intelligence Agent Specification",
    summary:
      "The internal specification for the AI agent that scores incoming regulatory intelligence against client Programme Intelligence Profiles, generating relevance assessments and programme-specific editorial analysis.",
  },
  "FATF Grey List": {
    name: "FATF List of Jurisdictions Under Increased Monitoring",
    summary:
      "Jurisdictions identified by the Financial Action Task Force as having strategic deficiencies in their AML/CFT frameworks. Engagement with entities in these jurisdictions is not prohibited but requires documented enhanced due diligence measures.",
  },
  "FATF Black List": {
    name: "FATF List of High-Risk Jurisdictions Subject to a Call for Action",
    summary:
      "Jurisdictions with such significant strategic deficiencies that FATF calls on all members to apply countermeasures. UK regulators treat these as requiring the highest level of enhanced due diligence, typically with senior management sign-off.",
  },
  "CR-JURIS-1.0 Spec": {
    name: "CR-JURIS-1.0 Jurisdiction Risk Engine Specification",
    summary:
      "The internal specification for the CR jurisdiction risk scoring engine. It combines FATF status, CPI score, sanctions exposure, and EU HRTC designation into a composite risk score with defined thresholds for risk band classification.",
  },
};

/** Attempt to find a reference by exact match or fuzzy match on value text */
function findReference(value: string): RegReference | null {
  // Direct match
  if (REG_REFERENCES[value]) return REG_REFERENCES[value];
  // Try matching within pipe-separated values
  return null;
}

/** Parse a value string that may contain pipe-separated references */
function parseReferenceValues(value: string): string[] {
  return value.split("|").map((v) => v.trim()).filter(Boolean);
}

/* ------------------------------------------------------------------ */
/*  Regulatory Reference Modal                                        */
/* ------------------------------------------------------------------ */
function RegulatoryReferenceModal({
  open,
  onClose,
  reference,
  label,
}: {
  open: boolean;
  onClose: () => void;
  reference: RegReference | null;
  label: string;
}) {
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display text-base flex items-center gap-2">
            <BookOpen size={16} className="text-accent" />
            Regulatory Reference
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">
              Regulation
            </p>
            <p className="text-sm font-semibold text-foreground">
              {reference?.name ?? label}
            </p>
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">
              Summary
            </p>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {reference?.summary ?? "Reference details are being added to the CR Regulatory Reference Library."}
            </p>
          </div>
          <p className="text-[11px] text-muted-foreground/70 italic">
            Full text available in CR Regulatory Reference Library
          </p>
        </div>
        <DialogFooter>
          <Button variant="outline" size="sm" disabled className="gap-1.5 text-xs">
            <BookOpen size={12} />
            Open in Reference Library
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ------------------------------------------------------------------ */
/*  Quick Reference value renderer                                    */
/* ------------------------------------------------------------------ */
function QuickReferenceValue({ value }: { value: string }) {
  const [activeRef, setActiveRef] = useState<{ label: string; ref: RegReference | null } | null>(null);
  const parts = parseReferenceValues(value);

  if (parts.length <= 1) {
    const ref = findReference(value);
    return (
      <>
        <button
          onClick={() => setActiveRef({ label: value, ref })}
          className="text-foreground underline decoration-muted-foreground/40 underline-offset-2 hover:decoration-accent hover:text-accent transition-colors text-left"
        >
          {value}
        </button>
        {activeRef && (
          <RegulatoryReferenceModal
            open
            onClose={() => setActiveRef(null)}
            reference={activeRef.ref}
            label={activeRef.label}
          />
        )}
      </>
    );
  }

  return (
    <>
      <span className="flex flex-wrap gap-x-1 gap-y-0.5">
        {parts.map((part, i) => {
          const ref = findReference(part);
          return (
            <span key={i}>
              <button
                onClick={() => setActiveRef({ label: part, ref })}
                className="text-foreground underline decoration-muted-foreground/40 underline-offset-2 hover:decoration-accent hover:text-accent transition-colors text-left"
              >
                {part}
              </button>
              {i < parts.length - 1 && <span className="text-muted-foreground mx-0.5">·</span>}
            </span>
          );
        })}
      </span>
      {activeRef && (
        <RegulatoryReferenceModal
          open
          onClose={() => setActiveRef(null)}
          reference={activeRef.ref}
          label={activeRef.label}
        />
      )}
    </>
  );
}

/* ------------------------------------------------------------------ */
/*  Shared section renderer                                           */
/* ------------------------------------------------------------------ */
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

function isQuickReferenceSection(title: string) {
  return title.toLowerCase().includes("quick reference");
}

function SectionRenderer({ section }: { section: KnowledgeSection }) {
  if (section.type === "quote") {
    return (
      <RenderContent
        content={section.content}
        className="border-l-2 border-accent/50 pl-3 text-[12px] text-muted-foreground leading-relaxed italic"
      />
    );
  }

  if (section.type === "keyvalue" && section.pairs) {
    const isQR = isQuickReferenceSection(section.title);
    return (
      <div className="space-y-1.5">
        {section.pairs.map((p, j) => (
          <div key={j} className="flex gap-2 text-[12px]">
            <span className="text-muted-foreground font-medium shrink-0">{p.key}:</span>
            {isQR ? (
              <QuickReferenceValue value={p.value} />
            ) : (
              <span className="text-foreground">{p.value}</span>
            )}
          </div>
        ))}
      </div>
    );
  }

  if (section.title === "Disclaimer") {
    return (
      <RenderContent
        content={section.content}
        className="text-[11px] text-muted-foreground/70 leading-relaxed"
      />
    );
  }

  return (
    <RenderContent
      content={section.content}
      className="text-[12px] text-muted-foreground leading-relaxed"
    />
  );
}

/* ------------------------------------------------------------------ */
/*  Public API                                                        */
/* ------------------------------------------------------------------ */
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
  const [hasVisited] = useState(
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
      {open && (
        <>
          <div
            className="fixed inset-0 z-40 bg-background/20"
            onClick={() => setOpen(false)}
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
                onClick={() => setOpen(false)}
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
                    <SectionRenderer section={section} />
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
                  <span className="text-[11px] text-muted-foreground">Was this helpful?</span>
                  <Button variant="ghost" size="sm" className="h-7 px-2 text-xs gap-1" onClick={() => setFeedback("yes")}>
                    <ThumbsUp size={12} /> Yes
                  </Button>
                  <Button variant="ghost" size="sm" className="h-7 px-2 text-xs gap-1" onClick={() => setFeedback("no")}>
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
                <SectionRenderer section={section} />
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
              <span className="text-[11px] text-muted-foreground">Was this helpful?</span>
              <Button variant="ghost" size="sm" className="h-7 px-2 text-xs gap-1" onClick={() => setFeedback("yes")}>
                <ThumbsUp size={12} /> Yes
              </Button>
              <Button variant="ghost" size="sm" className="h-7 px-2 text-xs gap-1" onClick={() => setFeedback("no")}>
                <ThumbsDown size={12} /> No
              </Button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
