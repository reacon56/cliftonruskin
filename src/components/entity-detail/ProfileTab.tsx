import { useAuth } from "@/contexts/AuthContext";
import { Globe, Mail, Phone, User } from "lucide-react";

interface Props {
  entity: any;
}

function formatAddress(line1?: string, line2?: string, city?: string, region?: string, postcode?: string, country?: string) {
  return [line1, line2, city, region, postcode, country].filter(Boolean).join(", ");
}

export default function ProfileTab({ entity }: Props) {
  const { hasRole } = useAuth();
  const contacts: string[] = Array.isArray(entity.internal_contacts) ? entity.internal_contacts : [];
  
  const canSeePoc = hasRole("client_admin") || hasRole("client_requester") || hasRole("fvc_analyst") || hasRole("fvc_ops_admin");

  const regAddress = formatAddress(entity.registered_address_line1, entity.registered_address_line2, entity.registered_city, entity.registered_region, entity.registered_postcode, entity.registered_country);
  const hqAddress = formatAddress(entity.head_office_address_line1, entity.head_office_address_line2, entity.head_office_city, entity.head_office_region, entity.head_office_postcode, entity.head_office_country);

  return (
    <div className="space-y-6 fvc-stagger">
      {/* Registration & Identity */}
      <div className="fvc-card">
        <h3 className="fvc-heading-3 text-foreground mb-4">Registration & Identity</h3>
        <div className="grid md:grid-cols-2 gap-y-4 gap-x-8 text-sm">
          <DetailRow label="Registered Country" value={entity.country} />
          <DetailRow label="Registration Number" value={entity.registration_number} />
          <DetailRow label="Entity Type" value={entity.entity_type} capitalize />
          <DetailRow label="Business Unit" value={entity.business_unit} />
          <DetailRow label="Service Provided" value={entity.service_provided} />
          {entity.website && (
            <div>
              <span className="fvc-label block mb-1">Website / Domain</span>
              <a href={entity.website.startsWith("http") ? entity.website : `https://${entity.website}`} target="_blank" rel="noopener noreferrer" className="text-accent hover:underline flex items-center gap-1">
                <Globe size={12} /> {entity.website}
              </a>
            </div>
          )}
          {!entity.website && <DetailRow label="Website / Domain" value={null} />}
        </div>
      </div>

      {/* Addresses */}
      {(regAddress || hqAddress) && (
        <div className="fvc-card">
          <h3 className="fvc-heading-3 text-foreground mb-4">Addresses</h3>
          <div className="grid md:grid-cols-2 gap-y-4 gap-x-8 text-sm">
            {regAddress && <DetailRow label="Registered Office" value={regAddress} />}
            {hqAddress && <DetailRow label="Head Office" value={hqAddress} />}
          </div>
        </div>
      )}

      {/* Point of Contact */}
      {canSeePoc && (entity.poc_name || entity.poc_email || entity.poc_phone) && (
        <div className="fvc-card">
          <h3 className="fvc-heading-3 text-foreground mb-4">Point of Contact</h3>
          <div className="grid md:grid-cols-2 gap-y-4 gap-x-8 text-sm">
            {entity.poc_name && (
              <div>
                <span className="fvc-label block mb-1">Name</span>
                <span className="text-foreground flex items-center gap-1.5"><User size={12} className="text-muted-foreground" /> {entity.poc_name}</span>
              </div>
            )}
            {entity.poc_email && (
              <div>
                <span className="fvc-label block mb-1">Email</span>
                <a href={`mailto:${entity.poc_email}`} className="text-accent hover:underline flex items-center gap-1.5">
                  <Mail size={12} /> {entity.poc_email}
                </a>
              </div>
            )}
            {entity.poc_phone && (
              <div>
                <span className="fvc-label block mb-1">Phone</span>
                <span className="text-foreground flex items-center gap-1.5"><Phone size={12} className="text-muted-foreground" /> {entity.poc_phone}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Internal Contacts */}
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
