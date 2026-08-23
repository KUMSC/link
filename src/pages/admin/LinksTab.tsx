import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import {
  Archive,
  ArrowDown,
  ArrowUp,
  Ban,
  CalendarClock,
  Clock,
  Copy,
  ImagePlus,
  Link as LinkIcon,
  Pencil,
  Plus,
  Star,
  Trash2,
} from "lucide-react";
import {
  createLink,
  deleteLink,
  duplicateLink,
  getAdminData,
  removeThumbnail,
  reorderLinks,
  updateLink,
  uploadThumbnail,
} from "../../lib/api";
import { LINK_ICON_CHOICES, SOCIAL_ICON_CHOICES, validateUrl } from "../../lib/platforms";
import { LinkIconBadge } from "../../lib/link-icon";
import { cn } from "../../lib/utils";
import type { EventStatus, LinkItem, LinkKind } from "../../lib/types";
import { EVENT_CATEGORY_PRESETS, EVENT_STATUS_LABELS } from "../../lib/types";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Switch } from "../../components/ui/switch";
import { Badge } from "../../components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../../components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../components/ui/table";
import { Card, CardContent } from "../../components/ui/card";

const linkSchema = z
  .object({
    label: z.string().min(1, "Label is required"),
    url: z.string().min(1, "URL is required").refine(validateUrl, "Enter a valid http(s) URL"),
    highlight: z.boolean(),
    kind: z.enum(["link", "event"]),
    icon: z.string().nullable(),
    startsAt: z.string().optional(),
    endsAt: z.string().optional(),
    location: z.string().optional(),
    status: z.enum(["auto", "open", "closed", "sold_out", "free_entry", "invite_only", "waitlist"]).optional(),
    categoryTag: z.string().optional(),
    ctaText: z.string().optional(),
    publishAt: z.string().optional(),
    expiresAt: z.string().optional(),
    archived: z.boolean().optional(),
  })
  .superRefine((v, ctx) => {
    if (v.kind === "event" && !v.startsAt && !v.endsAt) {
      ctx.addIssue({ code: "custom", path: ["startsAt"], message: "Add a start or end time for the event" });
    }
  });

type LinkForm = z.infer<typeof linkSchema>;

function toUnix(datetimeLocal: string | undefined): number | null {
  if (!datetimeLocal) return null;
  const d = new Date(datetimeLocal);
  return Number.isNaN(d.getTime()) ? null : Math.floor(d.getTime() / 1000);
}

