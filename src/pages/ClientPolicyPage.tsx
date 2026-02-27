import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Trash2, GripVertical, Shield, BookOpen, Play, Settings2 } from "lucide-react";
import { toast } from "sonner";
import PolicyRuleEditor from "@/components/policy/PolicyRuleEditor";

interface Ruleset {
  id: string;
  name: string;
  version: number;
  enabled: boolean;
  created_at: string;
  updated_at: string;
}

export default function ClientPolicyPage() {
  const { profile } = useAuth();
  const qc = useQueryClient();
  const orgId = profile?.org_id;

  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [selectedRuleset, setSelectedRuleset] = useState<string | null>(null);

  const { data: rulesets = [], isLoading } = useQuery({
    queryKey: ["client-policy-rulesets", orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data, error } = await (supabase
        .from("client_policy_ruleset") as any)
        .select("*")
        .eq("org_id", orgId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Ruleset[];
    },
  });

  const createRuleset = useMutation({
    mutationFn: async () => {
      const { data, error } = await (supabase
        .from("client_policy_ruleset") as any)
        .insert({ org_id: orgId, name: newName })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["client-policy-rulesets", orgId] });
      toast.success("Ruleset created");
      setCreateOpen(false);
      setNewName("");
      setSelectedRuleset(data.id);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const toggleRuleset = useMutation({
    mutationFn: async ({ id, enabled }: { id: string; enabled: boolean }) => {
      const { error } = await (supabase
        .from("client_policy_ruleset") as any)
        .update({ enabled, updated_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["client-policy-rulesets", orgId] });
    },
  });

  const deleteRuleset = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase
        .from("client_policy_ruleset") as any)
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["client-policy-rulesets", orgId] });
      if (selectedRuleset) setSelectedRuleset(null);
      toast.success("Ruleset deleted");
    },
  });

  const activeRuleset = rulesets.find((r) => r.id === selectedRuleset);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground flex items-center gap-2">
            <Settings2 className="h-6 w-6 text-primary" />
            Client Policy Mapping
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Map jurisdiction indicators to your organisation's internal outcomes and controls.
          </p>
        </div>
        <Button size="sm" onClick={() => setCreateOpen(true)} className="gap-1">
          <Plus className="h-4 w-4" /> New Ruleset
        </Button>
      </div>

      {/* Rulesets List */}
      <div className="grid md:grid-cols-3 gap-4">
        {rulesets.map((rs) => (
          <Card
            key={rs.id}
            className={`cursor-pointer transition-colors ${selectedRuleset === rs.id ? "border-primary ring-1 ring-primary/20" : "hover:border-muted-foreground/30"}`}
            onClick={() => setSelectedRuleset(rs.id)}
          >
            <CardContent className="pt-4 pb-3">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-medium text-sm text-foreground">{rs.name}</h3>
                <Switch
                  checked={rs.enabled}
                  onCheckedChange={(checked) => {
                    toggleRuleset.mutate({ id: rs.id, enabled: checked });
                  }}
                  onClick={(e) => e.stopPropagation()}
                />
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={rs.enabled ? "default" : "secondary"} className="text-[10px]">
                  {rs.enabled ? "Active" : "Disabled"}
                </Badge>
                <span className="text-[10px] text-muted-foreground">v{rs.version}</span>
              </div>
              <div className="flex items-center justify-between mt-3">
                <span className="text-[10px] text-muted-foreground">
                  Updated {new Date(rs.updated_at).toLocaleDateString()}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0 text-destructive/60 hover:text-destructive"
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteRuleset.mutate(rs.id);
                  }}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
        {rulesets.length === 0 && !isLoading && (
          <div className="col-span-3 text-center py-12 text-sm text-muted-foreground">
            No policy rulesets yet. Create one to start mapping indicators to outcomes.
          </div>
        )}
      </div>

      {/* Rule Editor */}
      {activeRuleset && (
        <>
          <Separator />
          <PolicyRuleEditor rulesetId={activeRuleset.id} rulesetName={activeRuleset.name} />
        </>
      )}

      {/* Info Card */}
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="pt-4 pb-3 px-4">
          <div className="flex items-start gap-2.5">
            <BookOpen className="h-4 w-4 text-primary mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-medium text-foreground mb-1">How policy mapping works</p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Policy rules let you define what internal actions should be triggered when specific
                jurisdiction indicators match conditions. For example: "If FATF_STATUS equals
                CALL_FOR_ACTION, then EDD_REQUIRED". Rules are evaluated in priority order and
                outcomes are merged. Your rules are private to your organisation — Clifton Ruskin
                cannot see your proprietary scoring logic.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Create Ruleset Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Policy Ruleset</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="space-y-1.5">
              <Label>Ruleset Name</Label>
              <Input
                placeholder="e.g. Standard Due Diligence Controls"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button onClick={() => createRuleset.mutate()} disabled={!newName.trim()}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
