import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Download, Eye, MousePointerClick, Percent, Users } from "lucide-react";
import { getStats, statsExportUrl } from "../../lib/api";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../../components/ui/card";
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
import type { StatsData } from "../../lib/types";

type Range = "7" | "30" | "90" | "all";

const RANGES: { label: string; value: Range }[] = [
  { label: "7d", value: "7" },
  { label: "30d", value: "30" },
  { label: "90d", value: "90" },
  { label: "All", value: "all" },
];

function formatDay(day: string): string {
  const d = new Date(`${day}T00:00:00Z`);
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function DailyChart({ data, accent }: { data: StatsData["daily"]; accent: string }) {
  const max = Math.max(1, ...data.map((d) => Math.max(d.clicks, d.views)));
  return (
    <div className="flex h-40 items-end gap-[2px]">
      {data.map((d) => (
        <div
          key={d.day}
          className="group relative flex flex-1 items-end gap-[1px]"
          title={`${formatDay(d.day)} · ${d.clicks} clicks · ${d.views} views`}
        >
          <div
            className="w-1/2 rounded-t bg-muted-foreground/30 transition-opacity group-hover:opacity-80"
            style={{ height: `${Math.max(4, (d.views / max) * 100)}%` }}
          />
          <div
            className="w-1/2 rounded-t transition-opacity group-hover:opacity-80"
            style={{ height: `${Math.max(4, (d.clicks / max) * 100)}%`, background: accent }}
          />
        </div>
      ))}
    </div>
  );
}

function Breakdown({ title, rows, accent }: { title: string; rows: { key: string; count: number }[]; accent: string }) {
  const total = rows.reduce((n, r) => n + r.count, 0);
  const max = Math.max(1, ...rows.map((r) => r.count));
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">{title}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        {rows.length === 0 && <p className="text-xs text-muted-foreground">No data yet.</p>}
        {rows.map((r) => (
          <div key={r.key}>
            <div className="flex items-center justify-between text-xs">
              <span className="truncate font-medium">{r.key}</span>
              <span className="tabular-nums text-muted-foreground">
                {r.count} · {total > 0 ? Math.round((r.count / total) * 100) : 0}%
              </span>
            </div>
            <div className="mt-1 h-1.5 w-full rounded-full bg-muted">
              <div className="h-full rounded-full" style={{ width: `${(r.count / max) * 100}%`, background: accent }} />
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
      <CardContent className="flex flex-col gap-1">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Icon className="h-3.5 w-3.5" />
          {label}
        </div>
        <div className="text-2xl font-bold tabular-nums">{value}</div>
      </CardContent>
    </Card>
  );
}

export default function AnalyticsTab() {
  const [range, setRange] = useState<Range>("30");
  const { data, isLoading, isError, isFetching } = useQuery({
    queryKey: ["stats", range],
    queryFn: () => getStats(range === "all" ? "all" : Number(range)),
  });
  const accent = "#6366f1";

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
            <Download className="h-4 w-4" /> CSV
          </a>
        </Button>
      </div>

      {isLoading ? (
        <div className="flex flex-col gap-4">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      ) : isError || !data ? (
        <p className="text-sm text-muted-foreground">Analytics unavailable.</p>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatCard icon={Eye} label="Views" value={data.views} />
            <StatCard icon={Users} label="Unique" value={data.uniques} />
            <StatCard icon={MousePointerClick} label="Clicks" value={data.total} />
            <StatCard icon={Percent} label="CTR" value={`${data.ctr}%`} />
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Daily activity</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              {isFetching && <Badge variant="outline" className="self-end">Refreshing…</Badge>}
              <DailyChart data={data.daily} accent={accent} />
              <div className="flex items-center gap-4 text-[10px] text-muted-foreground">
                <span className="flex items-center gap-1">
                  <span className="h-2 w-2 rounded-sm bg-muted-foreground/40" /> Views
                </span>
                <span className="flex items-center gap-1">
                  <span className="h-2 w-2 rounded-sm" style={{ background: accent }} /> Clicks
                </span>
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-4 lg:grid-cols-3">
            <Breakdown title="Top referrers" rows={data.referrers} accent={accent} />
            <Breakdown title="Countries" rows={data.countries} accent={accent} />
            <Breakdown title="Devices" rows={data.devices} accent={accent} />
          </div>

          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Link</TableHead>
                    <TableHead className="w-24 text-right">Clicks</TableHead>
                    <TableHead className="w-20 text-right">Share</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.totals.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={3} className="h-24 text-center text-sm text-muted-foreground">
                        No clicks recorded yet.
                      </TableCell>
                    </TableRow>
                  )}
                  {data.totals.map((t) => (
                    <TableRow key={t.linkId}>
                      <TableCell className="font-medium">{t.label}</TableCell>
                      <TableCell className="text-right tabular-nums">{t.total}</TableCell>
                      <TableCell className="text-right tabular-nums text-muted-foreground">
                        {data.total > 0 ? Math.round((t.total / data.total) * 100) : 0}%
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