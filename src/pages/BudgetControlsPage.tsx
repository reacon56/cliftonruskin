import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Tooltip, TooltipContent, TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Wallet, Plus, Pencil, Info, ShieldAlert, AlertTriangle,
  CheckCircle2, ArrowUpDown,
} from "lucide-react";

/* ─── types ─── */

interface Budget {
  id: string;
  org_id: string;
  period_type: string;
  period_start: string;
  period_end: string;
  total_cap: number;
  jurisdiction_caps: Record<string, number>;
  criticality_caps: Record<string, number>;
  cap_behaviour: string;
  committed_spend: number;
  delivered_spend: number;
  partner_spend: number;
  notes: string | null;
  created_at: string;
}

interface Override {
  id: string;
  budget_id: string;
  case_id: string | null;
  override_amount: number;
  justification: string;
  override_by: string;
  created_at: string;
}

interface Org {
  id: string;
  name: string;
}

const PERIOD_TYPES = ["monthly", "quarterly", "annual"];
const CAP_BEHAVIOURS = [
  { value: "block", label: "Block", desc: "Prevent new commissions when cap reached" },
  { value: "warn", label: "Warn", desc: "Allow but show warning to client and manager" },
  { value: "require_approval", label: "Require Approval", desc: "Manager must approve each over-cap commission" },
];

/* ─── component ─── */

