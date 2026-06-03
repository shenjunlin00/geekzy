import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { Search, Plus } from "lucide-react";
import { SiteHeader } from "@/components/SiteHeader";
import { NoteCard } from "@/components/NoteCard";
import { RichEditor } from "@/components/RichEditor";
import { TagPicker } from "@/components/TagPicker";
import { SubtitleModules } from "@/components/SubtitleModules";
import { PasswordGateOverlay } from "@/components/PasswordGate";
import {
  DEFAULT_SETTINGS,
  fetchSettings,
  getCachedSettings,
  isUnlocked,
  type SiteSettings,
} from "@/lib/site-store";
import { createNote, fetchNotes, type Note } from "@/lib/notes";
import { stripHtml } from "@/lib/tags";
import { useAuth } from "@/lib/use-auth";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "资源目录" },
      { name: "description", content: "精选资源链接与笔记。" },
    ],
  }),
  component: Index,
});

function Index() {
  // Seed from cached settings to avoid flash of defaults on refresh.
  const [settings, setSettings] = useState<SiteSettings | null>(() => getCachedSettings());
  const [notes, setNotes] = useState<Note[]>([]);
  const [query, setQuery] = useState("");
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [draft, setDraft] = useState("");
  const [draftTags, setDraftTags] = useState<string[]>([]);
  const [unlocked, setUnlockedState] = useState<boolean>(() => isUnlocked());
  const containerRef = useRef<HTMLDivElement>(null);
  const { isAdmin } = useAuth();

  useEffect(() => {
    fetchSettings().then(setSettings);
    fetchNotes().then(setNotes);
  }, []);

  const reload = () => fetchNotes().then(setNotes);

  const view = settings ?? DEFAULT_SETTINGS;
  const locked = view.password_enabled && !unlocked && !isAdmin;

  const allTags = useMemo(() => {
    const counts = new Map<string, number>();
    notes.forEach((n) => n.tags.forEach((t) => counts.set(t, (counts.get(t) ?? 0) + 1)));
    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([t]) => t);
  }, [notes]);

  const visibleNotes = useMemo(
    () => (activeTag ? notes.filter((n) => n.tags.includes(activeTag)) : notes),
    [notes, activeTag],
  );

  useEffect(() => {
    if (!query.trim() || !containerRef.current) return;
    const q = query.trim().toLowerCase();
    const target = visibleNotes.find((n) =>
      (stripHtml(n.content) + " " + n.tags.join(" ")).toLowerCase().includes(q),
    );
    if (target) {
      const el = containerRef.current.querySelector<HTMLElement>(`[data-note-id="${target.id}"]`);
      el?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [query, visibleNotes]);

  const isMatch = (n: Note) => {
    if (!query.trim()) return false;
    const q = query.trim().toLowerCase();
    return (stripHtml(n.content) + " " + n.tags.join(" ")).toLowerCase().includes(q);
  };

  const publishDraft = async () => {
    if (!stripHtml(draft)) return;
    await createNote(draft, draftTags, true);
    setDraft("");
    setDraftTags([]);
    setShowAdd(false);
    reload();
  };

  // Don't render anything until we have settings (cached or fetched) to avoid default flash
  if (!settings) {
    return <div className="min-h-screen bg-background" />;
  }

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader settings={view} />

      <main className="mx-auto max-w-6xl px-6 py-12">
        <section className="flex flex-col items-center text-center">
          {view.logo ? (
            <img src={view.logo} alt={view.site_name} className="mb-6 h-24 w-24 rounded-lg object-cover shadow-sm" />
          ) : (
            <div className="mb-6 flex h-24 w-24 items-center justify-center rounded-lg bg-foreground text-3xl font-bold text-background shadow-sm">
              {view.site_name.slice(0, 1)}
            </div>
          )}
          <h1 className="text-4xl font-extrabold tracking-tight text-foreground sm:text-5xl">
            {view.hero_title}
          </h1>
          {view.subtitle && (
            <p className="mt-4 max-w-2xl text-sm leading-7 text-muted-foreground sm:text-base">
              {view.subtitle}
            </p>
          )}

          <SubtitleModules texts={view.text_modules} icons={view.icon_modules} />

          <div className="relative mt-8 w-full max-w-xl">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="搜索资源名称、链接或说明..."
              className="h-12 w-full rounded-full border border-input bg-background pl-11 pr-4 text-sm shadow-sm outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          {allTags.length > 0 && (
            <div className="mt-5 flex max-w-3xl flex-wrap justify-center gap-2">
              <button
                onClick={() => setActiveTag(null)}
                className={`rounded-full border px-3 py-1 text-xs transition ${
                  activeTag === null
                    ? "border-foreground bg-foreground text-background"
                    : "border-border text-muted-foreground hover:text-foreground"
                }`}
              >
                全部
              </button>
              {allTags.map((t) => (
                <button
                  key={t}
                  onClick={() => setActiveTag(activeTag === t ? null : t)}
                  className={`rounded-full border px-3 py-1 text-xs transition ${
                    activeTag === t
                      ? "border-foreground bg-foreground text-background"
                      : "border-border text-muted-foreground hover:text-foreground"
                  }`}
                >
                  #{t}
                </button>
              ))}
            </div>
          )}

          {isAdmin && (
            <button
              onClick={() => setShowAdd((s) => !s)}
              className="mt-6 inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2 text-sm font-medium text-primary-foreground shadow hover:bg-primary/90"
            >
              <Plus className="h-4 w-4" />
              {showAdd ? "收起" : "添加笔记"}
            </button>
          )}
        </section>

        {isAdmin && showAdd && (
          <section className="mt-8 space-y-3 rounded-lg border border-border bg-card p-5">
            <RichEditor
              value={draft}
              onChange={setDraft}
              minHeight="200px"
              placeholder="粘贴链接、图片或直接输入..."
            />
            <TagPicker
              available={view.available_tags}
              selected={draftTags}
              onChange={setDraftTags}
            />
            <div className="flex gap-2">
              <button
                onClick={publishDraft}
                className="h-10 rounded-md bg-primary px-5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
              >
                发布
              </button>
              <button
                onClick={() => {
                  setDraft("");
                  setDraftTags([]);
                  setShowAdd(false);
                }}
                className="h-10 rounded-md border border-border px-5 text-sm"
              >
                取消
              </button>
            </div>
          </section>
        )}

        <div className="relative mt-12 grid grid-cols-1 gap-8 lg:grid-cols-[1fr_200px]">
          <section ref={containerRef} className="space-y-6">
            {visibleNotes.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border bg-card p-12 text-center text-sm text-muted-foreground">
                暂无内容
              </div>
            ) : locked ? (
              <>
                {visibleNotes.slice(0, 1).map((n) => (
                  <NoteCard
                    key={n.id}
                    note={n}
                    canEdit={false}
                    availableTags={view.available_tags}
                    onTagClick={(t) => setActiveTag(t)}
                  />
                ))}
                <div className="relative h-[600px] overflow-hidden">
                  {visibleNotes.slice(1, 4).map((n) => (
                    <NoteCard
                      key={n.id}
                      note={n}
                      canEdit={false}
                      availableTags={view.available_tags}
                    />
                  ))}
                  <PasswordGateOverlay
                    settings={view}
                    onUnlock={() => setUnlockedState(true)}
                  />
                </div>
              </>
            ) : (
              visibleNotes.map((n) => (
                <NoteCard
                  key={n.id}
                  note={n}
                  highlight={isMatch(n)}
                  canEdit={isAdmin}
                  availableTags={view.available_tags}
                  onChanged={reload}
                  onTagClick={(t) => setActiveTag(t)}
                />
              ))
            )}
          </section>

          {!locked && visibleNotes.length > 0 && (
            <aside className="hidden lg:block">
              <div className="sticky top-6 rounded-lg border border-border bg-card p-4">
                <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  时间线
                </h3>
                <ul className="space-y-2 text-xs">
                  {visibleNotes.map((n) => (
                    <li key={n.id}>
                      <a
                        href={`#${n.id}`}
                        onClick={(e) => {
                          e.preventDefault();
                          containerRef.current
                            ?.querySelector<HTMLElement>(`[data-note-id="${n.id}"]`)
                            ?.scrollIntoView({ behavior: "smooth", block: "start" });
                        }}
                        className="block truncate text-muted-foreground hover:text-foreground"
                      >
                        {new Date(n.updated_at).toLocaleDateString("zh-CN")}{" "}
                        <span className="opacity-70">
                          {stripHtml(n.content).slice(0, 18) || "(空)"}
                        </span>
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            </aside>
          )}
        </div>
      </main>
    </div>
  );
}
