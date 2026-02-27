import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Globe, Plus, Trash2, Link2, MapPin, Building2, User, Landmark, Truck, Ship } from "lucide-react";
import { toast } from "sonner";
import { countryCodeToFlag } from "@/lib/country-flag";

interface Props {
  entityId: string;
  canEdit: boolean;
}

const LINK_TYPES = [
  { value: "INCORPORATION", label: "Incorporation", icon: <Building2 className="h-3.5 w-3.5" /> },
  { value: "OPERATIONS", label: "Operations", icon: <MapPin className="h-3.5 w-3.5" /> },
  { value: "UBO_NATIONALITY", label: "UBO Nationality", icon: <User className="h-3.5 w-3.5" /> },
  { value: "BANK_LOCATION", label: "Bank Location", icon: <Landmark className="h-3.5 w-3.5" /> },
  { value: "SUPPLIER_LOCATION", label: "Supplier Location", icon: <Truck className="h-3.5 w-3.5" /> },
  { value: "SHIPPING_ROUTE", label: "Shipping Route", icon: <Ship className="h-3.5 w-3.5" /> },
  { value: "OTHER", label: "Other", icon: <Link2 className="h-3.5 w-3.5" /> },
];

const CONFIDENCE_LEVELS = [
  { value: "CONFIRMED", label: "Confirmed", color: "bg-success/10 text-success" },
  { value: "LIKELY", label: "Likely", color: "bg-warning/10 text-warning" },
  { value: "UNCONFIRMED", label: "Unconfirmed", color: "bg-muted text-muted-foreground" },
];

const LINK_TYPE_WEIGHT_LABEL: Record<string, string> = {
  INCORPORATION: "High weight",
  OPERATIONS: "High weight",
  UBO_NATIONALITY: "Medium weight",
  BANK_LOCATION: "Medium weight",
  SUPPLIER_LOCATION: "Medium weight",
  SHIPPING_ROUTE: "Medium weight",
  OTHER: "Low weight",
};

interface JurisdictionLink {
  id: string;
  jurisdiction_id: string;
  link_type: string;
  confidence: string;
  source: string;
  notes: string | null;
  created_at: string;
  jurisdiction?: { country_name: string; country_code: string };
}

export default function EntityJurisdictionLinksPanel({ entityId, canEdit }: Props) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState({
    jurisdiction_id: "",
    link_type: "OPERATIONS",
    confidence: "CONFIRMED",
    source: "manual",
    notes: "",
  });

  const { data: links = [] } = useQuery({
    queryKey: ["entity-jurisdiction-links", entityId],
    queryFn: async () => {
      const { data, error } = await (supabase
        .from("entity_jurisdiction_link") as any)
        .select("*, jurisdiction(country_name, country_code)")
        .eq("entity_id", entityId)
        .order("link_type");
      if (error) throw error;
      return data as JurisdictionLink[];
    },
  });

  const { data: jurisdictions = [] } = useQuery({
    queryKey: ["jurisdictions-for-linking"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("jurisdiction")
        .select("id, country_name, country_code")
        .order("country_name");
      if (error) throw error;
      return data;
    },
  });

  const addLink = useMutation({
    mutationFn: async () => {
      const { error } = await (supabase
        .from("entity_jurisdiction_link") as any)
        .insert({
          entity_id: entityId,
          jurisdiction_id: form.jurisdiction_id,
          link_type: form.link_type,
          confidence: form.confidence,
          source: form.source,
          notes: form.notes || null,
          created_by: user?.id,
        });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["entity-jurisdiction-links", entityId] });
      toast.success("Jurisdiction link added");
      setAddOpen(false);
      setForm({ jurisdiction_id: "", link_type: "OPERATIONS", confidence: "CONFIRMED", source: "manual", notes: "" });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const removeLink = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase
        .from("entity_jurisdiction_link") as any)
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["entity-jurisdiction-links", entityId] });
      toast.success("Jurisdiction link removed");
    },
  });

  // Group by jurisdiction
  const grouped = links.reduce<Record<string, JurisdictionLink[]>>((acc, link) => {
    const key = link.jurisdiction?.country_name || link.jurisdiction_id;
    if (!acc[key]) acc[key] = [];
    acc[key].push(link);
    return acc;
  }, {});

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <Globe className="h-4 w-4 text-primary" />
            Linked Jurisdictions
            <Badge variant="outline" className="text-[9px] font-normal">{links.length} links</Badge>
          </CardTitle>
          {canEdit && (
            <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => setAddOpen(true)}>
              <Plus className="h-3 w-3" /> Add Link
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {links.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-6">
            No jurisdiction links. Add links to enable risk scoring.
          </p>
        ) : (
          <div className="space-y-3">
            {Object.entries(grouped).map(([country, countryLinks]) => {
              const firstLink = countryLinks[0];
              const flag = firstLink.jurisdiction?.country_code
                ? countryCodeToFlag(firstLink.jurisdiction.country_code)
                : "";
              return (
                <div key={country} className="rounded-lg border p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-lg">{flag}</span>
                    <span className="text-sm font-medium text-foreground">{country}</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {countryLinks.map((link) => {
                      const lt = LINK_TYPES.find(l => l.value === link.link_type);
                      const conf = CONFIDENCE_LEVELS.find(c => c.value === link.confidence);
                      return (
                        <div key={link.id} className="flex items-center gap-1 rounded-md border bg-muted/30 px-2 py-1 group">
                          {lt?.icon}
                          <span className="text-[10px] font-medium">{lt?.label || link.link_type}</span>
                          <Badge className={`text-[8px] px-1 py-0 ${conf?.color || ""}`}>
                            {conf?.label || link.confidence}
                          </Badge>
                          <span className="text-[8px] text-muted-foreground/50">{LINK_TYPE_WEIGHT_LABEL[link.link_type] || ""}</span>
                          {canEdit && (
                            <button
                              className="opacity-0 group-hover:opacity-100 transition-opacity ml-1"
                              onClick={() => removeLink.mutate(link.id)}
                            >
                              <Trash2 className="h-3 w-3 text-destructive/60 hover:text-destructive" />
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>

      {/* Add Link Dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Jurisdiction Link</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="space-y-1.5">
              <Label className="text-xs">Jurisdiction</Label>
              <Select value={form.jurisdiction_id} onValueChange={(v) => setForm({ ...form, jurisdiction_id: v })}>
                <SelectTrigger><SelectValue placeholder="Select jurisdiction..." /></SelectTrigger>
                <SelectContent>
                  {jurisdictions.map((j: any) => (
                    <SelectItem key={j.id} value={j.id}>
                      {countryCodeToFlag(j.country_code)} {j.country_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Link Type</Label>
              <Select value={form.link_type} onValueChange={(v) => setForm({ ...form, link_type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {LINK_TYPES.map(lt => (
                    <SelectItem key={lt.value} value={lt.value}>{lt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-[10px] text-muted-foreground">
                {LINK_TYPE_WEIGHT_LABEL[form.link_type]} — affects risk scoring weight
              </p>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Confidence</Label>
              <Select value={form.confidence} onValueChange={(v) => setForm({ ...form, confidence: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CONFIDENCE_LEVELS.map(c => (
                    <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Source</Label>
              <Input
                value={form.source}
                onChange={(e) => setForm({ ...form, source: e.target.value })}
                placeholder="e.g. analyst, registry extract"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Notes (optional)</Label>
              <Textarea
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                rows={2}
                placeholder="Additional context..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button onClick={() => addLink.mutate()} disabled={!form.jurisdiction_id}>Add Link</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
