export type PlatformId =
  | "instagram"
  | "twitter"
  | "linkedin"
  | "github"
  | "threads"
  | "tiktok"
  | "facebook"
  | "youtube"
  | "whatsapp"
  | "telegram"
  | "discord"
  | "website";

export interface Social {
  platform: PlatformId;
  url: string;
  label?: string;
}

export type RadiusPreset = "none" | "sm" | "md" | "lg" | "full";
export type ShadowPreset = "none" | "subtle" | "hard" | "elevated";
export type BorderWidth = "hairline" | "thin" | "medium" | "thick";
export type ThemeMode = "light" | "dark" | "system";

export interface ThemePalette {
  accent: string;
  surface: string;
  text: string;
  muted: string;
  pageBg?: string;
}

export interface Theme {
  preset: string;
  fontFamily?: string;
  fontHeading: string;
  fontBody: string;
  radius: RadiusPreset;
  shadow: ShadowPreset;
  borderWidth: BorderWidth;
  mode: ThemeMode;
  palette: ThemePalette;
}

export const DEFAULT_THEME: Theme = {
  preset: "swiss",
  fontHeading: "Space Grotesk",
  fontBody: "Inter",
  radius: "sm",
  shadow: "subtle",
  borderWidth: "thin",
  mode: "light",
  palette: {
    accent: "#e11d48",
    surface: "#ffffff",
    text: "#09090b",
    muted: "#71717a",
    pageBg: "#f8f9fa",
  },
};

export function parseTheme(raw: string | null | undefined): Theme {
  if (!raw) return DEFAULT_THEME;
  try {
    const t = JSON.parse(raw) as Partial<Theme> & { fontFamily?: string };
    const fontHeading = t.fontHeading || t.fontFamily || DEFAULT_THEME.fontHeading;
    const fontBody = t.fontBody || t.fontFamily || DEFAULT_THEME.fontBody;
    return {
      preset: t.preset ?? DEFAULT_THEME.preset,
      fontHeading,
      fontBody,
      radius: t.radius ?? DEFAULT_THEME.radius,
      shadow: t.shadow ?? DEFAULT_THEME.shadow,
      borderWidth: t.borderWidth ?? DEFAULT_THEME.borderWidth,
      mode: t.mode ?? DEFAULT_THEME.mode,
      palette: {
        accent: t.palette?.accent ?? DEFAULT_THEME.palette.accent,
        surface: t.palette?.surface ?? DEFAULT_THEME.palette.surface,
        text: t.palette?.text ?? DEFAULT_THEME.palette.text,
        muted: t.palette?.muted ?? DEFAULT_THEME.palette.muted,
        pageBg: t.palette?.pageBg,
      },
    };
  } catch {
    return DEFAULT_THEME;
  }
}

export interface Profile {
  id: number;
  orgName: string;
  tagline: string;
  avatarKey: string | null;
  bannerKey: string | null;
  faviconKey: string | null;
  accentColor: string;
  socials: Social[];
  theme: Theme;
  updatedAt: number;
}

export type LinkKind = "link" | "event";

export type EventStatus =
  | "auto"
  | "open"
  | "closed"
  | "sold_out"
  | "free_entry"
  | "invite_only"
  | "waitlist";

export const EVENT_STATUS_LABELS: Record<EventStatus, string> = {
  auto: "Auto (From Date / Time)",
  open: "RSVP Open (Register Now)",
  closed: "RSVP Closed",
  sold_out: "Sold Out",
  free_entry: "Free Entry (No Ticket)",
  invite_only: "Invite Only",
  waitlist: "Waitlist",
};

export const EVENT_CATEGORY_PRESETS = [
  "WORKSHOP",
  "HACKATHON",
  "MEETUP",
  "FLAGSHIP FEST",
  "WEBINAR",
  "COMPETITION",
  "GUEST TALK",
  "COMMUNITY",
] as const;

export interface LinkItem {
  id: number;
  label: string;
  url: string;
  icon: string | null;
  highlight: number;
  sortOrder: number;
  kind: LinkKind;
  startsAt: number | null;
  endsAt: number | null;
  location: string | null;
  thumbnailKey: string | null;
  status?: EventStatus | null;
  categoryTag?: string | null;
  ctaText?: string | null;
  publishAt?: number | null;
  expiresAt?: number | null;
  archived?: number;
  createdAt: number;
}

export interface PublicData {
  profile: Profile;
  links: LinkItem[];
}

export interface LinkStats {
  linkId: number;
  label: string;
  url: string;
  total: number;
}

export interface DailyPoint {
  day: string;
  clicks: number;
  views: number;
  uniques: number;
}

export interface BreakdownRow {
  key: string;
  count: number;
}

export interface StatsData {
  totals: LinkStats[];
  daily: DailyPoint[];
  total: number;
  views: number;
  uniques: number;
  ctr: number;
  referrers: BreakdownRow[];
  countries: BreakdownRow[];
  devices: BreakdownRow[];
  campaigns?: BreakdownRow[];
  rangeDays: number;
}

export interface AuthInfo {
  email: string;
}

export interface AdminData {
  profile: Profile;
  links: LinkItem[];
  auth: AuthInfo;
}

export interface BackupData {
  version: number;
  exportedAt: number;
  profile: Profile;
  links: LinkItem[];
}