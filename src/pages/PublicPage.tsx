import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import type { CSSProperties } from "react";
import {
  ArrowUpRight,
  Calendar,
  ChevronDown,
  Copy,
  MapPin,
  QrCode,
  Sparkles,
  Ticket,
} from "lucide-react";
import { renderSVG } from "uqr";
import { getPublic } from "../lib/api";
import type { LinkItem, Profile } from "../lib/types";
import { PLATFORM_LABELS } from "../lib/platforms";
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
      {hasAvatar ? (
        <div className="relative">
          <img
            src="/api/avatar"
            alt={name}
            className={`relative ${dim} object-cover`}
            style={{
              borderRadius: "var(--card-radius)",
              borderWidth: "var(--border-width)",
              borderColor: "color-mix(in srgb, var(--text) 20%, transparent)",
              boxShadow: "var(--card-shadow)",
            }}
          />
          <div
            className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full text-white shadow-sm"
            style={{
              background: accent,
              border: "2px solid var(--surface)",
            }}
            title="Verified"
          >
            <span className="text-[9px] font-bold">✓</span>
          </div>
        </div>
      ) : (
        <div
          className={`relative flex ${dim} items-center justify-center text-2xl sm:text-3xl font-black tracking-tight text-white`}
          style={{
            background: accent,
            borderRadius: "var(--card-radius)",
            borderWidth: "var(--border-width)",
            borderColor: "color-mix(in srgb, var(--text) 20%, transparent)",
            boxShadow: "var(--card-shadow)",
            fontFamily: "var(--font-heading)",
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
  if (!socials || socials.length === 0) return null;

  const [activePlatform, setActivePlatform] = useState<PlatformId | null>(null);

  // Group socials by platform
  const grouped = useMemo(() => {
    const map = new Map<PlatformId, typeof socials>();
    for (const s of socials) {
      const list = map.get(s.platform) ?? [];
      list.push(s);
      map.set(s.platform, list);
    }
    return Array.from(map.entries()).map(([platform, items]) => ({ platform, items }));
  }, [socials]);

  return (
    <div className="relative mt-5 flex flex-wrap items-center justify-center gap-2">
      {grouped.map(({ platform, items }) => {
        const platformName = PLATFORM_LABELS[platform] ?? platform;
        const isMulti = items.length > 1;

        if (!isMulti) {
          const single = items[0]!;
          const tooltip = single.label ? `${platformName} (${single.label})` : platformName;
          const hasLabel = !!single.label?.trim();

          return (
            <a
              key={`${platform}-0`}
              href={single.url}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={tooltip}
              title={tooltip}
              className={cn(
                "group inline-flex items-center justify-center transition-all duration-150 hover:-translate-y-0.5",
                hasLabel ? "h-10 gap-2 px-3 text-xs font-semibold" : "h-10 w-10",
              )}
              style={{
                borderRadius: "var(--radius)",
                borderWidth: "var(--border-width)",
                borderColor: "color-mix(in srgb, var(--text) 16%, transparent)",
                background: "var(--surface)",
                color: "var(--text)",
                boxShadow: "var(--card-shadow)",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.borderColor = accent;
                (e.currentTarget as HTMLElement).style.color = accent;
                (e.currentTarget as HTMLElement).style.background = `color-mix(in srgb, ${accent} 10%, var(--surface))`;
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.borderColor = "color-mix(in srgb, var(--text) 16%, transparent)";
                (e.currentTarget as HTMLElement).style.color = "var(--text)";
                (e.currentTarget as HTMLElement).style.background = "var(--surface)";
              }}
            >
              <PlatformIcon platform={platform} size={hasLabel ? 16 : 18} />
              {hasLabel && <span className="truncate max-w-[130px]">{single.label}</span>}
            </a>
          );
        }

        const isOpen = activePlatform === platform;

        return (
          <div key={platform} className="relative">
            <button
              type="button"
              onClick={() => setActivePlatform(isOpen ? null : platform)}
              aria-label={`${platformName} (${items.length} accounts)`}
              title={`${platformName} (${items.length} accounts)`}
              className="group relative inline-flex h-10 items-center gap-2 px-3 text-xs font-semibold transition-all duration-150 hover:-translate-y-0.5 cursor-pointer"
              style={{
                borderRadius: "var(--radius)",
                borderWidth: "var(--border-width)",
                borderColor: isOpen ? accent : "color-mix(in srgb, var(--text) 16%, transparent)",
                background: isOpen ? `color-mix(in srgb, ${accent} 10%, var(--surface))` : "var(--surface)",
                color: isOpen ? accent : "var(--text)",
                boxShadow: "var(--card-shadow)",
              }}
            >
              <PlatformIcon platform={platform} size={16} />
              <span>{platformName}</span>
              <span
                className="flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[9px] font-bold text-white shadow-xs"
                style={{ background: accent }}
              >
                {items.length}
              </span>
              <ChevronDown className={cn("h-3 w-3 transition-transform duration-200 opacity-60", isOpen && "rotate-180")} />
            </button>

            {isOpen && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setActivePlatform(null)}
                  aria-hidden
                />
                <div
                  className="absolute left-1/2 bottom-full mb-2 z-50 -translate-x-1/2 flex min-w-48 flex-col gap-1 p-1.5 shadow-xl animate-in fade-in zoom-in-95 duration-150"
                  style={{
                    background: "var(--surface)",
                    borderRadius: "var(--card-radius)",
                    borderWidth: "var(--border-width)",
                    borderColor: "color-mix(in srgb, var(--text) 18%, transparent)",
                    boxShadow: "var(--card-shadow)",
                  }}
                >
                  <div className="px-2.5 py-1 font-mono text-[9px] font-bold tracking-wider uppercase opacity-60" style={{ color: "var(--muted)" }}>
                    {platformName} Channels ({items.length})
                  </div>
                  {items.map((item, idx) => (
                    <a
                      key={idx}
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => setActivePlatform(null)}
                      className="flex items-center justify-between gap-2.5 px-3 py-2 text-xs font-medium transition-colors hover:bg-black/5 dark:hover:bg-white/5"
                      style={{
                        borderRadius: "var(--radius)",
                        color: "var(--text)",
                      }}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <PlatformIcon platform={platform} size={14} />
                        <span className="truncate font-semibold">{item.label || `${platformName} #${idx + 1}`}</span>
                      </div>
                      <ArrowUpRight className="h-3 w-3 shrink-0 opacity-50" />
                    </a>
                  ))}
                </div>
              </>
            )}
          </div>
        );
      })}
    </div>
  );
}

