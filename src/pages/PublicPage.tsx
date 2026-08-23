import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import type { CSSProperties } from "react";
import {
  ArrowUpRight,
  Calendar,
  Clock,
  Copy,
  ImageIcon,
  MapPin,
  QrCode,
  Share2,
  Sparkles,
  Ticket,
} from "lucide-react";
import { renderSVG } from "uqr";
import { getPublic } from "../lib/api";
import type { LinkItem, Profile } from "../lib/types";
import { PlatformIcon } from "../lib/icons";
import { LinkIconBadge } from "../lib/link-icon";
import { ThemeProvider, useTheme } from "../lib/ThemeContext";
import { cn } from "../lib/utils";

export interface PageData {
  profile: Profile;
  links: LinkItem[];
}

interface EventDateDetails {
  month: string;
  day: string;
  weekday: string;
  timeString: string;
  fullDateString: string;
  statusLabel: string;
  isLive: boolean;
  isPast: boolean;
}

function getDomain(url: string): string | null {
  try {
    const host = new URL(url).hostname.replace(/^www\./, "");
    return host;
  } catch {
    return null;
  }
}

function getEventDateDetails(startsAt: number | null, endsAt: number | null): EventDateDetails | null {
  const primaryTs = startsAt || endsAt;
  if (!primaryTs) return null;

  const d = new Date(primaryTs * 1000);
  const now = Date.now();
  const startMs = startsAt ? startsAt * 1000 : null;
  const endMs = endsAt ? endsAt * 1000 : null;

  const month = d.toLocaleDateString(undefined, { month: "short" }).toUpperCase();
  const day = String(d.getDate()).padStart(2, "0");
  const weekday = d.toLocaleDateString(undefined, { weekday: "short" }).toUpperCase();

  const startTimeStr = d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });

  let timeString = startTimeStr;
  if (startsAt && endsAt) {
    const endD = new Date(endsAt * 1000);
    const endTimeStr = endD.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
    timeString = `${startTimeStr} – ${endTimeStr}`;
  }

  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);

  const isToday = d.toDateString() === today.toDateString();
  const isTomorrow = d.toDateString() === tomorrow.toDateString();

  const dayLabel = isToday
    ? "Today"
    : isTomorrow
      ? "Tomorrow"
      : d.toLocaleDateString(undefined, { month: "short", day: "numeric", weekday: "short" });

  const fullDateString = `${dayLabel} • ${timeString}`;

  let statusLabel = "Upcoming";
  let isLive = false;
  let isPast = false;

  if (startMs && endMs) {
    if (now >= startMs && now <= endMs) {
      statusLabel = "LIVE NOW";
      isLive = true;
    } else if (now > endMs) {
      statusLabel = "Concluded";
      isPast = true;
    } else {
      const diffHrs = Math.floor((startMs - now) / (1000 * 60 * 60));
      if (diffHrs < 1) {
        const diffMins = Math.max(1, Math.floor((startMs - now) / (1000 * 60)));
        statusLabel = `In ${diffMins}m`;
      } else if (diffHrs < 24) {
        statusLabel = `In ${diffHrs}h`;
      } else {
        const diffDays = Math.floor(diffHrs / 24);
        statusLabel = diffDays === 1 ? "Tomorrow" : `In ${diffDays}d`;
      }
    }
  } else if (startMs) {
    if (now > startMs + 4 * 3600 * 1000) {
      statusLabel = "Concluded";
      isPast = true;
    } else if (now >= startMs) {
      statusLabel = "LIVE NOW";
      isLive = true;
    } else {
      const diffHrs = Math.floor((startMs - now) / (1000 * 60 * 60));
      if (diffHrs < 1) {
        const diffMins = Math.max(1, Math.floor((startMs - now) / (1000 * 60)));
        statusLabel = `In ${diffMins}m`;
      } else if (diffHrs < 24) {
        statusLabel = `In ${diffHrs}h`;
      } else {
        const diffDays = Math.floor(diffHrs / 24);
        statusLabel = diffDays === 1 ? "Tomorrow" : `In ${diffDays}d`;
      }
    }
  } else if (endMs) {
    if (now > endMs) {
      statusLabel = "Concluded";
      isPast = true;
    } else {
      statusLabel = "Active";
    }
  }

  return {
    month,
    day,
    weekday,
    timeString,
    fullDateString,
    statusLabel,
    isLive,
    isPast,
  };
}

