import { Pill, ShoppingBag, Factory, Landmark, Building2, UtensilsCrossed, Cpu, Briefcase } from "lucide-react";

const GoldRule = ({ className = "" }: { className?: string }) => (
  <div className={`h-px w-16 bg-gradient-to-r from-[#c9a962] to-[#c9a962]/0 ${className}`} />
);

const sectors = [
  {
    icon: Pill,
    title: "Pharma & Life Sciences",
    mandates: "Supplier qualification, contract manufacturer vetting, distribution partner assurance.",
    flags: "Opaque ownership in generics supply chains, regulatory non-compliance history, sanctioned intermediaries.",
    good: "Complete beneficial ownership visibility, clean regulatory track record, auditable compliance documentation.",
  },
  {
    icon: ShoppingBag,
    title: "Consumer Goods / CPG",
    mandates: "Co-manufacturer due diligence, white-label supplier checks, ESG supply chain reviews.",
    flags: "Shell-company layering, undisclosed subcontracting, labour compliance concerns.",
    good: "Transparent corporate structure, verified manufacturing sites, strong labour and environmental practices.",
  },
  {
    icon: Factory,
    title: "Manufacturing & Supply Chain",
    mandates: "Critical supplier assurance, raw materials provenance, logistics partner screening.",
    flags: "Single points of failure in supply chain, undisclosed ownership changes, sanctions proximity.",
    good: "Resilient multi-source strategy, verified quality certifications, stable ownership and governance.",
  },
  {
    icon: Landmark,
    title: "Financial Services",
    mandates: "Counterparty due diligence, outsourced service provider checks, regulatory-driven reviews.",
    flags: "PEP exposure, adverse media clusters, jurisdictional risk concentration.",
    good: "Clear UBO chain, robust AML controls at counterparty level, proactive monitoring regime.",
  },
  {
    icon: Building2,
    title: "Real Estate",
    mandates: "Investor KYC, joint venture partner screening, tenant due diligence for commercial leases.",
    flags: "Complex offshore holding structures, unexplained wealth, beneficial ownership opacity.",
    good: "Transparent ownership, verifiable source of funds, clean litigation history.",
  },
  {
    icon: UtensilsCrossed,
    title: "Hospitality & Leisure",
    mandates: "Franchise partner vetting, F&B supplier qualification, brand-protection reviews.",
    flags: "Cash-intensive operations, reputational associations, undisclosed related-party transactions.",
    good: "Verifiable financials, clean regulatory history, alignment with brand standards.",
  },
  {
    icon: Cpu,
    title: "Technology",
    mandates: "Vendor risk assessment, data-processor due diligence, M&A target screening.",
    flags: "IP ownership disputes, data-protection non-compliance, founder background concerns.",
    good: "Clear IP ownership, GDPR/data compliance posture, transparent cap table and governance.",
  },
  {
    icon: Briefcase,
    title: "Professional Services",
    mandates: "Sub-contractor screening, referral partner checks, lateral-hire due diligence.",
    flags: "Conflicts of interest, undisclosed advisory roles, disciplinary history.",
    good: "Verified professional standing, transparent client relationships, clean regulatory record.",
  },
];

export default function SectorsPage() {
  return (
    <div>
      {/* Hero */}
      <section className="bg-[#1a1a2e] py-28">
        <div className="mx-auto max-w-7xl px-6 text-center">
          <p className="text-[#c9a962] text-xs font-semibold uppercase tracking-[0.2em] mb-4">Sectors</p>
          <h1 className="font-display text-4xl sm:text-5xl font-semibold text-white tracking-tight leading-[1.1]">
            Sector-fluent assurance.
          </h1>
          <p className="mt-6 max-w-2xl mx-auto text-lg text-white/60 leading-relaxed">
            We understand the regulatory, commercial, and reputational pressures specific to your industry — and we calibrate our diligence accordingly.
          </p>
        </div>
      </section>

      {/* Sector grid */}
      <section className="bg-[#f6f0e6] py-24">
        <div className="mx-auto max-w-7xl px-6">
          <div className="grid md:grid-cols-2 gap-6">
            {sectors.map(({ icon: Icon, title, mandates, flags, good }) => (
              <div key={title} className="group rounded-xl border border-[#c9a962]/10 bg-white/60 hover:bg-white p-8 transition-all duration-500 hover:shadow-lg">
                <div className="flex items-center gap-3 mb-5">
                  <div className="h-10 w-10 rounded-lg bg-[#1a1a2e] flex items-center justify-center group-hover:bg-[#c9a962] transition-colors duration-500">
                    <Icon className="h-5 w-5 text-[#c9a962] group-hover:text-[#1a1a2e] transition-colors duration-500" />
                  </div>
                  <h3 className="font-display text-xl font-semibold text-[#1a1a2e]">{title}</h3>
                </div>
                <div className="space-y-4">
                  <div>
                    <span className="text-[10px] font-semibold uppercase tracking-[0.15em] text-[#c9a962]">Typical mandates</span>
                    <p className="mt-1 text-sm text-[#1a1a2e]/60 leading-relaxed">{mandates}</p>
                  </div>
                  <div>
                    <span className="text-[10px] font-semibold uppercase tracking-[0.15em] text-red-600/70">Common red flags</span>
                    <p className="mt-1 text-sm text-[#1a1a2e]/60 leading-relaxed">{flags}</p>
                  </div>
                  <div>
                    <span className="text-[10px] font-semibold uppercase tracking-[0.15em] text-green-700/70">What good looks like</span>
                    <p className="mt-1 text-sm text-[#1a1a2e]/60 leading-relaxed">{good}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
