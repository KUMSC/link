import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Check, ImageOff, ImageIcon, Loader2, Plus, Trash2 } from "lucide-react";
import {
  getAdminData,
  removeAvatar,
  removeBanner,
  updateProfile,
  uploadAvatar,
  uploadBanner,
} from "../../lib/api";
import { PLATFORM_LABELS, SOCIAL_PLATFORMS, validateUrl } from "../../lib/platforms";
import {
  BODY_FONT_CHOICES,
  HEADING_FONT_CHOICES,
  THEME_PRESETS,
  themeFromPreset,
} from "../../lib/themes";
import { ThemeProvider } from "../../lib/ThemeContext";
import { PageShell } from "../PublicPage";
import type { BorderWidth, PlatformId, RadiusPreset, ShadowPreset, Theme, ThemeMode } from "../../lib/types";
import { DEFAULT_THEME } from "../../lib/types";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Textarea } from "../../components/ui/textarea";
import { Separator } from "../../components/ui/separator";
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from "../../components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "../../components/ui/tabs";
import { cn } from "../../lib/utils";

const profileSchema = z.object({
  orgName: z.string().min(1, "Organization name is required").max(60, "Keep name under 60 characters"),
  tagline: z.string().max(140, "Tagline must be 140 characters or fewer"),
});

type ProfileForm = z.infer<typeof profileSchema>;

interface SocialRow {
  platform: PlatformId;
  url: string;
  label?: string;
}

const MODE_LABELS: Record<ThemeMode, string> = { light: "Light", dark: "Dark", system: "System" };

const RADIUS_LABELS: Record<RadiusPreset, string> = {
  none: "Sharp (0px)",
  sm: "Subtle (6px)",
  md: "Medium (10px)",
  lg: "Large (16px)",
  full: "Pill (Full)",
};

const SHADOW_LABELS: Record<ShadowPreset, string> = {
  none: "None",
  subtle: "Subtle",
  hard: "Hard Drop",
  elevated: "Elevated",
};

const BORDER_LABELS: Record<BorderWidth, string> = {
  hairline: "Hairline",
  thin: "Thin",
  medium: "Medium",
  thick: "Thick (2px)",
};

