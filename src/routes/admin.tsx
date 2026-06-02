import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { SiteHeader } from "@/components/SiteHeader";
import { RichEditor } from "@/components/RichEditor";
import { DEFAULT_SETTINGS, loadSettings, saveSettings, type SiteSettings } from "@/lib/site-store";

export const Route = createFileRoute("/admin")({
  head: () => ({ meta: [{ title: "后台设置" }] }),
  component: Admin,
});

function Admin() {
  const [settings, setSettings] = useState<SiteSettings>(DEFAULT_SETTINGS);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setSettings(loadSettings());
  }, []);

  const update = <K extends keyof SiteSettings>(k: K, v: SiteSettings[K]) =>
    setSettings((s) => ({ ...s, [k]: v }));

  const handleLogo = (file: File) => {
    const r = new FileReader();
    r.onload = () => update("logo", String(r.result));
    r.readAsDataURL(file);
  };

  const handleSave = () => {
    saveSettings(settings);
    setSaved(true);
    setTimeout(() => setSaved(false), 1800);
  };

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader settings={settings} />

      <main className="mx-auto max-w-4xl px-6 py-10">
        <h1 className="text-2xl font-bold text-foreground">后台设置</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          所有修改保存后立即生效，并永久替换默认样式。
        </p>

        <div className="mt-8 space-y-6 rounded-lg border border-border bg-card p-6">
          <Field label="网站名称">
            <input
              value={settings.siteName}
              onChange={(e) => update("siteName", e.target.value)}
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
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
                  className="text-xs text-muted-foreground underline hover:text-foreground"
                >
                  移除
                </button>
              )}
            </div>
          </Field>

          <Field label="主标题">
            <input
              value={settings.heroTitle}
              onChange={(e) => update("heroTitle", e.target.value)}
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
          </Field>

          <Field label="副标题 / 说明">
            <textarea
              value={settings.subtitle}
              onChange={(e) => update("subtitle", e.target.value)}
              rows={2}
              className="w-full rounded-md border border-input bg-background p-3 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
          </Field>

          <Field label="资源笔记内容（粘贴链接自动识别，粘贴图片自动嵌入）">
            <RichEditor value={settings.contentHtml} onChange={(html) => update("contentHtml", html)} />
          </Field>

          <div className="flex items-center gap-3">
            <button
              onClick={handleSave}
              className="h-10 rounded-md bg-primary px-5 text-sm font-medium text-primary-foreground transition hover:bg-primary/90"
            >
              保存
            </button>
            {saved && <span className="text-sm text-muted-foreground">已保存 ✓</span>}
          </div>
        </div>
      </main>
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
