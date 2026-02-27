import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Bell, BellRing, Globe, Shield, AlertTriangle, Scale, Banknote, Building2, Check } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

const ALERT_TYPES = [
  { value: "FATF_CHANGE", label: "FATF Status Changes", icon: <Shield className="h-4 w-4" />, description: "Grey/black list changes from FATF" },
  { value: "EU_HRTC_CHANGE", label: "EU High-Risk Third Country", icon: <AlertTriangle className="h-4 w-4" />, description: "EU AML high-risk country list changes" },
  { value: "UK_SANCTIONS_CHANGE", label: "UK Sanctions Changes", icon: <Scale className="h-4 w-4" />, description: "UK sanctions regime updates" },
  { value: "EU_SANCTIONS_CHANGE", label: "EU Sanctions Changes", icon: <Scale className="h-4 w-4" />, description: "EU sanctions regime updates" },
  { value: "OFAC_SANCTIONS_CHANGE", label: "OFAC Sanctions Changes", icon: <Banknote className="h-4 w-4" />, description: "US OFAC programme changes" },
  { value: "CPI_CHANGE", label: "CPI Score Changes", icon: <Building2 className="h-4 w-4" />, description: "Corruption Perceptions Index updates" },
] as const;

type AlertType = typeof ALERT_TYPES[number]["value"];

interface Subscription {
  id: string;
  alert_type: string;
  jurisdiction_id: string | null;
  all_linked_jurisdictions: boolean;
  enabled: boolean;
}

