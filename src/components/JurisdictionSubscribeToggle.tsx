import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Switch } from "@/components/ui/switch";
import { BellRing } from "lucide-react";
import { toast } from "sonner";

interface Props {
  jurisdictionId: string;
}

const ALERT_TYPES = [
  "FATF_CHANGE", "EU_HRTC_CHANGE", "UK_SANCTIONS_CHANGE",
  "EU_SANCTIONS_CHANGE", "OFAC_SANCTIONS_CHANGE", "CPI_CHANGE",
] as const;

export default function JurisdictionSubscribeToggle({ jurisdictionId }: Props) {
  const { user, profile } = useAuth();
  const qc = useQueryClient();
  const orgId = profile?.org_id;

  const { data: subs = [] } = useQuery({
    queryKey: ["jurisdiction-alert-subs", jurisdictionId, user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await (supabase
        .from("alert_subscription") as any)
        .select("*")
        .eq("jurisdiction_id", jurisdictionId)
        .or(`user_id.eq.${user!.id},and(org_id.eq.${orgId},user_id.is.null)`);
      if (error) throw error;
      return data as any[];
    },
  });

  const isSubscribed = subs.some((s: any) => s.enabled);

  const toggle = useMutation({
    mutationFn: async (enabled: boolean) => {
      if (enabled) {
        // Create subscriptions for all alert types for this jurisdiction
        const inserts = ALERT_TYPES.map(at => ({
          org_id: orgId,
          user_id: user!.id,
          alert_type: at,
          jurisdiction_id: jurisdictionId,
          enabled: true,
        }));
        const { error } = await (supabase
          .from("alert_subscription") as any)
          .upsert(inserts, { onConflict: "id" });
        if (error) throw error;
      } else {
        // Disable all subs for this jurisdiction
        const ids = subs.filter((s: any) => s.jurisdiction_id === jurisdictionId).map((s: any) => s.id);
        if (ids.length) {
          const { error } = await (supabase
            .from("alert_subscription") as any)
            .update({ enabled: false, updated_at: new Date().toISOString() })
            .in("id", ids);
          if (error) throw error;
        }
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["jurisdiction-alert-subs", jurisdictionId, user?.id] });
      toast.success("Alert subscription updated");
    },
    onError: (e: any) => toast.error(e.message),
  });

  if (!user) return null;

  return (
    <div className="flex items-center gap-2 rounded-lg border px-3 py-2.5">
      <BellRing className={`h-4 w-4 ${isSubscribed ? "text-primary" : "text-muted-foreground"}`} />
      <span className="text-xs font-medium flex-1">Subscribe to alerts for this country</span>
      <Switch
        checked={isSubscribed}
        onCheckedChange={(checked) => toggle.mutate(checked)}
      />
    </div>
  );
}
