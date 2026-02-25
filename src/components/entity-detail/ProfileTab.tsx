interface Props {
  entity: any;
}

export default function ProfileTab({ entity }: Props) {
  const contacts: string[] = Array.isArray(entity.internal_contacts) ? entity.internal_contacts : [];

  return (
    <div className="space-y-6 fvc-stagger">
      <div className="fvc-card">
        <h3 className="fvc-heading-3 text-foreground mb-4">Registration & Identity</h3>
        <div className="grid md:grid-cols-2 gap-y-4 gap-x-8 text-sm">
          <DetailRow label="Registered Country" value={entity.country} />
          <DetailRow label="Registration Number" value={entity.registration_number} />
          <DetailRow label="Website / Domain" value={entity.website} />
          <DetailRow label="Entity Type" value={entity.entity_type} capitalize />
          <DetailRow label="Business Unit" value={entity.business_unit} />
          <DetailRow label="Service Provided" value={entity.service_provided} />
        </div>
      </div>

      <div className="fvc-card">
        <h3 className="fvc-heading-3 text-foreground mb-4">Internal Contacts</h3>
        {contacts.length === 0 ? (
          <p className="text-sm text-muted-foreground">No contacts recorded.</p>
        ) : (
          <div className="space-y-2">
            {contacts.map((c, i) => (
              <div key={i} className="text-sm text-foreground py-1.5 border-b border-border/60 last:border-0">{c}</div>
            ))}
          </div>
        )}
      </div>

      <p className="text-[10px] text-muted-foreground italic">
        Profile data shown as-of {new Date().toLocaleDateString()}. Avoid recording unnecessary personal data.
      </p>
    </div>
  );
}

function DetailRow({ label, value, capitalize }: { label: string; value?: string | null; capitalize?: boolean }) {
  return (
    <div>
      <span className="fvc-label block mb-1">{label}</span>
      <span className={`text-foreground ${capitalize ? "capitalize" : ""}`}>{value || "—"}</span>
    </div>
  );
}
