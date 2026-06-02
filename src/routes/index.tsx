import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Search } from "lucide-react";
import { SiteHeader } from "@/components/SiteHeader";
import { DEFAULT_SETTINGS, loadSettings, type SiteSettings } from "@/lib/site-store";

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
  const [query, setQuery] = useState("");

  useEffect(() => {
    setSettings(loadSettings());
    const onUpdate = () => setSettings(loadSettings());
    window.addEventListener("site-settings-updated", onUpdate);
    window.addEventListener("storage", onUpdate);
    return () => {
      window.removeEventListener("site-settings-updated", onUpdate);
      window.removeEventListener("storage", onUpdate);
    };
  }, []);

  // Search: filter top-level blocks (split by <br><br> or block tags) containing the query (case-insensitive, strip tags).
  const renderedHtml = useMemo(() => {
    const html = settings.contentHtml || "";
    if (!query.trim()) return html;
    const q = query.trim().toLowerCase();

    // Split into rough blocks on <div>, <p>, or double <br>
    const tmp = document.createElement("div");
    tmp.innerHTML = html;
    const blocks: string[] = [];
    tmp.childNodes.forEach((n) => {
      const el = document.createElement("div");
      el.appendChild(n.cloneNode(true));
      blocks.push(el.innerHTML);
    });

    // Group consecutive non-block nodes? Simpler: split inner html by <br> for fine-grained filtering
    const lines = html.split(/<br\s*\/?>/i);
    const matched = lines.filter((l) => {
      const t = document.createElement("div");
      t.innerHTML = l;
      return (t.textContent || "").toLowerCase().includes(q);
    });
    return matched.length ? matched.join("<br/>") : `<p class="text-muted-foreground">未找到包含 “${query}” 的内容</p>`;
  }, [settings.contentHtml, query]);

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader settings={settings} />

      <main className="mx-auto max-w-4xl px-6 py-12">
        <section className="flex flex-col items-center text-center">
          {settings.logo ? (
            <img
              src={settings.logo}
              alt={settings.siteName}
              className="mb-6 h-24 w-24 rounded-lg object-cover shadow-sm"
            />
          ) : (
            <div className="mb-6 flex h-24 w-24 items-center justify-center rounded-lg bg-foreground text-3xl font-bold text-background shadow-sm">
              {settings.siteName.slice(0, 1)}
            </div>
          )}
          <h1 className="text-4xl font-extrabold tracking-tight text-foreground sm:text-5xl">
            {settings.heroTitle}
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
              className="h-12 w-full rounded-full border border-input bg-background pl-11 pr-4 text-sm shadow-sm outline-none transition focus:ring-2 focus:ring-ring"
            />
          </div>
        </section>

        <section className="mt-12">
          {settings.contentHtml ? (
            <article
              className="prose-resources rounded-lg border border-border bg-card p-6 text-sm leading-7 text-card-foreground shadow-sm [&_a]:text-primary [&_a]:underline [&_a]:break-all [&_img]:my-2 [&_img]:max-w-full [&_img]:rounded"
              dangerouslySetInnerHTML={{ __html: renderedHtml }}
            />
          ) : (
            <div className="rounded-lg border border-dashed border-border bg-card p-12 text-center text-sm text-muted-foreground">
              还没有任何资源，前往 <a href="/admin" className="text-primary underline">后台</a> 添加吧。
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
