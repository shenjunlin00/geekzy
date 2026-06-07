import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Search, Plus, ChevronUp, ChevronDown, X, Share2, Check } from "lucide-react";
import { SiteHeader } from "@/components/SiteHeader";
import { NoteCard } from "@/components/NoteCard";
import { RichEditor } from "@/components/RichEditor";
import { TagPicker } from "@/components/TagPicker";
import { SubtitleModules } from "@/components/SubtitleModules";
import { PasswordGateOverlay } from "@/components/PasswordGate";
import {
  DEFAULT_SETTINGS, fetchSettings, getCachedSettings, isUnlocked, type SiteSettings,
} from "@/lib/site-store";
import { createNote, fetchNotes, getCachedNotes, type Note } from "@/lib/notes";
// (Public-site SSR data fn no longer used; route is client-rendered for instant paint.)
import { useAuth } from "@/lib/use-auth";

export const Route = createFileRoute("/")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "资源目录" },
      { name: "description", content: "精选资源链接与笔记。" },
    ],
  }),
  component: Index,
});

function Index() {
  // Hydrate instantly from localStorage cache, then refresh in background.
  const [settings, setSettings] = useState<SiteSettings>(
    () => getCachedSettings() ?? DEFAULT_SETTINGS,
  );
  const [notes, setNotes] = useState<Note[]>(() => getCachedNotes() ?? []);

  const [query, setQuery] = useState("");
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [draft, setDraft] = useState("");
  const [draftTags, setDraftTags] = useState<string[]>([]);
  const [publishing, setPublishing] = useState(false);
  const [publishError, setPublishError] = useState("");
  const [unlocked, setUnlockedState] = useState<boolean>(() => isUnlocked());
  const [hitIndex, setHitIndex] = useState(0);
  const [hits, setHits] = useState<HTMLElement[]>([]);
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkCopied, setBulkCopied] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const { isAdmin } = useAuth();

  // Background refresh from client to pick up latest data without delaying paint.
  useEffect(() => {
    fetchSettings().then(setSettings).catch(() => {});
    fetchNotes().then(setNotes).catch(() => {});
  }, []);

  const reload = () => fetchNotes().then(setNotes);

  const view = settings;
  const locked = view.password_enabled && !unlocked && !isAdmin;

  const allTags = useMemo(() => {
    const counts = new Map<string, number>();
    notes.forEach((n) => n.tags.forEach((t) => counts.set(t, (counts.get(t) ?? 0) + 1)));
    return Array.from(counts.entries()).sort((a, b) => b[1] - a[1]).map(([t]) => t);
  }, [notes]);

  const visibleNotes = useMemo(
    () => (activeTag ? notes.filter((n) => n.tags.includes(activeTag)) : notes),
    [notes, activeTag],
  );

  const groupedByDate = useMemo(() => {
    const m = new Map<string, Note[]>();
    visibleNotes.forEach((n) => {
      const d = new Date(n.updated_at).toLocaleDateString("zh-CN");
      if (!m.has(d)) m.set(d, []);
      m.get(d)!.push(n);
    });
    return Array.from(m.entries());
  }, [visibleNotes]);

  // ---- Find-on-page search ----
  const performSearch = useCallback((q: string) => {
    const root = containerRef.current;
    if (!root) return [] as HTMLElement[];

    // Wipe any previously injected marks.
    root.querySelectorAll("mark.search-hit").forEach((m) => {
      const parent = m.parentNode;
      if (!parent) return;
      while (m.firstChild) parent.insertBefore(m.firstChild, m);
      parent.removeChild(m);
    });
    root.normalize();

    const needle = q.trim().toLowerCase();
    if (!needle) return [];

    const newHits: HTMLElement[] = [];
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode: (node) => {
        const p = node.parentElement;
        if (!p) return NodeFilter.FILTER_REJECT;
        if (p.closest("textarea, input, script, style, [contenteditable='true']")) return NodeFilter.FILTER_REJECT;
        return node.nodeValue && node.nodeValue.toLowerCase().includes(needle)
          ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
      },
    });
    const textNodes: Text[] = [];
    let cur = walker.nextNode();
    while (cur) { textNodes.push(cur as Text); cur = walker.nextNode(); }

    textNodes.forEach((tn) => {
      const text = tn.nodeValue || "";
      const lower = text.toLowerCase();
      const frag = document.createDocumentFragment();
      let i = 0;
      while (i < text.length) {
        const idx = lower.indexOf(needle, i);
        if (idx === -1) {
          frag.appendChild(document.createTextNode(text.slice(i)));
          break;
        }
        if (idx > i) frag.appendChild(document.createTextNode(text.slice(i, idx)));
        const mark = document.createElement("mark");
        mark.className = "search-hit";
        mark.textContent = text.slice(idx, idx + needle.length);
        frag.appendChild(mark);
        newHits.push(mark);
        i = idx + needle.length;
      }
      tn.parentNode?.replaceChild(frag, tn);
    });

    return newHits;
  }, []);

  // Auto re-highlight as user types or when notes/filter change.
  useLayoutEffect(() => {
    const newHits = performSearch(query);
    setHits(newHits);
    setHitIndex(0);
  }, [query, visibleNotes, performSearch]);

  // Scroll active hit into view and add visual emphasis.
  useEffect(() => {
    hits.forEach((h, i) => h.classList.toggle("active", i === hitIndex));
    const target = hits[hitIndex];
    if (target) target.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [hits, hitIndex]);

  const runSearch = () => {
    const newHits = performSearch(query);
    setHits(newHits);
    setHitIndex(0);
    if (newHits[0]) newHits[0].scrollIntoView({ behavior: "smooth", block: "center" });
  };

  const nextHit = () => hits.length > 0 && setHitIndex((i) => (i + 1) % hits.length);
  const prevHit = () => hits.length > 0 && setHitIndex((i) => (i - 1 + hits.length) % hits.length);

  const publishDraft = async () => {
    setPublishError("");
    const plain = draft.replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").trim();
    if (!plain) {
      setPublishError("内容不能为空");
      return;
    }
    setPublishing(true);
    try {
      await createNote(draft, draftTags, true);
      setDraft(""); setDraftTags([]); setShowAdd(false);
      await reload();
    } catch (e) {
      console.error("publish failed", e);
      setPublishError((e as Error)?.message || "发布失败，请重试");
    } finally {
      setPublishing(false);
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id); else n.add(id);
      return n;
    });
  };

  const bulkShareLinks = async () => {
    const idToSlug = new Map(notes.map((n) => [n.id, n.slug ?? n.id]));
    const lines = Array.from(selectedIds).map((id) => `${window.location.origin}/n/${idToSlug.get(id) ?? id}`);
    if (lines.length === 0) return;
    try { await navigator.clipboard.writeText(lines.join("\n")); } catch {}
    setBulkCopied(true);
    setTimeout(() => setBulkCopied(false), 1500);
  };

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
          <h1 className="text-4xl font-extrabold tracking-tight text-foreground sm:text-5xl">{view.hero_title}</h1>
          {view.subtitle && (
            <p className="mt-4 max-w-2xl text-sm leading-7 text-muted-foreground sm:text-base">{view.subtitle}</p>
          )}

          <SubtitleModules texts={view.text_modules} icons={view.icon_modules} />

          {/* Find-on-page search */}
          <div className="relative mt-8 w-full max-w-xl">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); runSearch(); } }}
              placeholder="搜索资源名称、链接或说明，回车定位..."
              className="h-12 w-full rounded-full border border-input bg-background pl-11 pr-56 text-sm shadow-sm outline-none focus:ring-2 focus:ring-ring"
            />
            <div className="absolute right-2 top-1/2 flex -translate-y-1/2 items-center gap-1">
              {query.trim() && (
                <>
                  <span className="px-1 text-xs text-muted-foreground">
                    {hits.length > 0 ? `${hitIndex + 1}/${hits.length}` : "未收录"}
                  </span>
                  <button onClick={prevHit} disabled={hits.length === 0}
                    className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-accent disabled:opacity-30" title="上一个">
                    <ChevronUp className="h-4 w-4" />
                  </button>
                  <button onClick={nextHit} disabled={hits.length === 0}
                    className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-accent disabled:opacity-30" title="下一个">
                    <ChevronDown className="h-4 w-4" />
                  </button>
                  <button onClick={() => setQuery("")}
                    className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-accent" title="清空">
                    <X className="h-4 w-4" />
                  </button>
                </>
              )}
              <button onClick={runSearch}
                className="ml-1 h-8 rounded-full bg-foreground px-4 text-xs font-medium text-background hover:opacity-90">
                搜索
              </button>
            </div>
          </div>

          {allTags.length > 0 && (
            <div className="mt-5 flex max-w-3xl flex-wrap justify-center gap-2">
              <button onClick={() => setActiveTag(null)}
                className={`rounded-full border px-3 py-1 text-xs transition ${
                  activeTag === null ? "border-foreground bg-foreground text-background"
                    : "border-border text-muted-foreground hover:text-foreground"
                }`}>全部</button>
              {allTags.map((t) => (
                <button key={t} onClick={() => setActiveTag(activeTag === t ? null : t)}
                  className={`rounded-full border px-3 py-1 text-xs transition ${
                    activeTag === t ? "border-foreground bg-foreground text-background"
                      : "border-border text-muted-foreground hover:text-foreground"
                  }`}>#{t}</button>
              ))}
            </div>
          )}

          {isAdmin && (
            <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
              <button onClick={() => setShowAdd((s) => !s)}
                className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2 text-sm font-medium text-primary-foreground shadow hover:bg-primary/90">
                <Plus className="h-4 w-4" />{showAdd ? "收起" : "添加笔记"}
              </button>
              <button onClick={() => { setSelectMode((s) => !s); setSelectedIds(new Set()); }}
                className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-4 py-2 text-sm hover:bg-accent">
                <Share2 className="h-4 w-4" />{selectMode ? "退出批量" : "批量分享"}
              </button>
              {selectMode && (
                <button onClick={bulkShareLinks} disabled={selectedIds.size === 0}
                  className="inline-flex items-center gap-2 rounded-full bg-foreground px-4 py-2 text-sm text-background disabled:opacity-50">
                  {bulkCopied ? <Check className="h-4 w-4" /> : <Share2 className="h-4 w-4" />}
                  {bulkCopied ? "已复制" : `复制 ${selectedIds.size} 条链接`}
                </button>
              )}
            </div>
          )}
        </section>

        {isAdmin && showAdd && (
          <section className="mt-8 space-y-3 rounded-lg border border-border bg-card p-5">
            <RichEditor value={draft} onChange={setDraft} minHeight="200px" placeholder="粘贴链接、图片或直接输入..." />
            <TagPicker available={view.available_tags} selected={draftTags} onChange={setDraftTags} />
            <div className="flex flex-wrap items-center gap-2">
              <button onClick={publishDraft} disabled={publishing}
                className="h-10 rounded-md bg-primary px-5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60">
                {publishing ? "发布中..." : "发布"}
              </button>
              <button onClick={() => { setDraft(""); setDraftTags([]); setShowAdd(false); setPublishError(""); }}
                className="h-10 rounded-md border border-border px-5 text-sm">取消</button>
              {publishError && <span className="text-xs text-destructive">{publishError}</span>}
            </div>
          </section>
        )}

        <div className="relative mt-12 grid grid-cols-1 gap-8 lg:grid-cols-[1fr_220px]">
          <section ref={containerRef} className="space-y-6">
            {visibleNotes.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border bg-card p-12 text-center text-sm text-muted-foreground">
                暂无内容
              </div>
            ) : (
              visibleNotes.map((n) => (
                <NoteCard
                  key={n.id}
                  note={n}
                  canEdit={isAdmin}
                  availableTags={view.available_tags}
                  onChanged={reload}
                  onTagClick={(t) => setActiveTag(t)}
                  selectable={selectMode && isAdmin}
                  selected={selectedIds.has(n.id)}
                  onToggleSelect={() => toggleSelect(n.id)}
                />
              ))
            )}
          </section>

          {visibleNotes.length > 0 && (
            <aside className="timeline-skip hidden lg:block">
              <div className="sticky top-6 rounded-xl border border-border bg-gradient-to-b from-card to-card/60 p-4 shadow-sm">
                <h3 className="mb-4 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  <span className="h-1.5 w-1.5 rounded-full bg-primary" />时间线
                </h3>
                <ul className="relative space-y-4 border-l border-border pl-4">
                  {groupedByDate.map(([date, items]) => (
                    <li key={date} className="relative">
                      <span className="absolute -left-[21px] top-1.5 h-2.5 w-2.5 rounded-full border-2 border-background bg-primary" />
                      <div className="text-xs font-semibold text-foreground">{date}</div>
                      <ul className="mt-1.5 space-y-1">
                        {items.map((n) => {
                          const tmp = typeof document !== "undefined" ? document.createElement("div") : null;
                          if (tmp) tmp.innerHTML = n.content;
                          const preview = (tmp?.textContent || "").trim().slice(0, 20) || "(空)";
                          return (
                            <li key={n.id}>
                              <a href={`#${n.id}`} onClick={(e) => {
                                e.preventDefault();
                                containerRef.current
                                  ?.querySelector<HTMLElement>(`[data-note-id="${n.id}"]`)
                                  ?.scrollIntoView({ behavior: "smooth", block: "start" });
                              }} className="block truncate text-xs text-muted-foreground transition hover:text-primary">
                                · {preview}
                              </a>
                            </li>
                          );
                        })}
                      </ul>
                    </li>
                  ))}
                </ul>
              </div>
            </aside>
          )}
        </div>
      </main>

      {locked && <PasswordGateOverlay settings={view} onUnlock={() => setUnlockedState(true)} />}
    </div>
  );
}
