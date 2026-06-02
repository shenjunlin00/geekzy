import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { SiteHeader } from "@/components/SiteHeader";
import { RichEditor } from "@/components/RichEditor";
import { DEFAULT_SETTINGS, fetchSettings, updateSettings, type SiteSettings } from "@/lib/site-store";
import {
  createNote,
  deleteNote,
  fetchNotes,
  fetchRevisions,
  updateNote,
  type Note,
  type NoteRevision,
} from "@/lib/notes";
import { useAuth } from "@/lib/use-auth";
import { stripHtml } from "@/lib/tags";

export const Route = createFileRoute("/admin")({
  head: () => ({ meta: [{ title: "后台设置" }] }),
  component: Admin,
});

function Admin() {
  const { user, isAdmin, loading } = useAuth();
  const navigate = useNavigate();
  const [settings, setSettings] = useState<SiteSettings>(DEFAULT_SETTINGS);
  const [notes, setNotes] = useState<Note[]>([]);
  const [draft, setDraft] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState("");
  const [historyFor, setHistoryFor] = useState<Note | null>(null);
  const [revisions, setRevisions] = useState<NoteRevision[]>([]);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/login" });
  }, [loading, user, navigate]);

  useEffect(() => {
    if (!isAdmin) return;
    fetchSettings().then(setSettings);
    fetchNotes({ includeUnpublished: true }).then(setNotes);
  }, [isAdmin]);

  if (loading) return <div className="p-10 text-center text-sm text-muted-foreground">加载中...</div>;
  if (!user) return null;
  if (!isAdmin)
    return (
      <div className="min-h-screen bg-background">
        <SiteHeader settings={settings} />
        <div className="mx-auto max-w-md p-10 text-center text-sm text-muted-foreground">
          当前账号无管理员权限，无法进入后台。
        </div>
      </div>
    );

  const update = <K extends keyof SiteSettings>(k: K, v: SiteSettings[K]) =>
    setSettings((s) => ({ ...s, [k]: v }));

  const handleLogo = (file: File) => {
    const r = new FileReader();
    r.onload = () => update("logo", String(r.result));
    r.readAsDataURL(file);
  };

  const saveSiteSettings = async () => {
    await updateSettings(settings);
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  };

  const addNote = async () => {
    if (!stripHtml(draft)) return;
    const n = await createNote(draft);
    setNotes((arr) => [n, ...arr]);
    setDraft("");
  };

  const saveEdit = async () => {
    if (!editingId) return;
    await updateNote(editingId, { content: editingContent });
    const fresh = await fetchNotes({ includeUnpublished: true });
    setNotes(fresh);
    setEditingId(null);
    setEditingContent("");
  };

  const togglePublished = async (n: Note) => {
    await updateNote(n.id, { published: !n.published });
    setNotes((arr) => arr.map((x) => (x.id === n.id ? { ...x, published: !n.published } : x)));
  };

  const removeNote = async (id: string) => {
    if (!confirm("删除这条笔记？历史记录也会一并清除。")) return;
    await deleteNote(id);
    setNotes((arr) => arr.filter((n) => n.id !== id));
  };

  const openHistory = async (n: Note) => {
    setHistoryFor(n);
    setRevisions(await fetchRevisions(n.id));
  };

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader settings={settings} />

      <main className="mx-auto max-w-4xl px-6 py-10 space-y-10">
        {/* 站点设置 */}
        <section className="rounded-lg border border-border bg-card p-6 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-foreground">站点设置</h2>
            <button
              onClick={saveSiteSettings}
              className="h-9 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              {saved ? "已保存 ✓" : "保存设置"}
            </button>
          </div>

          <Field label="网站名称">
            <input
              value={settings.site_name}
              onChange={(e) => update("site_name", e.target.value)}
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            />
          </Field>
          <Field label="网站 Logo">
            <div className="flex items-center gap-4">
              {settings.logo && (
                <img src={settings.logo} alt="logo" className="h-12 w-12 rounded-md object-cover" />
              )}
              <input
                type="file"
                accept="image/*"
                onChange={(e) => e.target.files?.[0] && handleLogo(e.target.files[0])}
                className="text-sm"
              />
              {settings.logo && (
                <button
                  onClick={() => update("logo", "")}
                  className="text-xs text-muted-foreground underline"
                >
                  移除
                </button>
              )}
            </div>
          </Field>
          <Field label="主标题">
            <input
              value={settings.hero_title}
              onChange={(e) => update("hero_title", e.target.value)}
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            />
          </Field>
          <Field label="副标题">
            <textarea
              value={settings.subtitle}
              onChange={(e) => update("subtitle", e.target.value)}
              rows={2}
              className="w-full rounded-md border border-input bg-background p-3 text-sm"
            />
          </Field>
        </section>

        {/* 新增笔记 */}
        <section className="rounded-lg border border-border bg-card p-6 space-y-4">
          <h2 className="text-lg font-bold text-foreground">添加新笔记</h2>
          <p className="text-xs text-muted-foreground">
            粘贴链接自动识别为链接，粘贴图片自动嵌入。使用 #标签 可手动标注；URL 域名会自动作为标签。
          </p>
          <RichEditor value={draft} onChange={setDraft} />
          <button
            onClick={addNote}
            className="h-10 rounded-md bg-primary px-5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            发布笔记
          </button>
        </section>

        {/* 笔记列表 */}
        <section className="space-y-4">
          <h2 className="text-lg font-bold text-foreground">所有笔记（{notes.length}）</h2>
          {notes.map((n) => (
            <div key={n.id} className="rounded-lg border border-border bg-card p-5">
              <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
                <span>
                  更新于 {new Date(n.updated_at).toLocaleString("zh-CN")}
                  {!n.published && <span className="ml-2 text-orange-600">未发布</span>}
                </span>
                <div className="flex gap-3">
                  <button onClick={() => openHistory(n)} className="hover:text-foreground">历史</button>
                  <button onClick={() => togglePublished(n)} className="hover:text-foreground">
                    {n.published ? "取消发布" : "发布"}
                  </button>
                  <button
                    onClick={() => {
                      setEditingId(n.id);
                      setEditingContent(n.content);
                    }}
                    className="hover:text-foreground"
                  >
                    编辑
                  </button>
                  <button onClick={() => removeNote(n.id)} className="text-destructive hover:underline">
                    删除
                  </button>
                </div>
              </div>
              {editingId === n.id ? (
                <div className="space-y-3">
                  <RichEditor value={editingContent} onChange={setEditingContent} />
                  <div className="flex gap-2">
                    <button onClick={saveEdit} className="h-9 rounded-md bg-primary px-4 text-sm text-primary-foreground">保存</button>
                    <button onClick={() => setEditingId(null)} className="h-9 rounded-md border border-border px-4 text-sm">取消</button>
                  </div>
                </div>
              ) : (
                <div
                  className="prose-resources text-sm leading-7 [&_a]:text-primary [&_a]:underline [&_img]:my-2 [&_img]:max-w-full [&_img]:rounded"
                  dangerouslySetInnerHTML={{ __html: n.content }}
                />
              )}
              {n.tags.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {n.tags.map((t) => (
                    <span key={t} className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                      #{t}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </section>
      </main>

      {/* 历史记录弹窗 */}
      {historyFor && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setHistoryFor(null)}
        >
          <div
            className="max-h-[80vh] w-full max-w-2xl overflow-auto rounded-lg bg-background p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-bold text-foreground">编辑历史（{revisions.length}）</h3>
              <button onClick={() => setHistoryFor(null)} className="text-sm text-muted-foreground">关闭</button>
            </div>
            <div className="space-y-4">
              {revisions.map((r) => (
                <div key={r.id} className="rounded border border-border p-3">
                  <div className="mb-2 text-xs text-muted-foreground">
                    {new Date(r.edited_at).toLocaleString("zh-CN")}
                  </div>
                  <div
                    className="text-xs leading-6 [&_a]:text-primary [&_a]:underline [&_img]:my-1 [&_img]:max-w-full"
                    dangerouslySetInnerHTML={{ __html: r.content }}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-2 block text-sm font-medium text-foreground">{label}</label>
      {children}
    </div>
  );
}
