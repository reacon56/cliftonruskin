import { useRef, useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Download, Shield } from "lucide-react";
import { DATA_CATEGORY_OPTIONS, MITIGATION_OPTIONS } from "./LiaFormTypes";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface Props {
  lia: any;
  entityName?: string;
  orgName?: string;
}

const LEVEL_COLORS: Record<string, { bg: string; fg: string }> = {
  high: { bg: "#fecaca", fg: "#991b1b" },
  medium: { bg: "#fef3c7", fg: "#92400e" },
  low: { bg: "#dcfce7", fg: "#166534" },
  limited: { bg: "#dbeafe", fg: "#1e40af" },
  routine: { bg: "#dbeafe", fg: "#1e40af" },
  extensive: { bg: "#fef3c7", fg: "#92400e" },
};

const OUTCOME_STYLES: Record<string, { bg: string; fg: string; border: string }> = {
  proceed: { bg: "#dcfce7", fg: "#166534", border: "#bbf7d0" },
  proceed_with_conditions: { bg: "#fef3c7", fg: "#92400e", border: "#fde68a" },
  do_not_proceed: { bg: "#fecaca", fg: "#991b1b", border: "#fca5a5" },
};

export default function LiaExportView({ lia, entityName, orgName: orgNameProp }: Props) {
  const printRef = useRef<HTMLDivElement>(null);
  const { profile } = useAuth();
  const [orgName, setOrgName] = useState(orgNameProp || "");

  useEffect(() => {
    if (orgNameProp) return;
    if (!profile?.org_id) return;
    supabase.from("organisations").select("name").eq("id", profile.org_id).single()
      .then(({ data }) => { if (data) setOrgName(data.name); });
  }, [profile?.org_id, orgNameProp]);

  const catLabel = (v: string) => DATA_CATEGORY_OPTIONS.find((c) => c.value === v)?.label || v;
  const mitLabel = (v: string) => MITIGATION_OPTIONS.find((m) => m.value === v)?.label || v;

  const balancing = lia.balancing_test_factors || {};
  const categories: string[] = Array.isArray(lia.data_categories) ? lia.data_categories : [];
  const subjects: string[] = Array.isArray(lia.data_subjects) ? lia.data_subjects : [];
  const sources: string[] = Array.isArray(lia.sources) ? lia.sources : [];
  const mitigations: string[] = Array.isArray(balancing.mitigations) ? balancing.mitigations : [];
  const outcomeLabel = lia.outcome === "proceed_with_conditions" ? "Proceed with conditions" : lia.outcome === "do_not_proceed" ? "Do not proceed" : "Proceed";
  const outcomeStyle = OUTCOME_STYLES[lia.outcome] || OUTCOME_STYLES.proceed;
  const approvedDate = lia.approved_at ? new Date(lia.approved_at).toLocaleDateString() : null;

  const handlePrint = useCallback(() => {
    if (!printRef.current) return;
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;
    printWindow.document.write(`<!DOCTYPE html><html><head>
      <title>Mini-LIA — ${orgName || "Assessment"}</title>
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;600;700&family=DM+Sans:wght@400;500;600&display=swap');
        *{margin:0;padding:0;box-sizing:border-box}
        body{font-family:'DM Sans',sans-serif;color:#1a1a2e;padding:32px 40px;max-width:800px;margin:0 auto;font-size:10.5px;line-height:1.55}
        h1{font-family:'Cormorant Garamond',serif;font-size:20px;font-weight:700;letter-spacing:-0.3px}
        h2{font-family:'Cormorant Garamond',serif;font-size:13px;font-weight:600;margin:14px 0 6px;border-bottom:1px solid #e5e7eb;padding-bottom:3px;color:#374151}
        .header{border-bottom:2.5px solid #d4a843;padding-bottom:14px;margin-bottom:16px}
        .header-row{display:flex;align-items:center;gap:8px}
        .header-meta{display:flex;justify-content:space-between;font-size:9.5px;color:#6b7280;margin-top:6px}
        .monogram{width:28px;height:28px;border-radius:4px;background:linear-gradient(135deg,#d4a843,#b8922e);display:flex;align-items:center;justify-content:center;color:#fff;font-family:'Cormorant Garamond',serif;font-weight:700;font-size:13px}
        .badge{display:inline-block;padding:2px 8px;border-radius:4px;font-size:8.5px;font-weight:600;text-transform:uppercase;letter-spacing:0.3px}
        .row{display:flex;justify-content:space-between;align-items:center;padding:3px 0}
        .label{color:#6b7280;font-size:10px}
        .chips{display:flex;flex-wrap:wrap;gap:3px;margin-top:3px}
        .chip{display:inline-block;padding:1.5px 6px;border:1px solid #d1d5db;border-radius:3px;font-size:8.5px;color:#374151}
        .balancing-grid{display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin:6px 0}
        .balancing-card{border:1px solid #e5e7eb;border-radius:6px;padding:8px 10px;text-align:center}
        .balancing-card .card-label{font-size:8.5px;color:#6b7280;margin-bottom:4px;text-transform:uppercase;letter-spacing:0.3px}
        .balancing-card .card-value{font-size:10px;font-weight:600;padding:2px 8px;border-radius:4px;display:inline-block}
        .outcome-box{border:2px solid ${outcomeStyle.border};background:${outcomeStyle.bg};border-radius:8px;padding:10px 14px;margin:6px 0;display:flex;align-items:center;justify-content:space-between}
        .outcome-box .decision{font-size:13px;font-weight:700;color:${outcomeStyle.fg};font-family:'Cormorant Garamond',serif}
        .outcome-box .status-tag{font-size:8px;padding:2px 6px;border-radius:3px;font-weight:600;text-transform:uppercase;letter-spacing:0.4px}
        .disclaimer{margin-top:18px;padding:10px 12px;border:1px solid #e5e7eb;border-radius:6px;font-size:8.5px;color:#6b7280;font-style:italic;line-height:1.5}
        .footer{position:fixed;bottom:0;left:0;right:0;padding:10px 40px;border-top:1.5px solid #d4a843;font-size:8px;color:#9ca3af;display:flex;justify-content:space-between;background:#fff}
        .footer .left{color:#6b7280}
        .footer .right{text-align:right}
        @media print{body{padding:24px 32px 60px}@page{size:A4;margin:12mm 16mm 20mm}}
      </style>
    </head><body>${printRef.current.innerHTML}
      <div class="footer">
        <div class="left"><strong style="color:#d4a843">FV&C</strong> &nbsp;Far View & Chase Ltd · Confidential</div>
        <div class="right">Generated from the FV&C Assurance Portal<br/>This document is not legal advice. Liability is excluded to the fullest extent permitted by law.</div>
      </div>
    </body></html>`);
    printWindow.document.close();
    setTimeout(() => printWindow.print(), 400);
  }, [orgName, outcomeStyle]);

  const levelStyle = (level: string) => {
    const c = LEVEL_COLORS[level] || LEVEL_COLORS.low;
    return { background: c.bg, color: c.fg };
  };

  return (
    <div>
      <div className="flex justify-end mb-4">
        <Button size="sm" variant="outline" onClick={handlePrint} className="gap-1.5">
          <Download size={13} /> Export PDF
        </Button>
      </div>

      <div ref={printRef}>
        {/* Header */}
        <div className="header">
          <div className="header-row" style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div className="monogram" style={{ width: 28, height: 28, borderRadius: 4, background: "linear-gradient(135deg,#d4a843,#b8922e)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontFamily: "'Cormorant Garamond',serif", fontWeight: 700, fontSize: 13 }}>
              FV
            </div>
            <h1 style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 20, fontWeight: 700 }}>Legitimate Interests Assessment</h1>
          </div>
          <div className="header-meta" style={{ display: "flex", justifyContent: "space-between", fontSize: "9.5px", color: "#6b7280", marginTop: 6 }}>
            <div>
              {orgName && <span style={{ fontWeight: 600 }}>{orgName}</span>}
              {entityName && <span> · {entityName}</span>}
              {lia.case_id && <span> · Case {String(lia.case_id).slice(0, 8).toUpperCase()}</span>}
            </div>
            <div>{new Date(lia.created_at || Date.now()).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</div>
          </div>
        </div>

        {/* Purpose & Interest */}
        <h2 style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 13, fontWeight: 600, margin: "14px 0 6px", borderBottom: "1px solid #e5e7eb", paddingBottom: 3, color: "#374151" }}>Purpose</h2>
        <p style={{ fontSize: "10.5px" }}>{lia.purpose || "—"}</p>

        <h2 style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 13, fontWeight: 600, margin: "14px 0 6px", borderBottom: "1px solid #e5e7eb", paddingBottom: 3, color: "#374151" }}>Legitimate Interest</h2>
        <p style={{ fontSize: "10.5px" }}>{lia.legitimate_interest || "—"}</p>

        <h2 style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 13, fontWeight: 600, margin: "14px 0 6px", borderBottom: "1px solid #e5e7eb", paddingBottom: 3, color: "#374151" }}>Necessity</h2>
        <p style={{ fontSize: "10.5px" }}>{lia.necessity || "—"}</p>

        {/* Data scope */}
        {(subjects.length > 0 || categories.length > 0 || sources.length > 0) && (
          <>
            <h2 style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 13, fontWeight: 600, margin: "14px 0 6px", borderBottom: "1px solid #e5e7eb", paddingBottom: 3, color: "#374151" }}>Data Scope</h2>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, fontSize: "9.5px" }}>
              {subjects.length > 0 && (
                <div>
                  <div style={{ color: "#6b7280", fontSize: "8.5px", textTransform: "uppercase", letterSpacing: "0.3px", marginBottom: 3 }}>Subjects</div>
                  <div className="chips" style={{ display: "flex", flexWrap: "wrap", gap: 3 }}>{subjects.map((s) => <span key={s} className="chip" style={{ display: "inline-block", padding: "1.5px 6px", border: "1px solid #d1d5db", borderRadius: 3, fontSize: "8.5px", color: "#374151" }}>{s}</span>)}</div>
                </div>
              )}
              {categories.length > 0 && (
                <div>
                  <div style={{ color: "#6b7280", fontSize: "8.5px", textTransform: "uppercase", letterSpacing: "0.3px", marginBottom: 3 }}>Categories</div>
                  <div className="chips" style={{ display: "flex", flexWrap: "wrap", gap: 3 }}>{categories.map((c) => <span key={c} className="chip" style={{ display: "inline-block", padding: "1.5px 6px", border: "1px solid #d1d5db", borderRadius: 3, fontSize: "8.5px", color: "#374151" }}>{catLabel(c)}</span>)}</div>
                </div>
              )}
              {sources.length > 0 && (
                <div>
                  <div style={{ color: "#6b7280", fontSize: "8.5px", textTransform: "uppercase", letterSpacing: "0.3px", marginBottom: 3 }}>Sources</div>
                  <div className="chips" style={{ display: "flex", flexWrap: "wrap", gap: 3 }}>{sources.map((s) => <span key={s} className="chip" style={{ display: "inline-block", padding: "1.5px 6px", border: "1px solid #d1d5db", borderRadius: 3, fontSize: "8.5px", color: "#374151" }}>{s}</span>)}</div>
                </div>
              )}
            </div>
          </>
        )}

        {/* Balancing Test — visual indicator cards */}
        <h2 style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 13, fontWeight: 600, margin: "14px 0 6px", borderBottom: "1px solid #e5e7eb", paddingBottom: 3, color: "#374151" }}>Balancing Test</h2>
        <div className="balancing-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, margin: "6px 0" }}>
          {[
            { label: "Reasonable Expectations", value: balancing.reasonable_expectations },
            { label: "Likely Impact", value: balancing.likely_impact },
            { label: "Nature of Processing", value: balancing.nature_of_processing },
          ].map((item) => (
            <div key={item.label} className="balancing-card" style={{ border: "1px solid #e5e7eb", borderRadius: 6, padding: "8px 10px", textAlign: "center" }}>
              <div style={{ fontSize: "8.5px", color: "#6b7280", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.3px" }}>{item.label}</div>
              <span className="badge" style={{ ...levelStyle(item.value || "low"), display: "inline-block", padding: "2px 8px", borderRadius: 4, fontSize: "8.5px", fontWeight: 600, textTransform: "uppercase" }}>
                {item.value || "—"}
              </span>
            </div>
          ))}
        </div>
        {mitigations.length > 0 && (
          <div style={{ marginTop: 4, fontSize: "9.5px" }}>
            <span style={{ color: "#6b7280" }}>Mitigations: </span>
            {mitigations.map((m) => <span key={m} className="chip" style={{ display: "inline-block", padding: "1.5px 6px", border: "1px solid #d1d5db", borderRadius: 3, fontSize: "8.5px", color: "#374151", marginRight: 4 }}>{mitLabel(m)}</span>)}
          </div>
        )}

        {/* Safeguards */}
        <h2 style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 13, fontWeight: 600, margin: "14px 0 6px", borderBottom: "1px solid #e5e7eb", paddingBottom: 3, color: "#374151" }}>Safeguards &amp; Retention</h2>
        <p style={{ fontSize: "10.5px" }}>{lia.safeguards || "—"}</p>
        <div className="row" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "3px 0", fontSize: "10.5px" }}>
          <span style={{ color: "#6b7280" }}>Retention period</span>
          <span>{lia.retention_months === 0 ? "Per policy" : lia.retention_months ? `${lia.retention_months} months` : "—"}</span>
        </div>

        {/* Outcome — prominent box */}
        <h2 style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 13, fontWeight: 600, margin: "14px 0 6px", borderBottom: "1px solid #e5e7eb", paddingBottom: 3, color: "#374151" }}>Outcome</h2>
        <div className="outcome-box" style={{ border: `2px solid ${outcomeStyle.border}`, background: outcomeStyle.bg, borderRadius: 8, padding: "10px 14px", margin: "6px 0", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: outcomeStyle.fg, fontFamily: "'Cormorant Garamond',serif" }}>{outcomeLabel}</div>
            {lia.conditions && <div style={{ fontSize: "9.5px", color: "#374151", marginTop: 2 }}>{lia.conditions}</div>}
          </div>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 3 }}>
            <span className="badge" style={{ fontSize: "8px", padding: "2px 6px", borderRadius: 3, fontWeight: 600, textTransform: "uppercase", background: lia.status === "final" ? "#dcfce7" : "#f3f4f6", color: lia.status === "final" ? "#166534" : "#6b7280" }}>
              {lia.status}
            </span>
            {approvedDate && (
              <span style={{ fontSize: "8px", color: "#6b7280" }}>Approved {approvedDate}</span>
            )}
          </div>
        </div>

        {/* Disclaimer */}
        <div className="disclaimer" style={{ marginTop: 18, padding: "10px 12px", border: "1px solid #e5e7eb", borderRadius: 6, fontSize: "8.5px", color: "#6b7280", fontStyle: "italic", lineHeight: 1.5 }}>
          This summary is provided for governance and audit purposes only and does not constitute legal advice.
          Clients remain responsible for confirming their lawful basis and ongoing compliance obligations under applicable data protection legislation.
          Far View &amp; Chase Ltd accepts no liability for decisions made in reliance on this document.
        </div>
      </div>
    </div>
  );
}
