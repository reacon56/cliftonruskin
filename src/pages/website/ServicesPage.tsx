import { FileText, BookOpen, RefreshCw, CheckCircle, Clock, Target, Layers } from "lucide-react";

const GoldRule = ({ className = "" }: { className?: string }) => (
  <div className={`h-px w-16 bg-gradient-to-r from-[#c9a962] to-[#c9a962]/0 ${className}`} />
);

const products = [
  {
    icon: FileText,
    title: "Assurance Note",
    tag: "Standard",
    bestFor: "Onboarding decisions, routine third-party checks, and board-level summaries.",
    turnaround: "5–7 business days",
    included: [
      "Corporate structure verification",
      "Beneficial ownership identification",
      "Adverse media screening",
      "Sanctions and watchlist checks",
      "Risk ranking with recommendation",
    ],
    output: "Structured PDF with executive summary, risk matrix, and sourced evidence annex.",
  },
  {
    icon: BookOpen,
    title: "Assurance Dossier",
    tag: "Enhanced",
    bestFor: "High-value transactions, regulatory submissions, and complex ownership structures.",
    turnaround: "10–15 business days",
    included: [
      "Everything in Assurance Note",
      "In-depth beneficial ownership mapping",
      "Litigation and insolvency history",
      "In-country source enquiries",
      "Detailed evidence pack with source grading",
      "Executive summary with strategic context",
    ],
    output: "Comprehensive bound report with appendices, evidence pack, and board-ready executive brief.",
  },
  {
    icon: RefreshCw,
    title: "Refresh Note",
    tag: "Ongoing",
    bestFor: "Periodic re-assessments, triggered reviews, and maintaining audit-ready status.",
    turnaround: "3–5 business days",
    included: [
      "Material change analysis against baseline",
      "Updated adverse media and sanctions screening",
      "Corporate structure re-verification",
      "Change summary with delta view",
    ],
    output: "Concise update report highlighting changes, with comparison to prior assessment.",
  },
];

const addOns = [
  "Beneficial ownership mapping",
  "Sanctions exposure analysis",
  "Adverse media timeline",
  "Insolvency & litigation signals",
  "Monitoring cadence setup",
];

