import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Activity,
  ArrowUpRight,
  BarChart3,
  Calendar,
  Download,
  Eye,
  MousePointerClick,
  Percent,
  TrendingUp,
  Users,
} from "lucide-react";
import { getAdminData, getStats, statsExportUrl } from "../../lib/api";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "../../components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../components/ui/table";
import { Skeleton } from "../../components/ui/skeleton";
import type { DailyPoint, StatsData } from "../../lib/types";
import { cn } from "../../lib/utils";

type Range = "7" | "30" | "90" | "all";

const RANGES: { label: string; value: Range }[] = [
  { label: "7 Days", value: "7" },
  { label: "30 Days", value: "30" },
  { label: "90 Days", value: "90" },
  { label: "All Time", value: "all" },
];

function formatDayLabel(day: string): string {
  const d = new Date(`${day}T00:00:00Z`);
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function formatFullDate(day: string): string {
  const d = new Date(`${day}T00:00:00Z`);
  return d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric", year: "numeric" });
}

function DailyActivityChart({ data, accent }: { data: DailyPoint[]; accent: string }) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const totalClicksInPeriod = useMemo(() => data.reduce((acc, d) => acc + d.clicks, 0), [data]);
  const totalViewsInPeriod = useMemo(() => data.reduce((acc, d) => acc + d.views, 0), [data]);
  const totalUniquesInPeriod = useMemo(() => data.reduce((acc, d) => acc + d.uniques, 0), [data]);

  const maxVal = useMemo(() => {
    return Math.max(1, ...data.map((d) => Math.max(d.clicks, d.views, d.uniques || 0)));
  }, [data]);

  // Determine tick interval for X-axis
  const tickInterval = data.length <= 7 ? 1 : data.length <= 30 ? 5 : 15;

  const activePoint = hoveredIndex !== null ? data[hoveredIndex] : data[data.length - 1] ?? null;

  return (
    <div className="flex flex-col gap-4">
      {/* Top summary & active day hover card */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-muted/20 p-3.5">
        <div className="flex items-center gap-6">
          <div>
            <span className="text-[10px] font-bold font-mono uppercase tracking-wider text-muted-foreground block">
              {hoveredIndex !== null ? "Selected Day" : "Period Total"}
            </span>
            <span className="text-xs font-semibold text-foreground">
              {activePoint && hoveredIndex !== null ? formatFullDate(activePoint.day) : `${data.length} Days Tracked`}
            </span>
          </div>

          <div className="h-7 w-[1px] bg-border" />

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-muted-foreground/50" />
              <div className="text-xs">
                <span className="font-bold tabular-nums">
                  {hoveredIndex !== null && activePoint ? activePoint.views : totalViewsInPeriod}
                </span>{" "}
                <span className="text-muted-foreground">views</span>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: accent }} />
              <div className="text-xs">
                <span className="font-bold tabular-nums">
                  {hoveredIndex !== null && activePoint ? activePoint.clicks : totalClicksInPeriod}
                </span>{" "}
                <span className="text-muted-foreground">clicks</span>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-sky-500" />
              <div className="text-xs">
                <span className="font-bold tabular-nums">
                  {hoveredIndex !== null && activePoint ? activePoint.uniques : totalUniquesInPeriod}
                </span>{" "}
                <span className="text-muted-foreground">uniques</span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="font-mono text-[10px] font-bold">
            CTR:{" "}
            {hoveredIndex !== null && activePoint
              ? activePoint.views > 0
                ? `${((activePoint.clicks / activePoint.views) * 100).toFixed(1)}%`
                : "0%"
              : totalViewsInPeriod > 0
                ? `${((totalClicksInPeriod / totalViewsInPeriod) * 100).toFixed(1)}%`
                : "0%"}
          </Badge>
        </div>
      </div>

      {/* Chart Canvas */}
      <div className="relative pt-6 pb-2">
        {/* Background Grid Lines */}
        <div className="absolute inset-x-0 top-6 bottom-8 flex flex-col justify-between pointer-events-none opacity-40">
          <div className="w-full border-b border-dashed border-border flex justify-end pr-1">
            <span className="font-mono text-[9px] text-muted-foreground -mt-3">{maxVal}</span>
          </div>
          <div className="w-full border-b border-dashed border-border flex justify-end pr-1">
            <span className="font-mono text-[9px] text-muted-foreground -mt-3">{Math.round(maxVal / 2)}</span>
          </div>
          <div className="w-full border-b border-border flex justify-end pr-1">
            <span className="font-mono text-[9px] text-muted-foreground -mt-3">0</span>
          </div>
        </div>

        {/* Interactive Columns */}
        <div className="relative z-10 flex h-48 items-end gap-[3px] sm:gap-1.5 px-2">
          {data.map((d, idx) => {
            const isHovered = hoveredIndex === idx;
            const viewHeightPct = maxVal > 0 && d.views > 0 ? Math.max(8, (d.views / maxVal) * 100) : 4;
            const clickHeightPct = maxVal > 0 && d.clicks > 0 ? Math.max(8, (d.clicks / maxVal) * 100) : 4;
            const uniqueHeightPct = maxVal > 0 && d.uniques > 0 ? Math.max(8, (d.uniques / maxVal) * 100) : 0;

            return (
              <div
                key={d.day}
                onMouseEnter={() => setHoveredIndex(idx)}
                onMouseLeave={() => setHoveredIndex(null)}
                className={cn(
                  "group relative flex flex-1 h-full flex-col justify-end items-center cursor-pointer rounded-t transition-all duration-150",
                  isHovered ? "bg-muted/40" : "hover:bg-muted/20",
                )}
              >
                {/* Visual Bar Group */}
                <div className="flex w-full max-w-[28px] items-end justify-center gap-[2px] h-full pb-1">
                  {/* Views Bar */}
                  <div
                    className={cn(
                      "w-1/2 rounded-t transition-all duration-200",
                      d.views > 0 ? "bg-foreground/25 group-hover:bg-foreground/40" : "bg-muted-foreground/15",
                      isHovered && "ring-1 ring-foreground/40",
                    )}
                    style={{ height: `${viewHeightPct}%` }}
                  />

                  {/* Clicks Bar */}
                  <div
                    className={cn(
                      "w-1/2 rounded-t transition-all duration-200 shadow-xs",
                      d.clicks > 0 ? "group-hover:opacity-90" : "bg-muted-foreground/15",
                      isHovered && "ring-1 ring-white/50",
                    )}
                    style={{
                      height: `${clickHeightPct}%`,
                      background: d.clicks > 0 ? accent : undefined,
                    }}
                  />
                </div>

                {/* X-Axis Day Indicator Tick */}
                {(idx % tickInterval === 0 || idx === data.length - 1) && (
                  <div className="absolute -bottom-6 flex flex-col items-center">
                    <span className="font-mono text-[10px] text-muted-foreground whitespace-nowrap">
                      {formatDayLabel(d.day)}
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Legend & zero state note */}
      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 text-[11px] text-muted-foreground pt-2 border-t">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm bg-foreground/30" /> Page Views
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm" style={{ background: accent }} /> Link Clicks
          </span>
        </div>

        {totalViewsInPeriod === 0 && totalClicksInPeriod === 0 && (
          <span className="italic text-muted-foreground">
            No visitor clicks yet. Share your public link to start tracking live metrics.
          </span>
        )}
      </div>
    </div>
  );
}

function Breakdown({ title, rows, accent }: { title: string; rows: { key: string; count: number }[]; accent: string }) {
  const total = rows.reduce((n, r) => n + r.count, 0);
  const max = Math.max(1, ...rows.map((r) => r.count));
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-semibold">{title}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-2.5">
        {rows.length === 0 && <p className="text-xs text-muted-foreground py-2">No data yet.</p>}
        {rows.map((r) => (
          <div key={r.key}>
            <div className="flex items-center justify-between text-xs">
              <span className="truncate font-medium">{r.key}</span>
              <span className="tabular-nums font-mono text-[11px] text-muted-foreground">
                {r.count} · {total > 0 ? Math.round((r.count / total) * 100) : 0}%
              </span>
            </div>
            <div className="mt-1 h-1.5 w-full rounded-full bg-muted">
              <div className="h-full rounded-full transition-all" style={{ width: `${(r.count / max) * 100}%`, background: accent }} />
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function StatCard({ icon: Icon, label, value }: { icon: typeof Eye; label: string; value: number | string }) {
  return (
    <Card>
      <CardContent className="flex flex-col gap-1 pt-4">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Icon className="h-3.5 w-3.5" />
          {label}
        </div>
        <div className="text-2xl font-bold tabular-nums tracking-tight">{value}</div>
      </CardContent>
    </Card>
  );
}

export default function AnalyticsTab() {
  const [range, setRange] = useState<Range>("30");
  const { data: adminData } = useQuery({ queryKey: ["admin-data"], queryFn: getAdminData });
  const { data, isLoading, isError, isFetching } = useQuery({
    queryKey: ["stats", range],
    queryFn: () => getStats(range === "all" ? "all" : Number(range)),
  });

  const accent = adminData?.profile?.theme?.palette?.accent || adminData?.profile?.accentColor || "#6366f1";

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <Tabs value={range} onValueChange={(v) => setRange(v as Range)}>
          <TabsList>
            {RANGES.map((r) => (
              <TabsTrigger key={r.value} value={r.value}>
                {r.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        <Button asChild variant="outline" size="sm">
          <a href={statsExportUrl(range === "all" ? "all" : Number(range))}>
            <Download className="h-4 w-4" /> Export CSV
          </a>
        </Button>
      </div>

      {isLoading ? (
        <div className="flex flex-col gap-4">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-40 w-full" />
        </div>
      ) : isError || !data ? (
        <p className="text-sm text-muted-foreground">Analytics data is currently unavailable.</p>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatCard icon={Eye} label="Total Views" value={data.views} />
            <StatCard icon={Users} label="Unique Visitors" value={data.uniques} />
            <StatCard icon={MousePointerClick} label="Link Clicks" value={data.total} />
            <StatCard icon={Percent} label="Click-Through Rate" value={`${data.ctr}%`} />
          </div>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <Activity className="h-4 w-4" style={{ color: accent }} />
                Daily Activity
              </CardTitle>
              {isFetching && <Badge variant="outline" className="text-[10px]">Refreshing…</Badge>}
            </CardHeader>
            <CardContent>
              <DailyActivityChart data={data.daily} accent={accent} />
            </CardContent>
          </Card>

          <div className="grid gap-4 lg:grid-cols-3">
            <Breakdown title="Top Traffic Sources" rows={data.referrers} accent={accent} />
            <Breakdown title="Geographic Locations" rows={data.countries} accent={accent} />
            <Breakdown title="User Devices" rows={data.devices} accent={accent} />
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-semibold">Clicks by Link & Pass</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Link / Event Title</TableHead>
                    <TableHead className="w-24 text-right">Clicks</TableHead>
                    <TableHead className="w-24 text-right">Share</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.totals.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={3} className="h-24 text-center text-sm text-muted-foreground">
                        No link clicks recorded yet.
                      </TableCell>
                    </TableRow>
                  )}
                  {data.totals.map((t) => (
                    <TableRow key={t.linkId}>
                      <TableCell className="font-medium text-xs sm:text-sm">{t.label}</TableCell>
                      <TableCell className="text-right tabular-nums font-mono text-xs sm:text-sm">{t.total}</TableCell>
                      <TableCell className="text-right tabular-nums font-mono text-xs text-muted-foreground">
                        {data.total > 0 ? `${Math.round((t.total / data.total) * 100)}%` : "0%"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}