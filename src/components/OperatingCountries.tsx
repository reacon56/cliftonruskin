import { useState } from "react";
import { Globe, Plus, Trash2, Filter } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { countryCodeToFlag } from "@/lib/country-flag";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface OperatingCountry {
  id: string;
  entity_id: string;
  country_code: string;
  country_name: string;
  confidence: string;
  source: string;
  created_at: string;
}

/* ─── Compact chips for entity tiles (max 3 + overflow) ─── */
export function OperatingCountryChips({ countries }: { countries: OperatingCountry[] }) {
  if (!countries.length) return null;

  const shown = countries.slice(0, 3);
  const overflow = countries.length - 3;

  return (
    <TooltipProvider delayDuration={200}>
      <div className="flex items-center gap-1 flex-wrap">
        <span className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground/50 mr-0.5">OPS</span>
        {shown.map((c) => (
          <Tooltip key={c.id}>
            <TooltipTrigger asChild>
              <span className="inline-flex items-center gap-0.5 rounded-full border border-border/60 bg-muted/30 px-1.5 py-px text-[10px] cursor-default">
                <span className="text-xs leading-none">{countryCodeToFlag(c.country_code) || "🌐"}</span>
                <span className="text-muted-foreground font-medium">{c.country_code}</span>
              </span>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="text-xs">
              Operates in: {c.country_name} (confidence: {c.confidence}, source: {c.source})
            </TooltipContent>
          </Tooltip>
        ))}
        {overflow > 0 && (
          <span className="text-[10px] text-muted-foreground/60 font-medium">+{overflow}</span>
        )}
      </div>
    </TooltipProvider>
  );
}

/* ─── Full panel for entity profile page ─── */
interface FullPanelProps {
  countries: OperatingCountry[];
  entityId: string;
  canEdit: boolean;
  userId: string;
  onRefresh: () => void;
}

const CONFIDENCE_OPTIONS = ["confirmed", "likely", "unconfirmed"] as const;
const SOURCE_OPTIONS = ["website", "filings", "analyst", "third_party"] as const;

const confidenceColor = (c: string) => {
  if (c === "confirmed") return "bg-success/10 text-success";
  if (c === "likely") return "bg-warning/10 text-warning";
  return "bg-muted text-muted-foreground";
};

export function OperatingCountriesPanel({ countries, entityId, canEdit, userId, onRefresh }: FullPanelProps) {
  const { toast } = useToast();
  const [filterConfidence, setFilterConfidence] = useState<string>("all");
  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState({ country_code: "", country_name: "", confidence: "unconfirmed", source: "analyst" });

  const filtered = filterConfidence === "all"
    ? countries
    : countries.filter((c) => c.confidence === filterConfidence);

  const handleAdd = async () => {
    if (!form.country_code || !form.country_name) {
      toast({ title: "Country code and name are required", variant: "destructive" });
      return;
    }
    const { error } = await supabase.from("entity_operating_countries" as any).insert({
      entity_id: entityId,
      country_code: form.country_code.toUpperCase(),
      country_name: form.country_name,
      confidence: form.confidence,
      source: form.source,
      added_by: userId,
    });
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Operating country added" });
      setAddOpen(false);
      setForm({ country_code: "", country_name: "", confidence: "unconfirmed", source: "analyst" });
      onRefresh();
    }
  };

  const handleRemove = async (id: string) => {
    const { error } = await supabase.from("entity_operating_countries" as any).delete().eq("id", id);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Country removed" });
      onRefresh();
    }
  };

  return (
    <div className="fvc-card">
      <div className="flex items-center justify-between mb-4">
        <h3 className="fvc-heading-3 text-foreground flex items-center gap-2">
          <Globe size={16} className="text-accent" /> Countries of Operation
          <span className="text-sm font-normal text-muted-foreground">({countries.length})</span>
        </h3>
        <div className="flex items-center gap-2">
          <Select value={filterConfidence} onValueChange={setFilterConfidence}>
            <SelectTrigger className="h-7 text-[11px] w-32">
              <Filter size={10} className="mr-1" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All confidence</SelectItem>
              <SelectItem value="confirmed">Confirmed</SelectItem>
              <SelectItem value="likely">Likely</SelectItem>
              <SelectItem value="unconfirmed">Unconfirmed</SelectItem>
            </SelectContent>
          </Select>
          {canEdit && (
            <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setAddOpen(true)}>
              <Plus size={12} className="mr-1" /> Add
            </Button>
          )}
        </div>
      </div>

      {filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground py-4 text-center">
          {countries.length === 0 ? "No operating countries recorded." : "No countries match this filter."}
        </p>
      ) : (
        <div className="flex flex-wrap gap-2">
          <TooltipProvider delayDuration={200}>
            {filtered.map((c) => (
              <Tooltip key={c.id}>
                <TooltipTrigger asChild>
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted/40 px-3 py-1.5 cursor-default group">
                    <span className="text-base leading-none">{countryCodeToFlag(c.country_code) || "🌐"}</span>
                    <span className="text-xs font-medium text-foreground">{c.country_name}</span>
                    <Badge className={`fvc-status-badge text-[9px] ml-1 ${confidenceColor(c.confidence)}`}>
                      {c.confidence}
                    </Badge>
                    {canEdit && (
                      <button
                        onClick={(ev) => { ev.stopPropagation(); handleRemove(c.id); }}
                        className="ml-1 opacity-0 group-hover:opacity-100 transition-opacity text-destructive/60 hover:text-destructive"
                      >
                        <Trash2 size={11} />
                      </button>
                    )}
                  </span>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="text-xs">
                  Operates in: {c.country_name} (confidence: {c.confidence}, source: {c.source})
                </TooltipContent>
              </Tooltip>
            ))}
          </TooltipProvider>
        </div>
      )}

      {/* Add Dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-display text-xl">Add Operating Country</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Country Code (ISO)</Label>
                <Input
                  placeholder="e.g. GB"
                  maxLength={2}
                  value={form.country_code}
                  onChange={(e) => setForm({ ...form, country_code: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Country Name</Label>
                <Input
                  placeholder="e.g. United Kingdom"
                  value={form.country_name}
                  onChange={(e) => setForm({ ...form, country_name: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Confidence</Label>
                <Select value={form.confidence} onValueChange={(v) => setForm({ ...form, confidence: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CONFIDENCE_OPTIONS.map((c) => (
                      <SelectItem key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Source</Label>
                <Select value={form.source} onValueChange={(v) => setForm({ ...form, source: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {SOURCE_OPTIONS.map((s) => (
                      <SelectItem key={s} value={s}>{s.replace("_", " ").replace(/\b\w/g, (l) => l.toUpperCase())}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Button onClick={handleAdd} className="w-full">Add Country</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
