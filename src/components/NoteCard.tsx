import { useState } from "react";
import { Copy, Pencil, Check, X, Trash2, Share2, CheckSquare, Square } from "lucide-react";
import { RichEditor } from "./RichEditor";
import { TagPicker } from "./TagPicker";
import { type Note, updateNote, deleteNote } from "@/lib/notes";
import { htmlToPlainText } from "@/lib/tags";

interface Props {
  note: Note;
  highlight?: boolean;
  canEdit: boolean;
  availableTags: string[];
  onChanged?: () => void;
  onTagClick?: (t: string) => void;
  selectable?: boolean;
  selected?: boolean;
  onToggleSelect?: () => void;
}

export function NoteCard({
  note, highlight, canEdit, availableTags, onChanged, onTagClick,
  selectable, selected, onToggleSelect,
}: Props) {
  const [editing, setEditing] = useState(false);
  const [content, setContent] = useState(note.content);
  const [tags, setTags] = useState<string[]>(note.tags);
  const [copied, setCopied] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      await updateNote(note.id, { content, tags });
      setEditing(false);
      onChanged?.();
    } finally { setSaving(false); }
  };

  const copyText = async (text: string, setter: (b: boolean) => void) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = text; document.body.appendChild(ta);
      ta.select(); document.execCommand("copy"); document.body.removeChild(ta);
    }
    setter(true);
    setTimeout(() => setter(false), 1500);
  };

  const copy = () => copyText(htmlToPlainText(note.content), setCopied);

  const shareLink = () => {
    const url = `${window.location.origin}/n/${note.id}`;
    copyText(url, setShareCopied);
  };

  const remove = async () => {
    if (!confirm("删除这条笔记？")) return;
    await deleteNote(note.id);
    onChanged?.();
  };

  return (
    <article
      data-note-id={note.id}
      className={`scroll-mt-24 rounded-lg border bg-card p-6 shadow-sm transition ${
        highlight ? "border-primary ring-2 ring-primary/30" : "border-border"
      } ${selected ? "ring-2 ring-primary" : ""}`}
    >
      <div className="mb-3 flex items-start justify-between gap-3 text-xs text-muted-foreground">
        <div className="flex flex-wrap items-center gap-2">
          {selectable && (
            <button onClick={onToggleSelect} className="text-foreground" title="选择">
              {selected ? <CheckSquare className="h-4 w-4" /> : <Square className="h-4 w-4" />}
            </button>
          )}
          <time>{new Date(note.updated_at).toLocaleString("zh-CN")}</time>
          {!note.published && <span className="text-orange-600">未发布</span>}
          {note.tags.map((t) => (
            <button
              key={t}
              onClick={() => onTagClick?.(t)}
              className="rounded-full bg-muted px-2 py-0.5 hover:text-foreground"
            >#{t}</button>
          ))}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button onClick={shareLink} title="复制分享链接"
            className="inline-flex h-7 items-center gap-1 rounded-md border border-border px-2 hover:bg-accent">
            <Share2 className="h-3 w-3" />{shareCopied ? "已复制链接" : "分享"}
          </button>
          <button onClick={copy} title="复制内容"
            className="inline-flex h-7 items-center gap-1 rounded-md border border-border px-2 hover:bg-accent">
            <Copy className="h-3 w-3" />{copied ? "已复制" : "复制"}
          </button>
          {canEdit && !editing && (
            <>
              <button onClick={() => { setContent(note.content); setTags(note.tags); setEditing(true); }}
                className="inline-flex h-7 items-center gap-1 rounded-md border border-border px-2 hover:bg-accent">
                <Pencil className="h-3 w-3" />编辑
              </button>
              <button onClick={remove}
                className="inline-flex h-7 items-center justify-center rounded-md border border-border px-2 text-destructive hover:bg-destructive/10">
                <Trash2 className="h-3 w-3" />
              </button>
            </>
          )}
        </div>
      </div>

      {editing ? (
        <div className="space-y-3">
          <RichEditor value={content} onChange={setContent} minHeight="200px" />
          <TagPicker available={availableTags} selected={tags} onChange={setTags} />
          <div className="flex gap-2">
            <button onClick={save} disabled={saving}
              className="inline-flex h-9 items-center gap-1 rounded-md bg-primary px-4 text-sm text-primary-foreground hover:bg-primary/90">
              <Check className="h-4 w-4" /> 保存
            </button>
            <button onClick={() => setEditing(false)}
              className="inline-flex h-9 items-center gap-1 rounded-md border border-border px-4 text-sm">
              <X className="h-4 w-4" /> 取消
            </button>
          </div>
        </div>
      ) : (
        <div
          className="prose-resources text-sm leading-7 text-card-foreground [&_a]:text-primary [&_a]:underline [&_a]:break-all [&_img]:my-2 [&_img]:max-w-full [&_img]:rounded"
          dangerouslySetInnerHTML={{ __html: note.content }}
        />
      )}
    </article>
  );
}
