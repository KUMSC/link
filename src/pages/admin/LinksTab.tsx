import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { ArrowDown, ArrowUp, Pencil, Plus, Star, Trash2 } from "lucide-react";
import {
  createLink,
  deleteLink,
  getAdminData,
  reorderLinks,
  updateLink,
} from "../../lib/api";
import { validateUrl } from "../../lib/platforms";
import type { LinkItem } from "../../lib/types";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Switch } from "../../components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../../components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../components/ui/table";

const linkSchema = z.object({
  label: z.string().min(1, "Label is required"),
  url: z.string().min(1, "URL is required").refine(validateUrl, "Enter a valid http(s) URL"),
  highlight: z.boolean(),
});

type LinkForm = z.infer<typeof linkSchema>;

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
  const form = useForm<LinkForm>({
    resolver: zodResolver(linkSchema),
    defaultValues: { label: "", url: "", highlight: false },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        label: editing?.label ?? "",
        url: editing?.url ?? "",
        highlight: editing?.highlight === 1,
      });
    }
  }, [open, editing, form]);

  const mutation = useMutation({
    mutationFn: async (values: LinkForm) => {
      if (editing) return updateLink(editing.id, values);
      return createLink(values);
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
          <DialogDescription>External links like Google Forms, websites, or social pages.</DialogDescription>
        </DialogHeader>
        <form onSubmit={form.handleSubmit((v) => mutation.mutate(v))} className="flex flex-col gap-4">
          <div className="grid gap-2">
            <Label htmlFor="label">Label</Label>
            <Input id="label" placeholder="Event Registration Form" {...form.register("label")} />
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
          <div className="flex items-center justify-between rounded-lg border p-3">
            <div>
              <p className="text-sm font-medium">Featured event</p>
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
  const accent = data?.profile.accentColor ?? "#6366f1";

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
        <p className="text-sm text-muted-foreground">{links.length} links</p>
        <Button
          onClick={() => {
            setEditing(null);
            setEditorOpen(true);
          }}
        >
          <Plus className="h-4 w-4" />
          Add link
        </Button>
      </div>

      <div className="rounded-xl border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10" />
              <TableHead>Label</TableHead>
              <TableHead>URL</TableHead>
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
                <TableCell className="max-w-[220px] truncate text-muted-foreground">{link.url}</TableCell>
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