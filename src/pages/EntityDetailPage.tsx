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
import CommercialPostureTab from "@/components/entity-detail/CommercialPostureTab";
import JurisdictionBenchmarkTab from "@/components/entity-detail/JurisdictionBenchmarkTab";
import OwnershipStructureTab from "@/components/entity-detail/OwnershipStructureTab";
import { useFeatureFlags } from "@/hooks/use-feature-flags";
import { Lock } from "lucide-react";

export default function EntityDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { profile, hasRole } = useAuth();
  const { toast } = useToast();
  const { flags: featureFlags } = useFeatureFlags();

  const [entity, setEntity] = useState<any>(null);
  const [cases, setCases] = useState<any[]>([]);
  const [changeLogs, setChangeLogs] = useState<any[]>([]);
  const [monitoringEvents, setMonitoringEvents] = useState<any[]>([]);
  const [deliverables, setDeliverables] = useState<any[]>([]);
  const [operatingCountries, setOperatingCountries] = useState<any[]>([]);
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
    const [entityRes, casesRes, clRes, meRes, ocRes] = await Promise.all([
      supabase.from("entities").select("*").eq("id", id!).single(),
      supabase.from("cases").select("*").eq("entity_id", id!).order("created_at", { ascending: false }),
      supabase.from("change_logs").select("*").eq("entity_id", id!).order("created_at", { ascending: false }),
      supabase.from("monitoring_events").select("*").eq("entity_id", id!).order("detected_at", { ascending: false }),
      supabase.from("entity_operating_countries" as any).select("*").eq("entity_id", id!).order("country_name"),
    ]);

    const ent = entityRes.data;
    setEntity(ent);
    setCases(casesRes.data ?? []);
    setChangeLogs(clRes.data ?? []);
    setMonitoringEvents(meRes.data ?? []);
    setOperatingCountries((ocRes.data ?? []) as any[]);

    if (ent) {
      setEditForm({
        name: ent.name, country: ent.country || "", website: ent.website || "",
        registration_number: ent.registration_number || "", business_unit: ent.business_unit || "",
        service_provided: ent.service_provided || "", criticality: ent.criticality || "med",
        contract_renewal_date: ent.contract_renewal_date || "", onboarded_date: ent.onboarded_date || "",
        registered_address_line1: ent.registered_address_line1 || "", registered_address_line2: ent.registered_address_line2 || "",
        registered_city: ent.registered_city || "", registered_region: ent.registered_region || "",
        registered_postcode: ent.registered_postcode || "", registered_country: ent.registered_country || "",
        head_office_address_line1: ent.head_office_address_line1 || "", head_office_address_line2: ent.head_office_address_line2 || "",
        head_office_city: ent.head_office_city || "", head_office_region: ent.head_office_region || "",
        head_office_postcode: ent.head_office_postcode || "", head_office_country: ent.head_office_country || "",
        poc_name: ent.poc_name || "", poc_email: ent.poc_email || "", poc_phone: ent.poc_phone || "",
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
          <TabsTrigger value="ownership" className="gap-1">
            Ownership & Structure
            {!featureFlags.ownership_structure_intelligence && <Lock className="h-3 w-3 ml-1 text-muted-foreground" />}
          </TabsTrigger>
          <TabsTrigger value="posture" className="gap-1">Commercial Posture</TabsTrigger>
          <TabsTrigger value="benchmark" className="gap-1">Jurisdiction Benchmark</TabsTrigger>
          <TabsTrigger value="deliverables">Deliverables ({deliverables.length + changeLogs.length})</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-6">
          <OverviewTab entity={entity} cases={cases} changeLogs={changeLogs} monitoringEvents={monitoringEvents} deliverables={deliverables} operatingCountries={operatingCountries} canEdit={canEdit} userId={profile!.user_id} onRefresh={loadAll} />
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

        <TabsContent value="ownership" className="mt-6">
          {featureFlags.ownership_structure_intelligence ? (
            <OwnershipStructureTab entity={entity} />
          ) : (
            <div className="fvc-card text-center py-16 max-w-lg mx-auto">
              <div className="h-12 w-12 rounded-full bg-muted/50 flex items-center justify-center mx-auto mb-4">
                <Lock className="h-5 w-5 text-muted-foreground" />
              </div>
              <h3 className="font-display text-lg font-semibold text-foreground mb-2">
                Ownership & Structural Intelligence
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed mb-6">
                This premium module provides sophisticated visual analysis of corporate ownership, UBO clarity, and jurisdictional exposure. Available as an advanced enhancement to your engagement.
              </p>
              <p className="text-xs text-muted-foreground mb-4">
                Please contact your Assurance Manager to enable this feature.
              </p>
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5"
                onClick={() => {
                  toast({ title: "Upgrade Requested", description: "Your Assurance Manager has been notified." });
                }}
              >
                Request Upgrade
              </Button>
            </div>
          )}
        </TabsContent>

        <TabsContent value="posture" className="mt-6">
          <CommercialPostureTab entity={entity} cases={cases} />
        </TabsContent>

        <TabsContent value="benchmark" className="mt-6">
          <JurisdictionBenchmarkTab entity={entity} cases={cases} />
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
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
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

            {/* Registered Address */}
            <div className="border-t border-border pt-4">
              <p className="text-[10px] uppercase tracking-[0.08em] text-muted-foreground font-semibold mb-3">Registered Office</p>
              <div className="space-y-3">
                <Input placeholder="Address line 1" value={editForm.registered_address_line1 || ""} onChange={(e) => setEditForm({ ...editForm, registered_address_line1: e.target.value })} />
                <Input placeholder="Address line 2" value={editForm.registered_address_line2 || ""} onChange={(e) => setEditForm({ ...editForm, registered_address_line2: e.target.value })} />
                <div className="grid grid-cols-3 gap-3">
                  <Input placeholder="City" value={editForm.registered_city || ""} onChange={(e) => setEditForm({ ...editForm, registered_city: e.target.value })} />
                  <Input placeholder="Region" value={editForm.registered_region || ""} onChange={(e) => setEditForm({ ...editForm, registered_region: e.target.value })} />
                  <Input placeholder="Postcode" value={editForm.registered_postcode || ""} onChange={(e) => setEditForm({ ...editForm, registered_postcode: e.target.value })} />
                </div>
                <Input placeholder="Country" value={editForm.registered_country || ""} onChange={(e) => setEditForm({ ...editForm, registered_country: e.target.value })} />
              </div>
            </div>

            {/* Head Office */}
            <div className="border-t border-border pt-4">
              <p className="text-[10px] uppercase tracking-[0.08em] text-muted-foreground font-semibold mb-3">Head Office</p>
              <div className="space-y-3">
                <Input placeholder="Address line 1" value={editForm.head_office_address_line1 || ""} onChange={(e) => setEditForm({ ...editForm, head_office_address_line1: e.target.value })} />
                <Input placeholder="Address line 2" value={editForm.head_office_address_line2 || ""} onChange={(e) => setEditForm({ ...editForm, head_office_address_line2: e.target.value })} />
                <div className="grid grid-cols-3 gap-3">
                  <Input placeholder="City" value={editForm.head_office_city || ""} onChange={(e) => setEditForm({ ...editForm, head_office_city: e.target.value })} />
                  <Input placeholder="Region" value={editForm.head_office_region || ""} onChange={(e) => setEditForm({ ...editForm, head_office_region: e.target.value })} />
                  <Input placeholder="Postcode" value={editForm.head_office_postcode || ""} onChange={(e) => setEditForm({ ...editForm, head_office_postcode: e.target.value })} />
                </div>
                <Input placeholder="Country" value={editForm.head_office_country || ""} onChange={(e) => setEditForm({ ...editForm, head_office_country: e.target.value })} />
              </div>
            </div>

            {/* PoC */}
            <div className="border-t border-border pt-4">
              <p className="text-[10px] uppercase tracking-[0.08em] text-muted-foreground font-semibold mb-3">Point of Contact</p>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <Label>Name</Label>
                  <Input value={editForm.poc_name || ""} onChange={(e) => setEditForm({ ...editForm, poc_name: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label>Email</Label>
                  <Input type="email" value={editForm.poc_email || ""} onChange={(e) => setEditForm({ ...editForm, poc_email: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label>Phone</Label>
                  <Input value={editForm.poc_phone || ""} onChange={(e) => setEditForm({ ...editForm, poc_phone: e.target.value })} />
                </div>
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
