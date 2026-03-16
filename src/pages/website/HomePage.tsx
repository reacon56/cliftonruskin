import { Link } from "react-router-dom";
import { Shield, Scale, Globe, Lock, ArrowRight, FileText, BookOpen, RefreshCw, Eye, CheckCircle, Search, Calendar, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useScrollReveal } from "@/hooks/use-scroll-reveal";

/* ── scroll-reveal wrapper ── */
const RevealSection = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => {
  const { ref, isVisible } = useScrollReveal(0.12);
  return (
    <div ref={ref} className={`scroll-reveal ${isVisible ? "visible" : ""} ${className}`}>
      {children}
    </div>
  );
};

/* ── tiny reusable gold rule ── */
const GoldRule = ({ className = "" }: { className?: string }) => (
  <div className={`h-px w-16 bg-gradient-to-r from-[#c9a962] to-[#c9a962]/0 ${className}`} />
);

export default function HomePage() {
  return (
    <div>
      {/* ═══════════════════ HERO ═══════════════════ */}
      <section className="relative isolate min-h-[90vh] flex items-center">
        {/* Skyline BG */}
        <div className="absolute inset-0 -z-10">
          <img
            src="/images/london-skyline.png"
            alt=""
            className="h-full w-full object-cover object-bottom"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-[#1a1a2e]/50 via-[#1a1a2e]/40 to-[#1a1a2e]/75" />
        </div>

        <div className="mx-auto max-w-7xl px-6 py-28 text-center">
          <p className="text-[#c9a962] text-xs font-semibold uppercase tracking-[0.25em] mb-8 animate-fade-in">
            Discreet. Thorough. Decisive.
          </p>

          {/* Prominent logo + name */}
          <div className="mb-8 animate-fade-in" style={{ animationDelay: "80ms" }}>
            <img
              src="/images/clifton-ruskin-logo.png"
              alt="Clifton Ruskin"
              className="mx-auto mb-5 w-24 h-24 rounded-full shadow-[0_0_24px_hsl(38_55%_52%/0.15)]"
            />
            <h1 className="font-display text-[2.75rem] sm:text-[3.5rem] md:text-[4rem] font-semibold text-white tracking-[0.04em] leading-none">
              Clifton Ruskin
            </h1>
            {/* Gold decorative rule */}
            <div className="mx-auto mt-5 flex items-center gap-3 justify-center">
              <div className="h-px w-12 bg-[#c9a962]/30" />
              <div className="w-1.5 h-1.5 rotate-45 border border-[#c9a962]/40" />
              <div className="h-px w-12 bg-[#c9a962]/30" />
            </div>
            <p className="mt-4 text-[10px] uppercase tracking-[0.25em] text-white/50 font-medium">Est. London 2026</p>
            <div className="mx-auto mt-4 flex items-center gap-3 justify-center">
              <div className="h-px w-12 bg-[#c9a962]/30" />
              <div className="w-1.5 h-1.5 rotate-45 border border-[#c9a962]/40" />
              <div className="h-px w-12 bg-[#c9a962]/30" />
            </div>
            <p className="mt-2 text-[12px] text-white/60 italic leading-relaxed">
              Founded on decades of investigative and advisory experience.
            </p>
          </div>

          {/* Tagline in quotes, refined */}
          <p className="font-display text-xl sm:text-2xl md:text-[1.7rem] italic text-white/60 leading-snug tracking-tight animate-fade-in" style={{ animationDelay: "150ms" }}>
            "Reassuringly thorough. Decisively useful."
          </p>
          <p className="mt-6 max-w-2xl mx-auto text-lg text-white/70 leading-relaxed animate-fade-in" style={{ animationDelay: "200ms" }}>
            Analyst-led due diligence and third-party assurance on companies, owners, and suppliers — written for boards, counsel, and procurement teams.
          </p>

          {/* Bullets */}
          <ul className="mt-8 max-w-xl mx-auto space-y-3 text-left animate-fade-in" style={{ animationDelay: "250ms" }}>
            {[
              "Decision-grade conclusions — ranked risks, clear recommendations, practical mitigations",
              "Evidence discipline — sourced, dated, and audit-ready by design",
              "Monitoring that matters — refresh cycles and material-change alerts (not noise)",
            ].map((b) => (
              <li key={b} className="flex items-start gap-3">
                <span className="mt-2 h-1.5 w-1.5 rounded-full bg-[#c9a962] shrink-0" />
                <span className="text-sm text-white/60 leading-relaxed">{b}</span>
              </li>
            ))}
          </ul>

          <div className="mt-10 flex flex-wrap justify-center gap-4 animate-fade-in" style={{ animationDelay: "300ms" }}>
            <Link to="/contact">
              <Button size="lg" className="bg-[#c9a962] hover:bg-[#c9a962]/90 text-[#1a1a2e] font-semibold rounded-full px-8">
                Request a Consultation
              </Button>
            </Link>
            <Link to="/services">
              <Button variant="outline" size="lg" className="border-white/60 bg-white/10 text-white backdrop-blur-sm hover:bg-white/20 rounded-full px-8">
                View Services
              </Button>
            </Link>
          </div>

          <p className="mt-5 text-xs text-white/35 tracking-wide animate-fade-in" style={{ animationDelay: "350ms" }}>
            Confidential by default&ensp;•&ensp;UK standards, global coverage
          </p>
        </div>
      </section>

      {/* ═══════════════════ TRUST STRIP ═══════════════════ */}
      <section className="bg-[#1a1a2e] py-8 border-t border-white/5">
        <RevealSection>
          <div className="flex items-center justify-center gap-4">
            <div className="h-px w-16 bg-gradient-to-r from-transparent to-[#c9a962]/20" />
            <p className="text-center text-[11px] uppercase tracking-[0.2em] text-white/35 font-medium">
              Trusted by teams who answer to boards, regulators, and shareholders
            </p>
            <div className="h-px w-16 bg-gradient-to-l from-transparent to-[#c9a962]/20" />
          </div>
        </RevealSection>
      </section>

      {/* ═══════════════════ 4 PILLARS ═══════════════════ */}
      <section className="bg-[#f6f0e6] py-28">
        <RevealSection>
          <div className="mx-auto max-w-7xl px-6">
            <div className="text-center mb-16">
              <p className="text-[#c9a962] text-xs font-semibold uppercase tracking-[0.2em] mb-3">Our Standard</p>
              <h2 className="font-display text-3xl sm:text-4xl font-semibold text-[#1a1a2e] tracking-tight">
                The Clifton Ruskin Standard
              </h2>
              <div className="mx-auto mt-5 flex items-center gap-3 justify-center">
                <div className="h-px w-12 bg-[#c9a962]/25" />
                <div className="w-1.5 h-1.5 rotate-45 border border-[#c9a962]/30" />
                <div className="h-px w-12 bg-[#c9a962]/25" />
              </div>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
              {[
                { icon: Shield, title: "Defensible Outputs", desc: "Every finding sourced, dated, and ready for regulatory scrutiny." },
                { icon: Scale, title: "Proportionate Diligence", desc: "Scope matched to risk — no more, no less than the situation demands." },
                { icon: Globe, title: "Global Reach", desc: "In-country networks across 50+ jurisdictions, coordinated from London." },
                { icon: Lock, title: "Confidential by Default", desc: "Information barriers and need-to-know principles from first contact." },
              ].map(({ icon: Icon, title, desc }) => (
                <div key={title} className="group p-7 rounded-xl border border-[#c9a962]/10 bg-white/60 hover:bg-white transition-all duration-500 hover:shadow-[0_8px_30px_-12px_rgba(201,169,98,0.15)]">
                  <div className="h-11 w-11 rounded-lg bg-[#1a1a2e] flex items-center justify-center mb-5 group-hover:bg-[#c9a962] transition-colors duration-500 shadow-sm">
                    <Icon className="h-5 w-5 text-[#c9a962] group-hover:text-[#1a1a2e] transition-colors duration-500" />
                  </div>
                  <h3 className="font-display text-lg font-semibold text-[#1a1a2e] mb-2 tracking-tight">{title}</h3>
                  <p className="text-[13px] text-[#1a1a2e]/55 leading-relaxed">{desc}</p>
                </div>
              ))}
            </div>
          </div>
        </RevealSection>
      </section>

      {/* ═══════════════════ PRODUCTS ═══════════════════ */}
      <section className="bg-[#1a1a2e] py-28 relative overflow-hidden">
        {/* Subtle texture */}
        <div className="absolute inset-0 opacity-[0.02]" style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, white 1px, transparent 0)`,
          backgroundSize: "40px 40px",
        }} />
        <RevealSection className="mx-auto max-w-7xl px-6 relative">
          <div className="text-center mb-16">
            <p className="text-[#c9a962] text-xs font-semibold uppercase tracking-[0.2em] mb-3">Products</p>
            <h2 className="font-display text-3xl sm:text-4xl font-semibold text-white tracking-tight">
              Three levels of assurance
            </h2>
            <div className="mx-auto mt-5 flex items-center gap-3 justify-center">
              <div className="h-px w-12 bg-[#c9a962]/25" />
              <div className="w-1.5 h-1.5 rotate-45 border border-[#c9a962]/30" />
              <div className="h-px w-12 bg-[#c9a962]/25" />
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                icon: FileText,
                title: "Assurance Note",
                tag: "Standard",
                subtitle: "For routine onboarding and periodic review",
                features: [
                  "Corporate identity check",
                  "Sanctions screening",
                  "Adverse media",
                  "Risk recommendation",
                ],
                turnaround: "5–7 business days",
                cta: "Learn more",
                ctaLink: "/services",
              },
              {
                icon: BookOpen,
                title: "Assurance Dossier",
                tag: "Enhanced",
                subtitle: "For high-value transactions and complex structures",
                features: [
                  "Everything in Assurance Note, plus:",
                  "Beneficial ownership mapping",
                  "Litigation history",
                  "In-country source enquiries",
                  "Board-ready brief",
                ],
                turnaround: "10–15 business days",
                cta: "Learn more",
                ctaLink: "/services",
              },
              {
                icon: RefreshCw,
                title: "Assurance Programme",
                tag: "Managed Service",
                subtitle: "For ongoing third-party risk programmes",
                features: [
                  "Continuous monitoring",
                  "Annual review cycle",
                  "Dedicated CR officer",
                  "Jurisdiction alerts",
                  "Programme ROI reporting",
                ],
                turnaround: "Ongoing",
                cta: "Enquire",
                ctaLink: "/contact",
              },
            ].map(({ icon: Icon, title, tag, subtitle, features, turnaround, cta, ctaLink }) => (
              <div key={title} className="group relative rounded-xl border border-white/[0.07] bg-white/[0.03] p-8 hover:border-[#c9a962]/25 hover:bg-white/[0.06] transition-all duration-500 hover:shadow-[0_8px_30px_-12px_rgba(201,169,98,0.1)] flex flex-col">
                <span className="text-[10px] font-semibold uppercase tracking-[0.15em] text-[#c9a962]/70">{tag}</span>
                <div className="mt-5 h-11 w-11 rounded-lg bg-[#c9a962]/[0.08] flex items-center justify-center mb-5 group-hover:bg-[#c9a962]/15 transition-colors duration-500">
                  <Icon className="h-5 w-5 text-[#c9a962]" />
                </div>
                <h3 className="font-display text-xl font-semibold text-white mb-2 tracking-tight">{title}</h3>
                <p className="text-[13px] text-white/50 leading-relaxed mb-5">{subtitle}</p>
                <ul className="space-y-2 mb-6 flex-1">
                  {features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-[13px] text-white/40 leading-relaxed">
                      <span className="mt-1.5 h-1 w-1 rounded-full bg-[#c9a962]/50 shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
                <div className="text-[11px] font-medium uppercase tracking-[0.1em] text-white/25 mb-5">
                  Turnaround: {turnaround}
                </div>
                <Link to={ctaLink} className="inline-flex items-center gap-1.5 text-[13px] text-[#c9a962] font-medium hover:gap-2.5 transition-all duration-300">
                  {cta} <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            ))}
          </div>
        </RevealSection>
      </section>

      {/* ═══════════════════ HOW IT WORKS ═══════════════════ */}
      <section className="bg-[#f6f0e6] py-28">
        <RevealSection className="mx-auto max-w-7xl px-6">
          <div className="text-center mb-16">
            <p className="text-[#c9a962] text-xs font-semibold uppercase tracking-[0.2em] mb-3">Process</p>
            <h2 className="font-display text-3xl sm:text-4xl font-semibold text-[#1a1a2e] tracking-tight">
              How it works
            </h2>
            <div className="mx-auto mt-5 flex items-center gap-3 justify-center">
              <div className="h-px w-12 bg-[#c9a962]/25" />
              <div className="w-1.5 h-1.5 rotate-45 border border-[#c9a962]/30" />
              <div className="h-px w-12 bg-[#c9a962]/25" />
            </div>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-0">
            {[
              { step: "01", label: "Onboard", desc: "Define scope, risk tier, and timeline." },
              { step: "02", label: "Investigate", desc: "Analyst-led research across open and proprietary sources." },
              { step: "03", label: "Monitor", desc: "Continuous screening for material changes." },
              { step: "04", label: "Refresh", desc: "Periodic re-assessment to maintain audit readiness." },
            ].map(({ step, label, desc }, i) => (
              <div key={step} className="relative flex flex-col items-center text-center p-8">
                {i < 3 && (
                  <div className="hidden lg:block absolute top-14 right-0 w-full h-px bg-gradient-to-r from-[#c9a962]/20 via-[#c9a962]/30 to-[#c9a962]/20 translate-x-1/2" />
                )}
                <span className="font-display text-4xl font-bold text-[#c9a962]/20 mb-3 tracking-tight">{step}</span>
                <h3 className="font-display text-lg font-semibold text-[#1a1a2e] mb-2 tracking-tight">{label}</h3>
                <p className="text-[13px] text-[#1a1a2e]/50 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </RevealSection>
      </section>

      {/* ═══════════════════ PORTAL PREVIEW ═══════════════════ */}
      <section className="bg-white py-28">
        <RevealSection className="mx-auto max-w-7xl px-6">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <p className="text-[#c9a962] text-xs font-semibold uppercase tracking-[0.2em] mb-3">Client Portal</p>
              <h2 className="font-display text-3xl sm:text-4xl font-semibold text-[#1a1a2e] tracking-tight">
                Your assurance, always accessible
              </h2>
              <div className="mt-5 mb-10 flex items-center gap-3">
                <div className="h-px w-12 bg-[#c9a962]/25" />
                <div className="w-1.5 h-1.5 rotate-45 border border-[#c9a962]/30" />
              </div>
              <ul className="space-y-5">
                {[
                  { icon: Lock, text: "Secure delivery — encrypted, role-gated access" },
                  { icon: Eye, text: "Case status & milestones — real-time visibility" },
                  { icon: Search, text: "Searchable archive — find any entity instantly" },
                  { icon: Calendar, text: "Re-check scheduling — never miss a review cycle" },
                  { icon: Download, text: "Exportable board pack — PDF bundle ready for governance" },
                ].map(({ icon: Icon, text }) => (
                  <li key={text} className="flex items-start gap-3">
                    <div className="mt-0.5 h-7 w-7 rounded-md bg-[#1a1a2e] flex items-center justify-center shrink-0 shadow-sm">
                      <Icon className="h-3.5 w-3.5 text-[#c9a962]" />
                    </div>
                    <span className="text-[13px] text-[#1a1a2e]/65 leading-relaxed">{text}</span>
                  </li>
                ))}
              </ul>
            </div>
            {/* Mock portal UI */}
            <div className="rounded-xl border border-[#c9a962]/12 bg-gradient-to-b from-[#f6f0e6] to-[#f2ece0] p-8 shadow-[0_20px_60px_-20px_rgba(26,26,46,0.15)]">
              <div className="flex items-center gap-2 mb-6">
                <div className="h-2.5 w-2.5 rounded-full bg-[#c9a962]/40" />
                <div className="h-2.5 w-2.5 rounded-full bg-[#c9a962]/25" />
                <div className="h-2.5 w-2.5 rounded-full bg-[#c9a962]/10" />
                <span className="ml-3 text-[11px] text-[#1a1a2e]/25 font-medium tracking-wide">portal.cliftonruskin.com</span>
              </div>
              <div className="space-y-3">
                {["Novartis AG — Assurance Note", "Kier Group plc — Dossier", "Apex Holdings Ltd — Refresh Note"].map((item, i) => (
                  <div key={item} className="flex items-center justify-between rounded-lg bg-white p-4 border border-[#1a1a2e]/[0.04] shadow-sm">
                    <div>
                      <p className="text-[13px] font-medium text-[#1a1a2e] tracking-tight">{item}</p>
                      <p className="text-[11px] text-[#1a1a2e]/35 mt-0.5">{["Delivered", "In progress", "Scheduled"][i]}</p>
                    </div>
                    <span className={`text-[10px] font-semibold uppercase tracking-wider px-2.5 py-1 rounded-full ${
                      i === 0 ? "bg-emerald-50 text-emerald-700 border border-emerald-200/50" : i === 1 ? "bg-amber-50 text-amber-700 border border-amber-200/50" : "bg-sky-50 text-sky-700 border border-sky-200/50"
                    }`}>
                      {["Complete", "Active", "Pending"][i]}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </RevealSection>
      </section>

      {/* ═══════════════════ FINAL CTA ═══════════════════ */}
      <section className="bg-[#1a1a2e] py-24 relative overflow-hidden">
        <div className="absolute inset-0 opacity-[0.02]" style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, white 1px, transparent 0)`,
          backgroundSize: "40px 40px",
        }} />
        <RevealSection className="mx-auto max-w-3xl px-6 text-center relative">
          <div className="mx-auto mb-8 flex items-center gap-3 justify-center">
            <div className="h-px w-12 bg-[#c9a962]/25" />
            <div className="w-1.5 h-1.5 rotate-45 border border-[#c9a962]/30" />
            <div className="h-px w-12 bg-[#c9a962]/25" />
          </div>
          <h2 className="font-display text-3xl sm:text-4xl font-semibold text-white tracking-tight mb-5">
            A confidential conversation.
          </h2>
          <p className="text-white/45 text-[13px] mb-10 max-w-lg mx-auto leading-relaxed">
            Whether you're assessing a new supplier, preparing for a transaction, or strengthening your third-party governance — we're ready to listen.
          </p>
          <Link to="/contact">
            <Button size="lg" className="bg-[#c9a962] hover:bg-[#c9a962]/90 text-[#1a1a2e] font-semibold rounded-full px-10 shadow-[0_4px_20px_-4px_rgba(201,169,98,0.3)] hover:shadow-[0_4px_24px_-4px_rgba(201,169,98,0.45)] transition-all duration-500">
              Get in Touch
            </Button>
          </Link>
          <p className="mt-6 text-[11px] text-white/25 tracking-wide italic">
            All enquiries treated in strict confidence.
          </p>
        </RevealSection>
      </section>
    </div>
  );
}
