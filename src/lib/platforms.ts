import type { PlatformId } from "./types";

export const PLATFORM_LABELS: Record<PlatformId, string> = {
  instagram: "Instagram",
  twitter: "X / Twitter",
  linkedin: "LinkedIn",
  github: "GitHub",
  threads: "Threads",
  tiktok: "TikTok",
  facebook: "Facebook",
  youtube: "YouTube",
  whatsapp: "WhatsApp",
  telegram: "Telegram",
  discord: "Discord",
  website: "Website",
};

export const SOCIAL_PLATFORMS: PlatformId[] = [
  "instagram",
  "twitter",
  "linkedin",
  "github",
  "threads",
  "tiktok",
  "facebook",
  "youtube",
  "whatsapp",
  "telegram",
  "discord",
  "website",
];

export function validateUrl(value: string): boolean {
  try {
    const u = new URL(value);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

/** Generic icon ids usable on any link card (lucide names). */
export type LinkIconId = "link" | "mail" | "calendar" | "file" | "book" | "users" | "map" | "star";

export const LINK_ICON_CHOICES: { id: LinkIconId; label: string }[] = [
  { id: "link", label: "Link" },
  { id: "mail", label: "Contact" },
  { id: "calendar", label: "Schedule" },
  { id: "file", label: "Document" },
  { id: "book", label: "Notes" },
  { id: "users", label: "Team" },
  { id: "map", label: "Location" },
  { id: "star", label: "Featured" },
];

/** Social platform ids offered in the link icon picker. */
export const SOCIAL_ICON_CHOICES: PlatformId[] = [
  "instagram",
  "twitter",
  "linkedin",
  "github",
  "youtube",
  "discord",
  "telegram",
  "whatsapp",
];