function getEventStatusBadge(
  status: LinkItem["status"],
  dateInfo: ReturnType<typeof getEventDateDetails>,
) {
  if (status && status !== "auto") {
    switch (status) {
      case "open":
        return { label: "RSVP OPEN", dotColor: "bg-emerald-400" };
      case "closed":
        return { label: "RSVP CLOSED", dotColor: "bg-zinc-400" };
      case "sold_out":
        return { label: "SOLD OUT", dotColor: "bg-rose-400" };
      case "free_entry":
        return { label: "FREE ENTRY", dotColor: "bg-sky-400" };
      case "invite_only":
        return { label: "INVITE ONLY", dotColor: "bg-purple-400" };
      case "waitlist":
        return { label: "WAITLIST", dotColor: "bg-amber-400" };
    }
  }
  if (!dateInfo) return null;
  return {
    label: dateInfo.statusLabel,
    dotColor: dateInfo.isLive ? "animate-pulse bg-emerald-400" : dateInfo.isPast ? "bg-zinc-400" : "bg-white",
  };
}

/** Physical Event Ticket Pass (Clean Solid Aesthetics) */
function EventTicketCard({ link, accent }: { link: LinkItem; accent: string }) {
  const dateInfo = getEventDateDetails(link.startsAt ?? null, link.endsAt ?? null);
  const statusBadge = getEventStatusBadge(link.status, dateInfo);
  const categoryTag = link.categoryTag?.trim() || "EVENT PASS";
  const passSerial = `#EVT-${String(link.id).padStart(4, "0")}`;
  const ctaText = link.ctaText?.trim() || "Get Pass / RSVP";

  return (
    <a
      href={`/api/click/${link.id}`}
      className="group relative flex w-full flex-col overflow-hidden text-left transition-all duration-200 hover:-translate-y-0.5"
      style={{
        background: "var(--surface)",
        borderRadius: "var(--card-radius)",
        borderWidth: "var(--border-width)",
        borderColor: "color-mix(in srgb, var(--text) 18%, transparent)",
        boxShadow: "var(--card-shadow)",
      }}
    >
      {/* Top Banner / Event Poster Header */}
      <div className="relative h-40 sm:h-44 w-full overflow-hidden bg-muted/40">
        {link.thumbnailKey ? (
          <>
            <img
              src={`/api/thumb/${link.id}`}
              alt=""
              className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-black/35" />
          </>
        ) : (
          <div
            className="relative flex h-full w-full items-center justify-center overflow-hidden"
            style={{ background: "color-mix(in srgb, var(--text) 6%, var(--surface))" }}
          >
            <Ticket className="h-16 w-16 opacity-15" style={{ color: "var(--text)" }} />
          </div>
        )}

        {/* Floating Solid Badges */}
        <div className="absolute inset-x-3.5 top-3.5 flex items-start justify-between gap-2">
          {dateInfo && (
            <div
              className="flex flex-col items-center justify-center px-2.5 py-1 text-white shadow-sm"
              style={{
                background: "#09090b",
                borderRadius: "var(--radius)",
                border: "1px solid rgba(255,255,255,0.2)",
              }}
            >
              <span className="font-mono text-[9px] font-bold tracking-widest uppercase opacity-75">{dateInfo.month}</span>
              <span className="text-base font-black leading-none tracking-tight">{dateInfo.day}</span>
            </div>
          )}

          {statusBadge && (
            <div
              className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold text-white shadow-sm ml-auto"
              style={{
                background: "#09090b",
                borderRadius: "var(--radius)",
                border: "1px solid rgba(255,255,255,0.2)",
              }}
            >
              <span className={cn("h-2 w-2 rounded-full", statusBadge.dotColor)} />
              <span className="font-mono text-[10px] tracking-wider uppercase">{statusBadge.label}</span>
            </div>
          )}
        </div>
      </div>

      {/* Ticket Details Body */}
      <div className="p-5 pb-3">
        <div className="flex items-center justify-between font-mono text-[10px] font-bold tracking-widest uppercase" style={{ color: "var(--muted)" }}>
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-1.5 w-1.5 rounded-full" style={{ background: accent }} />
            <span className="tracking-wider">{categoryTag}</span>
          </span>
          <span className="opacity-70">{passSerial}</span>
        </div>

        <h3
          className="mt-1.5 text-base font-bold tracking-tight transition-colors line-clamp-2"
          style={{ color: "var(--text)", fontFamily: "var(--font-heading)" }}
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
            borderColor: "color-mix(in srgb, var(--text) 18%, transparent)",
          }}
        />
        <div
          className="mx-5 w-full border-t border-dashed"
          style={{ borderColor: "color-mix(in srgb, var(--text) 20%, transparent)" }}
        />
        <div
          className="absolute -right-2.5 h-5 w-5 rounded-full border shadow-inner"
          style={{
            background: "var(--page-bg)",
            borderColor: "color-mix(in srgb, var(--text) 18%, transparent)",
          }}
        />
      </div>

      {/* Ticket Action Footer */}
      <div className="flex items-center justify-between px-5 pb-4 pt-1">
        <div
          className="flex items-center gap-2 font-mono text-[11px] font-semibold tracking-wider uppercase opacity-75"
          style={{ color: "var(--muted)" }}
        >
          <span className="inline-block h-2 w-2 rounded-full" style={{ background: accent }} />
          <span>{statusBadge?.label || "RSVP OPEN"}</span>
        </div>

        <div
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm transition-all duration-150 group-hover:opacity-90"
          style={{
            background: accent,
            borderRadius: "var(--radius)",
          }}
        >
          <span>{ctaText}</span>
          <ArrowUpRight className="h-3.5 w-3.5 transition-transform duration-150 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
        </div>
      </div>
    </a>
  );
}