export default function BrandingTab() {
  const { data } = useQuery({ queryKey: ["admin-data"], queryFn: getAdminData });
  const queryClient = useQueryClient();

  const [socials, setSocials] = useState<SocialRow[]>([]);
  const [newPlatform, setNewPlatform] = useState<PlatformId>("instagram");
  const [newLabel, setNewLabel] = useState("");
  const [newUrl, setNewUrl] = useState("");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [bannerPreview, setBannerPreview] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [draftTheme, setDraftTheme] = useState<Theme>(DEFAULT_THEME);

  const form = useForm<ProfileForm>({
    resolver: zodResolver(profileSchema),
    defaultValues: { orgName: "", tagline: "" },
    mode: "onChange",
  });

  const hydrated = useRef(false);
  useEffect(() => {
    if (data && !hydrated.current) {
      hydrated.current = true;
      form.reset({ orgName: data.profile.orgName, tagline: data.profile.tagline });
      setSocials(data.profile.socials);
      setDraftTheme(data.profile.theme ?? DEFAULT_THEME);
      setAvatarPreview(data.profile.avatarKey ? `/api/avatar?v=${data.profile.updatedAt}` : null);
      setBannerPreview(data.profile.bannerKey ? `/api/banner?v=${data.profile.updatedAt}` : null);
    }
  }, [data, form]);

  const saveMutation = useMutation({
    mutationFn: (values: { orgName: string; tagline: string; socials: SocialRow[]; theme: Theme }) =>
      updateProfile({
        orgName: values.orgName,
        tagline: values.tagline,
        socials: values.socials.filter((s) => s.url.trim()),
        theme: values.theme,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-data"] });
      setSavedAt(Date.now());
      toast.success("Saved");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Save failed"),
  });

  const saveAll = () => {
    const current = form.getValues();
    if (!current.orgName.trim()) {
      toast.error("Organization name is required");
      return;
    }
    saveMutation.mutate({ orgName: current.orgName, tagline: current.tagline, socials, theme: draftTheme });
  };

  const avatarMutation = useMutation({
    mutationFn: uploadAvatar,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-data"] });
      toast.success("Avatar uploaded");
      setAvatarFile(null);
      setAvatarPreview(null);
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Upload failed"),
  });

  const avatarRemoveMutation = useMutation({
    mutationFn: removeAvatar,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-data"] });
      toast.success("Avatar removed");
      setAvatarFile(null);
      setAvatarPreview(null);
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Remove failed"),
  });

  const bannerMutation = useMutation({
    mutationFn: uploadBanner,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-data"] });
      toast.success("Cover banner uploaded");
      setBannerFile(null);
      setBannerPreview(null);
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Banner upload failed"),
  });

  const bannerRemoveMutation = useMutation({
    mutationFn: removeBanner,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-data"] });
      toast.success("Cover banner removed");
      setBannerFile(null);
      setBannerPreview(null);
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Banner removal failed"),
  });

  const addSocial = () => {
    const url = newUrl.trim();
    if (!validateUrl(url)) {
      toast.error("Enter a valid http(s) URL");
      return;
    }
    const label = newLabel.trim() || undefined;
    setSocials((prev) => [...prev, { platform: newPlatform, url, label }]);
    setNewUrl("");
    setNewLabel("");
  };

  const hasAvatar = !!(avatarPreview || data?.profile.avatarKey);
  const hasBanner = !!(bannerPreview || data?.profile.bannerKey);

  const paletteDirty = useRef(false);

  const updatePalette = (key: keyof Theme["palette"], value: string) => {
    paletteDirty.current = true;
    setDraftTheme((t) => ({ ...t, palette: { ...t.palette, [key]: value } }));
  };

  const SavedBadge = () => {
    if (!savedAt) return null;
    return (
      <span className="flex items-center gap-1.5 text-xs text-emerald-600">
        <Check className="h-3.5 w-3.5" /> Saved
      </span>
    );
  };

  const previewData = {
    profile: {
      id: 1,
      orgName: form.watch("orgName") || "Your organization",
      tagline: form.watch("tagline") || "Tagline goes here",
      avatarKey: avatarPreview ? "preview" : (data?.profile.avatarKey ?? null),
      bannerKey: bannerPreview ? "preview" : (data?.profile.bannerKey ?? null),
      accentColor: draftTheme.palette.accent,
      socials,
      theme: draftTheme,
      updatedAt: Date.now(),
    },
    links: data?.links ?? [],
  };

  return (
    <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,380px)] xl:grid-cols-[minmax(0,1fr)_minmax(0,440px)]">
      <div className="flex min-w-0 flex-col gap-6">
        {/* Profile */}
        <Card>
          <CardHeader>
            <CardTitle>Profile</CardTitle>
            <CardAction>
              <SavedBadge />
            </CardAction>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="grid gap-2">
              <Label htmlFor="orgName">Organization name</Label>
              <Input id="orgName" placeholder="Your organization" {...form.register("orgName")} />
              {form.formState.errors.orgName && (
                <p className="text-xs text-destructive">{form.formState.errors.orgName.message}</p>
              )}
            </div>
            <div className="grid gap-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="tagline">Tagline / Bio</Label>
                <span
                  className={cn(
                    "font-mono text-[10px]",
                    (form.watch("tagline") || "").length >= 140 ? "text-destructive font-bold" : "text-muted-foreground",
                  )}
                >
                  {(form.watch("tagline") || "").length} / 140
                </span>
              </div>
              <Textarea
                id="tagline"
                maxLength={140}
                rows={3}
                placeholder="Latest events, forms & socials"
                {...form.register("tagline")}
              />
              {form.formState.errors.tagline && (
                <p className="text-xs text-destructive">{form.formState.errors.tagline.message}</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Theme & Design System */}
        <Card>
          <CardHeader>
            <CardTitle>Theme & Design Language</CardTitle>
            <CardAction>
              <SavedBadge />
            </CardAction>
          </CardHeader>
          <CardContent className="flex flex-col gap-6">
            {/* Presets */}
            <div className="grid gap-3">
              <div className="flex items-center justify-between">
                <Label>Style Preset</Label>
                <span className="text-[11px] text-muted-foreground">Changes colors, fonts & shapes</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {THEME_PRESETS.map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => {
                      paletteDirty.current = false;
                      setDraftTheme(themeFromPreset(preset.id, draftTheme.mode));
                    }}
                    className={cn(
                      "flex flex-col gap-2 rounded-xl border p-3 text-left transition-all hover:border-ring",
                      draftTheme.preset === preset.id ? "border-ring ring-2 ring-ring/20 bg-muted/30" : "bg-card",
                    )}
                  >
                    <span className="flex gap-1.5 items-center">
                      {preset.swatches.map((c) => (
                        <span key={c} className="h-3.5 w-3.5 rounded-full border border-black/10 shadow-xs" style={{ background: c }} />
                      ))}
                    </span>
                    <div className="min-w-0">
                      <span className="text-xs font-semibold block truncate">{preset.name}</span>
                      <span className="text-[10px] text-muted-foreground block truncate leading-tight mt-0.5">{preset.defaults.fontHeading}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <Separator />

            {/* Typography Selection (Heading vs Body) */}
            <div className="grid gap-4">
              <Label className="text-sm font-semibold">Typography</Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="fontHeading" className="text-xs text-muted-foreground">Title / Heading Font</Label>
                  <Select
                    value={draftTheme.fontHeading || "Space Grotesk"}
                    onValueChange={(v) => setDraftTheme((t) => ({ ...t, fontHeading: v }))}
                  >
                    <SelectTrigger id="fontHeading">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {HEADING_FONT_CHOICES.map((f) => (
                        <SelectItem key={f.name} value={f.name}>
                          {f.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="fontBody" className="text-xs text-muted-foreground">Body & Subtitle Font</Label>
                  <Select
                    value={draftTheme.fontBody || "Inter"}
                    onValueChange={(v) => setDraftTheme((t) => ({ ...t, fontBody: v }))}
                  >
                    <SelectTrigger id="fontBody">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {BODY_FONT_CHOICES.map((f) => (
                        <SelectItem key={f.name} value={f.name}>
                          {f.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <Separator />

            {/* Shape & Geometry Tokens */}
            <div className="grid gap-4">
              <Label className="text-sm font-semibold">Shapes & Styling</Label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Roundness */}
                <div className="grid gap-2">
                  <Label htmlFor="radius" className="text-xs text-muted-foreground">Corner Roundness</Label>
                  <Select
                    value={draftTheme.radius || "sm"}
                    onValueChange={(v) => setDraftTheme((t) => ({ ...t, radius: v as RadiusPreset }))}
                  >
                    <SelectTrigger id="radius">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(Object.keys(RADIUS_LABELS) as RadiusPreset[]).map((r) => (
                        <SelectItem key={r} value={r}>
                          {RADIUS_LABELS[r]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Shadow */}
                <div className="grid gap-2">
                  <Label htmlFor="shadow" className="text-xs text-muted-foreground">Elevation / Shadow</Label>
                  <Select
                    value={draftTheme.shadow || "subtle"}
                    onValueChange={(v) => setDraftTheme((t) => ({ ...t, shadow: v as ShadowPreset }))}
                  >
                    <SelectTrigger id="shadow">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(Object.keys(SHADOW_LABELS) as ShadowPreset[]).map((s) => (
                        <SelectItem key={s} value={s}>
                          {SHADOW_LABELS[s]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Border Width */}
                <div className="grid gap-2">
                  <Label htmlFor="borderWidth" className="text-xs text-muted-foreground">Border Thickness</Label>
                  <Select
                    value={draftTheme.borderWidth || "thin"}
                    onValueChange={(v) => setDraftTheme((t) => ({ ...t, borderWidth: v as BorderWidth }))}
                  >
                    <SelectTrigger id="borderWidth">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(Object.keys(BORDER_LABELS) as BorderWidth[]).map((b) => (
                        <SelectItem key={b} value={b}>
                          {BORDER_LABELS[b]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <Separator />

            {/* Mode Switcher */}
            <div className="grid gap-3">
              <Label className="text-sm font-semibold">Appearance Mode</Label>
              <Tabs
                value={draftTheme.mode}
                onValueChange={(v) =>
                  setDraftTheme((t) => {
                    const mode = v as ThemeMode;
                    if (paletteDirty.current) return { ...t, mode };
                    return themeFromPreset(t.preset, mode, {
                      fontHeading: t.fontHeading,
                      fontBody: t.fontBody,
                      radius: t.radius,
                      shadow: t.shadow,
                      borderWidth: t.borderWidth,
                    });
                  })
                }
              >
                <TabsList>
                  {(Object.keys(MODE_LABELS) as ThemeMode[]).map((mode) => (
                    <TabsTrigger key={mode} value={mode}>
                      {MODE_LABELS[mode]}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </Tabs>
            </div>

            {/* Solid Colors */}
            <div className="grid gap-3">
              <Label className="text-sm font-semibold">Solid Palette</Label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {(
                  [
                    ["accent", "Accent Color"],
                    ["surface", "Card Surface"],
                    ["text", "Text & Titles"],
                    ["muted", "Muted Subtitles"],
                    ["pageBg", "Canvas Background"],
                  ] as const
                ).map(([key, label]) => (
                  <div key={key} className="flex items-center gap-2.5 rounded-xl border p-2 bg-card">
                    <Input
                      type="color"
                      className="h-8 w-9 cursor-pointer p-0.5 rounded-lg border"
                      value={draftTheme.palette[key] || (key === "pageBg" ? "#f8f9fa" : "#ffffff")}
                      onChange={(e) => updatePalette(key, e.target.value)}
                      aria-label={label}
                    />
                    <div className="min-w-0">
                      <span className="text-xs font-medium block truncate">{label}</span>
                      <span className="font-mono text-[10px] text-muted-foreground block truncate uppercase">
                        {draftTheme.palette[key] || "auto"}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Avatar */}
        <Card>
          <CardHeader>
            <CardTitle>Avatar</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <div
                className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl text-xl font-bold text-white shadow-sm"
                style={{ background: draftTheme.palette.accent }}
              >
                {avatarPreview ? (
                  <img src={avatarPreview} alt="Avatar preview" className="h-full w-full object-cover" />
                ) : (
                  (form.watch("orgName") || "?").slice(0, 2).toUpperCase()
                )}
              </div>
              <label className="flex-1">
                <Input
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/avif"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    if (file.size > 5 * 1024 * 1024) {
                      toast.error("Image must be under 5MB");
                      return;
                    }
                    setAvatarFile(file);
                    setAvatarPreview(URL.createObjectURL(file));
                  }}
                />
              </label>
              <Button onClick={() => avatarFile && avatarMutation.mutate(avatarFile)} disabled={!avatarFile || avatarMutation.isPending}>
                {avatarMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                Upload
              </Button>
              {hasAvatar && (
                <Button
                  variant="outline"
                  onClick={() => avatarRemoveMutation.mutate()}
                  disabled={avatarRemoveMutation.isPending}
                  aria-label="Remove avatar"
                >
                  {avatarRemoveMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImageOff className="h-4 w-4" />}
                  Remove
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Cover Banner */}
        <Card>
          <CardHeader>
            <CardTitle>Cover Banner</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div
              className="relative flex h-28 w-full items-center justify-center overflow-hidden rounded-xl border bg-muted/40"
              style={{ borderColor: "color-mix(in srgb, var(--text) 12%, transparent)" }}
            >
              {bannerPreview ? (
                <img src={bannerPreview} alt="Banner preview" className="h-full w-full object-cover" />
              ) : (
                <div className="flex items-center gap-2 text-xs font-mono tracking-wider uppercase text-muted-foreground">
                  <ImageIcon className="h-4 w-4" />
                  <span>No banner uploaded</span>
                </div>
              )}
            </div>
            <div className="flex items-center gap-3">
              <label className="flex-1">
                <Input
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/avif"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    if (file.size > 5 * 1024 * 1024) {
                      toast.error("Image must be under 5MB");
                      return;
                    }
                    setBannerFile(file);
                    setBannerPreview(URL.createObjectURL(file));
                  }}
                />
              </label>
              <Button onClick={() => bannerFile && bannerMutation.mutate(bannerFile)} disabled={!bannerFile || bannerMutation.isPending}>
                {bannerMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                Upload
              </Button>
              {hasBanner && (
                <Button
                  variant="outline"
                  onClick={() => bannerRemoveMutation.mutate()}
                  disabled={bannerRemoveMutation.isPending}
                  aria-label="Remove banner"
                >
                  {bannerRemoveMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImageOff className="h-4 w-4" />}
                  Remove
                </Button>
              )}
            </div>
            <p className="text-[11px] text-muted-foreground">Recommended 1200×400 or 16:9 • Displayed at the top of your public page</p>
          </CardContent>
        </Card>

        {/* Socials & Sub-Accounts */}
        <Card>
          <CardHeader>
            <div className="flex flex-col gap-1">
              <CardTitle>Social Links & Sub-Accounts</CardTitle>
              <p className="text-xs text-muted-foreground">Add official club handles and sub-accounts (e.g. Magazine, Events, Hackfest).</p>
            </div>
            <CardAction>
              <SavedBadge />
            </CardAction>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {socials.length === 0 && <p className="text-sm text-muted-foreground">No social links yet.</p>}
            <div className="flex flex-col gap-2.5">
              {socials.map((s, i) => (
                <div key={i} className="flex flex-wrap sm:flex-nowrap items-center gap-2 rounded-xl border p-2 bg-card">
                  <span className="w-24 shrink-0 text-xs font-semibold text-foreground truncate">{PLATFORM_LABELS[s.platform]}</span>
                  <Input
                    className="w-full sm:w-36 text-xs"
                    placeholder="Label (e.g. Main, Fest)"
                    value={s.label ?? ""}
                    onChange={(e) =>
                      setSocials((prev) =>
                        prev.map((x, j) => (j === i ? { ...x, label: e.target.value || undefined } : x)),
                      )
                    }
                  />
                  <Input
                    className="flex-1 font-mono text-xs"
                    placeholder="https://..."
                    value={s.url}
                    onChange={(e) =>
                      setSocials((prev) => prev.map((x, j) => (j === i ? { ...x, url: e.target.value } : x)))
                    }
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setSocials((prev) => prev.filter((_, j) => j !== i))}
                    aria-label={`Remove ${PLATFORM_LABELS[s.platform]}`}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              ))}
            </div>
            <Separator />
            <div className="flex flex-wrap sm:flex-nowrap items-center gap-2">
              <Select value={newPlatform} onValueChange={(v) => setNewPlatform(v as PlatformId)}>
                <SelectTrigger className="w-full sm:w-36">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SOCIAL_PLATFORMS.map((p) => (
                    <SelectItem key={p} value={p}>
                      {PLATFORM_LABELS[p]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                className="w-full sm:w-36 text-xs"
                placeholder="Label (optional)"
                value={newLabel}
                onChange={(e) => setNewLabel(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addSocial()}
              />
              <Input
                className="flex-1 font-mono text-xs"
                placeholder="https://instagram.com/yourhandle"
                value={newUrl}
                onChange={(e) => setNewUrl(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addSocial()}
              />
              <Button variant="outline" size="icon" onClick={addSocial} aria-label="Add social link">
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Save */}
        <div className="flex items-center justify-end gap-3">
          <SavedBadge />
          <Button onClick={saveAll} disabled={saveMutation.isPending}>
            {saveMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Save profile
          </Button>
        </div>
      </div>

      {/* Scrollable Live Preview */}
      <div className="lg:sticky lg:top-6">
        <div className="flex h-[84vh] max-h-[860px] min-h-[520px] flex-col overflow-hidden rounded-2xl border shadow-xl bg-background">
          <div className="flex items-center justify-between border-b bg-muted/40 px-4 py-2.5 text-xs font-medium text-muted-foreground">
            <span className="font-semibold">Live Preview</span>
            <span className="font-mono text-[10px] uppercase opacity-75">Scrollable Frame</span>
          </div>
          <div className="flex-1 overflow-y-auto overscroll-contain">
            <ThemeProvider theme={draftTheme}>
              <PageShell data={previewData} interactive={false} embedded />
            </ThemeProvider>
          </div>
        </div>
      </div>
    </div>
  );
}