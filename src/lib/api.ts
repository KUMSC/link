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

export async function getStats(): Promise<import("./types").StatsData> {
  return parse(fetch(`${BASE}/admin/stats`));
}

export async function updateProfile(fields: {
  orgName?: string;
  tagline?: string;
  accentColor?: string;
  socials?: import("./types").Social[];
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

export async function createLink(fields: {
  label: string;
  url: string;
  icon?: string | null;
  highlight?: boolean;
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
  fields: { label?: string; url?: string; icon?: string | null; highlight?: boolean },
): Promise<{ link: import("./types").LinkItem }> {
  return parse(
    fetch(`${BASE}/admin/links/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(fields),
    }),
  );
}

export async function deleteLink(id: number): Promise<void> {
  const res = await fetch(`${BASE}/admin/links/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error("Failed to delete link");
}

export async function reorderLinks(ids: number[]): Promise<void> {
  const res = await fetch(`${BASE}/admin/links/reorder`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ids }),
  });
  if (!res.ok) throw new Error("Failed to reorder links");
}