/** Featured Spotlight Link Card (Solid Crisp Accent) */
function FeaturedLinkCard({ link, accent }: { link: LinkItem; accent: string }) {
  const domain = getDomain(link.url);

  return (
    <a
      href={`/api/click/${link.id}`}
      className="group relative flex w-full flex-col overflow-hidden p-5 text-white transition-all duration-150 hover:-translate-y-0.5"
      style={{
        background: accent,
        borderRadius: "var(--card-radius)",
        borderWidth: "var(--border-width)",
        borderColor: "transparent",
        boxShadow: "var(--card-shadow)",
      }}
    >
      <div className="flex items-center justify-between text-white/85 font-mono text-[10px] font-bold tracking-widest uppercase">
        <span className="flex items-center gap-1.5">
          <Sparkles className="h-3.5 w-3.5" />
          <span>FEATURED SPOTLIGHT</span>
        </span>
        <ArrowUpRight className="h-4 w-4 opacity-85 transition-transform duration-150 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:opacity-100" />
      </div>

      <div className="mt-3 flex items-center gap-3.5">
        {link.thumbnailKey ? (
          <img
            src={`/api/thumb/${link.id}`}
            alt=""
            className="h-12 w-12 shrink-0 object-cover border border-white/30"
            style={{ borderRadius: "var(--radius)" }}
          />
        ) : link.icon ? (
          <div
            className="flex h-11 w-11 shrink-0 items-center justify-center border border-white/30 bg-white/15"
            style={{ borderRadius: "var(--radius)" }}
          >
            <LinkIconBadge icon={link.icon} size={20} />
          </div>
        ) : null}

        <div className="min-w-0 flex-1">
          <h3 className="truncate text-base font-bold tracking-tight" style={{ fontFamily: "var(--font-heading)" }}>
            {link.label}
          </h3>
          {domain && <p className="mt-0.5 font-mono text-xs text-white/80 truncate">{domain}</p>}
        </div>
      </div>
    </a>
  );
}

