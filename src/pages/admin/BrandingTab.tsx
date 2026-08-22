import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Check, Loader2, Plus, Trash2 } from "lucide-react";
import { getAdminData, updateProfile, uploadAvatar } from "../../lib/api";
import { PLATFORM_LABELS, SOCIAL_PLATFORMS, validateUrl } from "../../lib/platforms";
import type { PlatformId } from "../../lib/types";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Textarea } from "../../components/ui/textarea";
import { Separator } from "../../components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select";

const profileSchema = z.object({
  orgName: z.string().min(1, "Organization name is required"),
  tagline: z.string().max(120, "Keep it under 120 characters"),
  accentColor: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Enter a hex color like #6366f1"),
});

type ProfileForm = z.infer<typeof profileSchema>;

interface SocialRow {
  platform: PlatformId;
  url: string;
}

export default function BrandingTab() {
  const { data } = useQuery({ queryKey: ["admin-data"], queryFn: getAdminData });
  const queryClient = useQueryClient();

  const [socials, setSocials] = useState<SocialRow[]>([]);
  const [newPlatform, setNewPlatform] = useState<PlatformId>("instagram");
  const [newUrl, setNewUrl] = useState("");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved">("idle");

  const form = useForm<ProfileForm>({
    resolver: zodResolver(profileSchema),
    defaultValues: { orgName: "", tagline: "", accentColor: "#6366f1" },
    mode: "onChange",
  });

  useEffect(() => {
    if (data) {
      form.reset({
        orgName: data.profile.orgName,
        tagline: data.profile.tagline,
        accentColor: data.profile.accentColor,
      });
      setSocials(data.profile.socials);
      setAvatarPreview(data.profile.avatarKey ? `/api/avatar?v=${data.profile.updatedAt}` : null);
    }
  }, [data, form]);

  const saveMutation = useMutation({
    mutationFn: (values: { orgName: string; tagline: string; accentColor: string; socials: SocialRow[] }) =>
      updateProfile({ ...values, socials: values.socials.filter((s) => s.url.trim()) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-data"] });
      setSaveState("saved");
    },
    onError: (e) => {
      setSaveState("idle");
      toast.error(e instanceof Error ? e.message : "Save failed");
    },
  });

  // Debounced auto-save: watches form values + socials, saves ~800ms after the last change.
  const socialsRef = useRef(socials);
  socialsRef.current = socials;
  const saveStateTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const sub = form.watch(() => {
      if (saveStateTimer.current) clearTimeout(saveStateTimer.current);
      setSaveState("saving");
      saveStateTimer.current = setTimeout(() => {
        const current = form.getValues();
        if (!form.formState.isValid) {
          setSaveState("idle");
          return;
        }
        saveMutation.mutate({
          orgName: current.orgName,
          tagline: current.tagline,
          accentColor: current.accentColor,
          socials: socialsRef.current,
        });
      }, 800);
    });
    return () => sub.unsubscribe();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Socials edits bypass the form, so trigger the same debounced save on change.
  const socialsInitial = useRef(socials);
  useEffect(() => {
    if (socialsInitial.current === socials) {
      socialsInitial.current = socials;
      return;
    }
    socialsInitial.current = socials;
    if (saveStateTimer.current) clearTimeout(saveStateTimer.current);
    setSaveState("saving");
    saveStateTimer.current = setTimeout(() => {
      const current = form.getValues();
      if (!form.formState.isValid) {
        setSaveState("idle");
        return;
      }
      saveMutation.mutate({
        orgName: current.orgName,
        tagline: current.tagline,
        accentColor: current.accentColor,
        socials: socialsRef.current,
      });
    }, 800);
  }, [socials]); // eslint-disable-line react-hooks/exhaustive-deps

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

  const accent = form.watch("accentColor");

  const addSocial = () => {
    const url = newUrl.trim();
    if (!validateUrl(url)) {
      toast.error("Enter a valid http(s) URL");
      return;
    }
    setSocials((prev) => [...prev, { platform: newPlatform, url }]);
    setNewUrl("");
  };

  const SaveIndicator = () => (
    <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
      {saveState === "saving" && (
        <>
          <Loader2 className="h-3.5 w-3.5 animate-spin" /> Saving…
        </>
      )}
      {saveState === "saved" && (
        <>
          <Check className="h-3.5 w-3.5 text-emerald-600" /> Saved
        </>
      )}
    </span>
  );

  return (
    <div className="flex flex-col gap-8">
      {/* Profile */}
      <section className="flex flex-col gap-4 rounded-xl border bg-card p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold">Profile</h2>
          <SaveIndicator />
        </div>
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
        <div className="grid gap-2">
          <Label htmlFor="accent">Accent color</Label>
          <div className="flex items-center gap-3">
            <Input
              id="accent"
              type="color"
              className="h-10 w-16 cursor-pointer p-1"
              {...form.register("accentColor")}
            />
            <Input
              className="w-32 font-mono text-sm"
              value={form.watch("accentColor")}
              onChange={(e) => form.setValue("accentColor", e.target.value)}
            />
          </div>
        </div>
      </section>

      {/* Avatar */}
      <section className="flex flex-col gap-4 rounded-xl border bg-card p-6">
        <h2 className="text-base font-semibold">Avatar</h2>
        <div className="flex items-center gap-4">
          <div
            className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full text-xl font-bold text-white"
            style={{ background: accent }}
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
          <Button
            onClick={() => avatarFile && avatarMutation.mutate(avatarFile)}
            disabled={!avatarFile || avatarMutation.isPending}
          >
            {avatarMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Upload
          </Button>
        </div>
      </section>

      {/* Socials */}
      <section className="flex flex-col gap-4 rounded-xl border bg-card p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold">Social links</h2>
          <SaveIndicator />
        </div>
        {socials.length === 0 && <p className="text-sm text-muted-foreground">No social links yet.</p>}
        <div className="flex flex-col gap-2">
          {socials.map((s, i) => (
            <div key={`${s.platform}-${i}`} className="flex items-center gap-2">
              <span className="w-28 text-sm font-medium">{PLATFORM_LABELS[s.platform]}</span>
              <Input
                className="flex-1 font-mono text-xs"
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
      </section>
    </div>
  );
}