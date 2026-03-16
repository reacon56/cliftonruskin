import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ExternalLink, Loader2, Newspaper, Eye, EyeOff, RefreshCw, AlertTriangle, Ban, ChevronDown, ChevronRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { countryCodeToFlag } from "@/lib/country-flag";

interface RssItem {
  title: string;
  link: string;
  pubDate: string;
  source: string;
}

interface MarketLesson {
  id: string;
  title: string;
  category: string;
  publication_name: string;
  publication_url: string;
  publication_date: string | null;
  summary_text: string | null;
  governance_reflection: string | null;
  jurisdiction_country_code: string | null;
  published: boolean;
  created_at: string;
  relevance_score: string | null;
  relevance_reasoning: string | null;
}

type RelevanceLevel = "high" | "moderate" | "low" | "not_relevant";

const RELEVANCE_CONFIG: Record<RelevanceLevel, { label: string; className: string }> = {
  high: { label: "HIGH RELEVANCE", className: "bg-destructive/15 text-destructive border-destructive/30" },
  moderate: { label: "MODERATE RELEVANCE", className: "bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-700" },
  low: { label: "LOW RELEVANCE", className: "text-muted-foreground border-muted-foreground/30 bg-muted/50" },
  not_relevant: { label: "NOT RELEVANT", className: "text-muted-foreground/60 border-muted-foreground/20 bg-muted/30 line-through" },
};

function RelevanceBadge({ score }: { score: string | null }) {
  if (!score || !(score in RELEVANCE_CONFIG)) return null;
  const cfg = RELEVANCE_CONFIG[score as RelevanceLevel];
  return <Badge variant="outline" className={`text-[10px] ${cfg.className}`}>{cfg.label}</Badge>;
}

