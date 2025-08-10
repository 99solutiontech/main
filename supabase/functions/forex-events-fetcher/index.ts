import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.54.0";
import { XMLParser } from "https://esm.sh/fast-xml-parser@4.3.5";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const FEED_URL = "https://nfs.faireconomy.media/ff_calendar_thisweek.xml";
const KEYWORDS = [
  "ISM Services PMI",
  "Unemployment Claims",
  "ADP Non-Farm Employment Change",
  "Non-Farm Employment Change",
  "President Trump Speaks",
  "Federal Funds Rate",
  "FOMC Statement",
  "FOMC Press Conference",
  "Fed Chair Powell Speaks",
  "Fed Chair Powell Testifies",
];

function normalizeImpact(v: any): "high" | "medium" | "low" {
  if (v == null) return "low";
  const s = String(v).toLowerCase();
  if (s.includes("high") || s.includes("red") || s === "3" || s === "high impact") return "high";
  if (s.includes("medium") || s.includes("orange") || s === "2") return "medium";
  return "low";
}

function toIsoFromEvent(ev: any): string | null {
  // Prefer unix timestamp fields
  const ts = ev.timestamp || ev.unixTimestamp || ev.time_ms;
  if (ts) {
    const n = Number(ts);
    const ms = n > 1e12 ? n : n * 1000; // handle sec vs ms
    return new Date(ms).toISOString();
  }
  const dateStr = ev.date || ev.event_date || ev.pubDate;
  const timeStr = ev.time || ev.event_time;
  if (dateStr && timeStr) {
    const parsed = Date.parse(`${dateStr} ${timeStr} UTC`);
    if (!isNaN(parsed)) return new Date(parsed).toISOString();
  }
  if (dateStr) {
    const parsed = Date.parse(`${dateStr} UTC`);
    if (!isNaN(parsed)) return new Date(parsed).toISOString();
  }
  return null;
}

function extractEvents(parsed: any): any[] {
  let events: any = parsed?.weeklyevents?.event
    || parsed?.events?.event
    || parsed?.event
    || parsed?.rss?.channel?.item
    || [];
  if (!Array.isArray(events)) events = [events];
  // As a fallback, try to find arrays with objects having title & (currency|country)
  if (events.length === 0) {
    const collect: any[] = [];
    const walk = (node: any) => {
      if (!node || typeof node !== "object") return;
      Object.values(node).forEach((v) => {
        if (Array.isArray(v) && v.length && typeof v[0] === "object") {
          const looksLikeEvents = v.some((o) => o && (o.title || o.event) && (o.currency || o.country));
          if (looksLikeEvents) collect.push(...v);
        } else if (typeof v === "object") {
          walk(v);
        }
      });
    };
    walk(parsed);
    events = collect;
  }
  return events.filter(Boolean);
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { currencies, schedule } = await req.json().catch(() => ({ currencies: undefined }));
    const selected: string[] = (Array.isArray(currencies) ? currencies : ["USD", "EUR"]).filter((c) =>
      ["USD", "EUR", "JPY", "GBP", "CAD"].includes(String(c).toUpperCase())
    ).map((c) => String(c).toUpperCase());

    const xmlResp = await fetch(FEED_URL);
    if (!xmlResp.ok) throw new Error(`Feed error: ${xmlResp.status}`);
    const xmlText = await xmlResp.text();

    const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "" });
    const parsed = parser.parse(xmlText);
    const rawEvents = extractEvents(parsed);

    const filtered = rawEvents.map((ev) => {
      const title: string = ev.title || ev.event || ev.name || "";
      const currency: string = (ev.currency || ev.country || "").toString().toUpperCase();
      const impact_level = normalizeImpact(ev.impact || ev.importance || ev.impact_level || ev.folder || ev.icon || ev.color);
      const event_time = toIsoFromEvent(ev);
      const forecast = ev.forecast ?? ev.fcst ?? null;
      const previous = ev.previous ?? ev.prev ?? null;
      const actual = ev.actual ?? null;
      const detail_url = ev.link || ev.url || null;
      return { title, currency, impact_level, event_time, forecast, previous, actual, detail_url };
    })
    .filter((e) => e.title && e.currency && e.event_time)
    .filter((e) => selected.includes(e.currency))
    .filter((e) => e.impact_level === "high" || KEYWORDS.some((k) => e.title.toLowerCase().includes(k.toLowerCase())));

    // Optional: store to DB when running with service role
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (serviceKey) {
      const supabaseAdmin = createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        serviceKey,
        { auth: { autoRefreshToken: false, persistSession: false } }
      );
      const upsertPayload = filtered.map((e) => ({
        source: "forexfactory",
        title: e.title,
        currency: e.currency,
        impact_level: e.impact_level,
        event_time: e.event_time,
        forecast: e.forecast,
        previous: e.previous,
        actual: e.actual,
        detail_url: e.detail_url,
      }));
      const { error: upsertError } = await supabaseAdmin
        .from("economic_events")
        .upsert(upsertPayload, { onConflict: "source,currency,title,event_time" });
      if (upsertError) {
        console.error("Upsert error:", upsertError);
      }
    }

    return new Response(JSON.stringify({ events: filtered }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("forex-events-fetcher error:", e);
    return new Response(JSON.stringify({ error: e?.message || "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
