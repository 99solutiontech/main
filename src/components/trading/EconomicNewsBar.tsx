import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { ChevronLeft, ChevronRight, RefreshCw, Bell } from "lucide-react";

interface EconomicEvent {
  title: string;
  currency: "USD" | "EUR" | "JPY" | "GBP" | "CAD" | string;
  impact_level: "high" | "medium" | "low";
  event_time: string; // ISO
  forecast?: string | null;
  previous?: string | null;
  actual?: string | null;
  detail_url?: string | null;
}

const SUPPORTED = ["USD", "EUR", "JPY", "GBP", "CAD"] as const;

function parseNumber(v?: string | null): number | null {
  if (v == null) return null;
  const s = String(v).replace(/,/g, "").trim();
  const m = s.match(/-?\d+(\.\d+)?/);
  return m ? parseFloat(m[0]) : null;
}

function trend(a?: string | null, b?: string | null): "up" | "down" | "same" | "na" {
  const n1 = parseNumber(a);
  const n2 = parseNumber(b);
  if (n1 == null || n2 == null) return "na";
  if (n1 > n2) return "up";
  if (n1 < n2) return "down";
  return "same";
}

function clsForTrend(t: "up" | "down" | "same" | "na") {
  if (t === "up") return "text-success";
  if (t === "down") return "text-destructive";
  return "text-muted-foreground";
}

function formatBangkokTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Asia/Bangkok",
  });
}

function isSameBangkokDate(iso: string, date: Date) {
  const d = new Date(iso);
  const opts: Intl.DateTimeFormatOptions = {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: "Asia/Bangkok",
  };
  const a = d.toLocaleDateString("en-CA", opts); // YYYY-MM-DD
  const b = date.toLocaleDateString("en-CA", opts);
  return a === b;
}

export default function EconomicNewsBar() {
  const { toast } = useToast();
  const [selectedCurrencies, setSelectedCurrencies] = useState<string[]>(["USD", "EUR"]);
  const [events, setEvents] = useState<EconomicEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

  const weekDays = useMemo(() => {
    // Build current week (Mon..Sun) based on selectedDate
    const date = new Date(selectedDate);
    const day = date.getDay(); // 0..6 (Sun..Sat)
    const diffToMonday = (day === 0 ? -6 : 1) - day; // move to Monday
    const monday = new Date(date);
    monday.setDate(date.getDate() + diffToMonday);
    return Array.from({ length: 7 }).map((_, i) => {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      return d;
    });
  }, [selectedDate]);

  const filteredForDay = useMemo(
    () => events.filter((e) => isSameBangkokDate(e.event_time, selectedDate)).sort((a, b) => new Date(a.event_time).getTime() - new Date(b.event_time).getTime()),
    [events, selectedDate]
  );

  const fetchEvents = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.functions.invoke("forex-events-fetcher", {
        body: {
          currencies: selectedCurrencies,
        },
      });
      if (error) throw error;
      setEvents((data?.events as EconomicEvent[]) || []);
    } catch (err: any) {
      console.error("Failed to fetch economic events:", err);
      toast({ title: "Economic calendar", description: err.message || "Failed to load events", variant: "destructive" as any });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
    const id = setInterval(fetchEvents, 60_000); // refresh every 60s
    return () => clearInterval(id);
  }, [selectedCurrencies.join(",")]);

  const toggleCurrency = (c: string) => {
    setSelectedCurrencies((prev) => {
      const newSelection = prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c];
      // Ensure at least one currency is always selected
      return newSelection.length === 0 ? ["USD"] : newSelection;
    });
  };

  const changeDay = (delta: number) => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + delta);
    setSelectedDate(d);
  };

  return (
    <Card className="mb-4">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5" /> Economic Calendar (GMT+07:00)
        </CardTitle>
        <div className="flex items-center gap-2">
          <Button size="icon" variant="outline" onClick={() => changeDay(-1)} aria-label="Previous day">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="text-sm">
            {selectedDate.toLocaleDateString("en-GB", { weekday: "short", day: "2-digit", month: "short", timeZone: "Asia/Bangkok" })}
          </div>
          <Button size="icon" variant="outline" onClick={() => changeDay(1)} aria-label="Next day">
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button size="icon" variant="outline" onClick={fetchEvents} disabled={loading} aria-label="Refresh">
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-2 mb-3">
          {SUPPORTED.map((c) => (
            <Badge
              key={c}
              variant={selectedCurrencies.includes(c) ? "default" : "secondary"}
              className="cursor-pointer"
              onClick={() => toggleCurrency(c)}
              aria-pressed={selectedCurrencies.includes(c)}
              role="button"
            >
              {c}
            </Badge>
          ))}
        </div>

        {filteredForDay.length === 0 ? (
          <div className="text-sm text-muted-foreground">No events for the selected filters today.</div>
        ) : (
          <ul className="space-y-2">
            {filteredForDay.map((ev, idx) => (
              <li key={`${ev.currency}-${ev.event_time}-${idx}`} className="flex items-center justify-between rounded-md border p-3">
                <div className="flex items-center gap-3">
                  <Badge variant={ev.impact_level === "high" ? "destructive" : "secondary"}>
                    {ev.currency}
                  </Badge>
                  <div className="text-sm">
                    <div className="font-medium">{ev.title}</div>
                    <div className="text-xs text-muted-foreground">
                      {formatBangkokTime(ev.event_time)} · {ev.impact_level.toUpperCase()}
                    </div>
                  </div>
                </div>
<div className="text-right text-xs">
  {ev.previous && <div className="text-muted-foreground">Prev: {ev.previous}</div>}
  {ev.forecast && (
    <div className={clsForTrend(trend(ev.forecast ?? null, ev.previous ?? null))}>
      Forecast: {ev.forecast}
    </div>
  )}
  <div className={clsForTrend(trend(ev.actual ?? null, (ev.forecast ?? ev.previous) ?? null))}>
    Actual: {ev.actual ?? "-"}
  </div>
</div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
