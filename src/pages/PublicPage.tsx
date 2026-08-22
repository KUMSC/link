import { useQuery } from "@tanstack/react-query";
import type { CSSProperties } from "react";
import { ArrowUpRight, Sparkles } from "lucide-react";
import { getPublic } from "../lib/api";
import type { PublicData } from "../lib/types";
import { PlatformIcon } from "../lib/icons";

const ACCENT_DEFAULT = "#6366f1";

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
          className="relative h-28 w-28 rounded-full border-4 border-white object-cover shadow-xl"
        />
      ) : (
        <div
          className="relative flex h-28 w-28 items-center justify-center rounded-full border-4 border-white text-4xl font-extrabold tracking-tight text-white shadow-xl"
          style={{ background: `linear-gradient(135deg, ${accent}, ${accent}bb)` }}
          aria-hidden
        >
          {(name || "?").slice(0, 2).toUpperCase()}
        </div>
      )}
    </div>
  );
}

function SocialRow({ socials, accent }: { socials: PublicData["profile"]["socials"]; accent: string }) {
  if (socials.length === 0) return null;
  return (
    <div className="mt-7 flex flex-wrap items-center justify-center gap-2.5" style={{ "--hover-accent": accent } as CSSProperties}>
      {socials.map((s) => (
        <a
          key={s.platform}
          href={s.url}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={s.platform}
          title={s.platform}
          className="flex h-11 w-11 items-center justify-center rounded-full border border-border/70 bg-card/80 text-muted-foreground shadow-sm backdrop-blur transition-all hover:-translate-y-0.5 hover:border-transparent hover:text-white hover:shadow-lg"
          style={{ ["--hover-accent" as string]: undefined }}
          onMouseEnter={(e) => {
            const el = e.currentTarget as HTMLElement;
            el.style.background = `linear-gradient(135deg, ${accent}, ${accent}cc)`;
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.background = "";
          }}
        >
          <PlatformIcon platform={s.platform} size={19} />
        </a>
      ))}
    </div>
  );
}

function LinkCard({
  link,
  accent,
  featured,
}: {
  link: PublicData["links"][number];
  accent: string;
  featured: boolean;
}) {
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
        <div
          className="absolute inset-0 opacity-0 transition-opacity group-hover:opacity-100"
          style={{ background: "radial-gradient(400px 120px at 50% 0%, rgba(255,255,255,0.22), transparent)" }}
          aria-hidden
        />
      </a>
    );
  }
  return (
    <a
      href={`/api/click/${link.id}`}
      className="group relative flex items-center justify-center gap-2.5 rounded-2xl border border-border/70 bg-card px-6 py-4 text-[15px] font-medium text-card-foreground shadow-sm backdrop-blur transition-all hover:-translate-y-1 hover:border-transparent hover:shadow-xl"
      style={{ ["--hover-accent" as string]: accent }}
      onMouseEnter={(e) => {
        const el = e.currentTarget as HTMLElement;
        el.style.boxShadow = `0 20px 45px -12px ${accent}55`;
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.boxShadow = "";
      }}
    >
      <span>{link.label}</span>
      <ArrowUpRight className="absolute right-5 h-4.5 w-4.5 text-muted-foreground opacity-30 transition-all group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:opacity-100" />
    </a>
  );
}

function EmptyState({ accent }: { accent: string }) {
  return (
    <div className="mt-10 flex w-full flex-col items-center gap-3 rounded-2xl border border-dashed border-border/80 bg-card/50 px-6 py-10 text-center">
      <p className="text-sm font-medium text-muted-foreground">This page isn't set up yet.</p>
      <p className="text-xs text-muted-foreground/70">
        Visit <span className="font-mono" style={{ color: accent }}>/admin</span> to add your name, links and socials.
      </p>
    </div>
  );
}

export default function PublicPage() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["public"],
    queryFn: getPublic,
    staleTime: 5_000,
    refetchOnWindowFocus: true,
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

  const { profile, links } = data;
  const featured = links.filter((l) => l.highlight === 1);
  const regular = links.filter((l) => l.highlight === 0);
  const accent = profile.accentColor || ACCENT_DEFAULT;
  const configured = !!(profile.orgName || links.length > 0 || profile.socials.length > 0);

  const bg = {
    background: `radial-gradient(1100px 480px at 50% -10%, ${accent}1f, transparent 62%), radial-gradient(700px 300px at 85% 108%, ${accent}0f, transparent 60%), var(--background)`,
  } as CSSProperties;

  return (
    <main className="relative mx-auto flex min-h-screen w-full max-w-md flex-col items-center px-6 py-16" style={bg}>
      <Avatar name={profile.orgName} accent={accent} hasAvatar={!!profile.avatarKey} />

      {profile.orgName && (
        <h1 className="mt-6 text-center text-3xl font-bold tracking-tight">{profile.orgName}</h1>
      )}
      {profile.tagline && (
        <p className="mt-2.5 max-w-xs text-center text-[15px] leading-relaxed text-muted-foreground">{profile.tagline}</p>
      )}

      <SocialRow socials={profile.socials} accent={accent} />

      <div className="mt-10 flex w-full flex-col gap-3">
        {featured.map((link) => (
          <LinkCard key={link.id} link={link} accent={accent} featured />
        ))}
        {regular.map((link) => (
          <LinkCard key={link.id} link={link} accent={accent} featured={false} />
        ))}
        {!configured && <EmptyState accent={accent} />}
      </div>
    </main>
  );
}