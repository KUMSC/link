import { useQuery } from "@tanstack/react-query";
import type { CSSProperties } from "react";
import { ArrowUpRight, Star } from "lucide-react";
import { getPublic } from "../lib/api";
import type { PublicData } from "../lib/types";
import { PlatformIcon } from "../lib/icons";

function Avatar({ name, accent, hasAvatar }: { name: string; accent: string; hasAvatar: boolean }) {
  return (
    <div className="relative">
      <div
        className="absolute -inset-2 rounded-full opacity-30 blur-xl"
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
          className="relative flex h-28 w-28 items-center justify-center rounded-full border-4 border-white text-3xl font-bold text-white shadow-xl"
          style={{ background: `linear-gradient(135deg, ${accent}, ${accent}cc)` }}
          aria-hidden
        >
          {name.slice(0, 2).toUpperCase()}
        </div>
      )}
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
        className="group relative flex items-center justify-center gap-2 overflow-hidden rounded-2xl px-5 py-4 text-sm font-semibold text-white shadow-lg transition-all hover:-translate-y-0.5 hover:shadow-xl"
        style={{ background: `linear-gradient(135deg, ${accent}, ${accent}dd)` }}
      >
        <Star className="h-4 w-4" fill="currentColor" />
        <span>{link.label}</span>
        <ArrowUpRight className="absolute right-4 h-4 w-4 opacity-60 transition-all group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:opacity-100" />
      </a>
    );
  }
  return (
    <a
      href={`/api/click/${link.id}`}
      className="group relative flex items-center justify-center gap-2 rounded-2xl border border-border/80 bg-card px-5 py-4 text-sm font-medium text-card-foreground shadow-sm transition-all hover:-translate-y-0.5 hover:border-ring hover:shadow-md"
    >
      <span>{link.label}</span>
      <ArrowUpRight className="absolute right-4 h-4 w-4 text-muted-foreground opacity-40 transition-all group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:opacity-100" />
    </a>
  );
}

export default function PublicPage() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["public"],
    queryFn: getPublic,
  });

  if (isLoading) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-4">
        <div className="h-28 w-28 animate-pulse rounded-full bg-muted" />
        <div className="h-5 w-44 animate-pulse rounded bg-muted" />
      </main>
    );
  }

  if (isError || !data) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-2 text-sm text-muted-foreground">
        <p>Nothing here yet.</p>
      </main>
    );
  }

  const { profile, links } = data;
  const featured = links.filter((l) => l.highlight === 1);
  const regular = links.filter((l) => l.highlight === 0);
  const accent = profile.accentColor;

  const bg = {
    background: `radial-gradient(1200px 500px at 50% -10%, ${accent}1a, transparent 60%), var(--background)`,
  } as CSSProperties;

  return (
    <main className="relative mx-auto flex min-h-screen w-full max-w-md flex-col items-center px-6 py-16" style={bg}>
      <Avatar name={profile.orgName} accent={accent} hasAvatar={!!profile.avatarKey} />

      <h1 className="mt-6 text-center text-3xl font-bold tracking-tight">{profile.orgName}</h1>
      {profile.tagline && (
        <p className="mt-2 max-w-xs text-center text-[15px] leading-relaxed text-muted-foreground">{profile.tagline}</p>
      )}

      {profile.socials.length > 0 && (
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          {profile.socials.map((s) => (
            <a
              key={s.platform}
              href={s.url}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={s.platform}
              className="flex h-11 w-11 items-center justify-center rounded-full border border-border/80 bg-card text-muted-foreground shadow-sm transition-all hover:-translate-y-0.5 hover:border-ring hover:text-foreground hover:shadow-md"
            >
              <PlatformIcon platform={s.platform} size={20} />
            </a>
          ))}
        </div>
      )}

      <div className="mt-10 flex w-full flex-col gap-3">
        {featured.map((link) => (
          <LinkCard key={link.id} link={link} accent={accent} featured />
        ))}
        {regular.map((link) => (
          <LinkCard key={link.id} link={link} accent={accent} featured={false} />
        ))}
      </div>

      <footer className="mt-16 text-xs text-muted-foreground/50">Powered by Club Link</footer>
    </main>
  );
}