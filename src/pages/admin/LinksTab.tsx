import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { ArrowDown, ArrowUp, CalendarClock, Link as LinkIcon, Pencil, Plus, Star, Trash2 } from "lucide-react";
import { createLink, deleteLink, getAdminData, reorderLinks, updateLink } from "../../lib/api";
import { validateUrl } from "../../lib/platforms";
import type { LinkItem, LinkKind } from "../../lib/types";
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

const linkSchema = z
  .object({
    label: z.string().min(1, "Label is required"),
    url: z.string().min(1, "URL is required").refine(validateUrl, "Enter a valid http(s) URL"),
    highlight: z.boolean(),
    kind: z.enum(["link", "event"]),
    startsAt: z.string().optional(),
    endsAt: z.string().optional(),
    location: z.string().optional(),
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
    defaultValues: { label: "", url: "", highlight: false, kind: "link" },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        label: editing?.label ?? "",
        url: editing?.url ?? "",
        highlight: editing?.highlight === 1,
        kind: editing?.kind ?? "link",
        startsAt: toLocal(editing?.startsAt),
        endsAt: toLocal(editing?.endsAt),
        location: editing?.location ?? "",
      });
    }
  }, [open, editing, form]);

  const watchedKind = form.watch("kind");

  const mutation = useMutation({
    mutationFn: async (values: LinkForm) => {
      const payload = {
        label: values.label,
        url: values.url,
        highlight: values.highlight,
        kind: values.kind,
        startsAt: toUnix(values.startsAt),
        endsAt: toUnix(values.endsAt),
        location: values.location?.trim() || null,
      };
      if (editing) return updateLink(editing.id, payload);
      return createLink(payload);
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
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{editing ? "Edit link" : "Add link"}</DialogTitle>
          <DialogDescription>Links open externally; events also show a date, time and place.</DialogDescription>
        </DialogHeader>
        <form onSubmit={form.handleSubmit((v) => mutation.mutate(v))} className="flex flex-col gap-4">
          <div className="grid gap-2">
            <Label htmlFor="kind">Type</Label>
            <Select value={watchedKind} onValueChange={(v) => form.setValue("kind", v as LinkKind, { shouldValidate: true })}>
              <SelectTrigger id="kind">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="link">Link</SelectItem>
                <SelectItem value="event">Event</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="label">Label</Label>
            <Input id="label" placeholder={watchedKind === "event" ? "Tech Talk — April 10" : "Event Registration Form"} {...form.register("label")} />
            {form.formState.errors.label && (
              <p className="text-xs text-destructive">{form.formState.errors.label.message}</p>
            )}
          </div>
          <div className="grid gap-2">
            <Label htmlFor="url">URL</Label>
            <Input id="url" placeholder="https://forms.google.com/…" {...form.register("url")} />
            {form.formState.errors.url && (
              <p className="text-xs text-destructive">{form.formState.errors.url.message}</p>
            )}
          </div>

          {watchedKind === "event" && (
            <div className="grid gap-3 rounded-lg border p-3">
              <div className="grid gap-2">
                <Label htmlFor="startsAt">Starts at</Label>
                <Input id="startsAt" type="datetime-local" {...form.register("startsAt")} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="endsAt">Ends at</Label>
                <Input id="endsAt" type="datetime-local" {...form.register("endsAt")} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="location">Location</Label>
                <Input id="location" placeholder="Room 301, Science Block" {...form.register("location")} />
              </div>
              {form.formState.errors.startsAt && (
                <p className="text-xs text-destructive">{form.formState.errors.startsAt.message}</p>
              )}
            </div>
          )}

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

      <div className="rounded-xl border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10" />
              <TableHead>Label</TableHead>
              <TableHead>Type</TableHead>
              <TableHead className="w-10">Featured</TableHead>
              <TableHead className="w-28 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {links.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center text-sm text-muted-foreground">
                  No links yet — add your first one.
                </TableCell>
              </TableRow>
            )}
            {links.map((link, index) => (
              <TableRow key={link.id}>
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
                <TableCell className="font-medium">{link.label}</TableCell>
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
                  {link.highlight === 1 && <Star className="h-4 w-4" style={{ color: accent }} fill="currentColor" />}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        setEditing(link);
                        setEditorOpen(true);
                      }}
                      aria-label={`Edit ${link.label}`}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => deleteMutation.mutate(link.id)}
                      disabled={deleteMutation.isPending}
                      aria-label={`Delete ${link.label}`}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <LinkEditor open={editorOpen} onOpenChange={setEditorOpen} editing={editing} accent={accent} />
    </div>
  );
}