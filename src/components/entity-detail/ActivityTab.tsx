import UniversalAuditTimeline from "@/components/UniversalAuditTimeline";

interface Props {
  entityId: string;
}

export default function ActivityTab({ entityId }: Props) {
  return (
    <div className="fvc-card p-5">
      <h3 className="font-display text-sm font-semibold text-foreground mb-4">Audit Trail</h3>
      <UniversalAuditTimeline entityId={entityId} limit={100} />
    </div>
  );
}
