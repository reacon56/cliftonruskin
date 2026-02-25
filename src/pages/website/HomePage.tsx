import { Link } from "react-router-dom";
import { Shield, Scale, Globe, Lock, ArrowRight, FileText, BookOpen, RefreshCw, Eye, CheckCircle, Search, Calendar, Download } from "lucide-react";
import { Button } from "@/components/ui/button";

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

        <div className="mx-auto max-w-7xl px-6 py-32 text-center">
          <p className="text-[#c9a962] text-xs font-semibold uppercase tracking-[0.2em] mb-6 animate-fade-in">
            Est. London 2026
          </p>
          <h1 className="font-display text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-semibold text-white leading-[1.1] tracking-tight animate-fade-in" style={{ animationDelay: "100ms" }}>
            Assurance for<br />consequential decisions.
          </h1>
          <p className="mt-6 max-w-2xl mx-auto text-lg text-white/70 leading-relaxed animate-fade-in" style={{ animationDelay: "200ms" }}>
            Analyst-led due diligence on companies, owners, and third parties — delivered with a clear audit trail.
          </p>
          <div className="mt-10 flex flex-wrap justify-center gap-4 animate-fade-in" style={{ animationDelay: "300ms" }}>
            <Link to="/contact">
              <Button size="lg" className="bg-[#c9a962] hover:bg-[#c9a962]/90 text-[#1a1a2e] font-semibold rounded-full px-8">
                Request a Consultation
              </Button>
            </Link>
            <Link to="/services">
              <Button variant="outline" size="lg" className="border-white/50 text-white hover:bg-white/10 rounded-full px-8">
                View Services
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* ═══════════════════ TRUST STRIP ═══════════════════ */}
      <section className="bg-[#1a1a2e] py-6">
        <p className="text-center text-xs uppercase tracking-[0.15em] text-white/40 font-medium">
          Trusted by teams who answer to boards, regulators, and shareholders
        </p>
      </section>

      {/* ═══════════════════ 4 PILLARS ═══════════════════ */}
      <section className="bg-[#f6f0e6] py-24">
        <div className="mx-auto max-w-7xl px-6">
          <p className="text-[#c9a962] text-xs font-semibold uppercase tracking-[0.2em] mb-3">Our Standard</p>
          <h2 className="font-display text-3xl sm:text-4xl font-semibold text-[#1a1a2e] tracking-tight">
            The Clifton Ruskin Standard
          </h2>
          <GoldRule className="mt-4 mb-12" />

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              { icon: Shield, title: "Defensible Outputs", desc: "Every finding sourced, dated, and ready for regulatory scrutiny." },
              { icon: Scale, title: "Proportionate Diligence", desc: "Scope matched to risk — no more, no less than the situation demands." },
              { icon: Globe, title: "Global Reach", desc: "In-country networks across 50+ jurisdictions, coordinated from London." },
              { icon: Lock, title: "Confidential by Default", desc: "Information barriers and need-to-know principles from first contact." },
            ].map(({ icon: Icon, title, desc }) => (
              <div key={title} className="group p-6 rounded-xl border border-[#c9a962]/10 bg-white/60 hover:bg-white transition-all duration-500 hover:shadow-lg">
                <div className="h-10 w-10 rounded-lg bg-[#1a1a2e] flex items-center justify-center mb-4 group-hover:bg-[#c9a962] transition-colors duration-500">
                  <Icon className="h-5 w-5 text-[#c9a962] group-hover:text-[#1a1a2e] transition-colors duration-500" />
                </div>
                <h3 className="font-display text-lg font-semibold text-[#1a1a2e] mb-2">{title}</h3>
                <p className="text-sm text-[#1a1a2e]/60 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════ PRODUCTS ═══════════════════ */}
      <section className="bg-[#1a1a2e] py-24">
        <div className="mx-auto max-w-7xl px-6">
          <p className="text-[#c9a962] text-xs font-semibold uppercase tracking-[0.2em] mb-3">Products</p>
          <h2 className="font-display text-3xl sm:text-4xl font-semibold text-white tracking-tight">
            Three levels of assurance
          </h2>
          <GoldRule className="mt-4 mb-12" />

          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                icon: FileText,
                title: "Assurance Note",
                desc: "Concise KYB/third-party summary with ranked risks and a clear recommendation. Ideal for onboarding decisions.",
                tag: "Standard",
              },
              {
                icon: BookOpen,
                title: "Assurance Dossier",
                desc: "Comprehensive investigation report with full evidence pack, source grading, and executive summary. For high-stakes mandates.",
                tag: "Enhanced",
              },
              {
                icon: RefreshCw,
                title: "Refresh Note",
                desc: "Update an existing assessment with material-change focus. Keeps your assurance current without repeating baseline work.",
                tag: "Ongoing",
              },
            ].map(({ icon: Icon, title, desc, tag }) => (
              <div key={title} className="group relative rounded-xl border border-white/10 bg-white/5 p-8 hover:border-[#c9a962]/30 transition-all duration-500">
                <span className="text-[10px] font-semibold uppercase tracking-[0.15em] text-[#c9a962]">{tag}</span>
                <div className="mt-4 h-10 w-10 rounded-lg bg-[#c9a962]/10 flex items-center justify-center mb-4">
                  <Icon className="h-5 w-5 text-[#c9a962]" />
                </div>
                <h3 className="font-display text-xl font-semibold text-white mb-3">{title}</h3>
                <p className="text-sm text-white/50 leading-relaxed">{desc}</p>
                <Link to="/services" className="mt-6 inline-flex items-center gap-1.5 text-sm text-[#c9a962] font-medium hover:gap-2.5 transition-all duration-300">
                  Learn more <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════ HOW IT WORKS ═══════════════════ */}
      <section className="bg-[#f6f0e6] py-24">
        <div className="mx-auto max-w-7xl px-6">
          <p className="text-[#c9a962] text-xs font-semibold uppercase tracking-[0.2em] mb-3">Process</p>
          <h2 className="font-display text-3xl sm:text-4xl font-semibold text-[#1a1a2e] tracking-tight">
            How it works
          </h2>
          <GoldRule className="mt-4 mb-12" />

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-0">
            {[
              { step: "01", label: "Onboard", desc: "Define scope, risk tier, and timeline." },
              { step: "02", label: "Investigate", desc: "Analyst-led research across open and proprietary sources." },
              { step: "03", label: "Monitor", desc: "Continuous screening for material changes." },
              { step: "04", label: "Refresh", desc: "Periodic re-assessment to maintain audit readiness." },
            ].map(({ step, label, desc }, i) => (
              <div key={step} className="relative flex flex-col items-center text-center p-8">
                {i < 3 && (
                  <div className="hidden lg:block absolute top-12 right-0 w-full h-px bg-gradient-to-r from-[#c9a962]/30 to-[#c9a962]/30 translate-x-1/2" />
                )}
                <span className="font-display text-3xl font-bold text-[#c9a962]/30 mb-2">{step}</span>
                <h3 className="font-display text-lg font-semibold text-[#1a1a2e] mb-2">{label}</h3>
                <p className="text-sm text-[#1a1a2e]/50 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════ PORTAL PREVIEW ═══════════════════ */}
      <section className="bg-white py-24">
        <div className="mx-auto max-w-7xl px-6">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <p className="text-[#c9a962] text-xs font-semibold uppercase tracking-[0.2em] mb-3">Client Portal</p>
              <h2 className="font-display text-3xl sm:text-4xl font-semibold text-[#1a1a2e] tracking-tight">
                Your assurance, always accessible
              </h2>
              <GoldRule className="mt-4 mb-8" />
              <ul className="space-y-4">
                {[
                  { icon: Lock, text: "Secure delivery — encrypted, role-gated access" },
                  { icon: Eye, text: "Case status & milestones — real-time visibility" },
                  { icon: Search, text: "Searchable archive — find any entity instantly" },
                  { icon: Calendar, text: "Re-check scheduling — never miss a review cycle" },
                  { icon: Download, text: "Exportable board pack — PDF bundle ready for governance" },
                ].map(({ icon: Icon, text }) => (
                  <li key={text} className="flex items-start gap-3">
                    <div className="mt-0.5 h-6 w-6 rounded-md bg-[#1a1a2e] flex items-center justify-center shrink-0">
                      <Icon className="h-3.5 w-3.5 text-[#c9a962]" />
                    </div>
                    <span className="text-sm text-[#1a1a2e]/70 leading-relaxed">{text}</span>
                  </li>
                ))}
              </ul>
            </div>
            {/* Mock portal UI */}
            <div className="rounded-xl border border-[#c9a962]/15 bg-[#f6f0e6] p-8 shadow-xl">
              <div className="flex items-center gap-2 mb-6">
                <div className="h-3 w-3 rounded-full bg-[#c9a962]/40" />
                <div className="h-3 w-3 rounded-full bg-[#c9a962]/20" />
                <div className="h-3 w-3 rounded-full bg-[#c9a962]/10" />
                <span className="ml-3 text-xs text-[#1a1a2e]/30 font-medium">portal.cliftonruskin.com</span>
              </div>
              <div className="space-y-3">
                {["Novartis AG — Assurance Note", "Kier Group plc — Dossier", "Apex Holdings Ltd — Refresh Note"].map((item, i) => (
                  <div key={item} className="flex items-center justify-between rounded-lg bg-white p-4 border border-[#c9a962]/10">
                    <div>
                      <p className="text-sm font-medium text-[#1a1a2e]">{item}</p>
                      <p className="text-xs text-[#1a1a2e]/40 mt-0.5">{["Delivered", "In progress", "Scheduled"][i]}</p>
                    </div>
                    <span className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                      i === 0 ? "bg-green-100 text-green-700" : i === 1 ? "bg-amber-100 text-amber-700" : "bg-blue-100 text-blue-700"
                    }`}>
                      {["Complete", "Active", "Pending"][i]}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════ FINAL CTA ═══════════════════ */}
      <section className="bg-[#1a1a2e] py-20">
        <div className="mx-auto max-w-3xl px-6 text-center">
          <GoldRule className="mx-auto mb-8" />
          <h2 className="font-display text-3xl sm:text-4xl font-semibold text-white tracking-tight mb-4">
            A confidential conversation.
          </h2>
          <p className="text-white/50 text-sm mb-8 max-w-lg mx-auto leading-relaxed">
            Whether you're assessing a new supplier, preparing for a transaction, or strengthening your third-party governance — we're ready to listen.
          </p>
          <Link to="/contact">
            <Button size="lg" className="bg-[#c9a962] hover:bg-[#c9a962]/90 text-[#1a1a2e] font-semibold rounded-full px-8">
              Get in Touch
            </Button>
          </Link>
        </div>
      </section>
    </div>
  );
}
