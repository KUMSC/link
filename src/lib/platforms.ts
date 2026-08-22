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