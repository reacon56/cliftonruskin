import { useState } from "react";
import { X, Zap } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";

interface RegChangeAlertBannerProps {
  alertId: string;
  text: string;
  dateText: string;
  linkHref?: string;
  linkText?: string;
}

function getStorageKey(alertId: string) {
  return `cr-regchange-dismissed-${alertId}`;
}

export function RegChangeAlertBanner({
  alertId,
  text,
  dateText,
  linkHref = "/regulatory-briefings",
  linkText = "View in Regulatory Intelligence →",
}: RegChangeAlertBannerProps) {
  const [dismissed, setDismissed] = useState(
    () => localStorage.getItem(getStorageKey(alertId)) === "1"
  );
  const isMobile = useIsMobile();

  if (dismissed) return null;
  if (isMobile) return null; // mobile shows dot indicator via MobileRegChangeDot

  return (
    <div className="relative flex items-start gap-3 rounded-lg border-l-[3px] border-l-accent bg-accent/10 px-4 py-3 mb-6">
      <Zap size={16} className="text-accent shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        <p className="text-[10px] font-bold uppercase tracking-widest text-accent mb-0.5">
          Regulatory Update
        </p>
        <p className="text-sm text-foreground leading-relaxed">{text}</p>
        <p className="text-[11px] text-muted-foreground mt-1">
          {dateText}
          {" · "}
          <a href={linkHref} className="text-accent hover:underline">
            {linkText}
          </a>
        </p>
      </div>
      <button
        onClick={() => {
          localStorage.setItem(getStorageKey(alertId), "1");
          setDismissed(true);
        }}
        className="text-muted-foreground hover:text-foreground transition-colors shrink-0 p-1"
        aria-label="Dismiss"
      >
        <X size={14} />
      </button>
    </div>
  );
}

/** Small gold dot for mobile or dismissed state — place next to page title */
export function RegChangeDot({
  alertId,
  onReshow,
}: {
  alertId: string;
  onReshow: () => void;
}) {
  const isDismissed = localStorage.getItem(getStorageKey(alertId)) === "1";
  const isMobile = useIsMobile();

  if (!isDismissed && !isMobile) return null;

  return (
    <button
      onClick={() => {
        localStorage.removeItem(getStorageKey(alertId));
        onReshow();
      }}
      className="relative group"
      title="What changed?"
    >
      <span className="block w-2.5 h-2.5 rounded-full bg-accent animate-pulse" />
      <span className="absolute -bottom-5 left-1/2 -translate-x-1/2 whitespace-nowrap text-[9px] text-accent opacity-0 group-hover:opacity-100 transition-opacity">
        What changed?
      </span>
    </button>
  );
}
