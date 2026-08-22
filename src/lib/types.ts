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

export interface Profile {
  id: number;
  orgName: string;
  tagline: string;
  avatarKey: string | null;
  accentColor: string;
  socials: Social[];
  updatedAt: number;
}

export interface LinkItem {
  id: number;
  label: string;
  url: string;
  icon: string | null;
  highlight: number;
  sortOrder: number;
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
  date: string;
  clicks: number;
}

export interface StatsData {
  totals: LinkStats[];
  daily: DailyPoint[];
  total: number;
}

export interface AuthInfo {
  email: string;
}

export interface AdminData {
  profile: Profile;
  links: LinkItem[];
  auth: AuthInfo;
}