export default function ServicesPage() {
  return (
    <div>
      {/* Hero */}
      <section className="bg-[#1a1a2e] py-28">
        <div className="mx-auto max-w-7xl px-6 text-center">
          <p className="text-[#c9a962] text-xs font-semibold uppercase tracking-[0.2em] mb-4">Services</p>
          <h1 className="font-display text-4xl sm:text-5xl font-semibold text-white tracking-tight leading-[1.1]">
            Proportionate assurance,<br />delivered with precision.
          </h1>
          <p className="mt-6 max-w-2xl mx-auto text-lg text-white/60 leading-relaxed">
            Whether you're onboarding a critical supplier or preparing for a major transaction, our products are designed to match the level of assurance to the level of risk.
          </p>
        </div>
      </section>

      {/* Use-case sections */}
      <section className="bg-[#f6f0e6] py-24">
        <div className="mx-auto max-w-7xl px-6">
          <div className="grid md:grid-cols-2 gap-8 mb-16">
            {[
              {
                title: "Enterprise Supply Chain Assurance",
                desc: "For regulated organisations managing hundreds of third-party relationships. We integrate with your governance framework to deliver tiered, repeatable assurance across your supplier base.",
              },
              {
                title: "SME Transaction Support",
                desc: "For growing businesses entering partnerships, acquisitions, or new markets. Focused, proportionate diligence that gives you the clarity to proceed — or walk away — with confidence.",
              },
            ].map(({ title, desc }) => (
              <div key={title} className="p-8 rounded-xl border border-[#c9a962]/10 bg-white/60">
                <h3 className="font-display text-xl font-semibold text-[#1a1a2e] mb-3">{title}</h3>
                <p className="text-sm text-[#1a1a2e]/60 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Products */}
      <section className="bg-white py-24">
        <div className="mx-auto max-w-7xl px-6">
          <p className="text-[#c9a962] text-xs font-semibold uppercase tracking-[0.2em] mb-3">Products</p>
          <h2 className="font-display text-3xl font-semibold text-[#1a1a2e] tracking-tight">Our deliverables</h2>
          <GoldRule className="mt-4 mb-12" />

          <div className="space-y-8">
            {products.map(({ icon: Icon, title, tag, bestFor, turnaround, included, output }) => (
              <div key={title} className="rounded-xl border border-[#c9a962]/10 bg-[#f6f0e6]/50 p-8 md:p-10">
                <div className="flex flex-wrap items-start gap-4 mb-6">
                  <div className="h-10 w-10 rounded-lg bg-[#1a1a2e] flex items-center justify-center shrink-0">
                    <Icon className="h-5 w-5 text-[#c9a962]" />
                  </div>
                  <div>
                    <span className="text-[10px] font-semibold uppercase tracking-[0.15em] text-[#c9a962]">{tag}</span>
                    <h3 className="font-display text-2xl font-semibold text-[#1a1a2e]">{title}</h3>
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-8">
                  <div className="space-y-5">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <Target className="h-3.5 w-3.5 text-[#c9a962]" />
                        <span className="text-xs font-semibold uppercase tracking-wider text-[#1a1a2e]/50">Best for</span>
                      </div>
                      <p className="text-sm text-[#1a1a2e]/70 leading-relaxed">{bestFor}</p>
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <Clock className="h-3.5 w-3.5 text-[#c9a962]" />
                        <span className="text-xs font-semibold uppercase tracking-wider text-[#1a1a2e]/50">Typical turnaround</span>
                      </div>
                      <p className="text-sm text-[#1a1a2e]/70">{turnaround}</p>
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <Layers className="h-3.5 w-3.5 text-[#c9a962]" />
                        <span className="text-xs font-semibold uppercase tracking-wider text-[#1a1a2e]/50">Output format</span>
                      </div>
                      <p className="text-sm text-[#1a1a2e]/70 leading-relaxed">{output}</p>
                    </div>
                  </div>
                  <div>
                    <span className="text-xs font-semibold uppercase tracking-wider text-[#1a1a2e]/50 block mb-3">What's included</span>
                    <ul className="space-y-2">
                      {included.map((item) => (
                        <li key={item} className="flex items-start gap-2">
                          <CheckCircle className="h-4 w-4 text-[#c9a962] mt-0.5 shrink-0" />
                          <span className="text-sm text-[#1a1a2e]/70">{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Add-ons */}
      <section className="bg-[#f6f0e6] py-24">
        <div className="mx-auto max-w-7xl px-6">
          <p className="text-[#c9a962] text-xs font-semibold uppercase tracking-[0.2em] mb-3">Optional</p>
          <h2 className="font-display text-3xl font-semibold text-[#1a1a2e] tracking-tight">Add-ons</h2>
          <GoldRule className="mt-4 mb-8" />
          <div className="flex flex-wrap gap-3">
            {addOns.map((a) => (
              <span key={a} className="px-4 py-2 rounded-full border border-[#c9a962]/20 bg-white/60 text-sm text-[#1a1a2e]/70">
                {a}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Assurance Ledger */}
      <section className="bg-white py-24">
        <div className="mx-auto max-w-7xl px-6 max-w-3xl">
          <p className="text-[#c9a962] text-xs font-semibold uppercase tracking-[0.2em] mb-3">Audit Trail</p>
          <h2 className="font-display text-3xl font-semibold text-[#1a1a2e] tracking-tight">Assurance Ledger</h2>
          <GoldRule className="mt-4 mb-8" />
          <p className="text-[#1a1a2e]/60 leading-relaxed mb-6">
            Every deliverable is accompanied by a structured evidence ledger — a transparent record of how findings were obtained. This supports regulatory scrutiny, internal audit reviews, and board-level governance requirements.
          </p>
          <div className="grid sm:grid-cols-2 gap-4">
            {[
              { label: "Source type", desc: "Open source, proprietary database, in-country, or client-provided." },
              { label: "Capture date", desc: "When the information was obtained or last verified." },
              { label: "Corroboration", desc: "Whether findings were confirmed through an independent channel." },
              { label: "Confidence grading", desc: "High, medium, or low — applied to every material finding." },
            ].map(({ label, desc }) => (
              <div key={label} className="p-4 rounded-lg border border-[#c9a962]/10 bg-[#f6f0e6]/50">
                <span className="text-xs font-semibold uppercase tracking-wider text-[#c9a962]">{label}</span>
                <p className="mt-1 text-sm text-[#1a1a2e]/60">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
