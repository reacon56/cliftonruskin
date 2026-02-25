import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

async function geocodeAddress(parts: (string | null | undefined)[]): Promise<{ lat: number; lng: number } | null> {
  const query = parts.filter(Boolean).join(", ");
  if (!query) return null;

  const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(query)}`;
  const res = await fetch(url, {
    headers: { "User-Agent": "FarViewChase/1.0 (geocode-edge-function)" },
  });

  if (!res.ok) return null;
  const data = await res.json();
  if (!data || data.length === 0) return null;

  return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { entity_id } = await req.json();
    if (!entity_id) {
      return new Response(JSON.stringify({ error: "entity_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: entity, error } = await supabase
      .from("entities")
      .select("registered_address_line1, registered_city, registered_region, registered_postcode, registered_country, head_office_address_line1, head_office_city, head_office_region, head_office_postcode, head_office_country")
      .eq("id", entity_id)
      .single();

    if (error || !entity) {
      return new Response(JSON.stringify({ error: "Entity not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const updates: Record<string, number> = {};

    // Geocode registered address
    const regResult = await geocodeAddress([
      entity.registered_address_line1,
      entity.registered_city,
      entity.registered_region,
      entity.registered_postcode,
      entity.registered_country,
    ]);
    if (regResult) {
      updates.registered_lat = regResult.lat;
      updates.registered_lng = regResult.lng;
    }

    // Geocode head office address
    const hqResult = await geocodeAddress([
      entity.head_office_address_line1,
      entity.head_office_city,
      entity.head_office_region,
      entity.head_office_postcode,
      entity.head_office_country,
    ]);
    if (hqResult) {
      updates.hq_lat = hqResult.lat;
      updates.hq_lng = hqResult.lng;
    }

    if (Object.keys(updates).length > 0) {
      const { error: updateError } = await supabase
        .from("entities")
        .update(updates)
        .eq("id", entity_id);

      if (updateError) {
        return new Response(JSON.stringify({ error: updateError.message }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    return new Response(
      JSON.stringify({
        geocoded: Object.keys(updates).length > 0,
        registered: regResult,
        hq: hqResult,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
