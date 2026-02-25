import { useState } from "react";
import { MapPin, Mail, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const GoldRule = ({ className = "" }: { className?: string }) => (
  <div className={`h-px w-16 bg-gradient-to-r from-[#c9a962] to-[#c9a962]/0 ${className}`} />
);

export default function ContactPage() {
  const [submitted, setSubmitted] = useState(false);

  return (
    <div>
      {/* Hero */}
      <section className="bg-[#1a1a2e] py-28">
        <div className="mx-auto max-w-7xl px-6 text-center">
          <p className="text-[#c9a962] text-xs font-semibold uppercase tracking-[0.2em] mb-4">Contact</p>
          <h1 className="font-display text-4xl sm:text-5xl font-semibold text-white tracking-tight leading-[1.1]">
            A confidential conversation.
          </h1>
          <p className="mt-6 max-w-2xl mx-auto text-lg text-white/60 leading-relaxed">
            Tell us what you need. We'll respond promptly and with the discretion your situation requires.
          </p>
        </div>
      </section>

      <section className="bg-[#f6f0e6] py-24">
        <div className="mx-auto max-w-7xl px-6">
          <div className="grid lg:grid-cols-2 gap-16">
            {/* Form */}
            <div>
              <h2 className="font-display text-2xl font-semibold text-[#1a1a2e] mb-2">Get in touch</h2>
              <GoldRule className="mb-8" />

              {submitted ? (
                <div className="rounded-xl border border-[#c9a962]/20 bg-white/60 p-10 text-center">
                  <Shield className="h-10 w-10 text-[#c9a962] mx-auto mb-4" />
                  <h3 className="font-display text-xl font-semibold text-[#1a1a2e] mb-2">Message received.</h3>
                  <p className="text-sm text-[#1a1a2e]/60">We'll be in touch within one business day. Confidentiality is assured.</p>
                </div>
              ) : (
                <form
                  onSubmit={(e) => { e.preventDefault(); setSubmitted(true); }}
                  className="space-y-5"
                >
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-semibold uppercase tracking-wider text-[#1a1a2e]/50 block mb-1.5">Name</label>
                      <Input required placeholder="Your name" className="bg-white border-[#c9a962]/15 focus-visible:ring-[#c9a962]" />
                    </div>
                    <div>
                      <label className="text-xs font-semibold uppercase tracking-wider text-[#1a1a2e]/50 block mb-1.5">Organisation</label>
                      <Input placeholder="Company name" className="bg-white border-[#c9a962]/15 focus-visible:ring-[#c9a962]" />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-semibold uppercase tracking-wider text-[#1a1a2e]/50 block mb-1.5">Email</label>
                    <Input required type="email" placeholder="you@company.com" className="bg-white border-[#c9a962]/15 focus-visible:ring-[#c9a962]" />
                  </div>
                  <div>
                    <label className="text-xs font-semibold uppercase tracking-wider text-[#1a1a2e]/50 block mb-1.5">Phone (optional)</label>
                    <Input type="tel" placeholder="+44 ..." className="bg-white border-[#c9a962]/15 focus-visible:ring-[#c9a962]" />
                  </div>
                  <div>
                    <label className="text-xs font-semibold uppercase tracking-wider text-[#1a1a2e]/50 block mb-1.5">How can we help?</label>
                    <textarea
                      required
                      rows={4}
                      placeholder="Brief description of your requirements…"
                      className="flex w-full rounded-md border border-[#c9a962]/15 bg-white px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c9a962] focus-visible:ring-offset-2"
                    />
                  </div>
                  <Button type="submit" size="lg" className="bg-[#c9a962] hover:bg-[#c9a962]/90 text-[#1a1a2e] font-semibold rounded-full px-8 w-full sm:w-auto">
                    Send Enquiry
                  </Button>
                </form>
              )}
            </div>

            {/* Sidebar */}
            <div className="space-y-8">
              <div className="rounded-xl border border-[#c9a962]/10 bg-white/60 p-8">
                <div className="flex items-start gap-3 mb-4">
                  <Shield className="h-5 w-5 text-[#c9a962] mt-0.5" />
                  <div>
                    <h3 className="font-display text-lg font-semibold text-[#1a1a2e] mb-1">Confidentiality assumed</h3>
                    <p className="text-sm text-[#1a1a2e]/60 leading-relaxed">
                      All communications are treated as confidential from first contact. We do not share enquiry details with third parties.
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-[#c9a962]/10 bg-white/60 p-8">
                <div className="flex items-start gap-3 mb-4">
                  <MapPin className="h-5 w-5 text-[#c9a962] mt-0.5" />
                  <div>
                    <h3 className="font-display text-lg font-semibold text-[#1a1a2e] mb-1">Our office</h3>
                    <p className="text-sm text-[#1a1a2e]/60 leading-relaxed">
                      London, United Kingdom
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-[#c9a962]/10 bg-white/60 p-8">
                <div className="flex items-start gap-3">
                  <Mail className="h-5 w-5 text-[#c9a962] mt-0.5" />
                  <div>
                    <h3 className="font-display text-lg font-semibold text-[#1a1a2e] mb-1">Email</h3>
                    <p className="text-sm text-[#1a1a2e]/60 leading-relaxed">
                      enquiries@cliftonruskin.com
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
