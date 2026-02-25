import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ArrowLeft, FileCheck, RefreshCw, Zap, ShieldAlert, Pencil, ChevronDown } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface Props {
  entity: any;
  canEdit: boolean;
  canAdmin: boolean;
  onEditEntity: () => void;
  onChangeTier: () => void;
}

const REFRESH_REASONS = [
  "Contract renewal",
  "Event-driven",
  "New jurisdiction",
  "Escalation request",
  "Allegation / whistleblowing",
  "Other",
];

export default function EntityDetailHeader({ entity, canEdit, canAdmin, onEditEntity, onChangeTier }: Props) {
  const navigate = useNavigate();

  const todayStr = new Date().toISOString().split("T")[0];
  const in30 = new Date(Date.now() + 30 * 86400000).toISOString().split("T")[0];

  const assuranceStatus = !entity.next_review_date
    ? { label: "No date set", color: "bg-muted text-muted-foreground" }
    : entity.next_review_date < todayStr
    ? { label: "Overdue", color: "bg-destructive/10 text-destructive" }
    : entity.next_review_date <= in30
    ? { label: "Due soon", color: "bg-warning/10 text-warning" }
    : { label: "In-date", color: "bg-success/10 text-success" };

  const daysUntil = entity.next_review_date
    ? Math.ceil((new Date(entity.next_review_date).getTime() - Date.now()) / 86400000)
    : null;

  const tierColor = (t: string) =>
    t === "A" ? "bg-destructive/10 text-destructive" : t === "B" ? "bg-warning/10 text-warning" : "bg-success/10 text-success";

  const critColor = (c: string) =>
    c === "high" ? "bg-destructive/10 text-destructive" : c === "med" ? "bg-warning/10 text-warning" : "bg-success/10 text-success";

  return (
    <div>
      <button
        onClick={() => navigate("/entities")}
        className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors"
      >
        <ArrowLeft size={14} /> Back to register
      </button>

      <div className="flex items-start justify-between mb-2">
        <div className="flex-1 min-w-0">
          <h1 className="fvc-heading-1 text-foreground">{entity.name}</h1>
          <div className="fvc-gold-rule mt-3 mb-3" />
          <div className="flex flex-wrap items-center gap-2 mt-2">
            <Badge className={`fvc-status-badge ${tierColor(entity.risk_tier)}`}>Tier {entity.risk_tier}</Badge>
            <Badge className={`fvc-status-badge ${assuranceStatus.color}`}>{assuranceStatus.label}</Badge>
            {entity.criticality && (
              <Badge className={`fvc-status-badge ${critColor(entity.criticality)}`}>
                {entity.criticality.charAt(0).toUpperCase() + entity.criticality.slice(1)} criticality
              </Badge>
            )}
            <span className="text-sm text-muted-foreground capitalize">{entity.entity_type}</span>
            {entity.country && <span className="text-sm text-muted-foreground">· {entity.country}</span>}
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0 ml-4">
          <Button size="sm" onClick={() => navigate(`/commission?entity=${entity.id}`)}>
            <FileCheck size={14} className="mr-1.5" /> Commission Check
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" variant="outline">
                <RefreshCw size={14} className="mr-1.5" /> Refresh
                <ChevronDown size={12} className="ml-1" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 z-50 bg-card border border-border shadow-lg">
              {REFRESH_REASONS.map((r) => (
                <DropdownMenuItem
                  key={r}
                  onClick={() => navigate(`/commission?entity=${entity.id}&reason=${encodeURIComponent(r)}`)}
                  className="cursor-pointer text-sm"
                >
                  {r}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <Button
            size="sm"
            variant="outline"
            className="text-destructive border-destructive/30 hover:bg-destructive/10"
            onClick={() => navigate(`/commission?entity=${entity.id}&product=Emergency+Note`)}
          >
            <Zap size={14} className="mr-1.5" /> Emergency Note
          </Button>

          {canAdmin && (
            <Button size="sm" variant="ghost" onClick={onChangeTier}>
              <ShieldAlert size={14} className="mr-1.5" /> Change Tier
            </Button>
          )}
          {canEdit && (
            <Button size="sm" variant="ghost" onClick={onEditEntity}>
              <Pencil size={14} className="mr-1.5" /> Edit
            </Button>
          )}
        </div>
      </div>

      {/* Summary strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mt-6 mb-2">
        <SummaryItem label="Next Review" value={entity.next_review_date ? new Date(entity.next_review_date).toLocaleDateString() : "Not set"} sub={daysUntil !== null ? (daysUntil > 0 ? `${daysUntil}d away` : `${Math.abs(daysUntil)}d overdue`) : undefined} />
        <SummaryItem label="Business Unit" value={entity.business_unit || "—"} />
        <SummaryItem label="Service" value={entity.service_provided || "—"} />
        <SummaryItem label="Contract Renewal" value={entity.contract_renewal_date ? new Date(entity.contract_renewal_date).toLocaleDateString() : "—"} />
        <SummaryItem label="Onboarded" value={entity.onboarded_date ? new Date(entity.onboarded_date).toLocaleDateString() : entity.created_at ? new Date(entity.created_at).toLocaleDateString() : "—"} />
        <SummaryItem label="Status" value={entity.status} />
      </div>
    </div>
  );
}

function SummaryItem({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="fvc-kpi-tile py-3 px-4">
      <div className="fvc-label mb-1">{label}</div>
      <div className="text-sm font-medium text-foreground capitalize">{value}</div>
      {sub && <div className="text-[10px] text-muted-foreground mt-0.5">{sub}</div>}
    </div>
  );
}
