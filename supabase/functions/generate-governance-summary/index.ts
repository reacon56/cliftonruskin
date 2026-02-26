import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const CATEGORY_KEYWORDS: Record<string, string[]> = {
  "Regulatory Enforcement": ["fine", "enforcement", "penalty", "regulatory", "compliance failure"],
  "Sanctions & Exposure": ["sanctions", "asset freeze", "ofac", "designated", "ofsi"],
  "Ownership & Control": ["ownership transparency", "beneficial ownership", "shell company", "nominee"],
  "Corporate Governance": ["bribery", "corruption", "deferred prosecution", "fraud", "governance"],
  "Supply Chain Integrity": ["procurement", "counterparty", "supply chain", "third party"],
};

function suggestCategory(title: string): string {
  const lower = title.toLowerCase();
  for (const [cat, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    if (keywords.some((kw) => lower.includes(kw))) return cat;
  }
  return "Regulatory Enforcement";
}

// Simple country detection from title
function detectCountry(title: string): string | null {
  const lower = title.toLowerCase();
  const map: Record<string, string> = {
    "uk": "GB", "united kingdom": "GB", "britain": "GB", "fca": "GB", "sfo": "GB",
    "companies house": "GB", "ofsi": "GB",
    "us": "US", "united states": "US", "sec": "US", "doj": "US", "ofac": "US",
    "eu": "EU", "european": "EU",
    "germany": "DE", "france": "FR", "switzerland": "CH",
  };
  for (const [keyword, code] of Object.entries(map)) {
    if (lower.includes(keyword)) return code;
  }
  return null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { title, source, link } = await req.json();
    if (!title) throw new Error("title is required");

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const category = suggestCategory(title);
    const country = detectCountry(title);

    const systemPrompt = `You are a senior governance analyst at a discreet British institutional advisory firm.
Your task is to produce two pieces of text based on a headline from a public governance, regulatory or enforcement report.

Rules:
- Write original text. Do not copy or closely paraphrase the publisher's words.
- Use a restrained, neutral, institutional British advisory tone.
- Avoid sensational language, moral judgement, or emotive adjectives (never use "shocking", "disastrous", "catastrophic").
- Maintain measured phrasing throughout.

Output EXACTLY this JSON (no markdown, no wrapping):
{
  "summary": "<3-4 sentence neutral factual summary of the likely content, based on the headline and source>",
  "reflection": "<1-2 sentence board-level governance reflection, framed as a consideration>"
}`;

    const userPrompt = `Headline: "${title}"
Source: ${source}
URL: ${link}

Generate the summary and governance reflection.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited. Please try again shortly." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please top up." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const raw = data.choices?.[0]?.message?.content || "";

    // Parse JSON from response, stripping markdown fences if present
    let cleaned = raw.trim();
    if (cleaned.startsWith("```")) {
      cleaned = cleaned.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "").trim();
    }

    let parsed: { summary: string; reflection: string };
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      // Fallback
      parsed = {
        summary: "A governance-related matter has been publicly reported. Further details are available via the source link.",
        reflection: "Boards may wish to consider the relevance of this development to their own oversight arrangements.",
      };
    }

    return new Response(
      JSON.stringify({
        summary: parsed.summary,
        reflection: parsed.reflection,
        category,
        country,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("generate-governance-summary error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
