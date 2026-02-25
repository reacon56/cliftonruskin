import { useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Download, Shield } from "lucide-react";
import { DATA_CATEGORY_OPTIONS, MITIGATION_OPTIONS } from "./LiaFormTypes";

interface Props {
  lia: any;
  entityName?: string;
  orgName?: string;
}

export default function LiaExportView({ lia, entityName, orgName }: Props) {
  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = useCallback(() => {
    if (!printRef.current) return;
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Mini-LIA — ${entityName || "Assessment"}</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;600;700&family=DM+Sans:wght@400;500;600&display=swap');
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: 'DM Sans', sans-serif; color: #1a1a2e; padding: 40px; max-width: 800px; margin: 0 auto; font-size: 11px; line-height: 1.6; }
          h1 { font-family: 'Cormorant Garamond', serif; font-size: 22px; font-weight: 700; margin-bottom: 4px; }
          h2 { font-family: 'Cormorant Garamond', serif; font-size: 14px; font-weight: 600; margin: 16px 0 8px; border-bottom: 1px solid #e5e7eb; padding-bottom: 4px; }
          .header { border-bottom: 2px solid #d4a843; padding-bottom: 16px; margin-bottom: 20px; }
          .header-meta { display: flex; justify-content: space-between; font-size: 10px; color: #6b7280; margin-top: 8px; }
          .gold-accent { color: #d4a843; }
          .badge { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 9px; font-weight: 600; text-transform: uppercase; }
          .badge-low { background: #dcfce7; color: #166534; }
          .badge-medium { background: #fef3c7; color: #92400e; }
          .badge-high { background: #fecaca; color: #991b1b; }
          .row { display: flex; justify-content: space-between; padding: 4px 0; }
          .label { color: #6b7280; }
          .chips { display: flex; flex-wrap: wrap; gap: 4px; margin-top: 4px; }
          .chip { display: inline-block; padding: 2px 6px; border: 1px solid #e5e7eb; border-radius: 3px; font-size: 9px; }
          .disclaimer { margin-top: 24px; padding: 12px; border: 1px solid #e5e7eb; border-radius: 6px; font-size: 9px; color: #6b7280; font-style: italic; }
          .footer { margin-top: 24px; border-top: 1px solid #e5e7eb; padding-top: 12px; font-size: 9px; color: #9ca3af; text-align: center; }
          @media print { body { padding: 20px; } }
        </style>
      </head>
      <body>${printRef.current.innerHTML}
      <div class="footer">
        <div>Far View & Chase Ltd · Confidential</div>
        <div>This document was generated from the FV&C Assurance Portal</div>
      </div>
      </body></html>
    `);
    printWindow.document.close();
    setTimeout(() => { printWindow.print(); }, 500);
  }, [entityName]);

  const getLevelBadge = (level: string) => {
    const cls = level === "high" ? "badge-high" : level === "medium" ? "badge-medium" : "badge-low";
    return `<span class="badge ${cls}">${level}</span>`;
  };

  const catLabel = (v: string) => DATA_CATEGORY_OPTIONS.find((c) => c.value === v)?.label || v;
  const mitLabel = (v: string) => MITIGATION_OPTIONS.find((m) => m.value === v)?.label || v;

  const balancing = lia.balancing_test_factors || {};
  const categories: string[] = Array.isArray(lia.data_categories) ? lia.data_categories : [];
  const subjects: string[] = Array.isArray(lia.data_subjects) ? lia.data_subjects : [];
  const sources: string[] = Array.isArray(lia.sources) ? lia.sources : [];
  const mitigations: string[] = Array.isArray(balancing.mitigations) ? balancing.mitigations : [];

  const outcomeLabel = lia.outcome === "proceed_with_conditions" ? "Proceed with conditions" : lia.outcome === "do_not_proceed" ? "Do not proceed" : "Proceed";

  return (
    <div>
      <div className="flex justify-end mb-4">
        <Button size="sm" variant="outline" onClick={handlePrint} className="gap-1.5">
          <Download size={13} /> Export PDF
        </Button>
      </div>

      <div ref={printRef}>
        <div className="header">
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Shield size={18} className="gold-accent" style={{ color: "#d4a843" }} />
            <h1>Legitimate Interests Assessment</h1>
          </div>
          <div className="header-meta">
            <div>
              {orgName && <span>{orgName}</span>}
              {entityName && <span> · {entityName}</span>}
              {lia.case_id && <span> · Case {String(lia.case_id).slice(0, 8).toUpperCase()}</span>}
            </div>
            <div>{new Date(lia.created_at || Date.now()).toLocaleDateString()} · {new Date(lia.created_at || Date.now()).toLocaleTimeString()}</div>
          </div>
        </div>

        <h2>Purpose</h2>
        <p>{lia.purpose || "—"}</p>

        <h2>Legitimate Interest</h2>
        <p>{lia.legitimate_interest || "—"}</p>

        <h2>Necessity</h2>
        <p>{lia.necessity || "—"}</p>

        {subjects.length > 0 && (
          <>
            <h2>Data Subjects</h2>
            <div className="chips">{subjects.map((s) => <span key={s} className="chip">{s}</span>)}</div>
          </>
        )}

        {categories.length > 0 && (
          <>
            <h2>Data Categories</h2>
            <div className="chips">{categories.map((c) => <span key={c} className="chip">{catLabel(c)}</span>)}</div>
          </>
        )}

        {sources.length > 0 && (
          <>
            <h2>Sources</h2>
            <div className="chips">{sources.map((s) => <span key={s} className="chip">{s}</span>)}</div>
          </>
        )}

        <h2>Balancing Test</h2>
        <div className="row"><span className="label">Reasonable expectations</span><span className={`badge badge-${balancing.reasonable_expectations || "low"}`}>{balancing.reasonable_expectations || "—"}</span></div>
        <div className="row"><span className="label">Likely impact</span><span className={`badge badge-${balancing.likely_impact || "low"}`}>{balancing.likely_impact || "—"}</span></div>
        <div className="row"><span className="label">Nature of processing</span><span>{balancing.nature_of_processing || "—"}</span></div>
        {mitigations.length > 0 && (
          <div style={{ marginTop: 4 }}>
            <span className="label">Mitigations: </span>
            {mitigations.map((m) => <span key={m} className="chip" style={{ marginRight: 4 }}>{mitLabel(m)}</span>)}
          </div>
        )}

        <h2>Safeguards &amp; Retention</h2>
        <p>{lia.safeguards || "—"}</p>
        <div className="row"><span className="label">Retention</span><span>{lia.retention_months === 0 ? "Per policy" : lia.retention_months ? `${lia.retention_months} months` : "—"}</span></div>

        <h2>Outcome</h2>
        <div className="row"><span className="label">Decision</span><span style={{ fontWeight: 600 }}>{outcomeLabel}</span></div>
        {lia.conditions && <p style={{ marginTop: 4 }}><span className="label">Conditions: </span>{lia.conditions}</p>}

        <div className="disclaimer">
          This summary is provided for governance/audit purposes and is not legal advice. Clients remain responsible for confirming their lawful basis and compliance obligations.
        </div>
      </div>
    </div>
  );
}
