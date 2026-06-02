import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { Search } from "lucide-react";
import { SiteHeader } from "@/components/SiteHeader";
import { DEFAULT_SETTINGS, fetchSettings, type SiteSettings } from "@/lib/site-store";
import { fetchNotes, type Note } from "@/lib/notes";
import { stripHtml } from "@/lib/tags";

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
  const [settings, setSettings] = useState<SiteSettings>(DEFAULT_SETTINGS);
  const [notes, setNotes] = useState<Note[]>([]);
  const [query, setQuery] = useState("");
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchSettings().then(setSettings);
    fetchNotes().then(setNotes);
  }, []);

  // All tags ranked by frequency
  const allTags = useMemo(() => {
    const counts = new Map<string, number>();
    notes.forEach((n) => n.tags.forEach((t) => counts.set(t, (counts.get(t) ?? 0) + 1)));
    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([t]) => t)
      .slice(0, 24);
  }, [notes]);

  // Filter by tag (search filter does NOT remove notes — only scroll-to-match)
  const visibleNotes = useMemo(
    () => (activeTag ? notes.filter((n) => n.tags.includes(activeTag)) : notes),
    [notes, activeTag],
  );

  // Auto-scroll to first match when query changes
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

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader settings={settings} />

      <main className="mx-auto max-w-6xl px-6 py-12">
        {/* Hero */}
        <section className="flex flex-col items-center text-center">
          {settings.logo ? (
            <img src={settings.logo} alt={settings.site_name} className="mb-6 h-24 w-24 rounded-lg object-cover shadow-sm" />
          ) : (
            <div className="mb-6 flex h-24 w-24 items-center justify-center rounded-lg bg-foreground text-3xl font-bold text-background shadow-sm">
              {settings.site_name.slice(0, 1)}
            </div>
          )}
          <h1 className="text-4xl font-extrabold tracking-tight text-foreground sm:text-5xl">
            {settings.hero_title}
          </h1>
          {settings.subtitle && (
            <p className="mt-4 max-w-2xl text-sm leading-7 text-muted-foreground sm:text-base">
              {settings.subtitle}
            </p>
          )}

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
        </section>

        {/* Notes + timeline */}
        <div className="mt-12 grid grid-cols-1 gap-8 lg:grid-cols-[1fr_200px]">
          <section ref={containerRef} className="space-y-6">
            {visibleNotes.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border bg-card p-12 text-center text-sm text-muted-foreground">
                暂无内容
              </div>
            ) : (
              visibleNotes.map((n) => (
                <article
                  key={n.id}
                  data-note-id={n.id}
                  className={`scroll-mt-24 rounded-lg border bg-card p-6 shadow-sm transition ${
                    isMatch(n) ? "border-primary ring-2 ring-primary/30" : "border-border"
                  }`}
                >
                  <div className="mb-3 flex items-center justify-between text-xs text-muted-foreground">
                    <time>{new Date(n.updated_at).toLocaleString("zh-CN")}</time>
                    {n.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {n.tags.map((t) => (
                          <button
                            key={t}
                            onClick={() => setActiveTag(t)}
                            className="rounded-full bg-muted px-2 py-0.5 text-xs hover:text-foreground"
                          >
                            #{t}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <div
                    className="prose-resources text-sm leading-7 text-card-foreground [&_a]:text-primary [&_a]:underline [&_a]:break-all [&_img]:my-2 [&_img]:max-w-full [&_img]:rounded"
                    dangerouslySetInnerHTML={{ __html: n.content }}
                  />
                </article>
              ))
            )}
          </section>

          {/* Timeline sidebar */}
          {visibleNotes.length > 0 && (
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