function Avatar({ name, accent, hasAvatar, size = "default" }: { name: string; accent: string; hasAvatar: boolean; size?: "default" | "large" }) {
  const dim = size === "large" ? "h-24 w-24 sm:h-28 sm:w-28" : "h-20 w-20 sm:h-24 sm:w-24";
  return (
    <div className="relative flex items-center justify-center">
      {/* Swiss halo lighting */}
      <div
        className="absolute -inset-3 rounded-3xl opacity-35 blur-xl transition-opacity"
        style={{ background: `radial-gradient(circle, ${accent}, transparent 70%)` }}
        aria-hidden
      />
      {hasAvatar ? (
        <div className="relative">
          <img
            src="/api/avatar"
            alt={name}
            className={`relative ${dim} rounded-3xl border-2 object-cover shadow-2xl transition-transform duration-300 hover:scale-105`}
            style={{
              borderColor: "color-mix(in srgb, var(--text) 18%, transparent)",
              boxShadow: `0 12px 36px -10px ${accent}40`,
            }}
          />
          <div
            className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full border-2 text-white shadow-md"
            style={{
              background: accent,
              borderColor: "var(--surface)",
            }}
            title="Verified Club"
          >
            <span className="text-[9px] font-bold">✓</span>
          </div>
        </div>
      ) : (
        <div
          className={`relative flex ${dim} items-center justify-center rounded-3xl border-2 text-2xl sm:text-3xl font-black tracking-tight text-white shadow-2xl transition-transform duration-300 hover:scale-105`}
          style={{
            background: `linear-gradient(135deg, ${accent}, ${accent}cc)`,
            borderColor: "color-mix(in srgb, var(--text) 20%, transparent)",
            boxShadow: `0 12px 36px -10px ${accent}40`,
          }}
          aria-hidden
        >
          {(name || "?").slice(0, 2).toUpperCase()}
        </div>
      )}
    </div>
  );
}

function SocialDock({ socials, accent }: { socials: Profile["socials"]; accent: string }) {
  if (socials.length === 0) return null;
  return (
    <div
      className="mt-5 flex flex-wrap items-center justify-center gap-2 rounded-full border p-1.5 shadow-sm backdrop-blur-md transition-all"
      style={{
        borderColor: "color-mix(in srgb, var(--text) 12%, transparent)",
        background: "color-mix(in srgb, var(--surface) 80%, transparent)",
      }}
    >
      {socials.map((s) => (
        <a
          key={s.platform}
          href={s.url}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={s.platform}
          title={s.platform}
          className="group relative flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-full border transition-all duration-200 hover:-translate-y-0.5 hover:scale-105 hover:text-white hover:shadow-md"
          style={{
            borderColor: "color-mix(in srgb, var(--text) 10%, transparent)",
            color: "var(--muted)",
            background: "var(--surface)",
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.background = accent;
            (e.currentTarget as HTMLElement).style.borderColor = accent;
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.background = "var(--surface)";
            (e.currentTarget as HTMLElement).style.borderColor = "color-mix(in srgb, var(--text) 10%, transparent)";
          }}
        >
          <PlatformIcon platform={s.platform} size={17} />
        </a>
      ))}
    </div>
  );
}

