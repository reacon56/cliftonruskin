import { Building2, Settings, FileText } from "lucide-react";

export default function StubPage({ title, description }: { title: string; description: string }) {
  return (
    <div>
      <h1 className="fvc-heading-1 text-foreground mb-1">{title}</h1>
      <p className="text-sm text-muted-foreground mb-8">{description}</p>
      <div className="fvc-card text-center py-16">
        <Settings size={40} className="mx-auto text-muted-foreground/30 mb-3" />
        <p className="text-sm text-muted-foreground">This section is under development.</p>
      </div>
    </div>
  );
}
