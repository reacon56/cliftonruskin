import L from "leaflet";

const TIER_COLORS: Record<string, string> = { A: "#ef4444", B: "#d97706", C: "#22c55e" };

export function tierMarkerColor(tier: string): string {
  return TIER_COLORS[tier] || "#22c55e";
}

/** Create an SVG-based divIcon for a single entity pin */
export function createEntityIcon(tier: string, isHighlighted = false): L.DivIcon {
  const color = tierMarkerColor(tier);
  const letter = (tier || "C").charAt(0).toUpperCase();
  const r = isHighlighted ? 15 : 13;
  const size = r * 2;
  const border = isHighlighted ? 3 : 2;

  return L.divIcon({
    html: `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg" class="entity-pin-svg">
      <circle cx="${r}" cy="${r}" r="${r - border / 2}" fill="${color}" stroke="#fff" stroke-width="${border}" />
      <text x="${r}" y="${r}" text-anchor="middle" dominant-baseline="central"
        fill="#fff" font-size="9" font-weight="700" font-family="'DM Sans',sans-serif">${letter}</text>
    </svg>`,
    className: "entity-pin-icon",
    iconSize: L.point(size, size),
    iconAnchor: L.point(r, r),
  });
}

/** Build hover tooltip HTML for an entity pin */
export function buildEntityTooltipHtml(entity: {
  name: string;
  entity_type?: string;
  risk_tier: string;
  registered_city?: string | null;
  registered_country?: string | null;
  head_office_city?: string | null;
  head_office_country?: string | null;
  country?: string | null;
  next_review_date?: string | null;
}, pinType: "registered" | "hq" = "registered"): string {
  const tierColor = tierMarkerColor(entity.risk_tier);
  const location = pinType === "hq" && entity.head_office_city
    ? [entity.head_office_city, entity.head_office_country].filter(Boolean).join(", ")
    : [entity.registered_city, entity.registered_country || entity.country].filter(Boolean).join(", ");

  let overdueLine = "";
  if (entity.next_review_date) {
    const days = Math.ceil((new Date(entity.next_review_date).getTime() - Date.now()) / 86400000);
    if (days < 0) {
      overdueLine = `<div style="color:#ef4444;font-weight:600;margin-top:2px;">⚠ Review overdue</div>`;
    }
  }

  return `<div style="font-family:'DM Sans',sans-serif;font-size:11px;line-height:1.45;min-width:120px;">
    <div style="font-weight:700;margin-bottom:1px;">${entity.name}</div>
    <div style="opacity:0.75;">${entity.entity_type ? entity.entity_type.charAt(0).toUpperCase() + entity.entity_type.slice(1) : "Entity"} · <span style="color:${tierColor};font-weight:600;">Tier ${entity.risk_tier}</span></div>
    ${location ? `<div style="opacity:0.6;">${location}</div>` : ""}
    ${overdueLine}
  </div>`;
}

/** Create a cluster icon — dashed border, shows count, coloured by highest-risk tier */
export function createClusterIcon(count: number, highestTier: string): L.DivIcon {
  const color = tierMarkerColor(highestTier);
  const r = 16;
  const size = r * 2;

  return L.divIcon({
    html: `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg" class="entity-cluster-svg">
      <circle cx="${r}" cy="${r}" r="${r - 1.5}" fill="${color}" stroke="#fff" stroke-width="2.5" stroke-dasharray="4 2" />
      <text x="${r}" y="${r}" text-anchor="middle" dominant-baseline="central"
        fill="#fff" font-size="11" font-weight="700" font-family="'DM Sans',sans-serif">${count}</text>
    </svg>`,
    className: "entity-cluster-icon",
    iconSize: L.point(size, size),
    iconAnchor: L.point(r, r),
  });
}
