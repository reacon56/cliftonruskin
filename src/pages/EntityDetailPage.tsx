import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import EntityDetailHeader from "@/components/entity-detail/EntityDetailHeader";
import OverviewTab from "@/components/entity-detail/OverviewTab";
import ProfileTab from "@/components/entity-detail/ProfileTab";
import ReviewCycleTab from "@/components/entity-detail/ReviewCycleTab";
import MonitoringTab from "@/components/entity-detail/MonitoringTab";
import DeliverablesTab from "@/components/entity-detail/DeliverablesTab";
import ActivityTab from "@/components/entity-detail/ActivityTab";

export default function EntityDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { profile, hasRole } = useAuth();
  const { toast } = useToast();

  const [entity, setEntity] = useState<any>(null);
  const [cases, setCases] = useState<any[]>([]);
  const [changeLogs, setChangeLogs] = useState<any[]>([]);
  const [monitoringEvents, setMonitoringEvents] = useState<any[]>([]);
  const [deliverables, setDeliverables] = useState<any[]>([]);
  const [policyRule, setPolicyRule] = useState<any>(null);

  // Dialogs
  const [editOpen, setEditOpen] = useState(false);
  const [tierOpen, setTierOpen] = useState(false);
  const [editForm, setEditForm] = useState<any>({});
  const [newTier, setNewTier] = useState("B");

  const canEdit = hasRole("client_admin") || hasRole("client_requester");
  const canAdmin = hasRole("client_admin");
  const canTriage = hasRole("client_admin") || hasRole("client_requester");

  useEffect(() => {
    if (id) loadAll();
  }, [id]);

  const loadAll = async () => {
    const [entityRes, casesRes, clRes, meRes] = await Promise.all([
      supabase.from("entities").select("*").eq("id", id!).single(),
      supabase.from("cases").select("*").eq("entity_id", id!).order("created_at", { ascending: false }),
      supabase.from("change_logs").select("*").eq("entity_id", id!).order("created_at", { ascending: false }),
      supabase.from("monitoring_events").select("*").eq("entity_id", id!).order("detected_at", { ascending: false }),
    ]);

    const ent = entityRes.data;
    setEntity(ent);
    setCases(casesRes.data ?? []);
    setChangeLogs(clRes.data ?? []);
    setMonitoringEvents(meRes.data ?? []);

    if (ent) {
      setEditForm({
        name: ent.name, country: ent.country || "", website: ent.website || "",
        registration_number: ent.registration_number || "", business_unit: ent.business_unit || "",
        service_provided: ent.service_provided || "", criticality: ent.criticality || "med",
        contract_renewal_date: ent.contract_renewal_date || "", onboarded_date: ent.onboarded_date || "",
      });
      setNewTier(ent.risk_tier);
    }

    // Deliverables
    const caseIds = (casesRes.data ?? []).map((c: any) => c.id);
    if (caseIds.length > 0) {
      const { data } = await supabase.from("deliverables").select("*").in("case_id", caseIds).order("created_at", { ascending: false });
      setDeliverables(data ?? []);
    }

    // Policy rule for this tier
    if (ent?.org_id) {
      const { data: orgData } = await supabase.from("organisations").select("risk_policy_default_id").eq("id", ent.org_id).single();
      if (orgData?.risk_policy_default_id) {
        const { data: rule } = await supabase
          .from("policy_rules")
          .select("*")
          .eq("policy_id", orgData.risk_policy_default_id)
          .eq("risk_tier", ent.risk_tier)
          .single();
        setPolicyRule(rule);
      }
    }
  };

  const handleEditSave = async () => {
    const { error } = await supabase.from("entities").update(editForm).eq("id", id!);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      await supabase.from("audit_events").insert({
        object_type: "entity", object_id: id!, action_type: "entity_updated",
        user_id: profile!.user_id, org_id: entity.org_id, metadata: editForm,
      });
      toast({ title: "Entity updated" });
      setEditOpen(false);
      loadAll();
    }
  };

  const handleTierChange = async () => {
    const { error } = await supabase.from("entities").update({ risk_tier: newTier }).eq("id", id!);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      await supabase.from("audit_events").insert({
        object_type: "entity", object_id: id!, action_type: "risk_tier_changed",
        user_id: profile!.user_id, org_id: entity.org_id,
        metadata: { old_tier: entity.risk_tier, new_tier: newTier },
      });
      toast({ title: `Risk tier changed to ${newTier}` });
      setTierOpen(false);
      loadAll();
    }
  };

  if (!entity) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-muted-foreground text-sm">Loading…</div>
      </div>
    );
  }

  return (
    <div>
      <EntityDetailHeader
        entity={entity}
        canEdit={canEdit}
        canAdmin={canAdmin}
        onEditEntity={() => setEditOpen(true)}
        onChangeTier={() => setTierOpen(true)}
      />

      <Tabs defaultValue="overview" className="mt-8">
        <TabsList className="bg-muted/50">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="review">Review Cycle</TabsTrigger>
          <TabsTrigger value="monitoring">Monitoring ({monitoringEvents.length})</TabsTrigger>
          <TabsTrigger value="deliverables">Deliverables ({deliverables.length + changeLogs.length})</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-6">
          <OverviewTab entity={entity} cases={cases} changeLogs={changeLogs} monitoringEvents={monitoringEvents} deliverables={deliverables} />
        </TabsContent>

        <TabsContent value="profile" className="mt-6">
          <ProfileTab entity={entity} />
        </TabsContent>

        <TabsContent value="review" className="mt-6">
          <ReviewCycleTab
            entity={entity}
            cases={cases}
            policyRule={policyRule}
            canEdit={canEdit}
            onRefresh={loadAll}
            userId={profile!.user_id}
          />
        </TabsContent>

        <TabsContent value="monitoring" className="mt-6">
          <MonitoringTab entity={entity} events={monitoringEvents} canTriage={canTriage} onRefresh={loadAll} />
        </TabsContent>

        <TabsContent value="deliverables" className="mt-6">
          <DeliverablesTab deliverables={deliverables} changeLogs={changeLogs} cases={cases} />
        </TabsContent>

        <TabsContent value="activity" className="mt-6">
          <ActivityTab entityId={entity.id} />
        </TabsContent>
      </Tabs>

      {/* Edit Entity Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-display text-xl">Edit Entity</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="space-y-1.5">
              <Label>Name</Label>
              <Input value={editForm.name || ""} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Country</Label>
                <Input value={editForm.country || ""} onChange={(e) => setEditForm({ ...editForm, country: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Website</Label>
                <Input value={editForm.website || ""} onChange={(e) => setEditForm({ ...editForm, website: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Business Unit</Label>
                <Input value={editForm.business_unit || ""} onChange={(e) => setEditForm({ ...editForm, business_unit: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Service Provided</Label>
                <Input value={editForm.service_provided || ""} onChange={(e) => setEditForm({ ...editForm, service_provided: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Criticality</Label>
                <Select value={editForm.criticality || "med"} onValueChange={(v) => setEditForm({ ...editForm, criticality: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="med">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Registration Number</Label>
                <Input value={editForm.registration_number || ""} onChange={(e) => setEditForm({ ...editForm, registration_number: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Onboarded Date</Label>
                <Input type="date" value={editForm.onboarded_date || ""} onChange={(e) => setEditForm({ ...editForm, onboarded_date: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Contract Renewal</Label>
                <Input type="date" value={editForm.contract_renewal_date || ""} onChange={(e) => setEditForm({ ...editForm, contract_renewal_date: e.target.value })} />
              </div>
            </div>
            <Button onClick={handleEditSave} className="w-full">Save Changes</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Change Tier Dialog */}
      <Dialog open={tierOpen} onOpenChange={setTierOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-display text-xl">Change Risk Tier</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <p className="text-sm text-muted-foreground">
              Current tier: <strong className="text-foreground">Tier {entity.risk_tier}</strong>. This change will be logged.
            </p>
            <Select value={newTier} onValueChange={setNewTier}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="A">Tier A — High Risk</SelectItem>
                <SelectItem value="B">Tier B — Medium Risk</SelectItem>
                <SelectItem value="C">Tier C — Low Risk</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={handleTierChange} className="w-full" disabled={newTier === entity.risk_tier}>
              Confirm Tier Change
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
