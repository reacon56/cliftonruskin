import { useState } from "react";
import { Link, Outlet, useLocation } from "react-router-dom";
import { Menu, X, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";

const navLinks = [
  { label: "Home", to: "/" },
  { label: "About", to: "/about" },
  { label: "Services", to: "/services" },
  { label: "Sectors", to: "/sectors" },
  { label: "Insights", to: "/insights" },
  { label: "Observations", to: "/observations" },
  { label: "Contact", to: "/contact" },
];

export default function WebsiteLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { pathname } = useLocation();

  return (
    <div className="min-h-screen flex flex-col bg-[#f6f0e6] text-foreground font-body">
      {/* ─── Navbar ─── */}
      <header className="sticky top-0 z-50 border-b border-[#c9a962]/20 bg-[#f6f0e6]/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-3 group">
            <img
              src="/images/clifton-ruskin-logo.png"
              alt="Clifton Ruskin"
              className="h-10 w-10 rounded-full transition-shadow duration-500 group-hover:shadow-[0_0_16px_hsl(38_55%_52%/0.25)]"
            />
            <span className="font-display text-xl font-semibold tracking-tight text-[#1a1a2e]">
              Clifton Ruskin
            </span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden lg:flex items-center gap-8">
            {navLinks.map((l) => (
              <Link
                key={l.to}
                to={l.to}
                className={`text-sm font-medium transition-colors duration-200 hover:text-[#c9a962] ${
                  pathname === l.to ? "text-[#c9a962]" : "text-[#1a1a2e]/70"
                }`}
              >
                {l.label}
              </Link>
            ))}
          </nav>

          {/* Desktop CTA cluster */}
          <div className="hidden lg:flex items-center gap-3">
            <Link to="/contact" className="flex items-center gap-1.5 text-sm font-medium text-[#1a1a2e]/70 hover:text-[#c9a962] transition-colors">
              <Phone className="h-3.5 w-3.5" />
              Request a Call
            </Link>
            <Link to="/auth">
              <Button variant="outline" size="sm" className="border-[#c9a962] text-[#c9a962] hover:bg-[#c9a962]/10 rounded-full px-5">
                Client Login
              </Button>
            </Link>
          </div>

          {/* Mobile toggle */}
          <button className="lg:hidden p-2 text-[#1a1a2e]" onClick={() => setMobileOpen(!mobileOpen)}>
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        {/* Mobile menu */}
        {mobileOpen && (
          <div className="lg:hidden border-t border-[#c9a962]/10 bg-[#f6f0e6] animate-fade-in">
            <nav className="flex flex-col px-6 py-4 gap-3">
              {navLinks.map((l) => (
                <Link
                  key={l.to}
                  to={l.to}
                  onClick={() => setMobileOpen(false)}
                  className={`text-sm font-medium py-2 ${
                    pathname === l.to ? "text-[#c9a962]" : "text-[#1a1a2e]/70"
                  }`}
                >
                  {l.label}
                </Link>
              ))}
              <div className="flex flex-col gap-2 pt-3 border-t border-[#c9a962]/10">
                <Link to="/contact" onClick={() => setMobileOpen(false)} className="text-sm font-medium text-[#1a1a2e]/70">
                  Request a Call
                </Link>
                <Link to="/auth" onClick={() => setMobileOpen(false)}>
                  <Button variant="outline" size="sm" className="border-[#c9a962] text-[#c9a962] w-full rounded-full">
                    Client Login
                  </Button>
                </Link>
              </div>
            </nav>
          </div>
        )}
      </header>

      {/* ─── Page content ─── */}
      <main className="flex-1">
        <Outlet />
      </main>

      {/* ─── Footer ─── */}
      <footer className="border-t border-[#c9a962]/20 bg-[#1a1a2e] text-[#f6f0e6]/70">
        <div className="mx-auto max-w-7xl px-6 py-12">
          <div className="flex flex-col md:flex-row justify-between gap-8">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <img src="/images/clifton-ruskin-logo.png" alt="CR" className="h-8 w-8 rounded-full" />
                <span className="font-display text-lg font-semibold text-[#f6f0e6]">Clifton Ruskin</span>
              </div>
              <p className="text-sm leading-relaxed max-w-sm">
                Clifton Ruskin Ltd&ensp;|&ensp;London&ensp;|&ensp;Est. 2026<br />
                Due diligence &amp; assurance
              </p>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-8 text-sm">
              <div className="flex flex-col gap-2">
                <span className="font-semibold text-[#c9a962] text-xs uppercase tracking-widest mb-1">Navigate</span>
                {navLinks.slice(1).map((l) => (
                  <Link key={l.to} to={l.to} className="hover:text-[#c9a962] transition-colors">{l.label}</Link>
                ))}
              </div>
              <div className="flex flex-col gap-2">
                <span className="font-semibold text-[#c9a962] text-xs uppercase tracking-widest mb-1">Legal</span>
                <Link to="/privacy" className="hover:text-[#c9a962] transition-colors">Privacy Policy</Link>
                <Link to="/terms" className="hover:text-[#c9a962] transition-colors">Terms of Service</Link>
                <Link to="/cookies" className="hover:text-[#c9a962] transition-colors">Cookie Policy</Link>
              </div>
              <div className="flex flex-col gap-2">
                <span className="font-semibold text-[#c9a962] text-xs uppercase tracking-widest mb-1">Connect</span>
                <Link to="/contact" className="hover:text-[#c9a962] transition-colors">Contact</Link>
                <Link to="/auth" className="hover:text-[#c9a962] transition-colors">Client Portal</Link>
              </div>
            </div>
          </div>
          {/* Gold rule */}
          <div className="mt-10 h-px w-full bg-gradient-to-r from-transparent via-[#c9a962]/40 to-transparent" />
          <p className="mt-6 text-xs text-center text-[#f6f0e6]/40">
            © {new Date().getFullYear()} Clifton Ruskin Ltd. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