export default function MarketLessonsAdmin() {
  const { canQuote, canClose, user, profile } = useAuth();
  const canPublish = canQuote || canClose;
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [rssItems, setRssItems] = useState<RssItem[]>([]);
  const [fetching, setFetching] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [generating, setGenerating] = useState<Set<string>>(new Set());
  const [expandedDraft, setExpandedDraft] = useState<string | null>(null);
  const [suppressDialog, setSuppressDialog] = useState<{ id: string; title: string } | null>(null);
  const [suppressOrgId, setSuppressOrgId] = useState("");
  const [relevanceOrgId, setRelevanceOrgId] = useState("");

  const { data: lessons = [], isLoading } = useQuery({
    queryKey: ["market-lessons"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("market_lessons" as any)
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as unknown as MarketLesson[];
    },
  });

  const { data: orgs = [] } = useQuery({
    queryKey: ["orgs-for-suppression"],
    queryFn: async () => {
      const { data } = await supabase.from("organisations").select("id, name").order("name");
      return data ?? [];
    },
  });

  const handleFetchRss = async () => {
    setFetching(true);
    setRssItems([]);
    setSelected(new Set());
    try {
      const { data, error } = await supabase.functions.invoke("fetch-governance-rss");
      if (error) throw error;
      const items = (data?.items || []) as RssItem[];
      const existingUrls = new Set(lessons.map((l) => l.publication_url));
      const fresh = items.filter((i) => !existingUrls.has(i.link));
      setRssItems(fresh);
      if (fresh.length === 0) {
        toast({ title: "No new articles", description: "All matching articles have already been imported." });
      }
    } catch (e: any) {
      toast({ title: "Fetch failed", description: e.message, variant: "destructive" });
    } finally {
      setFetching(false);
    }
  };

  const createDraft = async (item: RssItem) => {
    setGenerating((prev) => new Set(prev).add(item.link));
    try {
      const { data: aiData, error: aiError } = await supabase.functions.invoke(
        "generate-governance-summary",
        { body: { title: item.title, source: item.source, link: item.link } }
      );
      if (aiError) throw aiError;

      const pubDate = item.pubDate ? new Date(item.pubDate).toISOString().split("T")[0] : null;

      const { error: insertError } = await supabase.from("market_lessons" as any).insert({
        title: item.title,
        category: aiData.category || "",
        publication_name: item.source,
        publication_url: item.link,
        publication_date: pubDate,
        summary_text: aiData.summary || null,
        governance_reflection: aiData.reflection || null,
        jurisdiction_country_code: aiData.country || null,
        published: false,
        created_by: user?.id,
        relevance_score: aiData.relevance_score || null,
        relevance_reasoning: aiData.relevance_reasoning || null,
      } as any);

      if (insertError) throw insertError;

      toast({ title: "Draft created", description: item.title });
      queryClient.invalidateQueries({ queryKey: ["market-lessons"] });
      setRssItems((prev) => prev.filter((i) => i.link !== item.link));
    } catch (e: any) {
      toast({ title: "Draft creation failed", description: e.message, variant: "destructive" });
    } finally {
      setGenerating((prev) => {
        const next = new Set(prev);
        next.delete(item.link);
        return next;
      });
    }
  };

  const handleCreateSelected = async () => {
    const items = rssItems.filter((i) => selected.has(i.link));
    for (const item of items) {
      await createDraft(item);
    }
    setSelected(new Set());
  };

  const togglePublish = useMutation({
    mutationFn: async ({ id, published }: { id: string; published: boolean }) => {
      const { error } = await supabase
        .from("market_lessons" as any)
        .update({ published, updated_at: new Date().toISOString() } as any)
        .eq("id", id);
      if (error) throw error;

      await supabase.from("audit_events").insert({
        action_type: published ? "market_lesson_published" : "market_lesson_unpublished",
        object_type: "market_lesson",
        object_id: id,
        user_id: user?.id,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["market-lessons"] });
      toast({ title: "Status updated" });
    },
    onError: (e: any) => {
      toast({ title: "Update failed", description: e.message, variant: "destructive" });
    },
  });

  const handleSuppress = async () => {
    if (!suppressDialog || !suppressOrgId) return;
    const { error } = await supabase.from("market_lesson_suppressions" as any).insert({
      market_lesson_id: suppressDialog.id,
      org_id: suppressOrgId,
      suppressed_by: user?.id ?? "",
    } as any);
    if (error) {
      toast({ title: "Suppression failed", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Suppressed", description: `Item suppressed for selected organisation.` });
    }
    setSuppressDialog(null);
    setSuppressOrgId("");
  };

  const toggleSelect = (link: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(link)) next.delete(link);
      else next.add(link);
      return next;
    });
  };

  const renderPublishButton = (lesson: MarketLesson) => {
    if (!canPublish) return null;
    const score = lesson.relevance_score as RelevanceLevel | null;

    if (score === "not_relevant") {
      return (
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSuppressDialog({ id: lesson.id, title: lesson.title })}
            className="text-xs gap-1 text-muted-foreground"
          >
            <Ban className="h-3 w-3" /> Suppress
          </Button>
        </div>
      );
    }

    const isLow = score === "low";
    const isHigh = score === "high";

    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={isHigh ? "default" : "outline"}
              size="sm"
              onClick={() => togglePublish.mutate({ id: lesson.id, published: true })}
              className={`text-xs gap-1 ${isHigh ? "bg-amber-600 hover:bg-amber-700 text-white border-amber-700" : ""} ${isLow ? "opacity-60" : ""}`}
            >
              <Eye className="h-3 w-3" /> Approve & Publish
            </Button>
          </TooltipTrigger>
          {isLow && (
            <TooltipContent>
              <p className="text-xs max-w-52">Low relevance to current programme — publish only if you consider it material</p>
            </TooltipContent>
          )}
        </Tooltip>
      </TooltipProvider>
    );
  };

  const drafts = lessons.filter((l) => !l.published);
  const published = lessons.filter((l) => l.published);

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-semibold text-foreground">Regulatory Intelligence</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Curate governance observations from public sources. All entries are draft until explicitly published.
          </p>
        </div>
        <Button onClick={handleFetchRss} disabled={fetching} className="gap-2">
          {fetching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Newspaper className="h-4 w-4" />}
          Fetch Recent Public Governance Reporting
        </Button>
      </div>

      {/* RSS Results */}
      {rssItems.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">New Articles Found</CardTitle>
              <Button
                size="sm"
                onClick={handleCreateSelected}
                disabled={selected.size === 0 || generating.size > 0}
                className="gap-2"
              >
                {generating.size > 0 && <Loader2 className="h-3 w-3 animate-spin" />}
                Create {selected.size} Draft{selected.size !== 1 ? "s" : ""}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10"></TableHead>
                  <TableHead>Headline</TableHead>
                  <TableHead className="w-40">Source</TableHead>
                  <TableHead className="w-28">Date</TableHead>
                  <TableHead className="w-20">Link</TableHead>
                  <TableHead className="w-28"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rssItems.map((item) => (
                  <TableRow key={item.link}>
                    <TableCell>
                      <Checkbox
                        checked={selected.has(item.link)}
                        onCheckedChange={() => toggleSelect(item.link)}
                      />
                    </TableCell>
                    <TableCell className="font-medium text-sm max-w-md truncate">{item.title}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{item.source}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {item.pubDate ? new Date(item.pubDate).toLocaleDateString("en-GB") : "—"}
                    </TableCell>
                    <TableCell>
                      <a href={item.link} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground" />
                      </a>
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => createDraft(item)}
                        disabled={generating.has(item.link)}
                        className="text-xs gap-1"
                      >
                        {generating.has(item.link) ? <Loader2 className="h-3 w-3 animate-spin" /> : "Create draft"}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Drafts */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <EyeOff className="h-4 w-4 text-muted-foreground" />
            Drafts ({drafts.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : drafts.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 px-6">No draft entries.</p>
          ) : (
            <div className="divide-y divide-border">
              {drafts.map((l) => (
                <div key={l.id}>
                  <div
                    className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-muted/30 transition-colors"
                    onClick={() => setExpandedDraft(expandedDraft === l.id ? null : l.id)}
                  >
                    {expandedDraft === l.id ? (
                      <ChevronDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    ) : (
                      <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium truncate">{l.title}</span>
                        {l.jurisdiction_country_code && (
                          <span className="text-sm">{countryCodeToFlag(l.jurisdiction_country_code)}</span>
                        )}
                        <RelevanceBadge score={l.relevance_score} />
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <Badge variant="outline" className="text-[10px]">{l.category}</Badge>
                        <span className="text-[11px] text-muted-foreground">{l.publication_name}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
                      <Badge variant="secondary" className="text-xs">Draft</Badge>
                      {renderPublishButton(l)}
                    </div>
                  </div>

                  {/* Expanded detail panel */}
                  {expandedDraft === l.id && (
                    <div className="px-6 pb-4 space-y-4 bg-muted/10 border-t border-border">
                      {/* Relevance Score Panel */}
                      {l.relevance_score && (
                        <div className="rounded-md border border-border p-3 space-y-2 mt-3">
                          <div className="flex items-center gap-2">
                            <AlertTriangle className="h-3.5 w-3.5 text-muted-foreground" />
                            <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Programme Relevance</span>
                          </div>
                          <RelevanceBadge score={l.relevance_score} />
                          {l.relevance_reasoning && (
                            <div className="space-y-1 mt-1">
                              {l.relevance_reasoning.split("\n").filter(Boolean).map((line, i) => (
                                <p key={i} className="text-xs text-muted-foreground leading-relaxed">{line}</p>
                              ))}
                            </div>
                          )}
                        </div>
                      )}

                      {/* CR Analysis */}
                      {l.governance_reflection && (
                        <div className="space-y-1">
                          <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">CR Analysis</span>
                          <p className="text-xs text-foreground/80 leading-relaxed whitespace-pre-wrap">{l.governance_reflection}</p>
                        </div>
                      )}
                      {l.summary_text && (
                        <div className="space-y-1">
                          <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Summary</span>
                          <p className="text-xs text-foreground/80 leading-relaxed">{l.summary_text}</p>
                        </div>
                      )}

                      {/* Suppress option for not_relevant */}
                      {l.relevance_score === "not_relevant" && canPublish && (
                        <div className="flex items-center gap-2 pt-2 border-t border-border">
                          <span className="text-xs text-muted-foreground">Not relevant to this programme —</span>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-xs h-7"
                            onClick={() => setSuppressDialog({ id: l.id, title: l.title })}
                          >
                            Suppress for an organisation
                          </Button>
                        </div>
                      )}

                      <div className="flex items-center gap-2 pt-1">
                        <a
                          href={l.publication_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-primary hover:underline inline-flex items-center gap-1"
                        >
                          View source <ExternalLink className="h-3 w-3" />
                        </a>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Published */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Eye className="h-4 w-4 text-muted-foreground" />
            Published ({published.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {published.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 px-6">No published entries.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead className="w-28">Relevance</TableHead>
                  <TableHead className="w-36">Category</TableHead>
                  <TableHead className="w-36">Source</TableHead>
                  <TableHead className="w-10"></TableHead>
                  <TableHead className="w-28">Status</TableHead>
                  <TableHead className="w-28"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {published.map((l) => (
                  <TableRow key={l.id}>
                    <TableCell className="font-medium text-sm">
                      <a href={l.publication_url} target="_blank" rel="noopener noreferrer"
                        className="hover:underline inline-flex items-center gap-1">
                        {l.title}
                        <ExternalLink className="h-3 w-3 text-muted-foreground" />
                      </a>
                    </TableCell>
                    <TableCell><RelevanceBadge score={l.relevance_score} /></TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">{l.category}</Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">{l.publication_name}</TableCell>
                    <TableCell>
                      {l.jurisdiction_country_code && (
                        <span className="text-sm">{countryCodeToFlag(l.jurisdiction_country_code)}</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge className="text-xs bg-emerald-100 text-emerald-800 border-emerald-200">Published</Badge>
                    </TableCell>
                    <TableCell>
                      {canPublish && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => togglePublish.mutate({ id: l.id, published: false })}
                          className="text-xs gap-1 text-muted-foreground"
                        >
                          <EyeOff className="h-3 w-3" /> Unpublish
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Suppress Dialog */}
      <Dialog open={!!suppressDialog} onOpenChange={() => { setSuppressDialog(null); setSuppressOrgId(""); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Suppress for Organisation</DialogTitle>
            <DialogDescription>
              This will hide "{suppressDialog?.title}" from the selected organisation's Regulatory Briefings feed. Other organisations will still see it if published.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <label className="text-sm font-medium">Select Organisation</label>
            <Select value={suppressOrgId} onValueChange={setSuppressOrgId}>
              <SelectTrigger>
                <SelectValue placeholder="Choose organisation…" />
              </SelectTrigger>
              <SelectContent>
                {orgs.map((o: any) => (
                  <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setSuppressDialog(null); setSuppressOrgId(""); }}>Cancel</Button>
            <Button onClick={handleSuppress} disabled={!suppressOrgId}>Suppress</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
