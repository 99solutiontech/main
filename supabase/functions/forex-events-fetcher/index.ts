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

    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    let supabaseAdmin = null;
    if (serviceKey) {
      supabaseAdmin = createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        serviceKey,
        { auth: { autoRefreshToken: false, persistSession: false } }
      );
    }

    // First, try to get recent events from database to reduce API calls
    let cachedEvents: any[] = [];
    if (supabaseAdmin) {
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
      const { data: dbEvents } = await supabaseAdmin
        .from("economic_events")
        .select("*")
        .gte("event_time", oneHourAgo)
        .in("currency", selected);
      
      if (dbEvents && dbEvents.length > 0) {
        console.log(`Found ${dbEvents.length} cached events from database`);
        cachedEvents = dbEvents;
      }
    }

    let filtered = [];
    
    try {
      // Attempt to fetch fresh data with retry logic
      let xmlResp;
      let retries = 3;
      
      while (retries > 0) {
        try {
          xmlResp = await fetch(FEED_URL, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
              'Accept': 'application/xml, text/xml, */*',
              'Cache-Control': 'no-cache'
            }
          });
          
          if (xmlResp.ok) break;
          
          if (xmlResp.status === 429) {
            console.warn(`Rate limited (429), waiting before retry... ${retries} retries left`);
            await new Promise(resolve => setTimeout(resolve, 2000 * (4 - retries))); // Exponential backoff
            retries--;
            continue;
          }
          
          throw new Error(`Feed error: ${xmlResp.status}`);
        } catch (fetchError) {
          retries--;
          if (retries === 0) throw fetchError;
          console.warn(`Fetch failed, retrying... ${retries} retries left`, fetchError);
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }

      if (!xmlResp || !xmlResp.ok) {
        throw new Error(`Feed not available after retries`);
      }

      const xmlText = await xmlResp.text();
      const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "" });
      const parsed = parser.parse(xmlText);
      const rawEvents = extractEvents(parsed);

      filtered = rawEvents.map((ev) => {
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

      console.log(`Fetched ${filtered.length} fresh events from XML feed`);
      
      // Store fresh data to database
      if (supabaseAdmin && filtered.length > 0) {
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
        } else {
          console.log(`Successfully updated ${upsertPayload.length} events in database`);
        }
      }

    } catch (xmlError) {
      console.warn("XML feed failed, using cached data:", xmlError);
      
      // Fallback to cached events if XML feed fails
      if (cachedEvents.length > 0) {
        filtered = cachedEvents.map(e => ({
          title: e.title,
          currency: e.currency,
          impact_level: e.impact_level,
          event_time: e.event_time,
          forecast: e.forecast,
          previous: e.previous,
          actual: e.actual,
          detail_url: e.detail_url,
        }));
        console.log(`Using ${filtered.length} cached events as fallback`);
      } else {
        // If no cached data, return the error
        throw xmlError;
      }
    }

    return new Response(JSON.stringify({ 
      events: filtered,
      source: cachedEvents.length > 0 && filtered.length === cachedEvents.length ? 'cache' : 'live',
      timestamp: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
    
  } catch (e: any) {
    console.error("forex-events-fetcher error:", e);
    // Return 200 with error info instead of 500 to avoid "non-2xx" errors in UI
    return new Response(JSON.stringify({ 
      events: [],
      error: e?.message || "Unable to fetch economic events",
      timestamp: new Date().toISOString(),
      source: 'error'
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
