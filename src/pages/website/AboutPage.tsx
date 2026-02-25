import { Target, Search, FileCheck, ShieldCheck, BookOpen, Clock, CheckCircle } from "lucide-react";

const GoldRule = ({ className = "" }: { className?: string }) => (
  <div className={`h-px w-16 bg-gradient-to-r from-[#c9a962] to-[#c9a962]/0 ${className}`} />
);

export default function AboutPage() {
  return (
    <div>
      {/* Hero */}
      <section className="bg-[#1a1a2e] py-28">
        <div className="mx-auto max-w-7xl px-6 text-center">
          <p className="text-[#c9a962] text-xs font-semibold uppercase tracking-[0.2em] mb-4">About</p>
          <h1 className="font-display text-4xl sm:text-5xl font-semibold text-white tracking-tight leading-[1.1]">
            Built on discipline,<br />delivered with discretion.
          </h1>
          <p className="mt-6 max-w-2xl mx-auto text-lg text-white/60 leading-relaxed">
            Clifton Ruskin was established in London in 2026, founded on decades of investigative and advisory experience. We serve organisations that require defensible, proportionate due diligence — from regulated institutions to growth-stage enterprises navigating complex partnerships.
          </p>
        </div>
      </section>

      {/* Values */}
      <section className="bg-[#f6f0e6] py-24">
        <div className="mx-auto max-w-7xl px-6">
          <p className="text-[#c9a962] text-xs font-semibold uppercase tracking-[0.2em] mb-3">Values</p>
          <h2 className="font-display text-3xl font-semibold text-[#1a1a2e] tracking-tight">What guides us</h2>
          <GoldRule className="mt-4 mb-12" />

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              { title: "Accuracy over speed", desc: "We would rather decline a deadline than compromise a finding." },
              { title: "Proportionality", desc: "Risk-based scope. We apply rigour where it matters, not uniformly." },
              { title: "Confidentiality", desc: "Information barriers, need-to-know access, and discretion as default." },
              { title: "Transparency", desc: "Clients see what we found, how we found it, and what confidence level we assign." },
              { title: "Independence", desc: "No referral relationships that might colour a conclusion." },
              { title: "Adaptability", desc: "Every mandate is different. We design scope around the actual risk, not a template." },
            ].map(({ title, desc }) => (
              <div key={title} className="p-6 rounded-xl border border-[#c9a962]/10 bg-white/60">
                <h3 className="font-display text-lg font-semibold text-[#1a1a2e] mb-2">{title}</h3>
                <p className="text-sm text-[#1a1a2e]/60 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Method & Discipline */}
      <section className="bg-white py-24">
        <div className="mx-auto max-w-7xl px-6">
          <p className="text-[#c9a962] text-xs font-semibold uppercase tracking-[0.2em] mb-3">Method</p>
          <h2 className="font-display text-3xl font-semibold text-[#1a1a2e] tracking-tight">Method &amp; discipline</h2>
          <GoldRule className="mt-4 mb-12" />

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              { icon: Target, step: "01", label: "Scope", desc: "Define objectives, risk tier, and information boundaries." },
              { icon: Search, step: "02", label: "Triage", desc: "Initial screening to calibrate depth and resource allocation." },
              { icon: FileCheck, step: "03", label: "Investigate", desc: "Structured research across open, proprietary, and in-country sources." },
              { icon: ShieldCheck, step: "04", label: "Assure", desc: "Findings graded, corroborated, and delivered with clear recommendations." },
            ].map(({ icon: Icon, step, label, desc }) => (
              <div key={step} className="text-center">
                <div className="mx-auto h-12 w-12 rounded-xl bg-[#1a1a2e] flex items-center justify-center mb-4">
                  <Icon className="h-5 w-5 text-[#c9a962]" />
                </div>
                <span className="text-xs font-semibold text-[#c9a962]">{step}</span>
                <h3 className="font-display text-lg font-semibold text-[#1a1a2e] mt-1 mb-2">{label}</h3>
                <p className="text-sm text-[#1a1a2e]/60 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Evidence Discipline */}
      <section className="bg-[#f6f0e6] py-24">
        <div className="mx-auto max-w-7xl px-6">
          <div className="max-w-3xl">
            <p className="text-[#c9a962] text-xs font-semibold uppercase tracking-[0.2em] mb-3">Evidence discipline</p>
            <h2 className="font-display text-3xl font-semibold text-[#1a1a2e] tracking-tight">
              Every finding is accountable
            </h2>
            <GoldRule className="mt-4 mb-8" />
            <p className="text-[#1a1a2e]/60 leading-relaxed mb-8">
              Our reports are built to withstand scrutiny. Every finding is sourced, dated, and — where possible — corroborated through independent channels. We assign confidence levels to each data point, so readers always know the basis for a conclusion.
            </p>
            <ul className="space-y-3">
              {[
                "Source type recorded for every data point",
                "Capture date stamped on all evidence",
                "Corroboration sought across independent channels",
                "Confidence grading applied to key findings",
              ].map((item) => (
                <li key={item} className="flex items-start gap-3">
                  <CheckCircle className="h-4 w-4 text-[#c9a962] mt-0.5 shrink-0" />
                  <span className="text-sm text-[#1a1a2e]/70">{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>
    </div>
  );
}