/** Swiss Physical Event Ticket Pass */
function EventTicketCard({ link, accent }: { link: LinkItem; accent: string }) {
  const dateInfo = getEventDateDetails(link.startsAt ?? null, link.endsAt ?? null);

  return (
    <a
      href={`/api/click/${link.id}`}
      className="group relative flex w-full flex-col overflow-hidden rounded-2xl border text-left shadow-sm backdrop-blur-md transition-all duration-300 hover:-translate-y-1 hover:shadow-xl"
      style={{
        background: "var(--surface)",
        borderColor: "color-mix(in srgb, var(--text) 16%, transparent)",
      }}
    >
      {/* Top Banner / Event Poster Header */}
      <div className="relative h-40 sm:h-44 w-full overflow-hidden bg-black/5 dark:bg-white/5">
        {link.thumbnailKey ? (
          <>
            <img
              src={`/api/thumb/${link.id}`}
              alt=""
              className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
            />
            {/* Contrast scrim gradient */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-black/10" />
          </>
        ) : (
          <div
            className="relative flex h-full w-full items-center justify-center overflow-hidden"
            style={{
              background: `linear-gradient(135deg, color-mix(in srgb, ${accent} 25%, transparent), color-mix(in srgb, ${accent} 8%, transparent)), radial-gradient(circle at 80% 20%, ${accent}33, transparent 65%)`,
            }}
          >
            <div
              className="absolute inset-0 opacity-10"
              style={{
                backgroundImage: "repeating-linear-gradient(45deg, var(--text) 0, var(--text) 1px, transparent 0, transparent 16px)",
              }}
            />
            <Ticket className="h-16 w-16 opacity-20 transition-transform duration-500 group-hover:scale-110" style={{ color: accent }} />
          </div>
        )}

        {/* Floating Swiss Badges */}
        <div className="absolute inset-x-3.5 top-3.5 flex items-start justify-between gap-2">
          {dateInfo && (
            <div className="flex flex-col items-center justify-center rounded-xl border border-white/20 bg-black/80 px-2.5 py-1 text-white shadow-lg backdrop-blur-md">
              <span className="font-mono text-[9px] font-bold tracking-widest uppercase opacity-75">{dateInfo.month}</span>
              <span className="text-base font-black leading-none tracking-tight">{dateInfo.day}</span>
            </div>
          )}

          {dateInfo && (
            <div className="flex items-center gap-1.5 rounded-full border border-white/20 bg-black/80 px-2.5 py-1 text-xs font-semibold text-white shadow-lg backdrop-blur-md">
              <span
                className={cn(
                  "h-2 w-2 rounded-full",
                  dateInfo.isLive ? "animate-pulse bg-emerald-400" : dateInfo.isPast ? "bg-zinc-400" : "bg-white",
                )}
              />
              <span className="font-mono text-[10px] tracking-wider uppercase">{dateInfo.statusLabel}</span>
            </div>
          )}
        </div>
      </div>

      {/* Ticket Details Body */}
      <div className="p-5 pb-3">
        <div className="flex items-center justify-between font-mono text-[10px] font-bold tracking-widest uppercase" style={{ color: "var(--muted)" }}>
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-1.5 w-1.5 rounded-full" style={{ background: accent }} />
            <span>EVENT PASS</span>
          </span>
          <span>#EVT-{String(link.id).padStart(4, "0")}</span>
        </div>

        <h3
          className="mt-1.5 text-base font-bold tracking-tight transition-colors line-clamp-2"
          style={{ color: "var(--text)" }}
        >
          {link.label}
        </h3>

        <div className="mt-3 flex flex-col gap-1.5 text-xs font-medium" style={{ color: "var(--muted)" }}>
          {dateInfo && (
            <div className="flex items-center gap-2">
              <Calendar className="h-3.5 w-3.5 shrink-0 opacity-70" />
              <span className="truncate">{dateInfo.fullDateString}</span>
            </div>
          )}
          {link.location && (
            <div className="flex items-center gap-2">
              <MapPin className="h-3.5 w-3.5 shrink-0 opacity-70" />
              <span className="truncate">{link.location}</span>
            </div>
          )}
        </div>
      </div>

      {/* Perforation Tear-Line with Notch Cutouts */}
      <div className="relative my-2 flex items-center justify-center">
        <div
          className="absolute -left-2.5 h-5 w-5 rounded-full border shadow-inner"
          style={{
            background: "var(--page-bg)",
            borderColor: "color-mix(in srgb, var(--text) 16%, transparent)",
          }}
        />
        <div
          className="mx-5 w-full border-t border-dashed"
          style={{ borderColor: "color-mix(in srgb, var(--text) 18%, transparent)" }}
        />
        <div
          className="absolute -right-2.5 h-5 w-5 rounded-full border shadow-inner"
          style={{
            background: "var(--page-bg)",
            borderColor: "color-mix(in srgb, var(--text) 16%, transparent)",
          }}
        />
      </div>

      {/* Ticket Stub Action Footer */}
      <div className="flex items-center justify-between px-5 pb-4 pt-1">
        <div
          className="flex items-center gap-2 select-none opacity-40 font-mono text-[9px] tracking-wider uppercase"
          style={{ color: "var(--text)" }}
        >
          <div className="flex h-5 items-center gap-[2px]" aria-hidden>
            <span className="h-full w-[2px] rounded-full bg-current" />
            <span className="h-3 w-[1px] rounded-full bg-current" />
            <span className="h-full w-[3px] rounded-full bg-current" />
            <span className="h-4 w-[1px] rounded-full bg-current" />
            <span className="h-full w-[2px] rounded-full bg-current" />
            <span className="h-2 w-[1px] rounded-full bg-current" />
            <span className="h-full w-[2px] rounded-full bg-current" />
          </div>
          <span className="hidden sm:inline">ADMIT ONE</span>
        </div>

        <div
          className="inline-flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm transition-all duration-200 group-hover:scale-[1.03] group-hover:shadow-md"
          style={{ background: `linear-gradient(135deg, ${accent}, ${accent}dd)` }}
        >
          <span>Get Pass / RSVP</span>
          <ArrowUpRight className="h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
        </div>
      </div>
    </a>
  );
}

/** Featured Spotlight Link Card */
function FeaturedLinkCard({ link, accent }: { link: LinkItem; accent: string }) {
  const domain = getDomain(link.url);

  return (
    <a
      href={`/api/click/${link.id}`}
      className="group relative flex w-full flex-col overflow-hidden rounded-2xl p-5 text-white shadow-lg transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl"
      style={{
        background: `linear-gradient(135deg, ${accent}, color-mix(in srgb, ${accent} 85%, black))`,
      }}
    >
      <div className="flex items-center justify-between text-white/80 font-mono text-[10px] font-bold tracking-widest uppercase">
        <span className="flex items-center gap-1.5">
          <Sparkles className="h-3.5 w-3.5" />
          <span>FEATURED SPOTLIGHT</span>
        </span>
        <ArrowUpRight className="h-4 w-4 opacity-80 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:opacity-100" />
      </div>

      <div className="mt-3 flex items-center gap-3.5">
        {link.thumbnailKey ? (
          <img
            src={`/api/thumb/${link.id}`}
            alt=""
            className="h-12 w-12 shrink-0 rounded-xl border border-white/30 object-cover shadow-sm"
          />
        ) : link.icon ? (
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/30 bg-white/20 shadow-sm backdrop-blur-sm">
            <LinkIconBadge icon={link.icon} size={20} />
          </div>
        ) : null}

        <div className="min-w-0 flex-1">
          <h3 className="truncate text-base font-bold tracking-tight">{link.label}</h3>
          {domain && <p className="mt-0.5 font-mono text-xs text-white/75 truncate">{domain}</p>}
        </div>
      </div>
    </a>
  );
}

/** Standard Swiss Precision Link Card */
function StandardLinkCard({ link, accent }: { link: LinkItem; accent: string }) {
  const domain = getDomain(link.url);

  return (
    <a
      href={`/api/click/${link.id}`}
      className="group relative flex w-full items-center gap-3.5 rounded-2xl border px-4 py-3.5 text-left shadow-sm backdrop-blur-md transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
      style={{
        borderColor: "color-mix(in srgb, var(--text) 14%, transparent)",
        color: "var(--text)",
        background: "var(--surface)",
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLElement).style.borderColor = `color-mix(in srgb, ${accent} 60%, transparent)`;
        (e.currentTarget as HTMLElement).style.boxShadow = `0 10px 30px -10px ${accent}30`;
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.borderColor = "color-mix(in srgb, var(--text) 14%, transparent)";
        (e.currentTarget as HTMLElement).style.boxShadow = "";
      }}
    >
      {link.thumbnailKey ? (
        <img
          src={`/api/thumb/${link.id}`}
          alt=""
          className="h-11 w-11 shrink-0 rounded-xl border object-cover shadow-sm"
          style={{ borderColor: "color-mix(in srgb, var(--text) 12%, transparent)" }}
        />
      ) : link.icon ? (
        <span
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border transition-colors group-hover:scale-105"
          style={{
            background: `color-mix(in srgb, ${accent} 12%, transparent)`,
            borderColor: `color-mix(in srgb, ${accent} 25%, transparent)`,
            color: accent,
          }}
        >
          <LinkIconBadge icon={link.icon} size={18} />
        </span>
      ) : null}

      <div className="min-w-0 flex-1">
        <p className="truncate text-[15px] font-semibold tracking-tight">{link.label}</p>
        {domain && (
          <p className="font-mono text-xs tracking-tight truncate" style={{ color: "var(--muted)" }}>
            {domain}
          </p>
        )}
      </div>

      <div
        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border opacity-50 transition-all duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:opacity-100"
        style={{
          borderColor: "color-mix(in srgb, var(--text) 15%, transparent)",
          color: "var(--text)",
        }}
      >
        <ArrowUpRight className="h-3.5 w-3.5" />
      </div>
    </a>
  );
}