/** Standard Solid / Bordered Link Card */
function StandardLinkCard({ link, accent }: { link: LinkItem; accent: string }) {
  const domain = getDomain(link.url);

  return (
    <a
      href={`/api/click/${link.id}`}
      className="group relative flex w-full items-center gap-3.5 px-4 py-3.5 text-left transition-all duration-150 hover:-translate-y-0.5"
      style={{
        borderRadius: "var(--card-radius)",
        borderWidth: "var(--border-width)",
        borderColor: "color-mix(in srgb, var(--text) 16%, transparent)",
        color: "var(--text)",
        background: "var(--surface)",
        boxShadow: "var(--card-shadow)",
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLElement).style.borderColor = accent;
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.borderColor = "color-mix(in srgb, var(--text) 16%, transparent)";
      }}
    >
      {link.thumbnailKey ? (
        <img
          src={`/api/thumb/${link.id}`}
          alt=""
          className="h-11 w-11 shrink-0 object-cover border"
          style={{
            borderRadius: "var(--radius)",
            borderColor: "color-mix(in srgb, var(--text) 12%, transparent)",
          }}
        />
      ) : link.icon ? (
        <span
          className="flex h-10 w-10 shrink-0 items-center justify-center border transition-colors"
          style={{
            borderRadius: "var(--radius)",
            background: `color-mix(in srgb, ${accent} 10%, transparent)`,
            borderColor: `color-mix(in srgb, ${accent} 25%, transparent)`,
            color: accent,
          }}
        >
          <LinkIconBadge icon={link.icon} size={18} />
        </span>
      ) : null}

      <div className="min-w-0 flex-1">
        <p className="truncate text-[15px] font-semibold tracking-tight" style={{ fontFamily: "var(--font-heading)" }}>
          {link.label}
        </p>
        {domain && (
          <p className="font-mono text-xs tracking-tight truncate" style={{ color: "var(--muted)" }}>
            {domain}
          </p>
        )}
      </div>

      <div
        className="flex h-7 w-7 shrink-0 items-center justify-center border opacity-50 transition-all duration-150 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:opacity-100"
        style={{
          borderRadius: "var(--radius)",
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
      className="mt-6 flex w-full flex-col items-center gap-3 border border-dashed px-6 py-12 text-center"
      style={{
        borderRadius: "var(--card-radius)",
        borderColor: "color-mix(in srgb, var(--text) 20%, transparent)",
        background: "var(--surface)",
      }}
    >
      <Ticket className="h-8 w-8 opacity-30" style={{ color: accent }} />
      <p className="text-sm font-semibold" style={{ color: "var(--text)", fontFamily: "var(--font-heading)" }}>
        This page is under construction.
      </p>
      <p className="text-xs max-w-xs" style={{ color: "var(--muted)" }}>
        Configure your links, upcoming events, and socials in the admin portal.
      </p>
      <a
        href="/admin"
        className="mt-2 px-4 py-2 text-xs font-semibold text-white shadow-sm transition-transform hover:opacity-90"
        style={{ background: accent, borderRadius: "var(--radius)" }}
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
      className="mt-6 hidden md:flex w-full flex-col items-center gap-3.5 p-4 shadow-sm"
      style={{
        background: "var(--surface)",
        borderRadius: "var(--card-radius)",
        borderWidth: "var(--border-width)",
        borderColor: "color-mix(in srgb, var(--text) 14%, transparent)",
        boxShadow: "var(--card-shadow)",
      }}
    >
      <div className="flex w-full items-center justify-between font-mono text-[10px] font-bold tracking-widest uppercase opacity-70" style={{ color: "var(--muted)" }}>
        <span className="flex items-center gap-1.5">
          <QrCode className="h-3.5 w-3.5" style={{ color: accent }} />
          <span>SCAN ON MOBILE</span>
        </span>
        <span>// CONNECT</span>
      </div>

      <div className="flex items-center gap-4 w-full">
        <div
          className="bg-white p-2 shrink-0 border"
          style={{
            borderRadius: "var(--radius)",
            borderColor: "color-mix(in srgb, var(--text) 12%, transparent)",
          }}
        >
          <div className="h-20 w-20" dangerouslySetInnerHTML={{ __html: svg }} />
        </div>

        <div className="flex flex-1 flex-col gap-2 min-w-0">
          <button
            onClick={copy}
            className="flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-semibold transition-all hover:opacity-85"
            style={{
              borderRadius: "var(--radius)",
              borderWidth: "var(--border-width)",
              borderColor: "color-mix(in srgb, var(--text) 18%, transparent)",
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
              className="flex-1 py-1.5 text-center text-[11px] font-semibold transition-opacity hover:opacity-80 border"
              style={{
                borderRadius: "var(--radius)",
                borderColor: "color-mix(in srgb, var(--text) 15%, transparent)",
                color: "var(--muted)",
              }}
            >
              X
            </a>
            <a
              href={`https://wa.me/?text=${shareUrl}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 py-1.5 text-center text-[11px] font-semibold transition-opacity hover:opacity-80 border"
              style={{
                borderRadius: "var(--radius)",
                borderColor: "color-mix(in srgb, var(--text) 15%, transparent)",
                color: "var(--muted)",
              }}
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

  // Clean, high-precision canvas background (NO color gradients)
  const bg = {
    ...cssVars,
    backgroundColor: "var(--page-bg)",
    backgroundImage: `radial-gradient(circle at 1px 1px, color-mix(in srgb, var(--text) 5%, transparent) 1px, transparent 0)`,
    backgroundSize: "20px 20px",
  } as CSSProperties;

  // Single-column mode for embedded admin preview
  if (embedded) {
    return (
      <main className="relative mx-auto flex w-full max-w-md flex-col items-center px-4 py-8" style={bg}>
        {/* Cover Banner (if set) */}
        {profile.bannerKey && (
          <div
            className="relative mb-[-3rem] h-28 w-full overflow-hidden border shadow-sm"
            style={{
              borderRadius: "var(--card-radius)",
              borderColor: "color-mix(in srgb, var(--text) 14%, transparent)",
            }}
          >
            <img src="/api/banner" alt="" className="h-full w-full object-cover" />
          </div>
        )}

        <Avatar name={profile.orgName} accent={accent} hasAvatar={!!profile.avatarKey} />

        {profile.orgName && (
          <h1
            className="mt-4 text-center text-2xl font-extrabold tracking-tight"
            style={{ color: "var(--text)", fontFamily: "var(--font-heading)" }}
          >
            {profile.orgName}
          </h1>
        )}

        {profile.tagline && (
          <p className="mt-1.5 max-w-xs text-center text-sm leading-relaxed" style={{ color: "var(--muted)" }}>
            {profile.tagline}
          </p>
        )}

        <SocialDock socials={profile.socials} accent={accent} />

        <div className="mt-6 flex w-full flex-col gap-3.5">
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
        <div
          className="relative h-44 sm:h-56 md:h-64 w-full overflow-hidden border-b"
          style={{ borderColor: "color-mix(in srgb, var(--text) 12%, transparent)" }}
        >
          <img src="/api/banner" alt="" className="h-full w-full object-cover" />
        </div>
      )}

      <main className={`relative mx-auto w-full px-5 sm:px-8 py-10 md:py-14 ${profile.bannerKey ? "max-w-5xl -mt-14 sm:-mt-18 md:-mt-20" : "max-w-5xl"}`}>
        {/* Desktop 2-Column Studio Grid */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 lg:gap-12 items-start">
          {/* Left Column: Identity & Profile Studio Card */}
          <div className="md:col-span-5 lg:col-span-5 flex flex-col items-center md:items-start text-center md:text-left md:sticky md:top-8">
            <div
              className="relative flex w-full flex-col items-center md:items-start p-6 sm:p-7 shadow-sm backdrop-blur-md"
              style={{
                background: "var(--surface)",
                borderRadius: "var(--card-radius)",
                borderWidth: "var(--border-width)",
                borderColor: "color-mix(in srgb, var(--text) 14%, transparent)",
                boxShadow: "var(--card-shadow)",
              }}
            >
              <Avatar name={profile.orgName} accent={accent} hasAvatar={!!profile.avatarKey} size="large" />

              {profile.orgName && (
                <h1
                  className="mt-5 text-2xl sm:text-3xl font-extrabold tracking-tight"
                  style={{ color: "var(--text)", fontFamily: "var(--font-heading)" }}
                >
                  {profile.orgName}
                </h1>
              )}

              {profile.tagline && (
                <p className="mt-2 text-sm sm:text-[15px] leading-relaxed font-normal line-clamp-4 max-w-md" style={{ color: "var(--muted)" }}>
                  {profile.tagline}
                </p>
              )}

              <SocialDock socials={profile.socials} accent={accent} />

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
        className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold backdrop-blur-md transition-all hover:-translate-y-0.5"
        style={{
          borderRadius: "var(--radius)",
          borderWidth: "var(--border-width)",
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
        className="flex w-full max-w-xs flex-col items-center gap-4 p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200"
        style={{
          borderRadius: "var(--card-radius)",
          background: "var(--surface)",
          color: "var(--text)",
          borderWidth: "var(--border-width)",
          borderColor: "color-mix(in srgb, var(--text) 18%, transparent)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 font-mono text-[11px] font-bold tracking-widest uppercase" style={{ color: "var(--muted)" }}>
          <Ticket className="h-3.5 w-3.5" style={{ color: accent }} />
          <span>SCAN TO CONNECT</span>
        </div>

        <div
          className="bg-white p-3.5 border shadow-sm"
          style={{
            borderRadius: "var(--radius)",
            borderColor: "color-mix(in srgb, var(--text) 10%, transparent)",
          }}
        >
          <div className="h-44 w-44" dangerouslySetInnerHTML={{ __html: svg }} />
        </div>

        <p className="max-w-full truncate font-mono text-xs opacity-75" style={{ color: "var(--muted)" }}>
          {url}
        </p>

        <div className="flex w-full gap-2">
          <a
            href={`data:image/svg+xml;utf8,${encodeURIComponent(svg)}`}
            download="qr-pass.svg"
            className="flex-1 py-2 text-center text-xs font-bold text-white shadow-sm transition-opacity hover:opacity-90"
            style={{ background: accent, borderRadius: "var(--radius)" }}
          >
            Download SVG
          </a>
          <button
            onClick={() => setOpen(false)}
            className="border px-4 py-2 text-xs font-semibold transition-colors hover:bg-black/5 dark:hover:bg-white/5"
            style={{
              borderRadius: "var(--radius)",
              borderWidth: "var(--border-width)",
              borderColor: "color-mix(in srgb, var(--text) 16%, transparent)",
              color: "var(--muted)",
            }}
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
          className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold backdrop-blur-md transition-all hover:-translate-y-0.5"
          style={{
            borderRadius: "var(--radius)",
            borderWidth: "var(--border-width)",
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
          className="px-3.5 py-1.5 text-xs font-semibold backdrop-blur-md transition-all hover:-translate-y-0.5 border"
          style={{
            borderRadius: "var(--radius)",
            borderWidth: "var(--border-width)",
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
          className="px-3.5 py-1.5 text-xs font-semibold backdrop-blur-md transition-all hover:-translate-y-0.5 border"
          style={{
            borderRadius: "var(--radius)",
            borderWidth: "var(--border-width)",
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
        <div className="h-24 w-24 animate-pulse rounded-2xl bg-muted" />
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