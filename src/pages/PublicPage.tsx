import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import type { CSSProperties } from "react";
import { ArrowUpRight, CalendarClock, Clock, MapPin, Sparkles } from "lucide-react";
import { getPublic } from "../lib/api";
import type { LinkItem, Profile } from "../lib/types";
import { PlatformIcon } from "../lib/icons";
import { ThemeProvider, useTheme } from "../lib/ThemeContext";

export interface PageData {
  profile: Profile;
  links: LinkItem[];
}

function formatTime(ts: number): string {
  const d = new Date(ts * 1000);
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  const sameDay = d.toDateString() === today.toDateString();
  const nextDay = d.toDateString() === tomorrow.toDateString();
  const day = sameDay ? "Today" : nextDay ? "Tomorrow" : d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  return `${day}, ${d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}`;
}

function useCountdown(endTs: number | null): string | null {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!endTs || endTs * 1000 <= now) return;
    const t = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(t);
  }, [endTs, now]);
  return endTs && endTs * 1000 > now ? formatTime(endTs) : null;
}

function Avatar({ name, accent, hasAvatar }: { name: string; accent: string; hasAvatar: boolean }) {
  return (
    <div className="relative">
      <div
        className="absolute -inset-3 rounded-full opacity-40 blur-2xl"
        style={{ background: `radial-gradient(circle, ${accent}, transparent 70%)` }}
        aria-hidden
      />
      {hasAvatar ? (
        <img
          src="/api/avatar"
          alt={name}
          className="relative h-28 w-28 rounded-full border-4 object-cover shadow-xl"
          style={{ borderColor: "var(--surface)" }}
        />
      ) : (
        <div
          className="relative flex h-28 w-28 items-center justify-center rounded-full border-4 text-4xl font-extrabold tracking-tight text-white shadow-xl"
          style={{ background: `linear-gradient(135deg, ${accent}, ${accent}bb)`, borderColor: "var(--surface)" }}
          aria-hidden
        >
          {(name || "?").slice(0, 2).toUpperCase()}
        </div>
      )}
    </div>
  );
}

function SocialRow({ socials, accent }: { socials: Profile["socials"]; accent: string }) {
  if (socials.length === 0) return null;
  return (
    <div className="mt-7 flex flex-wrap items-center justify-center gap-2.5">
      {socials.map((s) => (
        <a
          key={s.platform}
          href={s.url}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={s.platform}
          title={s.platform}
          className="flex h-11 w-11 items-center justify-center rounded-full border shadow-sm backdrop-blur transition-all hover:-translate-y-0.5 hover:text-white hover:shadow-lg"
          style={{ borderColor: "color-mix(in srgb, var(--text) 18%, transparent)", color: "var(--muted)" }}
          onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.background = `linear-gradient(135deg, ${accent}, ${accent}cc)`)}
          onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.background = "")}
        >
          <PlatformIcon platform={s.platform} size={19} />
        </a>
      ))}
    </div>
  );
}

function EventCard({ link, accent }: { link: LinkItem; accent: string }) {
  const timeLabel = useCountdown(link.endsAt ?? null);
  return (
    <a
      href={`/api/click/${link.id}`}
      className="group relative flex items-center gap-3 overflow-hidden rounded-2xl px-5 py-4 text-left text-white shadow-lg transition-all hover:-translate-y-1 hover:shadow-2xl"
      style={{ background: `linear-gradient(135deg, ${accent}, ${accent}cc)` }}
    >
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/20">
        <CalendarClock className="h-5 w-5" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[15px] font-semibold">{link.label}</p>
        <p className="mt-0.5 flex items-center gap-1 text-xs text-white/85">
          <Clock className="h-3 w-3" />
          {timeLabel ?? "See details"}
          {link.location && (
            <span className="flex items-center gap-1">
              <MapPin className="h-3 w-3" /> {link.location}
            </span>
          )}
        </p>
      </div>
      <ArrowUpRight className="h-4 w-4 opacity-70 transition-all group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
    </a>
  );
}

function LinkCard({ link, accent, featured }: { link: LinkItem; accent: string; featured: boolean }) {
  if (featured) {
    return (
      <a
        href={`/api/click/${link.id}`}
        className="group relative flex items-center justify-center gap-2.5 overflow-hidden rounded-2xl px-6 py-4.5 text-[15px] font-semibold text-white shadow-lg transition-all hover:-translate-y-1 hover:shadow-2xl"
        style={{ background: `linear-gradient(135deg, ${accent}, ${accent}cc)` }}
      >
        <Sparkles className="h-4 w-4" />
        <span className="relative">{link.label}</span>
        <ArrowUpRight className="absolute right-5 h-4.5 w-4.5 opacity-70 transition-all group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:opacity-100" />
      </a>
    );
  }
  return (
    <a
      href={`/api/click/${link.id}`}
      className="group relative flex items-center justify-center gap-2.5 rounded-2xl border px-6 py-4 text-[15px] font-medium shadow-sm backdrop-blur transition-all hover:-translate-y-1 hover:shadow-xl"
      style={{ borderColor: "color-mix(in srgb, var(--text) 15%, transparent)", color: "var(--text)", background: "var(--surface)" }}
      onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.boxShadow = `0 20px 45px -12px ${accent}55`)}
      onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.boxShadow = "")}
    >
      <span>{link.label}</span>
      <ArrowUpRight className="absolute right-5 h-4.5 w-4.5 opacity-30 transition-all group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:opacity-100" />
    </a>
  );
}

