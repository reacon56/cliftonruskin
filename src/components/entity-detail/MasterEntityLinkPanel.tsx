import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Link2, Link2Off, AlertTriangle, Building2, Search, Plus } from "lucide-react";

interface MasterEntityLinkPanelProps {
  entityId: string;
  entityName: string;
  onRefresh: () => void;
}

export default function MasterEntityLinkPanel({ entityId, entityName, onRefresh }: MasterEntityLinkPanelProps) {
  const { isInternal } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [masterEntity, setMasterEntity] = useState<any>(null);
  const [hasConflict, setHasConflict] = useState(false);
  const [linkOpen, setLinkOpen] = useState(false);
  const [masterList, setMasterList] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => { load(); }, [entityId]);

  const load = async () => {
    setLoading(true);
    // Get entity's master link + conflict flag
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
    } else {
      setMasterEntity(null);
    }
    setHasConflict(ent?.has_master_conflict ?? false);
    setLoading(false);
  };

  const openLinkDialog = async () => {
    const { data } = await (supabase as any)
      .from("master_entities")
      .select("id, canonical_name, jurisdiction_incorporation")
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
    } else {
      toast({ title: "Linked to master entity" });
      setLinkOpen(false);
      load();
      onRefresh();
    }
  };

  const handleUnlink = async () => {
    const { error } = await supabase
      .from("entities")
      .update({ master_entity_id: null, has_master_conflict: false } as any)
      .eq("id", entityId);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Unlinked from master entity" });
      load();
      onRefresh();
    }
  };

  if (!isInternal) return null;
  if (loading) return null;

  const filteredMasters = masterList.filter((m) =>
    m.canonical_name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="fvc-card p-4">
      <h3 className="text-[10px] uppercase tracking-[0.08em] text-muted-foreground font-semibold mb-3 flex items-center gap-1.5">
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
              <Link2 className="h-3 w-3" /> Change Link
            </Button>
            <Button variant="ghost" size="sm" className="gap-1 text-xs text-destructive hover:text-destructive" onClick={handleUnlink}>
              <Link2Off className="h-3 w-3" /> Unlink
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-xs text-muted-foreground">Not linked to a master entity.</p>
          <Button variant="outline" size="sm" className="w-full gap-1.5 text-xs" onClick={openLinkDialog}>
            <Plus className="h-3 w-3" /> Link to Master Entity
          </Button>
        </div>
      )}

      {/* Link Dialog */}
      <Dialog open={linkOpen} onOpenChange={setLinkOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display text-lg">Link to Master Entity</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Select a master entity to link <strong>{entityName}</strong> to:
          </p>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
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
                  <div>
                    <div className="text-sm font-medium text-foreground">{m.canonical_name}</div>
                    {m.jurisdiction_incorporation && (
                      <div className="text-xs text-muted-foreground">{m.jurisdiction_incorporation}</div>
                    )}
                  </div>
                </button>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
