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
import { ExternalLink, Loader2, Newspaper, Eye, EyeOff, RefreshCw } from "lucide-react";
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
}

export default function MarketLessonsAdmin() {
  const { canQuote, canClose, user } = useAuth(); // Ops Admin or Assurance Manager
  const canPublish = canQuote || canClose; // fvc_assurance_manager or fvc_ops_admin
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [rssItems, setRssItems] = useState<RssItem[]>([]);
  const [fetching, setFetching] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [generating, setGenerating] = useState<Set<string>>(new Set());

  // Fetch existing drafts and published lessons
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

  // Fetch RSS feeds
  const handleFetchRss = async () => {
    setFetching(true);
    setRssItems([]);
    setSelected(new Set());
    try {
      const { data, error } = await supabase.functions.invoke("fetch-governance-rss");
      if (error) throw error;
      const items = (data?.items || []) as RssItem[];
      // Filter out URLs already in lessons
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

  // Create draft for a single item
  const createDraft = async (item: RssItem) => {
    setGenerating((prev) => new Set(prev).add(item.link));
    try {
      // Generate AI summary
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

  // Create selected drafts
  const handleCreateSelected = async () => {
    const items = rssItems.filter((i) => selected.has(i.link));
    for (const item of items) {
      await createDraft(item);
    }
    setSelected(new Set());
  };

  // Toggle publish
  const togglePublish = useMutation({
    mutationFn: async ({ id, published }: { id: string; published: boolean }) => {
      const { error } = await supabase
        .from("market_lessons" as any)
        .update({ published, updated_at: new Date().toISOString() } as any)
        .eq("id", id);
      if (error) throw error;

      // Log to audit
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

  const toggleSelect = (link: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(link)) next.delete(link);
      else next.add(link);
      return next;
    });
  };

  const drafts = lessons.filter((l) => !l.published);
  const published = lessons.filter((l) => l.published);

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-semibold text-foreground">Market Lessons</h1>
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
                    <TableCell className="font-medium text-sm max-w-md truncate">
                      {item.title}
                    </TableCell>
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
                        {generating.has(item.link) ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          "Create draft"
                        )}
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
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead className="w-36">Category</TableHead>
                  <TableHead className="w-36">Source</TableHead>
                  <TableHead className="w-10"></TableHead>
                  <TableHead className="w-28">Status</TableHead>
                  <TableHead className="w-28"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {drafts.map((l) => (
                  <TableRow key={l.id}>
                    <TableCell className="font-medium text-sm">
                      <a href={l.publication_url} target="_blank" rel="noopener noreferrer"
                        className="hover:underline inline-flex items-center gap-1">
                        {l.title}
                        <ExternalLink className="h-3 w-3 text-muted-foreground" />
                      </a>
                    </TableCell>
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
                      <Badge variant="secondary" className="text-xs">Draft</Badge>
                    </TableCell>
                    <TableCell>
                      {canPublish && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => togglePublish.mutate({ id: l.id, published: true })}
                          className="text-xs gap-1"
                        >
                          <Eye className="h-3 w-3" /> Publish
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
    </div>
  );
}