function toLocal(value: number | null | undefined): string {
  if (!value) return "";
  const d = new Date(value * 1000);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function LinkEditor({
  open,
  onOpenChange,
  editing,
  accent,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing: LinkItem | null;
  accent: string;
}) {
  const queryClient = useQueryClient();
  const kind = editing?.kind ?? "link";
  const form = useForm<LinkForm>({
    resolver: zodResolver(linkSchema),
    defaultValues: {
      label: "",
      url: "",
      highlight: false,
      kind: "link",
      icon: null,
      status: "auto",
      categoryTag: "",
      ctaText: "",
      publishAt: "",
      expiresAt: "",
      archived: false,
    },
  });
  const [thumbFile, setThumbFile] = useState<File | null>(null);
  const [thumbPreview, setThumbPreview] = useState<string | null>(null);
  const thumbRemoved = useRef(false);

  useEffect(() => {
    if (open) {
      form.reset({
        label: editing?.label ?? "",
        url: editing?.url ?? "",
        highlight: editing?.highlight === 1,
        kind: editing?.kind ?? "link",
        icon: editing?.icon ?? null,
        startsAt: toLocal(editing?.startsAt),
        endsAt: toLocal(editing?.endsAt),
        location: editing?.location ?? "",
        status: editing?.status ?? "auto",
        categoryTag: editing?.categoryTag ?? "",
        ctaText: editing?.ctaText ?? "",
        publishAt: toLocal(editing?.publishAt),
        expiresAt: toLocal(editing?.expiresAt),
        archived: editing?.archived === 1,
      });
      setThumbFile(null);
      setThumbPreview(editing?.thumbnailKey ? `/api/thumb/${editing.id}` : null);
      thumbRemoved.current = false;
    }
  }, [open, editing, form]);

  const watchedKind = form.watch("kind");
  const hasThumb = !!(thumbPreview || (editing?.thumbnailKey && !thumbRemoved.current));

  const pickThumb = (file: File | undefined) => {
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be under 5MB");
      return;
    }
    setThumbFile(file);
    setThumbPreview(URL.createObjectURL(file));
    thumbRemoved.current = false;
  };

  const clearThumb = () => {
    setThumbFile(null);
    setThumbPreview(null);
    thumbRemoved.current = true;
  };

  const mutation = useMutation({
    mutationFn: async (values: LinkForm) => {
      const payload = {
        label: values.label,
        url: values.url,
        highlight: values.highlight,
        kind: values.kind,
        icon: values.icon,
        startsAt: toUnix(values.startsAt),
        endsAt: toUnix(values.endsAt),
        location: values.location?.trim() || null,
        status: values.status ?? "auto",
        categoryTag: values.categoryTag?.trim() || null,
        ctaText: values.ctaText?.trim() || null,
        publishAt: toUnix(values.publishAt),
        expiresAt: toUnix(values.expiresAt),
        archived: values.archived ? 1 : 0,
      };
      const result = editing ? await updateLink(editing.id, payload) : await createLink(payload);
      // Thumbnail follows the link row: upload a newly picked file, or remove
      // an existing one when the user cleared it.
      const id = result.link.id;
      if (thumbFile) {
        await uploadThumbnail(id, thumbFile);
      } else if (thumbRemoved.current && editing?.thumbnailKey) {
        await removeThumbnail(id);
      }
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-data"] });
      toast.success(editing ? "Link updated" : "Link added");
      onOpenChange(false);
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed to save link"),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editing ? "Edit item" : "Add item"}</DialogTitle>
          <DialogDescription>Links open externally; event passes show custom badge, dates, place & RSVP status.</DialogDescription>
        </DialogHeader>
        <form onSubmit={form.handleSubmit((v) => mutation.mutate(v))} className="flex flex-col gap-4">
          <div className="grid gap-2">
            <Label htmlFor="kind">Type</Label>
            <Select value={watchedKind} onValueChange={(v) => form.setValue("kind", v as LinkKind, { shouldValidate: true })}>
              <SelectTrigger id="kind">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="link">Standard Link</SelectItem>
                <SelectItem value="event">Event Pass / Ticket</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="label">Title / Event Name</Label>
            <Input id="label" placeholder={watchedKind === "event" ? "Tech Summit 2026" : "Official Website"} {...form.register("label")} />
            {form.formState.errors.label && (
              <p className="text-xs text-destructive">{form.formState.errors.label.message}</p>
            )}
          </div>
          <div className="grid gap-2">
            <Label htmlFor="url">Destination / RSVP URL</Label>
            <Input id="url" placeholder="https://..." {...form.register("url")} />
            {form.formState.errors.url && (
              <p className="text-xs text-destructive">{form.formState.errors.url.message}</p>
            )}
          </div>

          {/* Thumbnail / Poster */}
          <div className="flex items-center gap-3 rounded-lg border p-3">
            <div
              className="flex h-14 w-20 shrink-0 items-center justify-center overflow-hidden rounded-md border"
              style={{ background: "var(--muted, oklch(0.97 0 0))" }}
              aria-hidden
            >
              {thumbPreview ? (
                <img src={thumbPreview} alt="" className="h-full w-full object-cover" />
              ) : (
                <ImagePlus className="h-5 w-5 text-muted-foreground" />
              )}
            </div>
            <div className="flex flex-1 flex-col gap-1.5">
              <p className="text-sm font-medium">{watchedKind === "event" ? "Event Poster / Cover" : "Thumbnail"}</p>
              <label className="cursor-pointer text-xs font-medium text-muted-foreground underline-offset-2 hover:underline">
                {hasThumb ? "Replace image" : "Choose image"}
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/avif"
                  className="sr-only"
                  onChange={(e) => pickThumb(e.target.files?.[0])}
                />
              </label>
              <p className="text-[11px] text-muted-foreground">PNG/JPG/WebP · up to 5MB · shown on top of the card</p>
            </div>
            {hasThumb && (
              <Button type="button" variant="outline" size="icon" onClick={clearThumb} aria-label="Remove thumbnail">
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            )}
          </div>

          {watchedKind === "event" && (
            <div className="grid gap-3.5 rounded-xl border p-3.5 bg-muted/20">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold font-mono tracking-wider uppercase text-foreground">Event Pass Customization</span>
              </div>

              {/* RSVP Status */}
              <div className="grid gap-2">
                <Label htmlFor="status">RSVP / Registration Status</Label>
                <Select
                  value={form.watch("status") || "auto"}
                  onValueChange={(v) => form.setValue("status", v as EventStatus)}
                >
                  <SelectTrigger id="status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.keys(EVENT_STATUS_LABELS) as EventStatus[]).map((st) => (
                      <SelectItem key={st} value={st}>
                        {EVENT_STATUS_LABELS[st]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Category / Badge */}
              <div className="grid gap-2">
                <Label htmlFor="categoryTag">Badge / Category Tag</Label>
                <div className="flex flex-wrap gap-1.5 mb-1">
                  {EVENT_CATEGORY_PRESETS.map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => form.setValue("categoryTag", cat)}
                      className={cn(
                        "rounded-md border px-2 py-0.5 text-[10px] font-mono font-semibold transition-colors",
                        form.watch("categoryTag") === cat
                          ? "bg-foreground text-background border-foreground"
                          : "bg-background text-muted-foreground hover:border-foreground",
                      )}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
                <Input
                  id="categoryTag"
                  placeholder="e.g. WORKSHOP, HACKATHON, #EVT-01"
                  {...form.register("categoryTag")}
                />
              </div>

              {/* CTA Button Text */}
              <div className="grid gap-2">
                <Label htmlFor="ctaText">Action Button Text</Label>
                <Input
                  id="ctaText"
                  placeholder="Default: Get Pass / RSVP (or e.g. Register Free, Join Discord)"
                  {...form.register("ctaText")}
                />
              </div>

              {/* Timing & Location */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="grid gap-2">
                  <Label htmlFor="startsAt">Starts at</Label>
                  <Input id="startsAt" type="datetime-local" {...form.register("startsAt")} />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="endsAt">Ends at</Label>
                  <Input id="endsAt" type="datetime-local" {...form.register("endsAt")} />
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="location">Location / Venue</Label>
                <Input id="location" placeholder="Auditorium / Discord Stage / Zoom" {...form.register("location")} />
              </div>
              {form.formState.errors.startsAt && (
                <p className="text-xs text-destructive">{form.formState.errors.startsAt.message}</p>
              )}
            </div>
          )}

          {/* Icon */}
          <div className="grid gap-2">
            <Label>Icon</Label>
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => form.setValue("icon", null)}
                className={cn(
                  "flex h-9 w-9 items-center justify-center rounded-lg border text-xs transition-colors",
                  !form.watch("icon") ? "border-ring ring-1 ring-ring" : "text-muted-foreground hover:border-ring",
                )}
                aria-label="No icon"
              >
                <Ban className="h-4 w-4" />
              </button>
              {LINK_ICON_CHOICES.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  title={c.label}
                  aria-label={c.label}
                  onClick={() => form.setValue("icon", c.id)}
                  className={cn(
                    "flex h-9 w-9 items-center justify-center rounded-lg border transition-colors hover:border-ring",
                    form.watch("icon") === c.id ? "border-ring ring-1 ring-ring" : "text-muted-foreground",
                  )}
                >
                  <LinkIconBadge icon={c.id} size={16} />
                </button>
              ))}
              {SOCIAL_ICON_CHOICES.map((p) => (
                <button
                  key={p}
                  type="button"
                  title={p}
                  aria-label={p}
                  onClick={() => form.setValue("icon", p)}
                  className={cn(
                    "flex h-9 w-9 items-center justify-center rounded-lg border transition-colors hover:border-ring",
                    form.watch("icon") === p ? "border-ring ring-1 ring-ring" : "text-muted-foreground",
                  )}
                >
                  <LinkIconBadge icon={p} size={16} />
                </button>
              ))}
            </div>
          </div>

          {/* Scheduling & Auto-Expiry */}
          <div className="grid gap-3 rounded-lg border p-3.5 bg-muted/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold">Publish & Expiry Schedule</p>
                <p className="text-[11px] text-muted-foreground">Optional: Control when this link appears and disappears automatically.</p>
              </div>
              <div className="flex items-center gap-2">
                <Label htmlFor="archived" className="text-xs">Archived</Label>
                <Switch
                  id="archived"
                  checked={form.watch("archived")}
                  onCheckedChange={(v) => form.setValue("archived", v)}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div className="grid gap-1.5">
                <Label htmlFor="publishAt" className="text-xs">Publish At (Start)</Label>
                <Input
                  id="publishAt"
                  type="datetime-local"
                  {...form.register("publishAt")}
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="expiresAt" className="text-xs">Expire At (End)</Label>
                <Input
                  id="expiresAt"
                  type="datetime-local"
                  {...form.register("expiresAt")}
                />
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between rounded-lg border p-3">
            <div>
              <p className="text-sm font-medium">Featured</p>
              <p className="text-xs text-muted-foreground">Pinned to the top with the club accent color.</p>
            </div>
            <Switch
              checked={form.watch("highlight")}
              onCheckedChange={(v) => form.setValue("highlight", v, { shouldValidate: true })}
              style={form.watch("highlight") ? { backgroundColor: accent } : undefined}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {editing ? "Save changes" : "Add link"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function getScheduleStatus(link: LinkItem) {
  const now = Math.floor(Date.now() / 1000);
  if (link.archived === 1) {
    return { label: "Archived", variant: "secondary" as const, icon: Archive };
  }
  if (link.publishAt && link.publishAt > now) {
    return { label: "Scheduled", variant: "outline" as const, icon: Clock };
  }
  if (link.expiresAt && link.expiresAt <= now) {
    return { label: "Expired", variant: "destructive" as const, icon: Ban };
  }
  return { label: "Active", variant: "default" as const, icon: null };
}

export default function LinksTab() {
  const { data } = useQuery({ queryKey: ["admin-data"], queryFn: getAdminData });
  const queryClient = useQueryClient();
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<LinkItem | null>(null);

  const links = data?.links ?? [];
  const accent = data?.profile.theme.palette.accent ?? "#6366f1";

  const moveMutation = useMutation({
    mutationFn: reorderLinks,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-data"] }),
    onError: (e) => toast.error(e instanceof Error ? e.message : "Reorder failed"),
  });

  const duplicateMutation = useMutation({
    mutationFn: duplicateLink,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-data"] });
      toast.success("Link duplicated");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Duplicate failed"),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteLink,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-data"] });
      toast.success("Link deleted");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Delete failed"),
  });

  const move = (index: number, dir: -1 | 1) => {
    const target = index + dir;
    if (target < 0 || target >= links.length) return;
    const next = [...links];
    const a = next[index];
    const b = next[target];
    if (a === undefined || b === undefined) return;
    next[index] = b;
    next[target] = a;
    moveMutation.mutate(next.map((l) => l.id));
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{links.length} items</p>
        <Button
          onClick={() => {
            setEditing(null);
            setEditorOpen(true);
          }}
        >
          <Plus className="h-4 w-4" />
          Add
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10" />
              <TableHead>Label</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Schedule / Status</TableHead>
              <TableHead className="w-10">Featured</TableHead>
              <TableHead className="w-32 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {links.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center text-sm text-muted-foreground">
                  No links yet — add your first one.
                </TableCell>
              </TableRow>
            )}
            {links.map((link, index) => {
              const sched = getScheduleStatus(link);
              const SchedIcon = sched.icon;
              return (
                <TableRow key={link.id} className={cn(link.archived === 1 && "opacity-60")}>
                  <TableCell>
                    <div className="flex flex-col gap-0.5">
                      <button
                        onClick={() => move(index, -1)}
                        disabled={index === 0 || moveMutation.isPending}
                        className="text-muted-foreground transition-colors hover:text-foreground disabled:opacity-30"
                        aria-label="Move up"
                      >
                        <ArrowUp className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => move(index, 1)}
                        disabled={index === links.length - 1 || moveMutation.isPending}
                        className="text-muted-foreground transition-colors hover:text-foreground disabled:opacity-30"
                        aria-label="Move down"
                      >
                        <ArrowDown className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </TableCell>
                  <TableCell className="font-medium">
                    <span className="flex items-center gap-2">
                      {link.icon && <LinkIconBadge icon={link.icon} size={15} />}
                      {link.label}
                    </span>
                  </TableCell>
                  <TableCell>
                    {link.kind === "event" ? (
                      <Badge variant="secondary" className="gap-1">
                        <CalendarClock className="h-3 w-3" /> Event
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="gap-1">
                        <LinkIcon className="h-3 w-3" /> Link
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant={sched.variant} className="gap-1 text-[11px]">
                      {SchedIcon && <SchedIcon className="h-3 w-3" />}
                      <span>{sched.label}</span>
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {link.highlight === 1 && <Star className="h-4 w-4" style={{ color: accent }} fill="currentColor" />}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => duplicateMutation.mutate(link.id)}
                        disabled={duplicateMutation.isPending}
                        aria-label={`Duplicate ${link.label}`}
                        title="Duplicate"
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setEditing(link);
                          setEditorOpen(true);
                        }}
                        aria-label={`Edit ${link.label}`}
                        title="Edit"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => deleteMutation.mutate(link.id)}
                        disabled={deleteMutation.isPending}
                        aria-label={`Delete ${link.label}`}
                        title="Delete"
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
        </CardContent>
      </Card>

      <LinkEditor open={editorOpen} onOpenChange={setEditorOpen} editing={editing} accent={accent} />
    </div>
  );
}