function EmptyState({ accent }: { accent: string }) {
  return (
    <div className="mt-10 flex w-full flex-col items-center gap-3 rounded-2xl border border-dashed px-6 py-10 text-center" style={{ borderColor: "color-mix(in srgb, var(--text) 20%, transparent)" }}>
      <p className="text-sm font-medium" style={{ color: "var(--muted)" }}>This page isn't set up yet.</p>
      <p className="text-xs" style={{ color: "var(--muted)" }}>
        Visit <span className="font-mono" style={{ color: accent }}>/admin</span> to add your name, links and socials.
      </p>
    </div>
  );
}

/** Renders the public page from a given data payload. Reused by the admin live preview. */
export function PageShell({ data, interactive = true }: { data: PageData; interactive?: boolean }) {
  const { theme, cssVars } = useTheme();
  const { profile, links } = data;
  const featured = links.filter((l) => l.highlight === 1);
  const events = links.filter((l) => l.kind === "event");
  const regular = links.filter((l) => l.kind !== "event" && l.highlight === 0);
  const accent = theme.palette.accent;
  const configured = !!(profile.orgName || links.length > 0 || profile.socials.length > 0);

  const bg = {
    ...cssVars,
    background: `radial-gradient(1100px 480px at 50% -10%, ${accent}22, transparent 62%), radial-gradient(700px 300px at 85% 108%, ${accent}0f, transparent 60%), var(--page-bg)`,
  } as CSSProperties;

  return (
    <main className="relative mx-auto flex min-h-screen w-full max-w-md flex-col items-center px-6 py-16" style={bg}>
      <Avatar name={profile.orgName} accent={accent} hasAvatar={!!profile.avatarKey} />

      {profile.orgName && (
        <h1 className="mt-6 text-center text-3xl font-bold tracking-tight" style={{ color: "var(--text)" }}>
          {profile.orgName}
        </h1>
      )}
      {profile.tagline && (
        <p className="mt-2.5 max-w-xs text-center text-[15px] leading-relaxed" style={{ color: "var(--muted)" }}>
          {profile.tagline}
        </p>
      )}

      <SocialRow socials={profile.socials} accent={accent} />

      <div className="mt-10 flex w-full flex-col gap-3">
        {featured.map((link) => (
          <LinkCard key={link.id} link={link} accent={accent} featured />
        ))}
        {events.map((link) => (
          <EventCard key={link.id} link={link} accent={accent} />
        ))}
        {regular.map((link) => (
          <LinkCard key={link.id} link={link} accent={accent} featured={false} />
        ))}
        {!configured && <EmptyState accent={accent} />}
      </div>

      {interactive && <ShareRow />}
    </main>
  );
}

function ShareRow() {
  const [copied, setCopied] = useState(false);
  const url = typeof window !== "undefined" ? window.location.origin : "";
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* ignore */
    }
  };
  const shareUrl = encodeURIComponent(url);
  return (
    <div className="mt-14 flex items-center gap-2 text-xs" style={{ color: "var(--muted)" }}>
      <button
        onClick={copy}
        className="rounded-full border px-3 py-1.5 transition-colors hover:opacity-80"
        style={{ borderColor: "color-mix(in srgb, var(--text) 18%, transparent)" }}
      >
        {copied ? "Copied!" : "Copy link"}
      </button>
      <a
        href={`https://x.com/intent/post?url=${shareUrl}`}
        target="_blank"
        rel="noopener noreferrer"
        className="rounded-full border px-3 py-1.5 transition-colors hover:opacity-80"
        style={{ borderColor: "color-mix(in srgb, var(--text) 18%, transparent)" }}
      >
        Post on X
      </a>
      <a
        href={`https://wa.me/?text=${shareUrl}`}
        target="_blank"
        rel="noopener noreferrer"
        className="rounded-full border px-3 py-1.5 transition-colors hover:opacity-80"
        style={{ borderColor: "color-mix(in srgb, var(--text) 18%, transparent)" }}
      >
        WhatsApp
      </a>
    </div>
  );
}

export default function PublicPage() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["public"],
    queryFn: getPublic,
    refetchInterval: 15_000,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
    staleTime: 5_000,
    initialData: (window as Window & { __PUBLIC_DATA__?: PageData }).__PUBLIC_DATA__,
  });

  if (isLoading) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-4 px-6">
        <div className="h-28 w-28 animate-pulse rounded-full bg-muted" />
        <div className="h-6 w-48 animate-pulse rounded-lg bg-muted" />
        <div className="mt-4 h-12 w-full max-w-sm animate-pulse rounded-2xl bg-muted" />
        <div className="h-12 w-full max-w-sm animate-pulse rounded-2xl bg-muted" />
      </main>
    );
  }

  if (isError || !data) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-2 px-6 text-sm text-muted-foreground">
        <p>This page isn't available yet.</p>
      </main>
    );
  }

  return (
    <ThemeProvider theme={data.profile.theme}>
      <PageShell data={data} />
    </ThemeProvider>
  );
}