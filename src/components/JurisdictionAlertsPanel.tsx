import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Bell, BellOff, BellRing, ArrowUpDown, Shield } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import JurisdictionRiskTooltip, { getIndicatorInfo } from "./JurisdictionRiskTooltip";

interface IndicatorChange {
  id: string;
  indicator_type: string;
  old_value_json: any;
  new_value_json: any;
  old_effective_date: string | null;
  new_effective_date: string;
  source_name: string;
  source_url: string | null;
  detected_at: string;
  acknowledged: boolean;
}

interface Props {
  jurisdictionId: string;
  countryCode: string;
  countryName: string;
}

export default function JurisdictionAlertsPanel({ jurisdictionId, countryCode, countryName }: Props) {
  const { user } = useAuth();
  const qc = useQueryClient();

  // Fetch indicator changes for this jurisdiction
  const { data: changes = [] } = useQuery({
    queryKey: ["jurisdiction-indicator-changes", jurisdictionId],
    queryFn: async () => {
      const { data, error } = await (supabase
        .from("jurisdiction_indicator_change") as any)
        .select("*")
        .eq("jurisdiction_id", jurisdictionId)
        .order("detected_at", { ascending: false })
        .limit(30);
      if (error) throw error;
      return data as IndicatorChange[];
    },
  });

  // Fetch indicators for this jurisdiction (for tooltip data)
  const { data: indicators = [] } = useQuery({
    queryKey: ["jurisdiction-indicators", jurisdictionId],
    queryFn: async () => {
      const { data, error } = await (supabase
        .from("jurisdiction_indicator") as any)
        .select("*")
        .eq("jurisdiction_id", jurisdictionId);
      if (error) throw error;
      return data as any[];
    },
  });

  // Subscription state
  const { data: subscription } = useQuery({
    queryKey: ["jurisdiction-subscription", jurisdictionId, user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await (supabase
        .from("jurisdiction_alert_subscriptions") as any)
        .select("*")
        .eq("jurisdiction_id", jurisdictionId)
        .eq("user_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const toggleSub = useMutation({
    mutationFn: async (channel: string) => {
      if (subscription) {
        if (channel === "none") {
          const { error } = await (supabase
            .from("jurisdiction_alert_subscriptions") as any)
            .delete()
            .eq("id", subscription.id);
          if (error) throw error;
        } else {
          const { error } = await (supabase
            .from("jurisdiction_alert_subscriptions") as any)
            .update({ channel, updated_at: new Date().toISOString() })
            .eq("id", subscription.id);
          if (error) throw error;
        }
      } else {
        const { error } = await (supabase
          .from("jurisdiction_alert_subscriptions") as any)
          .insert({
            user_id: user!.id,
            jurisdiction_id: jurisdictionId,
            channel,
          });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["jurisdiction-subscription", jurisdictionId, user?.id] });
      toast.success("Alert preference updated");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const acknowledge = useMutation({
    mutationFn: async (changeId: string) => {
      const { error } = await (supabase
        .from("jurisdiction_indicator_change") as any)
        .update({ acknowledged: true, acknowledged_at: new Date().toISOString(), acknowledged_by: user?.id })
        .eq("id", changeId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["jurisdiction-indicator-changes", jurisdictionId] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  function describeChange(c: IndicatorChange): string {
    const info = getIndicatorInfo(c.indicator_type);
    const oldVal = c.old_value_json;
    const newVal = c.new_value_json;

    if (!oldVal) return `${info.label} indicator added`;

    if (c.indicator_type === "CPI_SCORE") {
      const oldScore = oldVal?.score;
      const newScore = newVal?.score;
      if (oldScore && newScore) {
        const delta = newScore - oldScore;
        return `CPI score ${delta > 0 ? "improved" : "declined"}: ${oldScore} → ${newScore}`;
      }
    }

    const oldStatus = oldVal?.programme_status || oldVal?.status;
    const newStatus = newVal?.programme_status || newVal?.status;
    if (oldStatus && newStatus && oldStatus !== newStatus) {
      return `${info.label}: ${oldStatus} → ${newStatus}`;
    }

    return `${info.label} updated`;
  }

  const currentChannel = subscription?.channel || "none";

  return (
    <div className="space-y-4">
      {/* Active Indicators with tooltips */}
      {indicators.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Shield className="h-4 w-4 text-primary" />
              Active Risk Indicators
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {indicators.map((ind: any) => (
                <JurisdictionRiskTooltip
                  key={ind.id}
                  indicatorType={ind.indicator_type}
                  sourceName={ind.source_name}
                  lastUpdated={ind.updated_at ? format(new Date(ind.updated_at), "dd MMM yyyy") : undefined}
                  value={ind.value_json?.score?.toString()}
                  programmeStatus={ind.value_json?.programme_status}
                />
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Subscription toggle */}
      {user && (
        <div className="flex items-center justify-between rounded-lg border px-3 py-2.5">
          <div className="flex items-center gap-2">
            {currentChannel === "none" ? (
              <BellOff className="h-4 w-4 text-muted-foreground" />
            ) : (
              <BellRing className="h-4 w-4 text-primary" />
            )}
            <span className="text-xs font-medium">Alert Subscription</span>
          </div>
          <Select value={currentChannel} onValueChange={(v) => toggleSub.mutate(v)}>
            <SelectTrigger className="w-[130px] h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Off</SelectItem>
              <SelectItem value="in_app">In-App</SelectItem>
              <SelectItem value="email">Email</SelectItem>
              <SelectItem value="both">Both</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      <Separator />

      {/* Change Timeline */}
      <div className="flex items-center gap-2 mb-2">
        <ArrowUpDown className="h-4 w-4 text-primary" />
        <h3 className="font-display text-sm font-semibold text-foreground">Indicator Change History</h3>
      </div>

      {changes.length === 0 ? (
        <p className="text-xs text-muted-foreground text-center py-6">No indicator changes detected yet</p>
      ) : (
        <div className="relative pl-6 space-y-3">
          <div className="absolute left-[11px] top-2 bottom-2 w-px bg-border" />
          {changes.map((c) => {
            const info = getIndicatorInfo(c.indicator_type);
            return (
              <div key={c.id} className="relative">
                <div className={`absolute -left-6 top-1.5 w-[9px] h-[9px] rounded-full border-2 ${
                  c.acknowledged ? "border-muted-foreground bg-background" : "border-primary bg-primary/20"
                }`} />
                <div className={`rounded-lg border p-3 space-y-1.5 ${!c.acknowledged ? "border-primary/30 bg-primary/5" : ""}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <JurisdictionRiskTooltip
                        indicatorType={c.indicator_type}
                        sourceName={c.source_name}
                        lastUpdated={format(new Date(c.detected_at), "dd MMM yyyy HH:mm")}
                        programmeStatus={c.new_value_json?.programme_status}
                      />
                    </div>
                    <span className="text-[10px] text-muted-foreground">
                      {format(new Date(c.detected_at), "dd MMM yyyy HH:mm")}
                    </span>
                  </div>
                  <p className="text-xs text-foreground">{describeChange(c)}</p>
                  {c.source_name && (
                    <p className="text-[10px] text-muted-foreground/60">Source: {c.source_name}</p>
                  )}
                  {!c.acknowledged && user && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 text-[10px] px-2"
                      onClick={() => acknowledge.mutate(c.id)}
                    >
                      Acknowledge
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