function EmptyState({ accent }: { accent: string }) {
  return (
    <div
      className="mt-6 flex w-full flex-col items-center gap-3 rounded-2xl border border-dashed px-6 py-12 text-center backdrop-blur-sm"
      style={{ borderColor: "color-mix(in srgb, var(--text) 20%, transparent)", background: "var(--surface)" }}
    >
      <Ticket className="h-8 w-8 opacity-30" style={{ color: accent }} />
      <p className="text-sm font-semibold" style={{ color: "var(--text)" }}>This page is under construction.</p>
      <p className="text-xs max-w-xs" style={{ color: "var(--muted)" }}>
        Configure your links, upcoming events, and socials in the admin portal.
      </p>
      <a
        href="/admin"
        className="mt-2 rounded-xl px-4 py-2 text-xs font-semibold text-white shadow-sm transition-transform hover:scale-105"
        style={{ background: accent }}
      >
        Open Admin Portal
      </a>
    </div>
  );
}

/** Desktop Integrated QR Connect Box */
function DesktopQrBox({ url, accent }: { url: string; accent: string }) {
  const [copied, setCopied] = useState(false);
  const svg = useMemo(() => renderSVG(url, { ecc: "M", border: 1 }), [url]);

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
    <div
      className="mt-6 hidden md:flex w-full flex-col items-center gap-3.5 rounded-2xl border p-4 shadow-sm backdrop-blur-md"
      style={{
        background: "var(--surface)",
        borderColor: "color-mix(in srgb, var(--text) 12%, transparent)",
      }}
    >
      <div className="flex w-full items-center justify-between font-mono text-[10px] font-bold tracking-widest uppercase opacity-70" style={{ color: "var(--muted)" }}>
        <span className="flex items-center gap-1.5">
          <QrCode className="h-3.5 w-3.5" style={{ color: accent }} />
          <span>SCAN ON MOBILE</span>
        </span>
        <span>// SHARE</span>
      </div>

      <div className="flex items-center gap-4 w-full">
        {/* QR Code */}
        <div className="rounded-xl border bg-white p-2 shadow-sm shrink-0" style={{ borderColor: "color-mix(in srgb, var(--text) 10%, transparent)" }}>
          <div className="h-20 w-20" dangerouslySetInnerHTML={{ __html: svg }} />
        </div>

        <div className="flex flex-1 flex-col gap-2 min-w-0">
          <button
            onClick={copy}
            className="flex items-center justify-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold transition-all hover:opacity-85"
            style={{
              borderColor: "color-mix(in srgb, var(--text) 15%, transparent)",
              color: "var(--text)",
            }}
          >
            {copied ? <span className="text-emerald-500 font-bold">Copied!</span> : <>
              <Copy className="h-3 w-3" />
              <span>Copy link</span>
            </>}
          </button>

          <div className="flex gap-1.5">
            <a
              href={`https://x.com/intent/post?url=${shareUrl}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 rounded-xl border py-1.5 text-center text-[11px] font-semibold transition-opacity hover:opacity-80"
              style={{ borderColor: "color-mix(in srgb, var(--text) 15%, transparent)", color: "var(--muted)" }}
            >
              X
            </a>
            <a
              href={`https://wa.me/?text=${shareUrl}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 rounded-xl border py-1.5 text-center text-[11px] font-semibold transition-opacity hover:opacity-80"
              style={{ borderColor: "color-mix(in srgb, var(--text) 15%, transparent)", color: "var(--muted)" }}
            >
              WhatsApp
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Renders the public page from a given data payload. Reused by the admin live preview. */
export function PageShell({ data, interactive = true, embedded = false }: { data: PageData; interactive?: boolean; embedded?: boolean }) {
  const { theme, cssVars } = useTheme();
  const { profile, links } = data;

  const featured = links.filter((l) => l.highlight === 1 && l.kind !== "event");
  const events = links.filter((l) => l.kind === "event");
  const regular = links.filter((l) => l.highlight !== 1 && l.kind !== "event");
  const accent = theme.palette.accent;
  const configured = !!(profile.orgName || links.length > 0 || profile.socials.length > 0);
  const url = typeof window !== "undefined" ? window.location.origin : "";

  // Swiss High-Craft Background: Dot Matrix Grid + Ambient Spotlight Mesh
  const bg = {
    ...cssVars,
    backgroundColor: "var(--page-bg)",
    backgroundImage: `
      radial-gradient(1100px 520px at 50% -10%, color-mix(in srgb, ${accent} 20%, transparent), transparent 65%),
      radial-gradient(800px 400px at 85% 100%, color-mix(in srgb, ${accent} 10%, transparent), transparent 60%),
      radial-gradient(circle at 1px 1px, color-mix(in srgb, var(--text) 6%, transparent) 1px, transparent 0)
    `,
    backgroundSize: "100% 100%, 100% 100%, 20px 20px",
  } as CSSProperties;

  // Single-column mode for embedded admin preview OR mobile layout
  if (embedded) {
    return (
      <main className="relative mx-auto flex w-full max-w-md flex-col items-center px-4 py-8" style={bg}>
        {/* Cover Banner (if set) */}
        {profile.bannerKey && (
          <div className="relative mb-[-3.5rem] h-32 w-full overflow-hidden rounded-2xl border shadow-sm" style={{ borderColor: "color-mix(in srgb, var(--text) 14%, transparent)" }}>
            <img src="/api/banner" alt="" className="h-full w-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
          </div>
        )}

        <Avatar name={profile.orgName} accent={accent} hasAvatar={!!profile.avatarKey} />

        {profile.orgName && (
          <h1 className="mt-4 text-center text-2xl font-extrabold tracking-tight" style={{ color: "var(--text)" }}>
            {profile.orgName}
          </h1>
        )}

        {profile.tagline && (
          <p className="mt-1.5 max-w-xs text-center text-sm leading-relaxed" style={{ color: "var(--muted)" }}>
            {profile.tagline}
          </p>
        )}

        <SocialDock socials={profile.socials} accent={accent} />

        <div className="mt-7 flex w-full flex-col gap-3.5">
          {featured.map((link) => (
            <FeaturedLinkCard key={link.id} link={link} accent={accent} />
          ))}
          {events.map((link) => (
            <EventTicketCard key={link.id} link={link} accent={accent} />
          ))}
          {regular.map((link) => (
            <StandardLinkCard key={link.id} link={link} accent={accent} />
          ))}
          {!configured && <EmptyState accent={accent} />}
        </div>
      </main>
    );
  }

  // Full Public Page: Responsive Mobile & Desktop Layout
  return (
    <div className="min-h-screen w-full" style={bg}>
      {/* Top Panoramic Banner (if available) for large screens */}
      {profile.bannerKey && (
        <div className="relative h-44 sm:h-56 md:h-64 w-full overflow-hidden border-b" style={{ borderColor: "color-mix(in srgb, var(--text) 10%, transparent)" }}>
          <img src="/api/banner" alt="" className="h-full w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-[var(--page-bg)] via-black/20 to-transparent" />
        </div>
      )}

      <main className={`relative mx-auto w-full px-5 sm:px-8 py-10 md:py-14 ${profile.bannerKey ? "max-w-5xl -mt-16 sm:-mt-20 md:-mt-24" : "max-w-5xl"}`}>
        {/* Desktop 2-Column Studio Grid */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 lg:gap-12 items-start">
          {/* Left Column: Identity & Profile Studio Card */}
          <div className="md:col-span-5 lg:col-span-5 flex flex-col items-center md:items-start text-center md:text-left md:sticky md:top-8">
            <div
              className="relative flex w-full flex-col items-center md:items-start rounded-3xl border p-6 sm:p-7 shadow-sm backdrop-blur-md"
              style={{
                background: "var(--surface)",
                borderColor: "color-mix(in srgb, var(--text) 14%, transparent)",
              }}
            >
              <Avatar name={profile.orgName} accent={accent} hasAvatar={!!profile.avatarKey} size="large" />

              {profile.orgName && (
                <h1 className="mt-5 text-2xl sm:text-3xl font-extrabold tracking-tight" style={{ color: "var(--text)" }}>
                  {profile.orgName}
                </h1>
              )}

              {profile.tagline && (
                <p className="mt-2 text-sm sm:text-[15px] leading-relaxed font-normal" style={{ color: "var(--muted)" }}>
                  {profile.tagline}
                </p>
              )}

              <SocialDock socials={profile.socials} accent={accent} />

              {/* Desktop Direct Connect & QR Box */}
              {interactive && <DesktopQrBox url={url} accent={accent} />}
            </div>
          </div>

          {/* Right Column: Events, Spotlight & Links Feed */}
          <div className="md:col-span-7 lg:col-span-7 flex flex-col gap-6">
            {/* Featured Links */}
            {featured.length > 0 && (
              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-2 font-mono text-[10px] font-bold tracking-widest uppercase opacity-65" style={{ color: "var(--muted)" }}>
                  <Sparkles className="h-3 w-3" />
                  <span>FEATURED SPOTLIGHT</span>
                </div>
                {featured.map((link) => (
                  <FeaturedLinkCard key={link.id} link={link} accent={accent} />
                ))}
              </div>
            )}

            {/* Event Passes */}
            {events.length > 0 && (
              <div className="flex flex-col gap-3.5">
                <div className="flex items-center gap-2 font-mono text-[10px] font-bold tracking-widest uppercase opacity-65" style={{ color: "var(--muted)" }}>
                  <Ticket className="h-3 w-3" />
                  <span>UPCOMING EVENTS // TICKET PASSES</span>
                </div>
                {events.map((link) => (
                  <EventTicketCard key={link.id} link={link} accent={accent} />
                ))}
              </div>
            )}

            {/* Regular Links Section */}
            {regular.length > 0 && (
              <div className="flex flex-col gap-2.5">
                <div className="flex items-center gap-2 font-mono text-[10px] font-bold tracking-widest uppercase opacity-65" style={{ color: "var(--muted)" }}>
                  <span>LINKS & RESOURCES</span>
                </div>
                {regular.map((link) => (
                  <StandardLinkCard key={link.id} link={link} accent={accent} />
                ))}
              </div>
            )}

            {!configured && <EmptyState accent={accent} />}

            {/* Mobile Share Footer */}
            {interactive && (
              <div className="flex md:hidden w-full justify-center">
                <MobileShareFooter accent={accent} />
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

function QrPopover({ url, accent }: { url: string; accent: string }) {
  const [open, setOpen] = useState(false);
  const svg = useMemo(() => renderSVG(url, { ecc: "M", border: 1 }), [url]);

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-semibold backdrop-blur-md transition-all hover:-translate-y-0.5 hover:shadow-sm"
        style={{
          borderColor: "color-mix(in srgb, var(--text) 15%, transparent)",
          color: "var(--muted)",
          background: "var(--surface)",
        }}
      >
        <QrCode className="h-3.5 w-3.5" />
        <span>QR Pass</span>
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-6 backdrop-blur-sm" onClick={() => setOpen(false)}>
      <div
        className="flex w-full max-w-xs flex-col items-center gap-4 rounded-3xl border p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200"
        style={{
          background: "var(--surface)",
          color: "var(--text)",
          borderColor: "color-mix(in srgb, var(--text) 18%, transparent)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 font-mono text-[11px] font-bold tracking-widest uppercase" style={{ color: "var(--muted)" }}>
          <Ticket className="h-3.5 w-3.5" style={{ color: accent }} />
          <span>SCAN TO CONNECT</span>
        </div>

        <div className="rounded-2xl border bg-white p-3.5 shadow-md" style={{ borderColor: "color-mix(in srgb, var(--text) 10%, transparent)" }}>
          <div className="h-44 w-44" dangerouslySetInnerHTML={{ __html: svg }} />
        </div>

        <p className="max-w-full truncate font-mono text-xs opacity-75" style={{ color: "var(--muted)" }}>
          {url}
        </p>

        <div className="flex w-full gap-2">
          <a
            href={`data:image/svg+xml;utf8,${encodeURIComponent(svg)}`}
            download="qr-pass.svg"
            className="flex-1 rounded-xl py-2 text-center text-xs font-bold text-white shadow-sm transition-transform hover:scale-105"
            style={{ background: accent }}
          >
            Download SVG
          </a>
          <button
            onClick={() => setOpen(false)}
            className="rounded-xl border px-4 py-2 text-xs font-semibold transition-colors hover:bg-black/5 dark:hover:bg-white/5"
            style={{ borderColor: "color-mix(in srgb, var(--text) 16%, transparent)", color: "var(--muted)" }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

function MobileShareFooter({ accent }: { accent: string }) {
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
    <footer className="mt-10 flex flex-col items-center gap-4">
      <div className="flex flex-wrap items-center justify-center gap-2">
        <button
          onClick={copy}
          className="flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-semibold backdrop-blur-md transition-all hover:-translate-y-0.5 hover:shadow-sm"
          style={{
            borderColor: "color-mix(in srgb, var(--text) 15%, transparent)",
            color: "var(--muted)",
            background: "var(--surface)",
          }}
        >
          {copied ? <span className="text-emerald-500 font-bold">Copied!</span> : <>
            <Copy className="h-3.5 w-3.5" />
            <span>Copy link</span>
          </>}
        </button>

        <QrPopover url={url} accent={accent} />

        <a
          href={`https://x.com/intent/post?url=${shareUrl}`}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-full border px-3.5 py-1.5 text-xs font-semibold backdrop-blur-md transition-all hover:-translate-y-0.5 hover:shadow-sm"
          style={{
            borderColor: "color-mix(in srgb, var(--text) 15%, transparent)",
            color: "var(--muted)",
            background: "var(--surface)",
          }}
        >
          Post on X
        </a>

        <a
          href={`https://wa.me/?text=${shareUrl}`}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-full border px-3.5 py-1.5 text-xs font-semibold backdrop-blur-md transition-all hover:-translate-y-0.5 hover:shadow-sm"
          style={{
            borderColor: "color-mix(in srgb, var(--text) 15%, transparent)",
            color: "var(--muted)",
            background: "var(--surface)",
          }}
        >
          WhatsApp
        </a>
      </div>

      <div className="flex items-center gap-1.5 font-mono text-[10px] tracking-widest uppercase opacity-40" style={{ color: "var(--muted)" }}>
        <span>POWERED BY</span>
        <span className="font-black text-[var(--text)]">LINK</span>
      </div>
    </footer>
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
        <div className="h-28 w-28 animate-pulse rounded-3xl bg-muted" />
        <div className="h-6 w-48 animate-pulse rounded-lg bg-muted" />
        <div className="mt-4 h-36 w-full max-w-md animate-pulse rounded-2xl bg-muted" />
        <div className="h-14 w-full max-w-md animate-pulse rounded-2xl bg-muted" />
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