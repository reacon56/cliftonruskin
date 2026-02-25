import { Clock } from "lucide-react";

const GoldRule = ({ className = "" }: { className?: string }) => (
  <div className={`h-px w-16 bg-gradient-to-r from-[#c9a962] to-[#c9a962]/0 ${className}`} />
);

const categories = ["All", "Ownership & Control", "Sanctions & Exposure", "Supplier Risk", "Practical Due Diligence"];

const articles = [
  {
    category: "Ownership & Control",
    title: "Layered ownership structures: when nominee directors mask beneficial control",
    readTime: "6 min",
    takeaways: [
      "Why nominee arrangements aren't inherently suspicious — but opacity is",
      "Three structural patterns that warrant deeper investigation",
      "How to document ownership uncertainty in a defensible way",
    ],
  },
  {
    category: "Sanctions & Exposure",
    title: "Secondary sanctions risk: what UK firms need to know about indirect exposure",
    readTime: "8 min",
    takeaways: [
      "The difference between direct and indirect sanctions exposure",
      "How supply chain depth creates inadvertent compliance gaps",
      "Practical screening steps beyond standard watchlist checks",
    ],
  },
  {
    category: "Supplier Risk",
    title: "The hidden costs of due diligence shortcuts in procurement",
    readTime: "5 min",
    takeaways: [
      "Why questionnaire-only approaches leave gaps in supplier assurance",
      "The board-level consequences of a third-party compliance failure",
      "Building a proportionate supplier assurance framework",
    ],
  },
  {
    category: "Practical Due Diligence",
    title: "Evidence grading: building confidence levels into your due diligence outputs",
    readTime: "7 min",
    takeaways: [
      "Why confidence levels matter for regulatory defensibility",
      "A practical framework for grading open-source intelligence",
      "How to communicate uncertainty without undermining conclusions",
    ],
  },
  {
    category: "Ownership & Control",
    title: "Beneficial ownership registers: progress, gaps, and what they actually reveal",
    readTime: "6 min",
    takeaways: [
      "Which jurisdictions offer reliable public registers — and which don't",
      "The gap between legal ownership and effective control",
      "Supplementary steps when registers alone are insufficient",
    ],
  },
  {
    category: "Sanctions & Exposure",
    title: "Navigating deferred prosecution agreements: lessons for third-party risk teams",
    readTime: "9 min",
    takeaways: [
      "What DPAs reveal about expected compliance standards",
      "How enforcement language is shaping due diligence scope",
      "Practical implications for ongoing monitoring programmes",
    ],
  },
];

export default function InsightsPage() {
  return (
    <div>
      {/* Hero */}
      <section className="bg-[#1a1a2e] py-28">
        <div className="mx-auto max-w-7xl px-6 text-center">
          <p className="text-[#c9a962] text-xs font-semibold uppercase tracking-[0.2em] mb-4">Insights</p>
          <h1 className="font-display text-4xl sm:text-5xl font-semibold text-white tracking-tight leading-[1.1]">
            Considered analysis,<br />not commentary.
          </h1>
          <p className="mt-6 max-w-2xl mx-auto text-lg text-white/60 leading-relaxed">
            Perspectives on due diligence, regulatory trends, and corporate transparency from the Clifton Ruskin team.
          </p>
        </div>
      </section>

      {/* Category pills */}
      <section className="bg-[#f6f0e6] pt-12 pb-0">
        <div className="mx-auto max-w-7xl px-6">
          <div className="flex flex-wrap gap-2">
            {categories.map((c, i) => (
              <button
                key={c}
                className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  i === 0
                    ? "bg-[#1a1a2e] text-white"
                    : "border border-[#c9a962]/20 text-[#1a1a2e]/60 hover:border-[#c9a962]/40"
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Article grid */}
      <section className="bg-[#f6f0e6] py-16">
        <div className="mx-auto max-w-7xl px-6">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {articles.map((a) => (
              <article
                key={a.title}
                className="group rounded-xl border border-[#c9a962]/10 bg-white/60 hover:bg-white p-7 transition-all duration-500 hover:shadow-lg cursor-pointer flex flex-col"
              >
                <div className="flex items-center justify-between mb-4">
                  <span className="text-[10px] font-semibold uppercase tracking-[0.15em] text-[#c9a962]">{a.category}</span>
                  <span className="flex items-center gap-1 text-xs text-[#1a1a2e]/40">
                    <Clock className="h-3 w-3" /> {a.readTime}
                  </span>
                </div>
                <h3 className="font-display text-lg font-semibold text-[#1a1a2e] leading-snug mb-4 group-hover:text-[#c9a962] transition-colors duration-300">
                  {a.title}
                </h3>
                <GoldRule className="mb-4" />
                <ul className="space-y-2 mt-auto">
                  {a.takeaways.map((t) => (
                    <li key={t} className="flex items-start gap-2">
                      <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-[#c9a962] shrink-0" />
                      <span className="text-xs text-[#1a1a2e]/50 leading-relaxed">{t}</span>
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
