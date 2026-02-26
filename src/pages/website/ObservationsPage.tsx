import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ExternalLink } from "lucide-react";
import { countryCodeToFlag } from "@/lib/country-flag";

/* ── decorative divider ── */
const GoldRule = ({ className = "" }: { className?: string }) => (
  <div className={`h-px w-16 bg-gradient-to-r from-[#c9a962] to-[#c9a962]/0 ${className}`} />
);

/* ── network-style SVG overlay for the hero ── */
const NetworkOverlay = () => (
  <svg
    className="absolute inset-0 h-full w-full opacity-[0.04]"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden
  >
    <defs>
      <pattern id="obs-net" x="0" y="0" width="120" height="120" patternUnits="userSpaceOnUse">
        <circle cx="60" cy="60" r="1.5" fill="#c9a962" />
        <circle cx="0" cy="0" r="1" fill="#c9a962" />
        <circle cx="120" cy="0" r="1" fill="#c9a962" />
        <circle cx="0" cy="120" r="1" fill="#c9a962" />
        <circle cx="120" cy="120" r="1" fill="#c9a962" />
        <line x1="0" y1="0" x2="60" y2="60" stroke="#c9a962" strokeWidth="0.4" />
        <line x1="120" y1="0" x2="60" y2="60" stroke="#c9a962" strokeWidth="0.4" />
        <line x1="0" y1="120" x2="60" y2="60" stroke="#c9a962" strokeWidth="0.4" />
        <line x1="120" y1="120" x2="60" y2="60" stroke="#c9a962" strokeWidth="0.4" />
      </pattern>
    </defs>
    <rect width="100%" height="100%" fill="url(#obs-net)" />
  </svg>
);

/* ── observation entries ── */
interface Observation {
  category: string;
  headline: string;
  sourceUrl: string;
  publication: string;
  date: string;
  summary: string;
  reflection: string;
  countryCode?: string;
}

const observations: Observation[] = [
  {
    category: "Ownership & Control",
    headline: "Sanctions evasion network used layered UK shell companies, NCA confirms",
    sourceUrl: "https://www.nationalcrimeagency.gov.uk",
    publication: "National Crime Agency",
    date: "November 2025",
    summary:
      "The NCA disclosed the dismantling of a network of UK-registered entities used to obscure beneficial ownership and facilitate payments to sanctioned parties. The structures involved nominee directors across multiple jurisdictions, with ultimate control traced to individuals subject to asset-freezing orders. Investigators noted that standard corporate registry filings were insufficient to identify the true controllers.",
    reflection:
      "Boards relying solely on Companies House filings for counterparty assurance may wish to consider supplementary verification measures.",
    countryCode: "GB",
  },
  {
    category: "Regulatory Enforcement",
    headline: "FCA fines wealth manager £7.6m for inadequate client due diligence",
    sourceUrl: "https://www.fca.org.uk/news",
    publication: "Financial Conduct Authority",
    date: "September 2025",
    summary:
      "The Financial Conduct Authority imposed a fine on a London-based wealth management firm for systemic failures in customer due diligence over a five-year period. The firm had accepted high-risk clients without adequate source-of-wealth verification and failed to file suspicious activity reports in a timely manner. The FCA noted that senior management had been aware of the deficiencies but had not allocated sufficient resource to remediation.",
    reflection:
      "The decision underscores the regulator's expectation that compliance resourcing decisions are themselves subject to board-level scrutiny.",
    countryCode: "GB",
  },
  {
    category: "Supply Chain Integrity",
    headline: "EU adopts Corporate Sustainability Due Diligence Directive with supply chain obligations",
    sourceUrl: "https://commission.europa.eu",
    publication: "European Commission",
    date: "July 2024",
    summary:
      "The European Union formally adopted the Corporate Sustainability Due Diligence Directive, imposing obligations on large undertakings to identify and mitigate adverse human rights and environmental impacts throughout their value chains. UK-headquartered firms with significant EU revenue will fall within scope. The directive introduces civil liability provisions for non-compliance.",
    reflection:
      "Firms with EU-facing supply chains may benefit from reviewing the adequacy of their current third-party assurance frameworks ahead of the transposition deadlines.",
    countryCode: "EU",
  },
  {
    category: "Sanctions & Exposure",
    headline: "OFSI publishes updated guidance on reporting obligations for professional services firms",
    sourceUrl: "https://www.gov.uk/government/organisations/office-of-financial-sanctions-implementation",
    publication: "HM Treasury — OFSI",
    date: "March 2025",
    summary:
      "The Office of Financial Sanctions Implementation issued revised guidance clarifying the reporting duties of professional services firms, including law firms and accountancy practices, when they encounter information suggesting a client or counterparty may be subject to financial sanctions. The guidance emphasises that the obligation to report arises upon reasonable suspicion, not confirmed knowledge.",
    reflection:
      "Professional services firms may wish to review whether their internal escalation procedures align with the revised reasonable-suspicion threshold.",
    countryCode: "GB",
  },
  {
    category: "Corporate Governance",
    headline: "Serious Fraud Office secures deferred prosecution agreement with engineering group",
    sourceUrl: "https://www.sfo.gov.uk",
    publication: "Serious Fraud Office",
    date: "January 2025",
    summary:
      "The SFO entered into a deferred prosecution agreement with a multinational engineering firm in respect of bribery offences committed by agents operating in three jurisdictions. The agreement required the firm to implement an enhanced compliance programme, including independent monitoring of its third-party intermediary arrangements. The SFO noted positively the firm's cooperation and self-reporting.",
    reflection:
      "The terms of the agreement offer a practical reference point for firms reviewing the adequacy of their own intermediary oversight arrangements.",
    countryCode: "GB",
  },
  {
    category: "Beneficial Ownership",
    headline: "Transparency International identifies significant gaps in UK beneficial ownership register",
    sourceUrl: "https://www.transparency.org.uk",
    publication: "Transparency International UK",
    date: "October 2024",
    summary:
      "A report by Transparency International UK found that a substantial proportion of entries on the UK's Register of Overseas Entities contained incomplete or unverified beneficial ownership information. The report identified instances where declared beneficial owners could not be independently corroborated through open-source research. The authors recommended legislative reform to strengthen verification requirements.",
    reflection:
      "Due diligence practitioners may wish to treat register entries as a starting point rather than a definitive record of beneficial ownership.",
    countryCode: "GB",
  },
];

