import { useQuery } from "@tanstack/react-query";
import type { PublicData } from "../lib/types";

export default function PublicPage() {
  const { data, isLoading, isError } = useQuery<PublicData>({
    queryKey: ["public"],
    queryFn: () => fetch("/api/public").then((r) => r.json()),
  });

  if (isLoading) return <div className="grid min-h-screen place-items-center text-sm text-muted-foreground">Loading…</div>;
  if (isError || !data) return <div className="grid min-h-screen place-items-center text-sm text-muted-foreground">Nothing here yet.</div>;

  const { profile, links } = data;

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col items-center px-4 py-12">
      <div
        className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-full text-2xl font-bold text-white"
        style={{ background: profile.accentColor }}
      >
        {profile.avatarKey ? (
          <img src="/api/avatar" alt={profile.orgName} className="h-full w-full object-cover" />
        ) : (
          profile.orgName.slice(0, 2).toUpperCase()
        )}
      </div>
      <h1 className="mt-4 text-2xl font-bold">{profile.orgName}</h1>
      {profile.tagline && <p className="mt-1 text-center text-sm text-muted-foreground">{profile.tagline}</p>}

      <div className="mt-6 flex w-full flex-col gap-3">
        {links.map((link) => (
          <a
            key={link.id}
            href={`/api/click/${link.id}`}
            className="rounded-xl border bg-card p-4 text-center font-medium shadow-sm transition hover:border-ring hover:shadow-md"
            style={link.highlight ? { borderColor: profile.accentColor, color: profile.accentColor } : undefined}
          >
            {link.label}
          </a>
        ))}
      </div>
    </main>
  );
}