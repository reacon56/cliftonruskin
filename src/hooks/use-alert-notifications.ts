import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export function useAlertNotifications() {
  const { user } = useAuth();

  const { data: unreadCount = 0 } = useQuery({
    queryKey: ["alert-notification-count", user?.id],
    enabled: !!user?.id,
    refetchInterval: 30_000,
    queryFn: async () => {
      const { count, error } = await (supabase
        .from("alert_notification") as any)
        .select("id", { count: "exact", head: true })
        .eq("user_id", user!.id)
        .eq("is_read", false);
      if (error) throw error;
      return count ?? 0;
    },
  });

  return { unreadCount };
}
