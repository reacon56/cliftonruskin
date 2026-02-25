import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useNavigate } from "react-router-dom";
import { AlertTriangle, MessageSquare, Shield, CalendarClock, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface ActionSection {
  key: string;
  label: string;
  count: number;
  icon: React.ReactNode;
  colorClass: string;
  bgClass: string;
  cta: string;
  route: string;
  items: Array<{ id: string; title: string; subtitle: string }>;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sections: ActionSection[];
}

export default function ActionsDrawer({ open, onOpenChange, sections }: Props) {
  const navigate = useNavigate();

  const handleNavigate = (route: string) => {
    onOpenChange(false);
    navigate(route);
  };

  const visible = sections.filter((s) => s.count > 0);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader className="pb-4">
          <SheetTitle className="fvc-heading-2">All Actions Required</SheetTitle>
        </SheetHeader>

        {visible.length === 0 ? (
          <p className="text-sm text-muted-foreground py-8 text-center">No actions required.</p>
        ) : (
          <div className="space-y-6">
            {visible.map((section) => (
              <div key={section.key}>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className={`flex h-6 w-6 items-center justify-center rounded-full ${section.bgClass}`}>
                      <span className={section.colorClass}>{section.icon}</span>
                    </div>
                    <span className="text-sm font-medium text-foreground">{section.label}</span>
                    <Badge className={`fvc-status-badge ${section.bgClass} ${section.colorClass}`}>
                      {section.count}
                    </Badge>
                  </div>
                  <button
                    onClick={() => handleNavigate(section.route)}
                    className="fvc-link text-[11px] flex items-center gap-1"
                  >
                    {section.cta} <ChevronRight size={10} />
                  </button>
                </div>

                <div className="space-y-0 border rounded-lg overflow-hidden">
                  {section.items.slice(0, 5).map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between py-2.5 px-3 border-b last:border-0 hover:bg-muted/30 transition-colors cursor-pointer"
                      onClick={() => handleNavigate(section.route)}
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{item.title}</p>
                        <p className="text-[11px] text-muted-foreground truncate">{item.subtitle}</p>
                      </div>
                      <ChevronRight size={14} className="text-muted-foreground shrink-0" />
                    </div>
                  ))}
                  {section.count > 5 && (
                    <div className="py-2 px-3 text-center">
                      <button
                        onClick={() => handleNavigate(section.route)}
                        className="text-[11px] text-accent font-medium hover:underline"
                      >
                        +{section.count - 5} more
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