export default function BudgetControlsPage() {
  const { isInternal, isClient, hasRole, profile, user } = useAuth();
  const { toast } = useToast();
  const isManager = hasRole("fvc_assurance_manager" as any) || hasRole("fvc_ops_admin" as any);

  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [orgs, setOrgs] = useState<Org[]>([]);
  const [overrides, setOverrides] = useState<Override[]>([]);
  const [loading, setLoading] = useState(true);
  const [editBudget, setEditBudget] = useState<Partial<Budget> | null>(null);
  const [saving, setSaving] = useState(false);

  // Override dialog
  const [overrideDialog, setOverrideDialog] = useState<{ budgetId: string } | null>(null);
  const [overrideAmount, setOverrideAmount] = useState(0);
  const [overrideJustification, setOverrideJustification] = useState("");
  const [savingOverride, setSavingOverride] = useState(false);

  // Jurisdiction/criticality cap editing
  const [jurisdictionKey, setJurisdictionKey] = useState("");
  const [jurisdictionVal, setJurisdictionVal] = useState(0);
  const [criticalityKey, setCriticalityKey] = useState("");
  const [criticalityVal, setCriticalityVal] = useState(0);

  useEffect(() => { loadAll(); }, []);

  async function loadAll() {
    setLoading(true);
    const budgetQuery = isClient
      ? supabase.from("programme_budgets" as any).select("*").eq("org_id", profile?.org_id).order("period_start", { ascending: false })
      : supabase.from("programme_budgets" as any).select("*").order("period_start", { ascending: false });

    const [budgetRes, orgsRes] = await Promise.all([
      budgetQuery,
      isInternal ? supabase.from("organisations").select("id, name").order("name") : Promise.resolve({ data: [] }),
    ]);

    setBudgets((budgetRes.data as any as Budget[]) ?? []);
    setOrgs((orgsRes.data as any as Org[]) ?? []);

    // Load overrides for all budgets
    if (isInternal && budgetRes.data?.length) {
      const ids = (budgetRes.data as any[]).map(b => b.id);
      const { data: ovr } = await supabase.from("budget_overrides" as any).select("*").in("budget_id", ids).order("created_at", { ascending: false });
      setOverrides((ovr as any as Override[]) ?? []);
    }

    setLoading(false);
  }

  function getOrgName(orgId: string) {
    return orgs.find(o => o.id === orgId)?.name ?? orgId.slice(0, 8);
  }

  /* ── Budget CRUD ── */
  async function saveBudget() {
    if (!editBudget?.org_id || !editBudget.period_start || !editBudget.period_end) return;
    setSaving(true);

    const payload: any = {
      org_id: editBudget.org_id,
      period_type: editBudget.period_type || "annual",
      period_start: editBudget.period_start,
      period_end: editBudget.period_end,
      total_cap: editBudget.total_cap || 0,
      jurisdiction_caps: editBudget.jurisdiction_caps || {},
      criticality_caps: editBudget.criticality_caps || {},
      cap_behaviour: editBudget.cap_behaviour || "warn",
      notes: editBudget.notes || null,
    };

    if (editBudget.id) {
      await supabase.from("programme_budgets" as any).update(payload).eq("id", editBudget.id);
      toast({ title: "Budget updated" });
    } else {
      payload.created_by = user?.id;
      await supabase.from("programme_budgets" as any).insert(payload);
      toast({ title: "Budget created" });
    }

    // Audit
    if (user && profile) {
      await supabase.from("audit_events").insert({
        user_id: user.id, org_id: profile.org_id,
        action_type: editBudget.id ? "BUDGET_UPDATED" : "BUDGET_CREATED",
        object_type: "programme_budget", object_id: editBudget.id || null,
        metadata: { target_org_id: editBudget.org_id, total_cap: payload.total_cap, cap_behaviour: payload.cap_behaviour },
      });
    }

    setEditBudget(null);
    setSaving(false);
    loadAll();
  }

  /* ── Override ── */
  async function saveOverride() {
    if (!overrideDialog || !overrideJustification.trim() || !user) return;
    setSavingOverride(true);

    await supabase.from("budget_overrides" as any).insert({
      budget_id: overrideDialog.budgetId,
      override_amount: overrideAmount,
      justification: overrideJustification,
      override_by: user.id,
    } as any);

    // Update budget committed spend with override
    const budget = budgets.find(b => b.id === overrideDialog.budgetId);
    if (budget) {
      await supabase.from("programme_budgets" as any)
        .update({ committed_spend: Number(budget.committed_spend) + overrideAmount } as any)
        .eq("id", budget.id);
    }

    // Audit
    if (profile) {
      await supabase.from("audit_events").insert({
        user_id: user.id, org_id: profile.org_id,
        action_type: "BUDGET_CAP_OVERRIDE",
        object_type: "programme_budget", object_id: overrideDialog.budgetId,
        metadata: { override_amount: overrideAmount, justification: overrideJustification },
      });
    }

    toast({ title: "Cap override recorded" });
    setOverrideDialog(null);
    setOverrideAmount(0);
    setOverrideJustification("");
    setSavingOverride(false);
    loadAll();
  }

  /* ── Helpers ── */
  function addJurisdictionCap() {
    if (!jurisdictionKey || !editBudget) return;
    setEditBudget({
      ...editBudget,
      jurisdiction_caps: { ...(editBudget.jurisdiction_caps || {}), [jurisdictionKey]: jurisdictionVal },
    });
    setJurisdictionKey("");
    setJurisdictionVal(0);
  }

  function addCriticalityCap() {
    if (!criticalityKey || !editBudget) return;
    setEditBudget({
      ...editBudget,
      criticality_caps: { ...(editBudget.criticality_caps || {}), [criticalityKey]: criticalityVal },
    });
    setCriticalityKey("");
    setCriticalityVal(0);
  }

  function removeJurisdictionCap(key: string) {
    if (!editBudget) return;
    const caps = { ...(editBudget.jurisdiction_caps || {}) };
    delete caps[key];
    setEditBudget({ ...editBudget, jurisdiction_caps: caps });
  }

  function removeCriticalityCap(key: string) {
    if (!editBudget) return;
    const caps = { ...(editBudget.criticality_caps || {}) };
    delete caps[key];
    setEditBudget({ ...editBudget, criticality_caps: caps });
  }

  return (
    <div className="space-y-6 p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground flex items-center gap-2">
            <Wallet size={22} className="text-primary" /> Budget & Spend Controls
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {isClient ? "View your programme budget and spend." : "Manage client programme budgets, caps, and overrides."}
          </p>
        </div>
        {isManager && (
          <Button size="sm" onClick={() => setEditBudget({ period_type: "annual", cap_behaviour: "warn", total_cap: 0, jurisdiction_caps: {}, criticality_caps: {} })} className="gap-1.5">
            <Plus size={14} /> New Budget
          </Button>
        )}
      </div>

      {loading ? (
        <div className="text-sm text-muted-foreground py-8 text-center">Loading budgets…</div>
      ) : budgets.length === 0 ? (
        <div className="text-sm text-muted-foreground py-8 text-center">No budgets configured yet.</div>
      ) : (
        <div className="space-y-4">
          {budgets.map((b) => {
            const totalSpend = Number(b.committed_spend) + Number(b.partner_spend);
            const cap = Number(b.total_cap);
            const pct = cap > 0 ? Math.min((totalSpend / cap) * 100, 100) : 0;
            const overCap = cap > 0 && totalSpend > cap;
            const budgetOverrides = overrides.filter(o => o.budget_id === b.id);

            return (
              <div key={b.id} className="rounded-lg border border-border bg-card p-5 space-y-4">
                {/* Header */}
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-display text-base font-semibold text-foreground">
                        {isInternal ? getOrgName(b.org_id) : "Programme Budget"}
                      </h3>
                      <Badge variant="outline" className="text-[10px] capitalize">{b.period_type}</Badge>
                      <Badge variant={b.cap_behaviour === "block" ? "destructive" : b.cap_behaviour === "require_approval" ? "default" : "secondary"} className="text-[10px]">
                        {CAP_BEHAVIOURS.find(c => c.value === b.cap_behaviour)?.label ?? b.cap_behaviour}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {new Date(b.period_start).toLocaleDateString()} — {new Date(b.period_end).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {isManager && (
                      <>
                        <Button variant="ghost" size="sm" onClick={() => setEditBudget(b)} className="h-7 px-2 text-xs">
                          <Pencil size={12} className="mr-1" /> Edit
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => { setOverrideDialog({ budgetId: b.id }); setOverrideAmount(0); setOverrideJustification(""); }} className="h-7 px-2 text-xs gap-1">
                          <ShieldAlert size={12} /> Override Cap
                        </Button>
                      </>
                    )}
                  </div>
                </div>

                {/* Spend bar */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Total Spend vs Cap</span>
                    <span className={`font-display font-semibold ${overCap ? "text-destructive" : "text-foreground"}`}>
                      £{totalSpend.toLocaleString()} / £{cap.toLocaleString()}
                    </span>
                  </div>
                  <Progress value={pct} className={`h-2.5 ${overCap ? "[&>div]:bg-destructive" : ""}`} />
                  {overCap && (
                    <div className="flex items-center gap-1 text-xs text-destructive">
                      <AlertTriangle size={12} /> Budget cap exceeded
                    </div>
                  )}
                </div>

                {/* Spend breakdown */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="rounded-md border border-border p-3 text-center">
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Committed</div>
                    <div className="font-display text-lg font-semibold text-foreground">
                      £{Number(b.committed_spend).toLocaleString()}
                    </div>
                    <div className="text-[10px] text-muted-foreground">Approved quotes</div>
                  </div>
                  <div className="rounded-md border border-border p-3 text-center">
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Delivered</div>
                    <div className="font-display text-lg font-semibold text-foreground">
                      £{Number(b.delivered_spend).toLocaleString()}
                    </div>
                    <div className="text-[10px] text-muted-foreground">Completed work</div>
                  </div>
                  <div className="rounded-md border border-border p-3 text-center">
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Partner Costs</div>
                    <div className="font-display text-lg font-semibold text-foreground">
                      £{Number(b.partner_spend).toLocaleString()}
                    </div>
                    <div className="text-[10px] text-muted-foreground">Pass-through</div>
                  </div>
                </div>

                {/* Remaining */}
                <div className="flex items-center justify-between text-sm border-t border-border pt-3">
                  <span className="text-muted-foreground">Remaining Budget</span>
                  <span className={`font-display font-semibold ${(cap - totalSpend) < 0 ? "text-destructive" : "text-primary"}`}>
                    £{(cap - totalSpend).toLocaleString()}
                  </span>
                </div>

                {/* Jurisdiction & Criticality caps (internal only) */}
                {isInternal && (Object.keys(b.jurisdiction_caps || {}).length > 0 || Object.keys(b.criticality_caps || {}).length > 0) && (
                  <div className="grid grid-cols-2 gap-4 border-t border-border pt-3">
                    {Object.keys(b.jurisdiction_caps || {}).length > 0 && (
                      <div>
                        <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Jurisdiction Caps</span>
                        <div className="mt-1 space-y-1">
                          {Object.entries(b.jurisdiction_caps).map(([k, v]) => (
                            <div key={k} className="flex justify-between text-xs">
                              <span className="text-muted-foreground">{k}</span>
                              <span className="text-foreground font-mono">£{Number(v).toLocaleString()}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {Object.keys(b.criticality_caps || {}).length > 0 && (
                      <div>
                        <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Criticality Caps</span>
                        <div className="mt-1 space-y-1">
                          {Object.entries(b.criticality_caps).map(([k, v]) => (
                            <div key={k} className="flex justify-between text-xs">
                              <span className="text-muted-foreground">Tier {k}</span>
                              <span className="text-foreground font-mono">£{Number(v).toLocaleString()}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Overrides log (internal only) */}
                {isInternal && budgetOverrides.length > 0 && (
                  <div className="border-t border-border pt-3">
                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Cap Overrides</span>
                    <div className="mt-1 space-y-1.5">
                      {budgetOverrides.map(ov => (
                        <div key={ov.id} className="flex items-start gap-2 text-xs bg-muted/30 rounded p-2">
                          <ShieldAlert size={12} className="text-primary mt-0.5 shrink-0" />
                          <div>
                            <span className="font-medium text-foreground">+£{Number(ov.override_amount).toLocaleString()}</span>
                            <span className="text-muted-foreground ml-2">{ov.justification}</span>
                            <div className="text-[10px] text-muted-foreground mt-0.5">{new Date(ov.created_at).toLocaleDateString()}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ═══════ BUDGET DIALOG ═══════ */}
      <Dialog open={!!editBudget} onOpenChange={(o) => !o && setEditBudget(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display">{editBudget?.id ? "Edit Budget" : "New Programme Budget"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {/* Org selector */}
            <div>
              <Label className="text-xs">Client Organisation *</Label>
              <Select value={editBudget?.org_id ?? ""} onValueChange={(v) => setEditBudget({ ...editBudget!, org_id: v })}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Select organisation…" /></SelectTrigger>
                <SelectContent>
                  {orgs.map(o => <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Period Type</Label>
                <Select value={editBudget?.period_type ?? "annual"} onValueChange={(v) => setEditBudget({ ...editBudget!, period_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PERIOD_TYPES.map(p => <SelectItem key={p} value={p} className="capitalize">{p}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Cap Behaviour</Label>
                <Select value={editBudget?.cap_behaviour ?? "warn"} onValueChange={(v) => setEditBudget({ ...editBudget!, cap_behaviour: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CAP_BEHAVIOURS.map(c => (
                      <SelectItem key={c.value} value={c.value}>
                        <div><div className="font-medium">{c.label}</div><div className="text-[10px] text-muted-foreground">{c.desc}</div></div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Period Start</Label>
                <Input type="date" value={editBudget?.period_start ?? ""} onChange={(e) => setEditBudget({ ...editBudget!, period_start: e.target.value })} />
              </div>
              <div>
                <Label className="text-xs">Period End</Label>
                <Input type="date" value={editBudget?.period_end ?? ""} onChange={(e) => setEditBudget({ ...editBudget!, period_end: e.target.value })} />
              </div>
            </div>

            <div>
              <Label className="text-xs">Total Budget Cap (£)</Label>
              <Input type="number" min={0} value={editBudget?.total_cap ?? 0} onChange={(e) => setEditBudget({ ...editBudget!, total_cap: Number(e.target.value) })} />
            </div>

            {/* Jurisdiction caps */}
            <div>
              <Label className="text-xs">Jurisdiction Caps (optional)</Label>
              <div className="space-y-1 mt-1">
                {Object.entries(editBudget?.jurisdiction_caps || {}).map(([k, v]) => (
                  <div key={k} className="flex items-center justify-between text-xs bg-muted/30 rounded px-2 py-1">
                    <span>{k}: £{Number(v).toLocaleString()}</span>
                    <Button variant="ghost" size="sm" className="h-5 w-5 p-0 text-muted-foreground hover:text-destructive" onClick={() => removeJurisdictionCap(k)}>×</Button>
                  </div>
                ))}
              </div>
              <div className="flex gap-2 mt-1">
                <Input placeholder="e.g. GB" value={jurisdictionKey} onChange={(e) => setJurisdictionKey(e.target.value.toUpperCase())} className="text-xs w-20" />
                <Input type="number" placeholder="£" value={jurisdictionVal || ""} onChange={(e) => setJurisdictionVal(Number(e.target.value))} className="text-xs w-24" />
                <Button variant="outline" size="sm" onClick={addJurisdictionCap} className="text-xs h-8">Add</Button>
              </div>
            </div>

            {/* Criticality caps */}
            <div>
              <Label className="text-xs">Criticality Tier Caps (optional)</Label>
              <div className="space-y-1 mt-1">
                {Object.entries(editBudget?.criticality_caps || {}).map(([k, v]) => (
                  <div key={k} className="flex items-center justify-between text-xs bg-muted/30 rounded px-2 py-1">
                    <span>Tier {k}: £{Number(v).toLocaleString()}</span>
                    <Button variant="ghost" size="sm" className="h-5 w-5 p-0 text-muted-foreground hover:text-destructive" onClick={() => removeCriticalityCap(k)}>×</Button>
                  </div>
                ))}
              </div>
              <div className="flex gap-2 mt-1">
                <Select value={criticalityKey} onValueChange={setCriticalityKey}>
                  <SelectTrigger className="text-xs w-20"><SelectValue placeholder="Tier" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="A">A</SelectItem>
                    <SelectItem value="B">B</SelectItem>
                    <SelectItem value="C">C</SelectItem>
                  </SelectContent>
                </Select>
                <Input type="number" placeholder="£" value={criticalityVal || ""} onChange={(e) => setCriticalityVal(Number(e.target.value))} className="text-xs w-24" />
                <Button variant="outline" size="sm" onClick={addCriticalityCap} className="text-xs h-8">Add</Button>
              </div>
            </div>

            <div>
              <Label className="text-xs">Notes</Label>
              <textarea className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" rows={2} value={editBudget?.notes ?? ""} onChange={(e) => setEditBudget({ ...editBudget!, notes: e.target.value })} />
            </div>
          </div>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setEditBudget(null)}>Cancel</Button>
            <Button onClick={saveBudget} disabled={saving || !editBudget?.org_id || !editBudget?.period_start || !editBudget?.period_end}>
              {saving ? "Saving…" : "Save Budget"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ═══════ OVERRIDE DIALOG ═══════ */}
      <Dialog open={!!overrideDialog} onOpenChange={(o) => !o && setOverrideDialog(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-display flex items-center gap-2">
              <ShieldAlert size={16} className="text-primary" /> Override Budget Cap
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-xs">Additional Amount (£) *</Label>
              <Input type="number" min={0} value={overrideAmount || ""} onChange={(e) => setOverrideAmount(Number(e.target.value))} />
            </div>
            <div>
              <Label className="text-xs">Justification *</Label>
              <textarea className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" rows={3} value={overrideJustification} onChange={(e) => setOverrideJustification(e.target.value)} placeholder="Reason for overriding the budget cap…" />
            </div>
          </div>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setOverrideDialog(null)}>Cancel</Button>
            <Button onClick={saveOverride} disabled={savingOverride || !overrideJustification.trim() || overrideAmount <= 0}>
              {savingOverride ? "Saving…" : "Record Override"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
