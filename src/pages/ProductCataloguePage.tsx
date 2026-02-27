import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
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
  Tabs, TabsContent, TabsList, TabsTrigger,
} from "@/components/ui/tabs";
import {
  Package, Plus, Pencil, Info, FileText, CreditCard,
} from "lucide-react";

/* ─────────────── types ─────────────── */

interface Product {
  id: string;
  product_name: string;
  product_type: string;
  description: string;
  internal_delivery_notes: string | null;
  base_price: number;
  pricing_unit: string;
  sla_default_days: number | null;
  included_in_packages: string[];
  vat_applicability: string;
  jurisdiction_pricing_modifier: any;
  enabled: boolean;
}

interface RateCard {
  id: string;
  name: string;
  org_id: string | null;
  client_group: string | null;
  version: number;
  status: string;
  effective_from: string | null;
  effective_to: string | null;
  discount_pct: number;
  notes: string | null;
  created_at: string;
}

interface RateCardItem {
  id: string;
  rate_card_id: string;
  product_id: string;
  override_price: number | null;
  override_sla_days: number | null;
  override_vat: string | null;
  notes: string | null;
}

const PRODUCT_TYPES = ["Subscription", "Monitoring", "Report", "Add-on", "Partner Service"];
const PRICING_UNITS = ["per entity", "per report", "per month", "per hour", "fixed"];
const VAT_OPTIONS = ["VATable", "Reverse charge", "Exempt", "TBD"];
const PACKAGES = ["Core", "Enhanced", "Premium"];

const EMPTY_PRODUCT: Omit<Product, "id"> = {
  product_name: "",
  product_type: "Report",
  description: "",
  internal_delivery_notes: null,
  base_price: 0,
  pricing_unit: "per report",
  sla_default_days: null,
  included_in_packages: [],
  vat_applicability: "VATable",
  jurisdiction_pricing_modifier: {},
  enabled: true,
};

/* ─────────────── helpers ─────────────── */

