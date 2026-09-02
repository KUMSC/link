const BASE = "/api";

async function parse<T>(res: Promise<Response>): Promise<T> {
  const response = await res;
  if (!response.ok) {
    let message = response.statusText;
    try {
      const body = (await response.json()) as { error?: string };
      if (body.error) message = body.error;
    } catch {
      /* ignore */
    }
    throw new Error(message);
  }
  return response.json() as Promise<T>;
}

export async function getPublic(): Promise<{ profile: import("./types").Profile; links: import("./types").LinkItem[] }> {
  return parse(fetch(`${BASE}/public`));
}

export async function getAdminData(): Promise<{
  profile: import("./types").Profile;
  links: import("./types").LinkItem[];
  email: string;
}> {
  return parse(fetch(`${BASE}/admin/data`));
}

export async function getStats(rangeDays: number | "all" = 30): Promise<import("./types").StatsData> {
  return parse(fetch(`${BASE}/admin/stats?days=${rangeDays}`));
}

export function statsExportUrl(rangeDays: number | "all" = 30): string {
  return `${BASE}/admin/stats/export?days=${rangeDays}`;
}

export async function updateProfile(fields: {
  orgName?: string;
  tagline?: string;
  accentColor?: string;
  socials?: import("./types").Social[];
  theme?: import("./types").Theme;
}): Promise<{ profile: import("./types").Profile }> {
  return parse(
    fetch(`${BASE}/admin/profile`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(fields),
    }),
  );
}

export async function uploadAvatar(file: File): Promise<{ key: string }> {
  const form = new FormData();
  form.append("avatar", file);
  return parse(
    fetch(`${BASE}/admin/avatar`, {
      method: "POST",
      body: form,
    }),
  );
}

export async function removeAvatar(): Promise<void> {
  const res = await fetch(`${BASE}/admin/avatar`, { method: "DELETE" });
  if (!res.ok) throw new Error("Failed to remove avatar");
}

export async function uploadBanner(file: File): Promise<{ key: string }> {
  const form = new FormData();
  form.append("banner", file);
  return parse(
    fetch(`${BASE}/admin/banner`, {
      method: "POST",
      body: form,
    }),
  );
}

export async function removeBanner(): Promise<void> {
  const res = await fetch(`${BASE}/admin/banner`, { method: "DELETE" });
  if (!res.ok) throw new Error("Failed to remove banner");
}

export async function uploadFavicon(file: File): Promise<{ key: string }> {
  const form = new FormData();
  form.append("favicon", file);
  return parse(
    fetch(`${BASE}/admin/favicon`, {
      method: "POST",
      body: form,
    }),
  );
}

export async function removeFavicon(): Promise<void> {
  const res = await fetch(`${BASE}/admin/favicon`, { method: "DELETE" });
  if (!res.ok) throw new Error("Failed to remove favicon");
}

export async function createLink(fields: {
  label: string;
  url: string;
  icon?: string | null;
  highlight?: boolean;
  kind?: import("./types").LinkKind;
  startsAt?: number | null;
  endsAt?: number | null;
  location?: string | null;
  status?: import("./types").EventStatus | null;
  categoryTag?: string | null;
  ctaText?: string | null;
  publishAt?: number | null;
  expiresAt?: number | null;
  archived?: number;
}): Promise<{ link: import("./types").LinkItem }> {
  return parse(
    fetch(`${BASE}/admin/links`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(fields),
    }),
  );
}

export async function updateLink(
  id: number,
  fields: {
    label?: string;
    url?: string;
    icon?: string | null;
    highlight?: boolean;
    kind?: import("./types").LinkKind;
    startsAt?: number | null;
    endsAt?: number | null;
    location?: string | null;
    status?: import("./types").EventStatus | null;
    categoryTag?: string | null;
    ctaText?: string | null;
    publishAt?: number | null;
    expiresAt?: number | null;
    archived?: number;
  },
): Promise<{ link: import("./types").LinkItem }> {
  return parse(
    fetch(`${BASE}/admin/links/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(fields),
    }),
  );
}

export async function duplicateLink(id: number): Promise<{ link: import("./types").LinkItem }> {
  return parse(
    fetch(`${BASE}/admin/links/${id}/duplicate`, {
      method: "POST",
    }),
  );
}

export async function deleteLink(id: number): Promise<void> {
  const res = await fetch(`${BASE}/admin/links/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error("Failed to delete link");
}

export async function uploadThumbnail(linkId: number, file: File): Promise<{ key: string }> {
  const form = new FormData();
  form.append("thumbnail", file);
  return parse(
    fetch(`${BASE}/admin/links/${linkId}/thumbnail`, {
      method: "POST",
      body: form,
    }),
  );
}

export async function removeThumbnail(linkId: number): Promise<void> {
  const res = await fetch(`${BASE}/admin/links/${linkId}/thumbnail`, { method: "DELETE" });
  if (!res.ok) throw new Error("Failed to remove thumbnail");
}

export async function reorderLinks(ids: number[]): Promise<void> {
  const res = await fetch(`${BASE}/admin/links/reorder`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ids }),
  });
  if (!res.ok) throw new Error("Failed to reorder links");
}

export async function getBackupData(): Promise<import("./types").BackupData> {
  return parse(fetch(`${BASE}/admin/backup`));
}

export async function restoreBackupData(payload: Partial<import("./types").BackupData>): Promise<{ ok: boolean }> {
  return parse(
    fetch(`${BASE}/admin/restore`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }),
  );
}