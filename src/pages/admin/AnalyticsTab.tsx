import { useQuery } from "@tanstack/react-query";
import { getStats } from "../../lib/api";
import { Button } from "../../components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../components/ui/table";
import { Skeleton } from "../../components/ui/skeleton";

function formatDay(day: string): string {
  const d = new Date(`${day}T00:00:00Z`);
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function DailyChart({ data, accent }: { data: { date: string; clicks: number }[]; accent: string }) {
  const max = Math.max(1, ...data.map((d) => d.clicks));
  return (
    <div className="flex h-40 items-end gap-1">
      {data.map((d) => (
        <div key={d.date} className="group relative flex flex-1 flex-col justify-end" title={`${formatDay(d.date)}: ${d.clicks} clicks`}>
          <div
            className="min-h-1 rounded-t transition-opacity group-hover:opacity-80"
            style={{ height: `${Math.max(4, (d.clicks / max) * 100)}%`, background: accent }}
          />
        </div>
      ))}
    </div>
  );
}

export default function AnalyticsTab() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["stats", 30],
    queryFn: () => getStats(30),
  });
  const accent = "#6366f1";

  if (isLoading) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (isError || !data) {
    return <p className="text-sm text-muted-foreground">Analytics unavailable.</p>;
  }

  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-col gap-4 rounded-xl border bg-card p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold">Clicks — last 30 days</h2>
          <span className="text-sm text-muted-foreground">{data.total} total</span>
        </div>
        <div className="flex items-center justify-between gap-2 text-[10px] text-muted-foreground">
          <span>{data.daily.length > 0 ? formatDay(data.daily[0]!.date) : "—"}</span>
          <span>{data.daily.length > 0 ? formatDay(data.daily[data.daily.length - 1]!.date) : "—"}</span>
        </div>
        <DailyChart data={data.daily} accent={accent} />
      </section>

      <section className="rounded-xl border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Link</TableHead>
              <TableHead className="w-20 text-right">Clicks</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.totals.length === 0 && (
              <TableRow>
                <TableCell colSpan={2} className="h-24 text-center text-sm text-muted-foreground">
                  No clicks recorded yet.
                </TableCell>
              </TableRow>
            )}
            {data.totals.map((t) => (
              <TableRow key={t.linkId}>
                <TableCell className="font-medium">{t.label}</TableCell>
                <TableCell className="text-right tabular-nums">{t.total}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </section>

      <Button asChild variant="link" className="self-start text-muted-foreground">
        <a href="/admin/links">Manage links →</a>
      </Button>
    </div>
  );
}