function formatPrice(price: number, vat: string, includeVat: boolean) {
  if (!includeVat || vat !== "VATable") return `£${price.toLocaleString()}`;
  return `£${(price * 1.2).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/* ─────────────── component ─────────────── */

export default function ProductCataloguePage() {
  const { isInternal, hasRole } = useAuth();
  const { toast } = useToast();
  const isManager = hasRole("fvc_assurance_manager" as any) || hasRole("fvc_ops_admin" as any);

  // Products
  const [products, setProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [editProduct, setEditProduct] = useState<Partial<Product> | null>(null);
  const [saving, setSaving] = useState(false);
  const [showVatInc, setShowVatInc] = useState(false);

  // Rate cards
  const [rateCards, setRateCards] = useState<RateCard[]>([]);
  const [loadingCards, setLoadingCards] = useState(true);
  const [editCard, setEditCard] = useState<Partial<RateCard> | null>(null);
  const [savingCard, setSavingCard] = useState(false);

  useEffect(() => {
    fetchProducts();
    fetchRateCards();
  }, []);

  async function fetchProducts() {
    setLoadingProducts(true);
    const { data } = await supabase.from("products" as any).select("*").order("product_name");
    setProducts((data as any as Product[]) ?? []);
    setLoadingProducts(false);
  }

  async function fetchRateCards() {
    setLoadingCards(true);
    const { data } = await supabase.from("rate_cards" as any).select("*").order("created_at", { ascending: false });
    setRateCards((data as any as RateCard[]) ?? []);
    setLoadingCards(false);
  }

  /* ── Product CRUD ── */
  async function saveProduct() {
    if (!editProduct?.product_name) return;
    setSaving(true);
    const payload = {
      product_name: editProduct.product_name,
      product_type: editProduct.product_type || "Report",
      description: editProduct.description || "",
      internal_delivery_notes: editProduct.internal_delivery_notes || null,
      base_price: editProduct.base_price || 0,
      pricing_unit: editProduct.pricing_unit || "per report",
      sla_default_days: editProduct.sla_default_days || null,
      included_in_packages: editProduct.included_in_packages || [],
      vat_applicability: editProduct.vat_applicability || "VATable",
      jurisdiction_pricing_modifier: editProduct.jurisdiction_pricing_modifier || {},
      enabled: editProduct.enabled ?? true,
    };

    if (editProduct.id) {
      await supabase.from("products" as any).update(payload as any).eq("id", editProduct.id);
      toast({ title: "Product updated" });
    } else {
      await supabase.from("products" as any).insert(payload as any);
      toast({ title: "Product created" });
    }
    setEditProduct(null);
    setSaving(false);
    fetchProducts();
  }

  async function toggleProductEnabled(p: Product) {
    await supabase.from("products" as any).update({ enabled: !p.enabled } as any).eq("id", p.id);
    fetchProducts();
  }

  /* ── Rate Card CRUD ── */
  async function saveRateCard() {
    if (!editCard?.name) return;
    setSavingCard(true);
    const payload = {
      name: editCard.name,
      org_id: editCard.org_id || null,
      client_group: editCard.client_group || null,
      version: editCard.version || 1,
      status: editCard.status || "draft",
      effective_from: editCard.effective_from || null,
      effective_to: editCard.effective_to || null,
      discount_pct: editCard.discount_pct || 0,
      notes: editCard.notes || null,
    };

    if (editCard.id) {
      await supabase.from("rate_cards" as any).update(payload as any).eq("id", editCard.id);
      toast({ title: "Rate card updated" });
    } else {
      await supabase.from("rate_cards" as any).insert(payload as any);
      toast({ title: "Rate card created" });
    }
    setEditCard(null);
    setSavingCard(false);
    fetchRateCards();
  }

  /* ── Package toggle helper ── */
  function togglePackage(pkg: string) {
    if (!editProduct) return;
    const current = editProduct.included_in_packages ?? [];
    const next = current.includes(pkg) ? current.filter((p) => p !== pkg) : [...current, pkg];
    setEditProduct({ ...editProduct, included_in_packages: next });
  }

  return (
    <div className="space-y-6 p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground flex items-center gap-2">
            <Package size={22} className="text-primary" /> Product Catalogue & Rate Cards
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage products, pricing, and client-specific rate cards.
          </p>
        </div>
      </div>

      <Tabs defaultValue="products">
        <TabsList>
          <TabsTrigger value="products" className="gap-1.5"><FileText size={14} /> Products</TabsTrigger>
          <TabsTrigger value="ratecards" className="gap-1.5"><CreditCard size={14} /> Rate Cards</TabsTrigger>
        </TabsList>

        {/* ═══════ PRODUCTS TAB ═══════ */}
        <TabsContent value="products" className="space-y-4 mt-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <label className="text-xs text-muted-foreground flex items-center gap-1.5">
                <Switch checked={showVatInc} onCheckedChange={setShowVatInc} />
                Show inc. VAT
              </label>
              <Tooltip>
                <TooltipTrigger>
                  <Info size={14} className="text-muted-foreground" />
                </TooltipTrigger>
                <TooltipContent className="max-w-[220px] text-xs">
                  VAT treatment depends on client status (UK domestic, reverse charge, exempt). Prices shown are indicative.
                </TooltipContent>
              </Tooltip>
            </div>
            {isManager && (
              <Button size="sm" onClick={() => setEditProduct({ ...EMPTY_PRODUCT })} className="gap-1.5">
                <Plus size={14} /> Add Product
              </Button>
            )}
          </div>

          {loadingProducts ? (
            <div className="text-sm text-muted-foreground py-8 text-center">Loading products…</div>
          ) : products.length === 0 ? (
            <div className="text-sm text-muted-foreground py-8 text-center">No products configured yet.</div>
          ) : (
            <div className="rounded-lg border border-border overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr className="text-left text-xs text-muted-foreground">
                    <th className="px-4 py-2.5 font-medium">Product</th>
                    <th className="px-4 py-2.5 font-medium">Type</th>
                    <th className="px-4 py-2.5 font-medium text-right">
                      Price {showVatInc ? "(inc. VAT)" : "(ex. VAT)"}
                    </th>
                    <th className="px-4 py-2.5 font-medium">Unit</th>
                    <th className="px-4 py-2.5 font-medium">SLA</th>
                    <th className="px-4 py-2.5 font-medium">Packages</th>
                    <th className="px-4 py-2.5 font-medium">VAT</th>
                    <th className="px-4 py-2.5 font-medium">Status</th>
                    {isManager && <th className="px-4 py-2.5 font-medium" />}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {products.map((p) => (
                    <tr key={p.id} className={`${!p.enabled ? "opacity-50" : ""}`}>
                      <td className="px-4 py-3 font-medium text-foreground">{p.product_name}</td>
                      <td className="px-4 py-3">
                        <Badge variant="outline" className="text-[10px]">{p.product_type}</Badge>
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-foreground">
                        {formatPrice(Number(p.base_price), p.vat_applicability, showVatInc)}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{p.pricing_unit}</td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {p.sla_default_days ? `${p.sla_default_days}d` : "—"}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1 flex-wrap">
                          {(p.included_in_packages ?? []).map((pkg) => (
                            <Badge key={pkg} variant="secondary" className="text-[9px]">{pkg}</Badge>
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <span className="text-xs text-muted-foreground">{p.vat_applicability}</span>
                          <Tooltip>
                            <TooltipTrigger><Info size={11} className="text-muted-foreground/60" /></TooltipTrigger>
                            <TooltipContent className="text-xs max-w-[200px]">
                              VAT treatment depends on client status
                            </TooltipContent>
                          </Tooltip>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {isManager ? (
                          <Switch checked={p.enabled} onCheckedChange={() => toggleProductEnabled(p)} />
                        ) : (
                          <Badge variant={p.enabled ? "default" : "secondary"} className="text-[10px]">
                            {p.enabled ? "Active" : "Disabled"}
                          </Badge>
                        )}
                      </td>
                      {isManager && (
                        <td className="px-4 py-3">
                          <Button variant="ghost" size="sm" onClick={() => setEditProduct(p)}>
                            <Pencil size={13} />
                          </Button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </TabsContent>

        {/* ═══════ RATE CARDS TAB ═══════ */}
        <TabsContent value="ratecards" className="space-y-4 mt-4">
          <div className="flex items-center justify-end">
            {isManager && (
              <Button size="sm" onClick={() => setEditCard({ name: "", version: 1, status: "draft", discount_pct: 0 })} className="gap-1.5">
                <Plus size={14} /> New Rate Card
              </Button>
            )}
          </div>

          {loadingCards ? (
            <div className="text-sm text-muted-foreground py-8 text-center">Loading rate cards…</div>
          ) : rateCards.length === 0 ? (
            <div className="text-sm text-muted-foreground py-8 text-center">No rate cards yet.</div>
          ) : (
            <div className="rounded-lg border border-border overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr className="text-left text-xs text-muted-foreground">
                    <th className="px-4 py-2.5 font-medium">Name</th>
                    <th className="px-4 py-2.5 font-medium">Client / Group</th>
                    <th className="px-4 py-2.5 font-medium">Version</th>
                    <th className="px-4 py-2.5 font-medium">Status</th>
                    <th className="px-4 py-2.5 font-medium">Discount</th>
                    <th className="px-4 py-2.5 font-medium">Effective</th>
                    {isManager && <th className="px-4 py-2.5 font-medium" />}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {rateCards.map((rc) => (
                    <tr key={rc.id}>
                      <td className="px-4 py-3 font-medium text-foreground">{rc.name}</td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {rc.client_group || (rc.org_id ? "Client-specific" : "Global")}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">v{rc.version}</td>
                      <td className="px-4 py-3">
                        <Badge variant={rc.status === "active" ? "default" : "secondary"} className="text-[10px]">
                          {rc.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {Number(rc.discount_pct) > 0 ? `${rc.discount_pct}%` : "—"}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground text-xs">
                        {rc.effective_from ? new Date(rc.effective_from).toLocaleDateString() : "—"}
                        {rc.effective_to ? ` → ${new Date(rc.effective_to).toLocaleDateString()}` : ""}
                      </td>
                      {isManager && (
                        <td className="px-4 py-3">
                          <Button variant="ghost" size="sm" onClick={() => setEditCard(rc)}>
                            <Pencil size={13} />
                          </Button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* ═══════ PRODUCT DIALOG ═══════ */}
      <Dialog open={!!editProduct} onOpenChange={(o) => !o && setEditProduct(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display">
              {editProduct?.id ? "Edit Product" : "New Product"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-xs font-medium text-foreground">Product Name *</label>
              <Input value={editProduct?.product_name ?? ""} onChange={(e) => setEditProduct({ ...editProduct!, product_name: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-foreground">Type</label>
                <Select value={editProduct?.product_type ?? "Report"} onValueChange={(v) => setEditProduct({ ...editProduct!, product_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{PRODUCT_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs font-medium text-foreground">Pricing Unit</label>
                <Select value={editProduct?.pricing_unit ?? "per report"} onValueChange={(v) => setEditProduct({ ...editProduct!, pricing_unit: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{PRICING_UNITS.map((u) => <SelectItem key={u} value={u}>{u}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-foreground">Base Price (£)</label>
                <Input type="number" min={0} value={editProduct?.base_price ?? 0} onChange={(e) => setEditProduct({ ...editProduct!, base_price: Number(e.target.value) })} />
              </div>
              <div>
                <label className="text-xs font-medium text-foreground">SLA (days)</label>
                <Input type="number" min={0} value={editProduct?.sla_default_days ?? ""} onChange={(e) => setEditProduct({ ...editProduct!, sla_default_days: e.target.value ? Number(e.target.value) : null })} />
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-foreground">VAT Applicability</label>
              <Select value={editProduct?.vat_applicability ?? "VATable"} onValueChange={(v) => setEditProduct({ ...editProduct!, vat_applicability: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{VAT_OPTIONS.map((v) => <SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-medium text-foreground">Included in Packages</label>
              <div className="flex gap-2 mt-1">
                {PACKAGES.map((pkg) => (
                  <Badge
                    key={pkg}
                    variant={(editProduct?.included_in_packages ?? []).includes(pkg) ? "default" : "outline"}
                    className="cursor-pointer text-xs"
                    onClick={() => togglePackage(pkg)}
                  >
                    {pkg}
                  </Badge>
                ))}
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-foreground">Description (client-safe)</label>
              <textarea
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                rows={2}
                value={editProduct?.description ?? ""}
                onChange={(e) => setEditProduct({ ...editProduct!, description: e.target.value })}
              />
            </div>
            {isInternal && (
              <div>
                <label className="text-xs font-medium text-foreground">Internal Delivery Notes (CR only)</label>
                <textarea
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  rows={2}
                  value={editProduct?.internal_delivery_notes ?? ""}
                  onChange={(e) => setEditProduct({ ...editProduct!, internal_delivery_notes: e.target.value })}
                />
              </div>
            )}
          </div>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setEditProduct(null)}>Cancel</Button>
            <Button onClick={saveProduct} disabled={saving || !editProduct?.product_name}>
              {saving ? "Saving…" : "Save Product"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ═══════ RATE CARD DIALOG ═══════ */}
      <Dialog open={!!editCard} onOpenChange={(o) => !o && setEditCard(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-display">
              {editCard?.id ? "Edit Rate Card" : "New Rate Card"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-xs font-medium text-foreground">Name *</label>
              <Input value={editCard?.name ?? ""} onChange={(e) => setEditCard({ ...editCard!, name: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-foreground">Client Group</label>
                <Input placeholder="e.g. Global Pharma" value={editCard?.client_group ?? ""} onChange={(e) => setEditCard({ ...editCard!, client_group: e.target.value })} />
              </div>
              <div>
                <label className="text-xs font-medium text-foreground">Discount %</label>
                <Input type="number" min={0} max={100} value={editCard?.discount_pct ?? 0} onChange={(e) => setEditCard({ ...editCard!, discount_pct: Number(e.target.value) })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-foreground">Version</label>
                <Input type="number" min={1} value={editCard?.version ?? 1} onChange={(e) => setEditCard({ ...editCard!, version: Number(e.target.value) })} />
              </div>
              <div>
                <label className="text-xs font-medium text-foreground">Status</label>
                <Select value={editCard?.status ?? "draft"} onValueChange={(v) => setEditCard({ ...editCard!, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="superseded">Superseded</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-foreground">Effective From</label>
                <Input type="date" value={editCard?.effective_from ?? ""} onChange={(e) => setEditCard({ ...editCard!, effective_from: e.target.value || null })} />
              </div>
              <div>
                <label className="text-xs font-medium text-foreground">Effective To</label>
                <Input type="date" value={editCard?.effective_to ?? ""} onChange={(e) => setEditCard({ ...editCard!, effective_to: e.target.value || null })} />
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-foreground">Notes</label>
              <textarea
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                rows={2}
                value={editCard?.notes ?? ""}
                onChange={(e) => setEditCard({ ...editCard!, notes: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setEditCard(null)}>Cancel</Button>
            <Button onClick={saveRateCard} disabled={savingCard || !editCard?.name}>
              {savingCard ? "Saving…" : "Save Rate Card"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
