import { useState, useEffect, useCallback, ReactNode } from "react";
import { Maximize2, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  title: string;
  subtitle?: string;
  children: ReactNode;
  expandedContent?: ReactNode;
  className?: string;
  headerRight?: ReactNode;
  icon?: ReactNode;
}

export default function ExpandableTile({
  title,
  subtitle,
  children,
  expandedContent,
  className,
  headerRight,
  icon,
}: Props) {
  const [expanded, setExpanded] = useState(false);

  const close = useCallback(() => setExpanded(false), []);

  useEffect(() => {
    if (!expanded) return;
    document.body.style.overflow = "hidden";
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", handler);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handler);
    };
  }, [expanded, close]);

  return (
    <>
      <div className={cn("fvc-card relative group/tile", className)}>
        {/* Header row */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2 min-w-0">
            {icon}
            <h2 className="fvc-heading-3 text-foreground truncate">{title}</h2>
          </div>
          <div className="flex items-center gap-2">
            {headerRight}
            <button
              onClick={() => setExpanded(true)}
              className={cn(
                "p-1 rounded transition-all duration-200",
                "text-muted-foreground hover:text-accent",
                "opacity-0 group-hover/tile:opacity-100 focus:opacity-100",
                "touch-device:opacity-100",
                "md:opacity-0 md:group-hover/tile:opacity-100",
                // Always visible on touch/mobile via CSS below
              )}
              style={{ touchAction: "manipulation" }}
              aria-label={`Expand ${title}`}
            >
              <Maximize2 size={14} />
            </button>
          </div>
        </div>
        {subtitle && (
          <p className="text-[11px] text-muted-foreground mb-4">{subtitle}</p>
        )}
        {children}
      </div>

      {/* Fullscreen modal */}
      {expanded && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in"
          onClick={(e) => { if (e.target === e.currentTarget) close(); }}
        >
          <div className="w-[90vw] h-[85vh] max-w-[1400px] fvc-card flex flex-col overflow-hidden animate-scale-in">
            {/* Modal header */}
            <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-border shrink-0">
              <div>
                <div className="flex items-center gap-2">
                  {icon}
                  <h2 className="fvc-heading-3 text-foreground">{title}</h2>
                </div>
                {subtitle && (
                  <p className="text-[11px] text-muted-foreground mt-1">{subtitle}</p>
                )}
              </div>
              <button
                onClick={close}
                className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>
            {/* Modal content */}
            <div className="flex-1 overflow-auto p-6">
              {expandedContent ?? children}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