export default function ObservationsPage() {
  // Fetch published market lessons from DB
  const { data: dbLessons = [] } = useQuery({
    queryKey: ["published-market-lessons"],
    queryFn: async () => {
      const { data } = await supabase
        .from("market_lessons" as any)
        .select("*")
        .eq("published", true)
        .order("publication_date", { ascending: false });
      return (data || []) as any[];
    },
  });

  // Merge DB lessons with hardcoded fallbacks, DB first
  const dbObservations: Observation[] = dbLessons.map((l: any) => ({
    category: l.category || "Governance",
    headline: l.title,
    sourceUrl: l.publication_url,
    publication: l.publication_name,
    date: l.publication_date
      ? new Date(l.publication_date).toLocaleDateString("en-GB", { month: "long", year: "numeric" })
      : "",
    summary: l.summary_text || "",
    reflection: l.governance_reflection || "",
    countryCode: l.jurisdiction_country_code || undefined,
  }));

  // Deduplicate: if DB has entries with same headline, skip hardcoded
  const dbHeadlines = new Set(dbObservations.map((o) => o.headline));
  const fallback = observations.filter((o) => !dbHeadlines.has(o.headline));
  const allObservations = [...dbObservations, ...fallback];

  return (
    <div>
      {/* ── Hero ── */}
      <section className="relative bg-[#1a1a2e] py-32 overflow-hidden">
        <NetworkOverlay />
        <div className="relative mx-auto max-w-4xl px-6 text-center">
          <p className="text-[#c9a962] text-xs font-semibold uppercase tracking-[0.25em] mb-5">
            Public Record
          </p>
          <h1 className="font-display text-4xl sm:text-5xl font-semibold text-white tracking-tight leading-[1.1]">
            Observations from the<br />Public Record
          </h1>
          <p className="mt-7 max-w-2xl mx-auto text-base sm:text-lg text-white/55 leading-relaxed">
            Select instances of publicly reported governance, ownership and counterparty risk events.
            Presented for consideration by boards, investment committees and senior risk professionals.
          </p>
          <p className="mt-4 text-xs text-white/30 tracking-wide italic">Updated periodically.</p>
        </div>
      </section>

      {/* ── Introductory paragraph ── */}
      <section className="bg-[#f6f0e6] py-16">
        <div className="mx-auto max-w-3xl px-6 text-center">
          <GoldRule className="mx-auto mb-8" />
          <p className="text-[15px] text-[#1a1a2e]/60 leading-[1.85] font-body">
            The references below are drawn exclusively from publicly available sources — regulatory
            announcements, parliamentary publications, court records and established news outlets.
            They are presented without embellishment, for the purpose of reflection by those responsible
            for the governance and oversight of counterparty and third-party relationships.
          </p>
        </div>
      </section>

      {/* ── Content grid ── */}
      <section className="bg-[#f6f0e6] pb-20">
        <div className="mx-auto max-w-6xl px-6">
          <div className="grid gap-8 md:grid-cols-2">
            {observations.map((o) => {
              const flag = countryCodeToFlag(o.countryCode === "EU" ? null : o.countryCode);
              return (
                <article
                  key={o.headline}
                  className="group rounded-xl border border-[#c9a962]/10 bg-white/60 hover:bg-white p-8 transition-all duration-500 hover:shadow-lg flex flex-col"
                >
                  {/* header row */}
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#c9a962]">
                      {o.category}
                    </span>
                    {flag && <span className="text-base" title={o.countryCode}>{flag}</span>}
                    {o.countryCode === "EU" && (
                      <span className="text-[10px] font-semibold uppercase tracking-widest text-[#c9a962]/60 border border-[#c9a962]/20 rounded px-1.5 py-0.5">
                        EU
                      </span>
                    )}
                  </div>

                  {/* headline */}
                  <a
                    href={o.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-display text-lg font-semibold text-[#1a1a2e] leading-snug mb-1 group-hover:text-[#c9a962] transition-colors duration-300 inline-flex items-start gap-1.5"
                  >
                    {o.headline}
                    <ExternalLink className="h-3.5 w-3.5 mt-1 shrink-0 text-[#c9a962]/40" />
                  </a>

                  {/* source + date */}
                  <p className="text-[11px] text-[#1a1a2e]/35 tracking-wide mb-4">
                    {o.publication}&ensp;·&ensp;{o.date}
                  </p>

                  <GoldRule className="mb-4" />

                  {/* summary */}
                  <p className="text-[13px] text-[#1a1a2e]/55 leading-relaxed mb-5 flex-1">
                    {o.summary}
                  </p>

                  {/* governance reflection */}
                  <div className="rounded-lg bg-[#1a1a2e]/[0.03] border border-[#c9a962]/8 px-5 py-4">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-[#c9a962]/70 mb-1.5">
                      Governance Reflection
                    </p>
                    <p className="text-[12.5px] text-[#1a1a2e]/50 leading-relaxed italic">
                      {o.reflection}
                    </p>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── Disclaimer ── */}
      <section className="bg-[#f6f0e6] pb-10">
        <div className="mx-auto max-w-4xl px-6">
          <div className="border-t border-[#c9a962]/15 pt-8">
            <p className="text-[11px] text-[#1a1a2e]/30 leading-relaxed text-center max-w-2xl mx-auto">
              The material referenced on this page is drawn from publicly available reporting and official
              regulatory publications. Clifton Ruskin makes no independent assertion beyond the source
              material cited.
            </p>
          </div>
        </div>
      </section>

      {/* ── Further Discussion CTA ── */}
      <section className="bg-[#1a1a2e] py-20">
        <div className="mx-auto max-w-2xl px-6 text-center">
          <GoldRule className="mx-auto mb-6" />
          <h2 className="font-display text-2xl font-semibold text-white tracking-tight mb-4">
            Further Discussion
          </h2>
          <p className="text-sm text-white/45 leading-relaxed mb-8 max-w-lg mx-auto">
            If any of the matters referenced above are relevant to your organisation's risk landscape,
            we are available for a confidential, no-obligation conversation.
          </p>
          <a
            href="/contact"
            className="inline-flex items-center gap-2 px-7 py-3 rounded-full border border-[#c9a962]/40 text-[#c9a962] text-sm font-medium tracking-wide hover:bg-[#c9a962]/10 transition-colors duration-300"
          >
            Arrange a Conversation
          </a>
        </div>
      </section>
    </div>
  );
}
