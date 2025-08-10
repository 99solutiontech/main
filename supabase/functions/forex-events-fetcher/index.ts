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
  // Prefer unix/epoch timestamp fields when available
  const ts = ev.timestamp || ev.unixTimestamp || ev.time_ms || ev.time_ms_epoch || ev.time_epoch;
  if (ts) {
    const n = Number(ts);
    const ms = n > 1e12 ? n : n * 1000; // handle sec vs ms
    return new Date(ms).toISOString();
  }

  // Many feeds include RFC2822 dates in pubDate. Parse directly (it already encodes TZ)
  if (ev.pubDate) {
    const parsed = Date.parse(String(ev.pubDate));
    if (!isNaN(parsed)) return new Date(parsed).toISOString();
  }

  // Enhanced parsing for ForexFactory fields
  const dateStrRaw = ev.date || ev.event_date || ev.datetime || ev.dateTime;
  const timeStrRaw = ev.time || ev.event_time || ev.time24 || ev.time_utc || ev.timeLocal || ev.time_local;

  if (dateStrRaw) {
    const dateOnly = new Date(String(dateStrRaw));

    // If both date and time are provided, try to compose a UTC moment
    if (!isNaN(dateOnly.getTime()) && timeStrRaw) {
      const timeStr = String(timeStrRaw).trim();

      // Handle keywords
      if (/all\s*day|tentative|holiday/i.test(timeStr)) {
        // Use midnight UTC for all-day type events
        return new Date(Date.UTC(dateOnly.getUTCFullYear(), dateOnly.getUTCMonth(), dateOnly.getUTCDate(), 0, 0, 0)).toISOString();
      }

      // 12h format with am/pm, e.g., "8:30am" or "12pm"
      const m12 = timeStr.match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)$/i);
      if (m12) {
        let hour = parseInt(m12[1], 10);
        const minute = m12[2] ? parseInt(m12[2], 10) : 0;
        const ap = m12[3]?.toLowerCase();
        if (ap === 'pm' && hour < 12) hour += 12;
        if (ap === 'am' && hour === 12) hour = 0;
        return new Date(Date.UTC(dateOnly.getUTCFullYear(), dateOnly.getUTCMonth(), dateOnly.getUTCDate(), hour, minute, 0)).toISOString();
      }

      // 24h format, e.g., "08:30" or "8:30"
      const m24 = timeStr.match(/^(\d{1,2}):(\d{2})$/);
      if (m24) {
        const hour = parseInt(m24[1], 10);
        const minute = parseInt(m24[2], 10);
        return new Date(Date.UTC(dateOnly.getUTCFullYear(), dateOnly.getUTCMonth(), dateOnly.getUTCDate(), hour, minute, 0)).toISOString();
      }

      // Fallback generic Date.parse for combined strings if recognizable
      const parsed = Date.parse(`${dateStrRaw} ${timeStr}`);
      if (!isNaN(parsed)) return new Date(parsed).toISOString();
    }

    // Only date provided: return midnight UTC to avoid local-time drift
    if (!isNaN(dateOnly.getTime())) {
      return new Date(Date.UTC(dateOnly.getUTCFullYear(), dateOnly.getUTCMonth(), dateOnly.getUTCDate(), 0, 0, 0)).toISOString();
    }
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
