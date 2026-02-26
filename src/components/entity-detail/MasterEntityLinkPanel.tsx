import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Link2, Link2Off, AlertTriangle, Building2, Search, Plus, Sparkles, Globe, Hash } from "lucide-react";
import { findMasterMatches, type MatchResult } from "@/lib/entity-matching";

interface MasterEntityLinkPanelProps {
  entityId: string;
  entityName: string;
  entityJurisdiction?: string | null;
  onRefresh: () => void;
}

export default function MasterEntityLinkPanel({ entityId, entityName, entityJurisdiction, onRefresh }: MasterEntityLinkPanelProps) {
  const { isInternal, canQuote } = useAuth(); // canQuote = manager/ops_admin
  const { toast } = useToast();
  const navigate = useNavigate();

  const [masterEntity, setMasterEntity] = useState<any>(null);
  const [hasConflict, setHasConflict] = useState(false);
  const [linkOpen, setLinkOpen] = useState(false);
  const [masterList, setMasterList] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [suggestions, setSuggestions] = useState<MatchResult[]>([]);
  const [createFromEntityOpen, setCreateFromEntityOpen] = useState(false);

  useEffect(() => { load(); }, [entityId]);

  const load = async () => {
    setLoading(true);
    const { data: ent } = await (supabase as any)
      .from("entities")
      .select("master_entity_id, has_master_conflict")
      .eq("id", entityId)
      .single();

    if (ent?.master_entity_id) {
      const { data: me } = await (supabase as any)
        .from("master_entities")
        .select("*")
        .eq("id", ent.master_entity_id)
        .single();
      setMasterEntity(me);
      setSuggestions([]);
    } else {
      setMasterEntity(null);
      // Load suggestions for unlinked entities (manager only)
      if (canQuote) {
        await loadSuggestions();
      }
    }
    setHasConflict(ent?.has_master_conflict ?? false);
    setLoading(false);
  };

  const loadSuggestions = async () => {
    const { data: allMasters } = await (supabase as any)
      .from("master_entities")
      .select("id, canonical_name, jurisdiction_incorporation, canonical_registration_number");
    if (allMasters && allMasters.length > 0) {
      const matches = findMasterMatches(entityName, entityJurisdiction ?? null, allMasters);
      setSuggestions(matches);
    } else {
      setSuggestions([]);
    }
  };

  const openLinkDialog = async () => {
    const { data } = await (supabase as any)
      .from("master_entities")
      .select("id, canonical_name, jurisdiction_incorporation, canonical_registration_number")
      .order("canonical_name");
    setMasterList(data ?? []);
    setSearch("");
    setLinkOpen(true);
  };

  const handleLink = async (masterEntityId: string) => {
    const { error } = await supabase
      .from("entities")
      .update({ master_entity_id: masterEntityId } as any)
      .eq("id", entityId);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }
    // Audit log
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase.from("audit_events").insert({
        object_type: "entity", object_id: entityId, action_type: "master_entity_linked",
        user_id: user.id, metadata: { master_entity_id: masterEntityId },
      });
    }
    toast({ title: "Linked to master entity" });
    setLinkOpen(false);
    load();
    onRefresh();
  };

  const handleUnlink = async () => {
    const { error } = await supabase
      .from("entities")
      .update({ master_entity_id: null, has_master_conflict: false } as any)
      .eq("id", entityId);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase.from("audit_events").insert({
        object_type: "entity", object_id: entityId, action_type: "master_entity_unlinked",
        user_id: user.id, metadata: {},
      });
    }
    toast({ title: "Unlinked from master entity" });
    load();
    onRefresh();
  };

  const handleCreateFromEntity = async () => {
    const { error, data: newMaster } = await (supabase as any)
      .from("master_entities")
      .insert({
        canonical_name: entityName,
        jurisdiction_incorporation: entityJurisdiction || null,
      })
      .select()
      .single();
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }
    // Auto-link
    await supabase.from("entities").update({ master_entity_id: (newMaster as any).id } as any).eq("id", entityId);
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase.from("audit_events").insert({
        object_type: "master_entity", object_id: (newMaster as any).id, action_type: "master_entity_created_from_client",
        user_id: user.id, metadata: { source_entity_id: entityId },
      });
    }
    toast({ title: "Master entity created and linked" });
    setCreateFromEntityOpen(false);
    load();
    onRefresh();
  };

  if (!isInternal) return null;
  if (loading) return null;

  const filteredMasters = masterList.filter((m) =>
    m.canonical_name.toLowerCase().includes(search.toLowerCase()) ||
    (m.canonical_registration_number ?? "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="fvc-card p-4 space-y-3">
      <h3 className="text-[10px] uppercase tracking-[0.08em] text-muted-foreground font-semibold flex items-center gap-1.5">
        <Link2 className="h-3.5 w-3.5" /> Master Entity Link
        <span className="text-[9px] font-normal text-muted-foreground/60 ml-1">(CR only)</span>
      </h3>

      {masterEntity ? (
        <div className="space-y-3">
          <button
            onClick={() => navigate(`/master-entities/${masterEntity.id}`)}
            className="w-full text-left p-3 rounded-md border border-border hover:bg-muted/30 transition-colors"
          >
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-primary flex-shrink-0" />
              <span className="text-sm font-medium text-foreground truncate">{masterEntity.canonical_name}</span>
            </div>
            {masterEntity.jurisdiction_incorporation && (
              <div className="text-xs text-muted-foreground mt-1 ml-6">{masterEntity.jurisdiction_incorporation}</div>
            )}
          </button>

          {hasConflict && (
            <div className="flex items-center gap-2 p-2 rounded-md bg-destructive/10 text-destructive text-xs">
              <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0" />
              <span>Field conflict detected — reconciliation needed</span>
            </div>
          )}

          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="flex-1 gap-1 text-xs" onClick={openLinkDialog}>
              <Link2 className="h-3 w-3" /> Change
            </Button>
            <Button variant="ghost" size="sm" className="gap-1 text-xs text-destructive hover:text-destructive" onClick={handleUnlink}>
              <Link2Off className="h-3 w-3" /> Unlink
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center gap-2 p-2 rounded-md bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 text-xs">
            <Link2Off className="h-3.5 w-3.5 flex-shrink-0" />
            <span>Not linked to a master entity</span>
          </div>

          {/* Suggested matches (Manager only) */}
          {canQuote && suggestions.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.08em] text-muted-foreground font-semibold">
                <Sparkles className="h-3 w-3 text-primary" /> Suggested Matches
              </div>
              {suggestions.map((s) => (
                <div key={s.masterId} className="p-2.5 rounded-md border border-border space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-foreground truncate">{s.masterName}</span>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] text-muted-foreground">{s.similarity}%</span>
                      <Progress value={s.similarity} className="w-12 h-1.5" />
                    </div>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    {s.jurisdiction && (
                      <span className="flex items-center gap-0.5">
                        <Globe className="h-3 w-3" /> {s.jurisdiction}
                        {s.jurisdictionMatch && <Badge variant="secondary" className="text-[8px] px-1 py-0 ml-1">Match</Badge>}
                      </span>
                    )}
                    {s.registrationNumber && (
                      <span className="flex items-center gap-0.5"><Hash className="h-3 w-3" /> {s.registrationNumber}</span>
                    )}
                  </div>
                  <Button size="sm" variant="outline" className="w-full text-xs h-7 mt-1" onClick={() => handleLink(s.masterId)}>
                    Confirm Link
                  </Button>
                </div>
              ))}
            </div>
          )}

          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="flex-1 gap-1.5 text-xs" onClick={openLinkDialog}>
              <Search className="h-3 w-3" /> Find & Link
            </Button>
            {canQuote && (
              <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={() => setCreateFromEntityOpen(true)}>
                <Plus className="h-3 w-3" /> Create New
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Link Dialog */}
      <Dialog open={linkOpen} onOpenChange={setLinkOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display text-lg">Link to Master Entity</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Link <strong>{entityName}</strong> to a master record:
          </p>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search by name or reg number…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
          </div>
          <div className="max-h-64 overflow-y-auto space-y-1">
            {filteredMasters.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No master entities found.</p>
            ) : (
              filteredMasters.map((m) => (
                <button
                  key={m.id}
                  onClick={() => handleLink(m.id)}
                  className="w-full text-left p-3 rounded-md hover:bg-muted/50 transition-colors flex items-center gap-3"
                >
                  <Building2 className="h-4 w-4 text-primary flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-foreground truncate">{m.canonical_name}</div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      {m.jurisdiction_incorporation && <span>{m.jurisdiction_incorporation}</span>}
                      {m.canonical_registration_number && <span>Reg: {m.canonical_registration_number}</span>}
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Create from Entity Dialog */}
      <Dialog open={createFromEntityOpen} onOpenChange={setCreateFromEntityOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-display text-lg">Create Master Entity</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Create a new master entity from <strong>{entityName}</strong> and automatically link it.
          </p>
          <div className="p-3 rounded-md border border-border bg-muted/30 space-y-1">
            <div className="text-sm font-medium">{entityName}</div>
            {entityJurisdiction && <div className="text-xs text-muted-foreground">{entityJurisdiction}</div>}
          </div>
          <Button onClick={handleCreateFromEntity} className="w-full">Create & Link</Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
