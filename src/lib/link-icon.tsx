import {
  BookOpen,
  Calendar,
  FileText,
  Link2,
  Mail,
  MapPin,
  Star,
  Users,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { PlatformId } from "./types";
import { PlatformIcon } from "./icons";
import type { LinkIconId } from "./platforms";

const GENERIC: Record<LinkIconId, LucideIcon> = {
  link: Link2,
  mail: Mail,
  calendar: Calendar,
  file: FileText,
  book: BookOpen,
  users: Users,
  map: MapPin,
  star: Star,
};

const PLATFORM_IDS = new Set<string>([
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
]);

/** Renders the icon configured on a link card: a brand icon, a generic one, or nothing. */
export function LinkIconBadge({ icon, size = 18 }: { icon: string | null; size?: number }) {
  if (!icon) return null;
  if (PLATFORM_IDS.has(icon)) {
    return <PlatformIcon platform={icon as PlatformId} size={size} />;
  }
  const Generic = GENERIC[icon as LinkIconId];
  if (!Generic) return null;
  return <Generic className="shrink-0" style={{ width: size, height: size }} />;
}