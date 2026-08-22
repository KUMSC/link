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
}

export type ThemeMode = "light" | "dark" | "system";

export interface ThemePalette {
  accent: string;
  surface: string;
  text: string;
  muted: string;
}

export interface Theme {
  preset: string;
  fontFamily: string;
  mode: ThemeMode;
  palette: ThemePalette;
}

export const DEFAULT_THEME: Theme = {
  preset: "minimal",
  fontFamily: "Inter",
  mode: "light",
  palette: { accent: "#6366f1", surface: "#ffffff", text: "#18181b", muted: "#71717a" },
};

export function parseTheme(raw: string | null | undefined): Theme {
  if (!raw) return DEFAULT_THEME;
  try {
    const t = JSON.parse(raw) as Partial<Theme>;
    return {
      preset: t.preset ?? DEFAULT_THEME.preset,
      fontFamily: t.fontFamily ?? DEFAULT_THEME.fontFamily,
      mode: t.mode ?? DEFAULT_THEME.mode,
      palette: {
        accent: t.palette?.accent ?? DEFAULT_THEME.palette.accent,
        surface: t.palette?.surface ?? DEFAULT_THEME.palette.surface,
        text: t.palette?.text ?? DEFAULT_THEME.palette.text,
        muted: t.palette?.muted ?? DEFAULT_THEME.palette.muted,
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
  accentColor: string;
  socials: Social[];
  theme: Theme;
  updatedAt: number;
}

export type LinkKind = "link" | "event";

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