export default function ClientAlertsPage() {
  const { user, profile } = useAuth();
  const qc = useQueryClient();
  const orgId = profile?.org_id;

  const { data: subscriptions = [], isLoading } = useQuery({
    queryKey: ["alert-subscriptions", orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data, error } = await (supabase
        .from("alert_subscription") as any)
        .select("*")
        .eq("org_id", orgId);
      if (error) throw error;
      return data as Subscription[];
    },
  });

  const { data: jurisdictions = [] } = useQuery({
    queryKey: ["jurisdictions-list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("jurisdiction")
        .select("id, country_name, country_code")
        .order("country_name");
      if (error) throw error;
      return data;
    },
  });

  const { data: linkedCountries = [] } = useQuery({
    queryKey: ["linked-entity-countries", orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data, error } = await (supabase
        .from("entity_operating_countries") as any)
        .select("country_code, country_name, entity_id, entities!inner(org_id)")
        .eq("entities.org_id", orgId);
      if (error) throw error;
      const unique = new Map<string, string>();
      (data || []).forEach((d: any) => unique.set(d.country_code, d.country_name));
      return Array.from(unique.entries()).map(([code, name]) => ({ code, name }));
    },
  });

  const { data: notifications = [] } = useQuery({
    queryKey: ["alert-notifications", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await (supabase
        .from("alert_notification") as any)
        .select("*, alert_event(*)")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data as any[];
    },
  });

  const toggleSubscription = useMutation({
    mutationFn: async ({ alertType, enabled, allLinked }: { alertType: AlertType; enabled: boolean; allLinked?: boolean }) => {
      const existing = subscriptions.find(s => s.alert_type === alertType && !s.jurisdiction_id);
      if (existing) {
        const { error } = await (supabase
          .from("alert_subscription") as any)
          .update({
            enabled,
            all_linked_jurisdictions: allLinked ?? existing.all_linked_jurisdictions,
            updated_at: new Date().toISOString(),
          })
          .eq("id", existing.id);
        if (error) throw error;
      } else {
        const { error } = await (supabase
          .from("alert_subscription") as any)
          .insert({
            org_id: orgId,
            user_id: user?.id,
            alert_type: alertType,
            enabled,
            all_linked_jurisdictions: allLinked ?? false,
          });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["alert-subscriptions", orgId] });
      toast.success("Alert preference updated");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const markRead = useMutation({
    mutationFn: async (notifId: string) => {
      const { error } = await (supabase
        .from("alert_notification") as any)
        .update({ is_read: true, read_at: new Date().toISOString() })
        .eq("id", notifId);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["alert-notifications", user?.id] }),
  });

  const markAllRead = useMutation({
    mutationFn: async () => {
      const { error } = await (supabase
        .from("alert_notification") as any)
        .update({ is_read: true, read_at: new Date().toISOString() })
        .eq("user_id", user!.id)
        .eq("is_read", false);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["alert-notifications", user?.id] });
      toast.success("All notifications marked as read");
    },
  });

  const unreadCount = notifications.filter((n: any) => !n.is_read).length;

  function isEnabled(alertType: string): boolean {
    const sub = subscriptions.find(s => s.alert_type === alertType && !s.jurisdiction_id);
    return sub?.enabled ?? false;
  }

  function isAllLinked(alertType: string): boolean {
    const sub = subscriptions.find(s => s.alert_type === alertType && !s.jurisdiction_id);
    return sub?.all_linked_jurisdictions ?? false;
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground flex items-center gap-2">
            <Bell className="h-6 w-6 text-primary" />
            Jurisdiction Alerts
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Configure which jurisdiction changes trigger alerts for your organisation.
          </p>
        </div>
        {linkedCountries.length > 0 && (
          <Badge variant="outline" className="text-xs">
            <Globe className="h-3 w-3 mr-1" />
            {linkedCountries.length} linked jurisdictions
          </Badge>
        )}
      </div>

      {/* Alert Type Subscriptions */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Alert Types</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1">
          {ALERT_TYPES.map((at) => (
            <div key={at.value} className="flex items-center justify-between py-3 border-b last:border-b-0">
              <div className="flex items-center gap-3">
                <span className="text-primary">{at.icon}</span>
                <div>
                  <p className="text-sm font-medium">{at.label}</p>
                  <p className="text-xs text-muted-foreground">{at.description}</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                {isEnabled(at.value) && linkedCountries.length > 0 && (
                  <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isAllLinked(at.value)}
                      onChange={(e) => toggleSubscription.mutate({ alertType: at.value, enabled: true, allLinked: e.target.checked })}
                      className="rounded border-border"
                    />
                    Linked only
                  </label>
                )}
                <Switch
                  checked={isEnabled(at.value)}
                  onCheckedChange={(checked) => toggleSubscription.mutate({ alertType: at.value, enabled: checked })}
                />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Linked Jurisdictions */}
      {linkedCountries.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Globe className="h-4 w-4 text-primary" />
              Linked Jurisdictions (via entities)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-1.5">
              {linkedCountries.map((c) => (
                <Badge key={c.code} variant="secondary" className="text-xs">
                  {c.name}
                </Badge>
              ))}
            </div>
            <p className="text-[10px] text-muted-foreground mt-2">
              When "Linked only" is checked for an alert type, you'll only receive alerts for these jurisdictions.
            </p>
          </CardContent>
        </Card>
      )}

      <Separator />

      {/* Recent Notifications */}
      <div className="flex items-center justify-between">
        <h2 className="font-display text-lg font-semibold text-foreground flex items-center gap-2">
          <BellRing className="h-5 w-5 text-primary" />
          Recent Alerts
          {unreadCount > 0 && (
            <Badge variant="destructive" className="text-[10px] ml-1">{unreadCount}</Badge>
          )}
        </h2>
        {unreadCount > 0 && (
          <Button variant="ghost" size="sm" className="text-xs" onClick={() => markAllRead.mutate()}>
            <Check className="h-3 w-3 mr-1" /> Mark all read
          </Button>
        )}
      </div>

      {notifications.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">No alerts received yet</p>
      ) : (
        <div className="space-y-2">
          {notifications.map((n: any) => {
            const event = n.alert_event;
            return (
              <div
                key={n.id}
                className={`rounded-lg border p-3 transition-colors ${!n.is_read ? "border-primary/30 bg-primary/5" : ""}`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-[10px]">
                      {ALERT_TYPES.find(a => a.value === event?.alert_type)?.label || event?.alert_type}
                    </Badge>
                    {!n.is_read && <span className="w-2 h-2 rounded-full bg-primary" />}
                  </div>
                  <span className="text-[10px] text-muted-foreground">
                    {event?.detected_at ? format(new Date(event.detected_at), "dd MMM yyyy HH:mm") : ""}
                  </span>
                </div>
                <p className="text-xs text-foreground mt-1">{event?.summary}</p>
                {event?.source_url && (
                  <a href={event.source_url} target="_blank" rel="noopener noreferrer" className="text-[10px] text-primary hover:underline">
                    View source
                  </a>
                )}
                {!n.is_read && (
                  <Button variant="ghost" size="sm" className="h-6 text-[10px] px-2 mt-1" onClick={() => markRead.mutate(n.id)}>
                    Mark as read
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
