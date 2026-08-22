import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Check, ImageOff, Loader2, Plus, Trash2 } from "lucide-react";
import { getAdminData, removeAvatar, updateProfile, uploadAvatar } from "../../lib/api";
import { PLATFORM_LABELS, SOCIAL_PLATFORMS, validateUrl } from "../../lib/platforms";
import { FONT_CHOICES, THEME_PRESETS, themeFromPreset } from "../../lib/themes";
import { ThemeProvider } from "../../lib/ThemeContext";
import { PageShell } from "../PublicPage";
import type { PlatformId, Theme, ThemeMode } from "../../lib/types";
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
  orgName: z.string().min(1, "Organization name is required"),
  tagline: z.string().max(120, "Keep it under 120 characters"),
});

type ProfileForm = z.infer<typeof profileSchema>;

interface SocialRow {
  platform: PlatformId;
  url: string;
}

const MODE_LABELS: Record<ThemeMode, string> = { light: "Light", dark: "Dark", system: "System" };

export default function BrandingTab() {
  const { data } = useQuery({ queryKey: ["admin-data"], queryFn: getAdminData });
  const queryClient = useQueryClient();

  const [socials, setSocials] = useState<SocialRow[]>([]);
  const [newPlatform, setNewPlatform] = useState<PlatformId>("instagram");
  const [newUrl, setNewUrl] = useState("");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
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

  const addSocial = () => {
    const url = newUrl.trim();
    if (!validateUrl(url)) {
      toast.error("Enter a valid http(s) URL");
      return;
    }
    setSocials((prev) => [...prev, { platform: newPlatform, url }]);
    setNewUrl("");
  };

    const hasAvatar = !!(avatarPreview || data?.profile.avatarKey);

  // Tracks manual palette edits: mode switching keeps custom colors instead of
  // resetting to the preset's palette for the new mode.
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
      avatarKey: data?.profile.avatarKey ?? null,
      accentColor: draftTheme.palette.accent,
      socials,
      theme: draftTheme,
      updatedAt: Date.now(),
    },
    links: data?.links ?? [],
  };

  return (
    <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,380px)] xl:grid-cols-[minmax(0,1fr)_minmax(0,420px)]">
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
              <Label htmlFor="tagline">Tagline / bio</Label>
              <Textarea id="tagline" placeholder="Latest events, forms & socials" {...form.register("tagline")} />
            </div>
          </CardContent>
        </Card>

        {/* Theme */}
        <Card>
          <CardHeader>
            <CardTitle>Theme</CardTitle>
            <CardAction>
              <SavedBadge />
            </CardAction>
          </CardHeader>
          <CardContent className="flex flex-col gap-6">
            <div className="grid gap-3">
              <Label>Preset</Label>
              <div className="grid grid-cols-3 gap-2">
                {THEME_PRESETS.map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => {
                      paletteDirty.current = false;
                      setDraftTheme((t) => ({ ...themeFromPreset(preset.id, t.mode), fontFamily: t.fontFamily }));
                    }}
                    className={cn(
                      "flex flex-col gap-2 rounded-xl border p-3 text-left transition-colors hover:border-ring",
                      draftTheme.preset === preset.id ? "border-ring ring-1 ring-ring" : "",
                    )}
                  >
                    <span className="flex gap-1">
                      {preset.swatches.map((c) => (
                        <span key={c} className="h-4 w-4 rounded-full" style={{ background: c }} />
                      ))}
                    </span>
                    <span className="text-xs font-medium">{preset.name}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="grid gap-3">
              <Label htmlFor="font">Font</Label>
              <Select value={draftTheme.fontFamily} onValueChange={(v) => setDraftTheme((t) => ({ ...t, fontFamily: v }))}>
                <SelectTrigger id="font">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FONT_CHOICES.map((f) => (
                    <SelectItem key={f.name} value={f.name}>
                      {f.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

                        <div className="grid gap-3">
              <Label>Mode</Label>
              <Tabs
                value={draftTheme.mode}
                onValueChange={(v) =>
                  setDraftTheme((t) => {
                    const mode = v as ThemeMode;
                    // Switching mode adopts the preset's palette for that mode,
                    // unless the user has customized colors (tracked separately).
                    if (paletteDirty.current) return { ...t, mode };
                    return { ...themeFromPreset(t.preset, mode), fontFamily: t.fontFamily };
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

            <div className="grid gap-3">
              <Label>Colors</Label>
              <div className="grid grid-cols-2 gap-3">
                {(
                  [
                    ["accent", "Accent"],
                    ["surface", "Background"],
                    ["text", "Text"],
                    ["muted", "Muted"],
                  ] as const
                ).map(([key, label]) => (
                  <div key={key} className="flex items-center gap-2">
                    <Input
                      type="color"
                      className="h-9 w-10 cursor-pointer p-0.5"
                      value={draftTheme.palette[key]}
                      onChange={(e) => updatePalette(key, e.target.value)}
                      aria-label={label}
                    />
                    <span className="text-xs text-muted-foreground">{label}</span>
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
                className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full text-xl font-bold text-white"
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

        {/* Socials */}
        <Card>
          <CardHeader>
            <CardTitle>Social links</CardTitle>
            <CardAction>
              <SavedBadge />
            </CardAction>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {socials.length === 0 && <p className="text-sm text-muted-foreground">No social links yet.</p>}
            <div className="flex flex-col gap-2">
              {socials.map((s, i) => (
                <div key={`${s.platform}-${i}`} className="flex items-center gap-2">
                  <span className="w-28 text-sm font-medium">{PLATFORM_LABELS[s.platform]}</span>
                  <Input
                    className="flex-1 font-mono text-xs"
                    value={s.url}
                    onChange={(e) => setSocials((prev) => prev.map((x, j) => (j === i ? { ...x, url: e.target.value } : x)))}
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
            <div className="flex items-center gap-2">
              <Select value={newPlatform} onValueChange={(v) => setNewPlatform(v as PlatformId)}>
                <SelectTrigger className="w-40">
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

      {/* Live preview */}
      <div className="lg:sticky lg:top-6 lg:max-h-[calc(100vh-3rem)]">
        <div className="flex h-full flex-col overflow-hidden rounded-2xl border shadow-xl">
          <div className="border-b bg-muted/50 px-4 py-2.5 text-xs font-medium text-muted-foreground">Live preview</div>
          <div className="min-h-[420px] flex-1 lg:overflow-y-auto">
            <ThemeProvider theme={draftTheme}>
              <PageShell data={previewData} interactive={false} embedded />
            </ThemeProvider>
          </div>
        </div>
      </div>
    </div>
  );
}