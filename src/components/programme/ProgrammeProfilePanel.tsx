import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { Globe, BarChart3, Building2, Save, RefreshCw } from "lucide-react";
import { format } from "date-fns";
import { countryCodeToFlag } from "@/lib/country-flag";

interface JurisdictionEntry {
  code: string;
  name: string;
  source: string;
}

interface RiskProfile {
  tier_a: number;
  tier_b: number;
  tier_c: number;
  high_criticality: number;
  monitored: number;
}

interface PIPData {
  id: string;
  org_id: string;
  sector_profile: string[];
  jurisdiction_profile: JurisdictionEntry[];
  risk_profile: RiskProfile;
  entity_count: number;
  tier_a_count: number;
  last_generated_at: string;
  generated_from_entity_count: number;
  manual_context: string | null;
}

interface Props {
  orgId: string;
  canEdit: boolean;
}

export default function ProgrammeProfilePanel({ orgId, canEdit }: Props) {
  const [pip, setPip] = useState<PIPData | null>(null);
  const [loading, setLoading] = useState(true);
  const [manualContext, setManualContext] = useState("");
  const [savingContext, setSavingContext] = useState(false);
  const [regenerating, setRegenerating] = useState(false);

  useEffect(() => {
    if (!orgId) return;
    loadPip();
  }, [orgId]);

  const loadPip = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("programme_intelligence_profile" as any)
      .select("*")
      .eq("org_id", orgId)
      .maybeSingle();

    if (data) {
      const d = data as any as PIPData;
      setPip(d);
      setManualContext(d.manual_context ?? "");
    }
    setLoading(false);
  };

  const handleRegenerate = async () => {
    setRegenerating(true);
    const { error } = await supabase.rpc("generate_programme_profile" as any, { _org_id: orgId });
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Profile regenerated" });
      await loadPip();
    }
    setRegenerating(false);
  };

  const handleSaveContext = async () => {
    if (!pip) return;
    setSavingContext(true);
    const { error } = await supabase
      .from("programme_intelligence_profile" as any)
      .update({ manual_context: manualContext || null } as any)
      .eq("org_id", orgId);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Context saved" });
      setPip({ ...pip, manual_context: manualContext || null });
    }
    setSavingContext(false);
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8">
          <p className="text-sm text-muted-foreground text-center">Loading programme profile…</p>
        </CardContent>
      </Card>
    );
  }

  if (!pip) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-primary" />
            Your Programme Intelligence Profile
          </CardTitle>
          <CardDescription>
            Auto-generated from your entity register. Used to filter and contextualise regulatory intelligence for your programme.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground text-center py-4">
            No profile generated yet. Add entities to your register to auto-generate your programme profile.
          </p>
          {canEdit && (
            <div className="flex justify-center">
              <Button variant="outline" size="sm" onClick={handleRegenerate} disabled={regenerating} className="gap-2">
                <RefreshCw className={`h-3.5 w-3.5 ${regenerating ? "animate-spin" : ""}`} />
                Generate Now
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  const uniqueJurisdictions = pip.jurisdiction_profile.reduce<JurisdictionEntry[]>((acc, j) => {
    if (!acc.find(x => x.code === j.code)) acc.push(j);
    return acc;
  }, []);

  const lastUpdated = format(new Date(pip.last_generated_at), "dd MMM yyyy HH:mm");
  const footerNote = `Last updated: ${lastUpdated}. Based on ${pip.generated_from_entity_count} entities.`;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-primary" />
              Your Programme Intelligence Profile
            </CardTitle>
            <CardDescription className="mt-1">
              Auto-generated from your entity register. Used to filter and contextualise regulatory intelligence for your programme.
            </CardDescription>
          </div>
          {canEdit && (
            <Button variant="ghost" size="sm" onClick={handleRegenerate} disabled={regenerating} className="gap-1.5 text-xs">
              <RefreshCw className={`h-3.5 w-3.5 ${regenerating ? "animate-spin" : ""}`} />
              Regenerate
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Sector/Industry Exposure */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium flex items-center gap-2">
            <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
            Sector / Industry Exposure
          </h4>
          {pip.sector_profile.length === 0 ? (
            <p className="text-xs text-muted-foreground">No sector data detected from entity descriptions.</p>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {pip.sector_profile.map((s) => (
                <Badge key={s} variant="secondary" className="text-xs">{s}</Badge>
              ))}
            </div>
          )}
          <p className="text-[10px] text-muted-foreground">{footerNote}</p>
        </div>

        {/* Geographic Exposure */}
        <div className="space-y-3 border-t border-border pt-4">
          <h4 className="text-sm font-medium flex items-center gap-2">
            <Globe className="h-3.5 w-3.5 text-muted-foreground" />
            Geographic Exposure
          </h4>
          {uniqueJurisdictions.length === 0 ? (
            <p className="text-xs text-muted-foreground">No jurisdictions detected.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {uniqueJurisdictions.map((j) => (
                <Badge key={j.code} variant="outline" className="text-xs gap-1">
                  <span>{countryCodeToFlag(j.code)}</span>
                  {j.name}
                  <span className="text-muted-foreground ml-1 capitalize">({j.source})</span>
                </Badge>
              ))}
            </div>
          )}
          <p className="text-[10px] text-muted-foreground">{footerNote}</p>
        </div>

        {/* Risk Focus Areas */}
        <div className="space-y-3 border-t border-border pt-4">
          <h4 className="text-sm font-medium flex items-center gap-2">
            <BarChart3 className="h-3.5 w-3.5 text-muted-foreground" />
            Risk Focus Areas
          </h4>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {[
              { label: "Tier A (High)", value: pip.risk_profile.tier_a, variant: "destructive" as const },
              { label: "Tier B (Medium)", value: pip.risk_profile.tier_b, variant: "default" as const },
              { label: "Tier C (Low)", value: pip.risk_profile.tier_c, variant: "secondary" as const },
              { label: "High Criticality", value: pip.risk_profile.high_criticality, variant: "outline" as const },
              { label: "Monitored", value: pip.risk_profile.monitored, variant: "outline" as const },
            ].map((item) => (
              <div key={item.label} className="text-center space-y-1 p-2 rounded-md bg-muted/50">
                <div className="text-lg font-semibold">{item.value}</div>
                <div className="text-[10px] text-muted-foreground">{item.label}</div>
              </div>
            ))}
          </div>
          <p className="text-[10px] text-muted-foreground">{footerNote}</p>
        </div>

        {/* Manual Context */}
        <div className="space-y-3 border-t border-border pt-4">
          <Label className="text-sm font-medium">Additional programme context (optional)</Label>
          <p className="text-xs text-muted-foreground">
            Add context the system cannot derive automatically — e.g. "This programme focuses primarily on technology sector suppliers."
          </p>
          <Textarea
            value={manualContext}
            onChange={(e) => setManualContext(e.target.value)}
            placeholder="e.g. We have no exposure to financial services entities."
            className="min-h-[60px] text-sm"
            disabled={!canEdit}
          />
          {canEdit && manualContext !== (pip.manual_context ?? "") && (
            <Button size="sm" variant="outline" onClick={handleSaveContext} disabled={savingContext} className="gap-1.5">
              <Save className="h-3.5 w-3.5" />
              {savingContext ? "Saving…" : "Save Context"}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
