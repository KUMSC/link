import { useQuery } from "@tanstack/react-query";
import type { CSSProperties } from "react";
import { ArrowUpRight, Star } from "lucide-react";
import { getPublic } from "../lib/api";
import type { PublicData } from "../lib/types";
import { PlatformIcon } from "../lib/icons";

function Avatar({ name, accent, hasAvatar }: { name: string; accent: string; hasAvatar: boolean }) {
  if (hasAvatar) {
    return (
      <div className="relative h-24 w-24 overflow-hidden rounded-full ring-4" style={{ "--tw-ring-color": `${accent}33` } as CSSProperties}>
        <img src="/api/avatar" alt={name} className="h-full w-full object-cover" />
      </div>
    );
  }
  return (
    <div
      className="flex h-24 w-24 items-center justify-center rounded-full text-3xl font-bold text-white"
      style={{ background: accent }}
      aria-hidden
    >
      {name.slice(0, 2).toUpperCase()}
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
  return (
    <a
      href={`/api/click/${link.id}`}
      className={`group relative flex items-center justify-center gap-2 rounded-2xl px-5 py-4 text-sm font-medium shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md ${
        featured ? "text-white" : "bg-card text-card-foreground hover:border-ring"
      }`}
      style={
        featured
          ? { background: accent }
          : { border: "1px solid var(--border)" }
      }
    >
      {featured && <Star className="h-4 w-4" fill="currentColor" />}
      <span>{link.label}</span>
      <ArrowUpRight className="h-4 w-4 opacity-40 transition-opacity group-hover:opacity-80" />
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
      <main className="flex min-h-screen flex-col items-center justify-center gap-2 text-sm text-muted-foreground">
        <div className="h-24 w-24 animate-pulse rounded-full bg-muted" />
        <div className="mt-4 h-6 w-40 animate-pulse rounded bg-muted" />
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

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col items-center px-6 py-14">
      <Avatar name={profile.orgName} accent={profile.accentColor} hasAvatar={!!profile.avatarKey} />

      <h1 className="mt-5 text-center text-2xl font-bold tracking-tight">{profile.orgName}</h1>
      {profile.tagline && <p className="mt-1.5 text-center text-sm leading-relaxed text-muted-foreground">{profile.tagline}</p>}

      {profile.socials.length > 0 && (
        <div className="mt-5 flex items-center gap-3">
          {profile.socials.map((s) => (
            <a
              key={s.platform}
              href={s.url}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={s.platform}
              className="flex h-10 w-10 items-center justify-center rounded-full text-muted-foreground transition-colors hover:text-foreground"
            >
              <PlatformIcon platform={s.platform} size={20} />
            </a>
          ))}
        </div>
      )}

      <div className="mt-8 flex w-full flex-col gap-3">
        {featured.map((link) => (
          <LinkCard key={link.id} link={link} accent={profile.accentColor} featured />
        ))}
        {regular.map((link) => (
          <LinkCard key={link.id} link={link} accent={profile.accentColor} featured={false} />
        ))}
      </div>

      <footer className="mt-14 text-xs text-muted-foreground/60">Powered by Club Link</footer>
    </main>
  );
}