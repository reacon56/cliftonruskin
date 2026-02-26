import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Approved open-access RSS feeds only
const RSS_FEEDS = [
  { name: "Reuters Business", url: "https://feeds.reuters.com/reuters/businessNews" },
  { name: "BBC Business", url: "https://feeds.bbci.co.uk/news/business/rss.xml" },
  { name: "FCA Press Releases", url: "https://www.fca.org.uk/news/rss.xml" },
  { name: "SEC Enforcement", url: "https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&type=LIT&dateb=&owner=include&count=40&search_text=&action=getcompany&output=atom" },
  { name: "DOJ Press Releases", url: "https://www.justice.gov/feeds/opa/justice-news.xml" },
  { name: "UK Government", url: "https://www.gov.uk/search/news-and-communications.atom" },
  { name: "Companies House", url: "https://www.gov.uk/government/organisations/companies-house.atom" },
];

const GOVERNANCE_KEYWORDS = [
  "sanctions",
  "regulatory fine",
  "enforcement",
  "ownership transparency",
  "procurement",
  "bribery",
  "corruption",
  "counterparty",
  "compliance failure",
  "money laundering",
  "fraud",
  "beneficial ownership",
  "deferred prosecution",
  "asset freeze",
];

interface FeedItem {
  title: string;
  link: string;
  pubDate: string;
  source: string;
}

function extractItems(xml: string, sourceName: string): FeedItem[] {
  const items: FeedItem[] = [];

  // Try RSS <item> elements
  const itemRegex = /<item[^>]*>([\s\S]*?)<\/item>/gi;
  let match;
  while ((match = itemRegex.exec(xml)) !== null) {
    const block = match[1];
    const title = block.match(/<title[^>]*>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?<\/title>/i)?.[1]?.trim() || "";
    const link = block.match(/<link[^>]*>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?<\/link>/i)?.[1]?.trim() || "";
    const pubDate = block.match(/<pubDate[^>]*>(.*?)<\/pubDate>/i)?.[1]?.trim() || "";
    if (title) items.push({ title, link, pubDate, source: sourceName });
  }

  // Try Atom <entry> elements
  const entryRegex = /<entry[^>]*>([\s\S]*?)<\/entry>/gi;
  while ((match = entryRegex.exec(xml)) !== null) {
    const block = match[1];
    const title = block.match(/<title[^>]*>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?<\/title>/i)?.[1]?.trim() || "";
    const link = block.match(/<link[^>]*href="([^"]*)"[^>]*\/?>/i)?.[1]?.trim() || "";
    const updated = block.match(/<updated[^>]*>(.*?)<\/updated>/i)?.[1]?.trim() ||
                    block.match(/<published[^>]*>(.*?)<\/published>/i)?.[1]?.trim() || "";
    if (title) items.push({ title, link, pubDate: updated, source: sourceName });
  }

  return items;
}

function matchesGovernanceKeywords(title: string): boolean {
  const lower = title.toLowerCase();
  return GOVERNANCE_KEYWORDS.some((kw) => lower.includes(kw));
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const allItems: FeedItem[] = [];

    // Fetch all feeds concurrently
    const results = await Promise.allSettled(
      RSS_FEEDS.map(async (feed) => {
        try {
          const resp = await fetch(feed.url, {
            headers: { "User-Agent": "CliftonRuskin-GovernanceMonitor/1.0" },
            signal: AbortSignal.timeout(8000),
          });
          if (!resp.ok) return [];
          const xml = await resp.text();
          return extractItems(xml, feed.name);
        } catch {
          console.warn(`Failed to fetch ${feed.name}: skipping`);
          return [];
        }
      })
    );

    for (const r of results) {
      if (r.status === "fulfilled") allItems.push(...r.value);
    }

    // Filter by governance keywords
    const filtered = allItems.filter((item) => matchesGovernanceKeywords(item.title));

    // Deduplicate by link
    const seen = new Set<string>();
    const unique = filtered.filter((item) => {
      if (seen.has(item.link)) return false;
      seen.add(item.link);
      return true;
    });

    // Sort by date descending, limit to 30
    unique.sort((a, b) => {
      const da = new Date(a.pubDate).getTime() || 0;
      const db = new Date(b.pubDate).getTime() || 0;
      return db - da;
    });

    return new Response(JSON.stringify({ items: unique.slice(0, 30) }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("fetch-governance-rss error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
