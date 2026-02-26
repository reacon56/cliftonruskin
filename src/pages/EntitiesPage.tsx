import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, Building2, List, Map, Globe, MapPin, ExternalLink, User, Sparkles, ArrowRight, CheckCircle2, Zap, Table2, Upload } from "lucide-react";
import BulkEntityUpload from "@/components/BulkEntityUpload";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import SavedViewsDropdown, { type FilterState } from "@/components/SavedViewsDropdown";
import EntityMapView from "@/components/EntityMapView";
import EnhancementSuggestionPanel from "@/components/EnhancementSuggestionPanel";
import { CountryFlagBadge, FlagBadgesInfo } from "@/components/CountryFlagBadge";
import { OperatingCountryChips, type OperatingCountry } from "@/components/OperatingCountries";

export default function EntitiesPage() {
  const { profile, hasRole, isInternal } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { toast } = useToast();
  const [entities, setEntities] = useState<any[]>([]);
  const [opCountriesMap, setOpCountriesMap] = useState<Record<string, OperatingCountry[]>>({});
  const [search, setSearch] = useState("");
  const [filterTier, setFilterTier] = useState<string>("all");
  const [filterType, setFilterType] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterIncCountry, setFilterIncCountry] = useState<string>("all");
  const [filterHqCountry, setFilterHqCountry] = useState<string>("all");
  const [activeViewName, setActiveViewName] = useState<string | undefined>();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [bulkUploadOpen, setBulkUploadOpen] = useState(false);
  const [viewMode, setViewMode] = useState<"list" | "map" | "table">("list");
  const [highlightEntityId, setHighlightEntityId] = useState<string | null>(null);
  const [postSaveEntity, setPostSaveEntity] = useState<{ id: string; name: string; country?: string; risk_tier?: string; data_access_level?: string } | null>(null);

  const canSeePoc = hasRole("client_admin") || hasRole("client_requester") || isInternal;

  const [form, setForm] = useState({
    name: "", entity_type: "supplier", country: "", website: "",
    registration_number: "", risk_tier: "B",
    registered_address_line1: "", registered_address_line2: "", registered_city: "",
    registered_region: "", registered_postcode: "", registered_country: "",
    head_office_address_line1: "", head_office_address_line2: "", head_office_city: "",
    head_office_region: "", head_office_postcode: "", head_office_country: "",
    poc_name: "", poc_email: "", poc_phone: "",
    location_type: "registered" as "registered" | "hq" | "both",
    same_as_registered: false,
  });

  // Sync query params to filter state
  useEffect(() => {
    const tier = searchParams.get("tier");
    const filter = searchParams.get("filter");
    const view = searchParams.get("view");
    const highlight = searchParams.get("highlight");

    if (tier) setFilterTier(tier);
    if (filter === "overdue" || filter === "due_soon" || filter === "due_60") setFilterStatus(filter);
    if (filter === "mine") setFilterStatus("mine");
    if (filter === "high_alerts") setFilterStatus("high_alerts");
    if (view === "map") setViewMode("map");
    if (highlight) setHighlightEntityId(highlight);
  }, [searchParams]);

  useEffect(() => {
    if (profile?.org_id) loadEntities();
  }, [profile?.org_id]);

  const loadEntities = async () => {
    const [entRes, ocRes] = await Promise.all([
      supabase.from("entities").select("*").eq("org_id", profile!.org_id!).order("name"),
      supabase.from("entity_operating_countries" as any).select("*").order("country_name"),
    ]);
    setEntities(entRes.data ?? []);
    // Group operating countries by entity_id
    const map: Record<string, OperatingCountry[]> = {};
    for (const oc of ((ocRes.data ?? []) as unknown as OperatingCountry[])) {
      (map[oc.entity_id] ??= []).push(oc);
    }
    setOpCountriesMap(map);
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile?.org_id) return;

    // Validate poc_email if provided
    if (form.poc_email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.poc_email)) {
      toast({ title: "Invalid email", description: "Please enter a valid PoC email address.", variant: "destructive" });
      return;
    }

    const insertData: any = {
      name: form.name, entity_type: form.entity_type, country: form.country || form.registered_country,
      website: form.website, registration_number: form.registration_number, risk_tier: form.risk_tier,
      org_id: profile.org_id, owner_user_id: profile.user_id,
      poc_name: form.poc_name || null, poc_email: form.poc_email || null, poc_phone: form.poc_phone || null,
    };

    if (form.location_type === "registered" || form.location_type === "both") {
      insertData.registered_address_line1 = form.registered_address_line1 || null;
      insertData.registered_address_line2 = form.registered_address_line2 || null;
      insertData.registered_city = form.registered_city || null;
      insertData.registered_region = form.registered_region || null;
      insertData.registered_postcode = form.registered_postcode || null;
      insertData.registered_country = form.registered_country || null;
    }

    if (form.location_type === "hq" || form.location_type === "both") {
      if (form.same_as_registered) {
        insertData.head_office_address_line1 = form.registered_address_line1 || null;
        insertData.head_office_address_line2 = form.registered_address_line2 || null;
        insertData.head_office_city = form.registered_city || null;
        insertData.head_office_region = form.registered_region || null;
        insertData.head_office_postcode = form.registered_postcode || null;
        insertData.head_office_country = form.registered_country || null;
      } else {
        insertData.head_office_address_line1 = form.head_office_address_line1 || null;
        insertData.head_office_address_line2 = form.head_office_address_line2 || null;
        insertData.head_office_city = form.head_office_city || null;
        insertData.head_office_region = form.head_office_region || null;
        insertData.head_office_postcode = form.head_office_postcode || null;
        insertData.head_office_country = form.head_office_country || null;
      }
    }

    const { data: inserted, error } = await supabase.from("entities").insert(insertData).select("id").single();
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Entity added" });
      setDialogOpen(false);
      const savedName = form.name;
      setForm({
        name: "", entity_type: "supplier", country: "", website: "",
        registration_number: "", risk_tier: "B",
        registered_address_line1: "", registered_address_line2: "", registered_city: "",
        registered_region: "", registered_postcode: "", registered_country: "",
        head_office_address_line1: "", head_office_address_line2: "", head_office_city: "",
        head_office_region: "", head_office_postcode: "", head_office_country: "",
        poc_name: "", poc_email: "", poc_phone: "",
        location_type: "registered", same_as_registered: false,
      });
      // Fire-and-forget geocoding
      if (inserted?.id) {
        supabase.functions.invoke("geocode", { body: { entity_id: inserted.id } })
          .then(() => loadEntities())
          .catch(() => {});
        setPostSaveEntity({
          id: inserted.id,
          name: savedName,
          country: form.country || form.registered_country,
          risk_tier: form.risk_tier,
        });
      }
      loadEntities();
    }
  };

  const handleApplyFilters = (filters: FilterState) => {
    setFilterTier(filters.tier || "all");
    setFilterType(filters.type || "all");
    setFilterStatus(filters.status || "all");
    setActiveViewName(undefined);
  };

  const currentFilters: FilterState = { tier: filterTier, type: filterType, status: filterStatus };

  const todayStr = new Date().toISOString().split("T")[0];
  const in30Str = new Date(Date.now() + 30 * 86400000).toISOString().split("T")[0];
  const in60Str = new Date(Date.now() + 60 * 86400000).toISOString().split("T")[0];

  const filtered = entities.filter((e) => {
    const matchSearch = e.name.toLowerCase().includes(search.toLowerCase()) ||
      (e.country || "").toLowerCase().includes(search.toLowerCase()) ||
      (e.registered_city || "").toLowerCase().includes(search.toLowerCase()) ||
      (e.head_office_city || "").toLowerCase().includes(search.toLowerCase());
    const matchTier = filterTier === "all" || e.risk_tier === filterTier;
    const matchType = filterType === "all" || e.entity_type === filterType;
    const matchInc = filterIncCountry === "all" || e.incorporation_country_name === filterIncCountry;
    const matchHq = filterHqCountry === "all" || e.hq_country_name === filterHqCountry;

    let matchStatus = true;
    if (filterStatus === "overdue") {
      matchStatus = !!e.next_review_date && e.next_review_date < todayStr;
    } else if (filterStatus === "due_soon") {
      matchStatus = !!e.next_review_date && e.next_review_date >= todayStr && e.next_review_date <= in30Str;
    } else if (filterStatus === "due_60") {
      matchStatus = !!e.next_review_date && e.next_review_date >= todayStr && e.next_review_date <= in60Str;
    } else if (filterStatus === "mine") {
      matchStatus = e.owner_user_id === profile?.user_id;
    }

    return matchSearch && matchTier && matchType && matchStatus && matchInc && matchHq;
  });

  const tierColor = (tier: string) => {
    if (tier === "A") return "bg-destructive/10 text-destructive";
    if (tier === "B") return "bg-warning/10 text-warning";
    return "bg-success/10 text-success";
  };

  const getDueStatus = (e: any) => {
    if (!e.next_review_date) return { label: "No date set", color: "bg-muted text-muted-foreground" };
    const days = Math.ceil((new Date(e.next_review_date).getTime() - Date.now()) / 86400000);
    if (days < 0) return { label: "Overdue", color: "bg-destructive/10 text-destructive" };
    if (days <= 30) return { label: "Due soon", color: "bg-warning/10 text-warning" };
    return { label: "In-date", color: "bg-success/10 text-success" };
  };

  const getLocation = (e: any) => {
    if (e.head_office_city && e.head_office_country) return `${e.head_office_city}, ${e.head_office_country}`;
    if (e.registered_city && e.registered_country) return `${e.registered_city}, ${e.registered_country}`;
    return e.country || "—";
  };

  const getAddress = (e: any) => {
    const parts = [e.registered_address_line1, e.registered_city, e.registered_country || e.country].filter(Boolean);
    return parts.length > 0 ? parts.join(", ") : null;
  };

  const canAdd = hasRole("client_admin") || hasRole("client_requester");

  const showHqFields = form.location_type === "hq" || form.location_type === "both";
  const showRegFields = form.location_type === "registered" || form.location_type === "both";

  return (
    <div>
      <div className="flex items-center justify-between mb-10">
        <div>
          <h1 className="fvc-heading-1 text-foreground">Entity Register</h1>
          <div className="fvc-gold-rule mt-3 mb-2" />
          <p className="text-sm text-muted-foreground">Third parties under due diligence</p>
        </div>
        <div className="flex items-center gap-3">
          {/* View mode toggle */}
          <div className="flex items-center rounded-md border border-border overflow-hidden">
            <button
              onClick={() => setViewMode("list")}
              className={`flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-medium transition-colors ${
                viewMode === "list" ? "bg-accent/10 text-accent" : "text-muted-foreground hover:bg-muted/50"
              }`}
            >
              <List size={12} /> List
            </button>
            <button
              onClick={() => setViewMode("table")}
              className={`flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-medium transition-colors ${
                viewMode === "table" ? "bg-accent/10 text-accent" : "text-muted-foreground hover:bg-muted/50"
              }`}
            >
              <Table2 size={12} /> Table
            </button>
            <button
              onClick={() => setViewMode("map")}
              className={`flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-medium transition-colors ${
                viewMode === "map" ? "bg-accent/10 text-accent" : "text-muted-foreground hover:bg-muted/50"
              }`}
            >
              <Map size={12} /> Map
            </button>
          </div>
          <SavedViewsDropdown pageType="entities" currentFilters={currentFilters} onApplyFilters={handleApplyFilters} />
          {hasRole("client_admin") && (
            <Button variant="outline" onClick={() => setBulkUploadOpen(true)}>
              <Upload size={15} className="mr-2" />Bulk Upload
            </Button>
          )}
          {canAdd && (
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button><Plus size={15} className="mr-2" />Add Entity</Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle className="font-display text-xl">Add Entity</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleAdd} className="space-y-5 mt-2">
                  {/* Basic info */}
                  <div className="space-y-2">
                    <Label>Name *</Label>
                    <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Type</Label>
                      <Select value={form.entity_type} onValueChange={(v) => setForm({ ...form, entity_type: v })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="supplier">Supplier</SelectItem>
                          <SelectItem value="partner">Partner</SelectItem>
                          <SelectItem value="target">Target</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Risk Tier</Label>
                      <Select value={form.risk_tier} onValueChange={(v) => setForm({ ...form, risk_tier: v })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="A">A — High</SelectItem>
                          <SelectItem value="B">B — Medium</SelectItem>
                          <SelectItem value="C">C — Low</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Country</Label>
                      <Input value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <Label>Registration Number</Label>
                      <Input value={form.registration_number} onChange={(e) => setForm({ ...form, registration_number: e.target.value })} />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Website</Label>
                      <Input value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} placeholder="https://…" />
                    </div>
                  </div>

                  {/* Divider */}
                  <div className="border-t border-border pt-4">
                    <p className="text-[10px] uppercase tracking-[0.08em] text-muted-foreground font-semibold mb-3">Location</p>
                    <div className="space-y-2 mb-4">
                      <Label>Location Type</Label>
                      <Select value={form.location_type} onValueChange={(v: any) => setForm({ ...form, location_type: v })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="registered">Registered Office</SelectItem>
                          <SelectItem value="hq">Head Office</SelectItem>
                          <SelectItem value="both">Both</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {showRegFields && (
                      <div className="space-y-3 mb-4">
                        <p className="text-xs font-medium text-foreground">Registered Office</p>
                        <Input placeholder="Address line 1" value={form.registered_address_line1} onChange={(e) => setForm({ ...form, registered_address_line1: e.target.value })} />
                        <Input placeholder="Address line 2 (optional)" value={form.registered_address_line2} onChange={(e) => setForm({ ...form, registered_address_line2: e.target.value })} />
                        <div className="grid grid-cols-3 gap-3">
                          <Input placeholder="City" value={form.registered_city} onChange={(e) => setForm({ ...form, registered_city: e.target.value })} />
                          <Input placeholder="Region" value={form.registered_region} onChange={(e) => setForm({ ...form, registered_region: e.target.value })} />
                          <Input placeholder="Postcode" value={form.registered_postcode} onChange={(e) => setForm({ ...form, registered_postcode: e.target.value })} />
                        </div>
                        <Input placeholder="Country" value={form.registered_country} onChange={(e) => setForm({ ...form, registered_country: e.target.value })} />
                      </div>
                    )}

                    {showHqFields && form.location_type === "both" && (
                      <div className="flex items-center gap-2 mb-3">
                        <Checkbox
                          checked={form.same_as_registered}
                          onCheckedChange={(c) => setForm({ ...form, same_as_registered: !!c })}
                          id="same-addr"
                        />
                        <label htmlFor="same-addr" className="text-sm text-muted-foreground cursor-pointer">Same as registered address</label>
                      </div>
                    )}

                    {showHqFields && !form.same_as_registered && (
                      <div className="space-y-3">
                        <p className="text-xs font-medium text-foreground">Head Office</p>
                        <Input placeholder="Address line 1" value={form.head_office_address_line1} onChange={(e) => setForm({ ...form, head_office_address_line1: e.target.value })} />
                        <Input placeholder="Address line 2 (optional)" value={form.head_office_address_line2} onChange={(e) => setForm({ ...form, head_office_address_line2: e.target.value })} />
                        <div className="grid grid-cols-3 gap-3">
                          <Input placeholder="City" value={form.head_office_city} onChange={(e) => setForm({ ...form, head_office_city: e.target.value })} />
                          <Input placeholder="Region" value={form.head_office_region} onChange={(e) => setForm({ ...form, head_office_region: e.target.value })} />
                          <Input placeholder="Postcode" value={form.head_office_postcode} onChange={(e) => setForm({ ...form, head_office_postcode: e.target.value })} />
                        </div>
                        <Input placeholder="Country" value={form.head_office_country} onChange={(e) => setForm({ ...form, head_office_country: e.target.value })} />
                      </div>
                    )}
                  </div>

                  {/* PoC */}
                  <div className="border-t border-border pt-4">
                    <p className="text-[10px] uppercase tracking-[0.08em] text-muted-foreground font-semibold mb-3">Point of Contact</p>
                    <div className="grid grid-cols-3 gap-3">
                      <div className="space-y-2">
                        <Label>Name</Label>
                        <Input value={form.poc_name} onChange={(e) => setForm({ ...form, poc_name: e.target.value })} />
                      </div>
                      <div className="space-y-2">
                        <Label>Email</Label>
                        <Input type="email" value={form.poc_email} onChange={(e) => setForm({ ...form, poc_email: e.target.value })} />
                      </div>
                      <div className="space-y-2">
                        <Label>Phone</Label>
                        <Input value={form.poc_phone} onChange={(e) => setForm({ ...form, poc_phone: e.target.value })} />
                      </div>
                    </div>
                  </div>

                  <Button type="submit" className="w-full">Add Entity</Button>
                </form>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/60" />
          <Input placeholder="Search entities…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={filterTier} onValueChange={setFilterTier}>
          <SelectTrigger className="w-36"><SelectValue placeholder="Risk tier" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All tiers</SelectItem>
            <SelectItem value="A">Tier A</SelectItem>
            <SelectItem value="B">Tier B</SelectItem>
            <SelectItem value="C">Tier C</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-36"><SelectValue placeholder="Entity type" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All types</SelectItem>
            <SelectItem value="supplier">Supplier</SelectItem>
            <SelectItem value="partner">Partner</SelectItem>
            <SelectItem value="target">Target</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-44"><SelectValue placeholder="Review status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="overdue">Overdue</SelectItem>
            <SelectItem value="due_soon">Due within 30 days</SelectItem>
            <SelectItem value="due_60">Due within 60 days</SelectItem>
            <SelectItem value="mine">My entities</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterIncCountry} onValueChange={setFilterIncCountry}>
          <SelectTrigger className="w-44"><SelectValue placeholder="INC country" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All INC countries</SelectItem>
            {[...new Set(entities.map(e => e.incorporation_country_name).filter(Boolean))].sort().map(c => (
              <SelectItem key={c} value={c}>{c}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterHqCountry} onValueChange={setFilterHqCountry}>
          <SelectTrigger className="w-44"><SelectValue placeholder="HQ country" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All HQ countries</SelectItem>
            {[...new Set(entities.map(e => e.hq_country_name).filter(Boolean))].sort().map(c => (
              <SelectItem key={c} value={c}>{c}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Content */}
      {viewMode === "map" ? (
        <div className="fvc-card">
          <EntityMapView entities={filtered} highlightId={highlightEntityId} />
        </div>
      ) : viewMode === "table" ? (
        <div className="fvc-card overflow-x-auto">
          {filtered.length === 0 ? (
            <div className="text-center py-16">
              <Building2 size={36} className="mx-auto text-muted-foreground/30 mb-4" />
              <p className="text-sm text-muted-foreground">No entities found.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-[10px] uppercase tracking-wider">Entity</TableHead>
                  <TableHead className="text-[10px] uppercase tracking-wider">Type</TableHead>
                  <TableHead className="text-[10px] uppercase tracking-wider">Risk Tier</TableHead>
                  <TableHead className="text-[10px] uppercase tracking-wider">INC</TableHead>
                  <TableHead className="text-[10px] uppercase tracking-wider">HQ</TableHead>
                  <TableHead className="text-[10px] uppercase tracking-wider">Criticality</TableHead>
                  <TableHead className="text-[10px] uppercase tracking-wider">Last Reviewed</TableHead>
                  <TableHead className="text-[10px] uppercase tracking-wider">Next Review</TableHead>
                  <TableHead className="text-[10px] uppercase tracking-wider">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((e) => {
                  const dueStatus = getDueStatus(e);
                  const formatDate = (d: string | null) => d ? new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "—";
                  return (
                    <TableRow
                      key={e.id}
                      className="cursor-pointer hover:bg-muted/30 transition-colors"
                      onClick={() => navigate(`/entities/${e.id}`)}
                    >
                      <TableCell>
                        <div>
                          <span className="text-sm font-semibold text-foreground">{e.name}</span>
                          {e.registration_number && (
                            <span className="block text-[10px] text-muted-foreground/60 mt-0.5">{e.registration_number}</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground capitalize">{e.entity_type}</TableCell>
                      <TableCell>
                        <Badge className={`fvc-status-badge ${tierColor(e.risk_tier)}`}>Tier {e.risk_tier}</Badge>
                      </TableCell>
                      <TableCell>
                        <CountryFlagBadge code={e.incorporation_country_code} name={e.incorporation_country_name} label="INC" />
                      </TableCell>
                      <TableCell>
                        <CountryFlagBadge code={e.hq_country_code} name={e.hq_country_name} label="HQ" />
                      </TableCell>
                      <TableCell>
                        <span className={`text-xs capitalize ${e.criticality === "high" ? "text-destructive" : e.criticality === "med" ? "text-warning" : "text-muted-foreground"}`}>
                          {e.criticality}
                        </span>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">{formatDate(e.last_review_date)}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{formatDate(e.next_review_date)}</TableCell>
                      <TableCell>
                        <Badge className={`fvc-status-badge ${dueStatus.color}`}>{dueStatus.label}</Badge>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </div>
      ) : (
        <>
          {filtered.length === 0 ? (
            <div className="fvc-card text-center py-16">
              <Building2 size={36} className="mx-auto text-muted-foreground/30 mb-4" />
              <p className="text-sm text-muted-foreground">No entities found. Add your first third party to begin.</p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {filtered.map((e) => {
                const dueStatus = getDueStatus(e);
                const location = getLocation(e);
                const address = getAddress(e);
                return (
                  <div
                    key={e.id}
                    className="fvc-card-interactive group"
                    onClick={() => navigate(`/entities/${e.id}`)}
                  >
                    {/* Row 1: Name + jurisdiction badges */}
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <h3 className="text-sm font-semibold text-foreground truncate min-w-0">{e.name}</h3>
                      <div className="flex items-center gap-1.5 shrink-0
                        transition-all duration-200
                        group-hover:[&>span]:shadow-[0_0_0_1px_hsl(var(--gold)/0.2),0_2px_8px_hsl(var(--gold)/0.08)]">
                        <CountryFlagBadge code={e.incorporation_country_code} name={e.incorporation_country_name} label="INC" />
                        <CountryFlagBadge code={e.hq_country_code} name={e.hq_country_name} label="HQ" />
                        <FlagBadgesInfo />
                      </div>
                    </div>

                    {/* Row 2: Type + risk badges */}
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-muted-foreground capitalize">{e.entity_type}</span>
                        {e.registration_number && (
                          <span className="text-[10px] text-muted-foreground/50">· {e.registration_number}</span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <Badge className={`fvc-status-badge ${tierColor(e.risk_tier)}`}>Tier {e.risk_tier}</Badge>
                        <Badge className={`fvc-status-badge ${dueStatus.color}`}>{dueStatus.label}</Badge>
                      </div>
                    </div>

                    {/* Operating countries */}
                    {(opCountriesMap[e.id]?.length ?? 0) > 0 && (
                      <div className="flex items-center gap-1.5 mb-3">
                        <OperatingCountryChips countries={opCountriesMap[e.id] ?? []} />
                      </div>
                    )}

                    {/* Profile section — 2 columns */}
                    <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-[11px] mb-3">
                      <div>
                        <span className="text-muted-foreground flex items-center gap-1">
                          <MapPin size={10} /> {location}
                        </span>
                        {address && (
                          <span className="text-muted-foreground/70 block truncate mt-0.5">{address}</span>
                        )}
                      </div>
                      <div>
                        {e.website && (
                          <a
                            href={e.website.startsWith("http") ? e.website : `https://${e.website}`}
                            target="_blank" rel="noopener noreferrer"
                            className="text-accent hover:underline flex items-center gap-1"
                            onClick={(ev) => ev.stopPropagation()}
                          >
                            <Globe size={10} /> {e.website.replace(/^https?:\/\//, "").replace(/\/$/, "")}
                          </a>
                        )}
                        {canSeePoc && e.poc_name && (
                          <span className="text-muted-foreground flex items-center gap-1 mt-0.5">
                            <User size={10} /> {e.poc_name}
                            {e.poc_email && <span className="text-muted-foreground/60 truncate ml-0.5">· {e.poc_email}</span>}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Bottom meta */}
                    {(e.business_unit || e.service_provided) && (
                      <div className="text-[10px] text-muted-foreground/60 truncate mb-3">
                        {[e.business_unit, e.service_provided].filter(Boolean).join(" · ")}
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex items-center gap-2 pt-2 border-t border-border/50">
                      <Button size="sm" variant="ghost" className="h-7 text-xs text-muted-foreground flex-1"
                        onClick={(ev) => { ev.stopPropagation(); navigate(`/entities/${e.id}`); }}>
                        Open
                      </Button>
                      <Button size="sm" variant="ghost" className="h-7 text-xs text-muted-foreground flex-1"
                        onClick={(ev) => { ev.stopPropagation(); navigate(`/commission?entity=${e.id}`); }}>
                        Commission
                      </Button>
                      <button
                        className="text-[10px] text-accent hover:underline"
                        onClick={(ev) => {
                          ev.stopPropagation();
                          setHighlightEntityId(e.id);
                          setViewMode("map");
                        }}
                      >
                        View on map
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* Post-save commission prompt */}
      <Dialog open={!!postSaveEntity} onOpenChange={(o) => !o && setPostSaveEntity(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display text-xl flex items-center gap-2">
              <CheckCircle2 size={20} className="text-success" /> Entity Created
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <p className="text-sm text-muted-foreground">
              <strong className="text-foreground">{postSaveEntity?.name}</strong> has been added to your register. Would you like to commission a check now?
            </p>

            {/* Smart suggestions based on entity attributes */}
            <EnhancementSuggestionPanel
              entityCountry={postSaveEntity?.country}
              riskTier={postSaveEntity?.risk_tier}
              dataAccessLevel={postSaveEntity?.data_access_level}
              selectedModules={[]}
              onAddModule={(code) => {
                const entityId = postSaveEntity?.id;
                setPostSaveEntity(null);
                navigate(`/commission?entity=${entityId}`);
              }}
            />
            <div className="flex gap-2">
              <Button
                className="flex-1"
                onClick={() => {
                  const entityId = postSaveEntity?.id;
                  setPostSaveEntity(null);
                  navigate(`/commission?entity=${entityId}`);
                }}
              >
                <ArrowRight size={14} className="mr-1" /> Commission Now
              </Button>
              <Button variant="outline" className="flex-1" onClick={() => setPostSaveEntity(null)}>
                Later
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
