import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

/**
 * Hook that ensures a report + report_version exist for a case,
 * auto-creating the DRAFT report and version 1 if needed.
 */
export function useReportVersion(caseId: string, orgId: string | null) {
  const { user } = useAuth();
  const [reportId, setReportId] = useState<string | null>(null);
  const [versionId, setVersionId] = useState<string | null>(null);
  const [versionNumber, setVersionNumber] = useState(1);
  const [locked, setLocked] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      // 1. Find or create report
      let { data: report } = await supabase
        .from("report" as any)
        .select("id")
        .eq("case_id", caseId)
        .maybeSingle();

      if (!report) {
        const { data: newReport } = await supabase
          .from("report" as any)
          .insert({ case_id: caseId, client_id: orgId, status: "DRAFT" } as any)
          .select("id")
          .single();
        report = newReport;
      }

      if (!report) {
        setLoading(false);
        return;
      }

      setReportId((report as any).id);

      // 2. Find latest version or create version 1
      let { data: version } = await supabase
        .from("report_version" as any)
        .select("id, version_number, locked")
        .eq("report_id", (report as any).id)
        .order("version_number", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!version) {
        const { data: newVersion } = await supabase
          .from("report_version" as any)
          .insert({
            report_id: (report as any).id,
            version_number: 1,
            generated_by: user?.id,
          } as any)
          .select("id, version_number, locked")
          .single();
        version = newVersion;
      }

      if (version) {
        setVersionId((version as any).id);
        setVersionNumber((version as any).version_number);
        setLocked((version as any).locked ?? false);
      }
    } finally {
      setLoading(false);
    }
  }, [caseId, orgId, user?.id]);

  useEffect(() => {
    if (caseId) load();
  }, [caseId, load]);

  /** Create a new version (for amendments after issuing) */
  const createNewVersion = useCallback(async () => {
    if (!reportId) return;
    const nextVersion = versionNumber + 1;
    const { data } = await supabase
      .from("report_version" as any)
      .insert({
        report_id: reportId,
        version_number: nextVersion,
        generated_by: user?.id,
      } as any)
      .select("id, version_number, locked")
      .single();
    if (data) {
      setVersionId((data as any).id);
      setVersionNumber((data as any).version_number);
      setLocked(false);
    }
    return data;
  }, [reportId, versionNumber, user?.id]);

  /** Lock the current version and compute content hash */
  const lockVersion = useCallback(async () => {
    if (!versionId) return;

    // Fetch all sections for this version to compute a hash
    const { data: sections } = await supabase
      .from("report_section" as any)
      .select("section_key, content_markdown")
      .eq("report_version_id", versionId)
      .order("section_key");

    const hashInput = JSON.stringify(sections ?? []);
    // Simple hash for audit (not crypto-grade, but sufficient for change detection)
    const encoder = new TextEncoder();
    const hashBuffer = await crypto.subtle.digest("SHA-256", encoder.encode(hashInput));
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const contentHash = hashArray.map(b => b.toString(16).padStart(2, "0")).join("");

    await supabase
      .from("report_version" as any)
      .update({
        locked: true,
        locked_at: new Date().toISOString(),
        locked_by: user?.id,
        content_hash: contentHash,
      } as any)
      .eq("id", versionId);

    setLocked(true);
    return contentHash;
  }, [versionId, user?.id]);

  /** Issue the report (lock version + set status) */
  const issueReport = useCallback(async () => {
    const hash = await lockVersion();
    if (!reportId) return;
    await supabase
      .from("report" as any)
      .update({ status: "ISSUED", issued_at: new Date().toISOString() } as any)
      .eq("id", reportId);
    return hash;
  }, [reportId, lockVersion]);

  return {
    reportId,
    versionId,
    versionNumber,
    locked,
    loading,
    createNewVersion,
    lockVersion,
    issueReport,
    reload: load,
  };
}
