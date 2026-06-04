import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, Copy, Share2 } from "lucide-react";
import { SiteHeader } from "@/components/SiteHeader";
import { DEFAULT_SETTINGS, fetchSettings, getCachedSettings, type SiteSettings } from "@/lib/site-store";
import { fetchNoteById, type Note } from "@/lib/notes";
import { htmlToPlainText } from "@/lib/tags";

export const Route = createFileRoute("/n/$id")({
  head: () => ({ meta: [{ title: "笔记分享" }] }),
  component: SharedNotePage,
});

function SharedNotePage() {
  const { id } = Route.useParams();
  const [settings, setSettings] = useState<SiteSettings | null>(() => getCachedSettings());
  const [note, setNote] = useState<Note | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState<"" | "link" | "text">("");

  useEffect(() => {
    fetchSettings().then(setSettings);
    fetchNoteById(id).then((n) => { setNote(n); setLoading(false); });
  }, [id]);

  const view = settings ?? DEFAULT_SETTINGS;

  const copy = async (text: string, k: "link" | "text") => {
    try { await navigator.clipboard.writeText(text); } catch {}
    setCopied(k); setTimeout(() => setCopied(""), 1500);
  };

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader settings={view} />
      <main className="mx-auto max-w-3xl px-6 py-10">
        <Link to="/" className="mb-6 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> 返回全部笔记
        </Link>
        {loading ? (
          <div className="rounded-lg border border-dashed border-border bg-card p-12 text-center text-sm text-muted-foreground">加载中...</div>
        ) : !note || !note.published ? (
          <div className="rounded-lg border border-dashed border-border bg-card p-12 text-center text-sm text-muted-foreground">笔记不存在或已被删除。</div>
        ) : (
          <article className="rounded-lg border border-border bg-card p-6 shadow-sm">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground">
              <div className="flex flex-wrap items-center gap-2">
                <time>{new Date(note.updated_at).toLocaleString("zh-CN")}</time>
                {note.tags.map((t) => (
                  <span key={t} className="rounded-full bg-muted px-2 py-0.5">#{t}</span>
                ))}
              </div>
              <div className="flex gap-2">
                <button onClick={() => copy(window.location.href, "link")}
                  className="inline-flex h-8 items-center gap-1 rounded-md border border-border px-3 hover:bg-accent">
                  <Share2 className="h-3 w-3" />{copied === "link" ? "已复制" : "复制链接"}
                </button>
                <button onClick={() => copy(htmlToPlainText(note.content), "text")}
                  className="inline-flex h-8 items-center gap-1 rounded-md border border-border px-3 hover:bg-accent">
                  <Copy className="h-3 w-3" />{copied === "text" ? "已复制" : "复制内容"}
                </button>
              </div>
            </div>
            <div
              className="prose-resources text-sm leading-7 text-card-foreground [&_a]:text-primary [&_a]:underline [&_a]:break-all [&_img]:my-2 [&_img]:max-w-full [&_img]:rounded"
              dangerouslySetInnerHTML={{ __html: note.content }}
            />
          </article>
        )}
      </main>
    </div>
  );
}
