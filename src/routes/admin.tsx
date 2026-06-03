import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { SiteHeader } from "@/components/SiteHeader";
import {
  DEFAULT_SETTINGS,
  fetchSettings,
  updateSettings,
  fetchUnlockPassword,
  saveUnlockPassword,
  type SiteSettings,
  type TextModule,
  type IconModule,
} from "@/lib/site-store";
import { useAuth } from "@/lib/use-auth";

export const Route = createFileRoute("/admin")({
  head: () => ({ meta: [{ title: "后台设置" }] }),
  component: Admin,
});

const uid = () => Math.random().toString(36).slice(2, 9);

function Admin() {
  const { user, isAdmin, loading } = useAuth();
  const navigate = useNavigate();
  const [settings, setSettings] = useState<SiteSettings>(DEFAULT_SETTINGS);
  const [password, setPassword] = useState("");
  const [newTag, setNewTag] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/login" });
  }, [loading, user, navigate]);

  useEffect(() => {
    if (!isAdmin) return;
    fetchSettings().then(setSettings);
    fetchUnlockPassword().then(setPassword);
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

  const handleImageFile = (file: File, cb: (dataUrl: string) => void) => {
    const r = new FileReader();
    r.onload = () => cb(String(r.result));
    r.readAsDataURL(file);
  };

  const saveAll = async () => {
    await updateSettings(settings);
    await saveUnlockPassword(password);
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  };

  const addTag = () => {
    const t = newTag.trim().replace(/^#/, "");
    if (!t || settings.available_tags.includes(t)) return;
    update("available_tags", [...settings.available_tags, t]);
    setNewTag("");
  };
  const removeTag = (t: string) =>
    update("available_tags", settings.available_tags.filter((x) => x !== t));

  // text modules
  const addTextModule = () =>
    update("text_modules", [...settings.text_modules, { id: uid(), text: "新文字", url: "" }]);
  const updateTextModule = (id: string, patch: Partial<TextModule>) =>
    update("text_modules", settings.text_modules.map((m) => (m.id === id ? { ...m, ...patch } : m)));
  const removeTextModule = (id: string) =>
    update("text_modules", settings.text_modules.filter((m) => m.id !== id));

  // icon modules
  const addIconModule = () =>
    update("icon_modules", [
      ...settings.icon_modules,
      { id: uid(), icon: "", label: "图标", mode: "link", link_url: "", qr_url: "", popup_title: "", popup_text: "" },
    ]);
  const updateIconModule = (id: string, patch: Partial<IconModule>) =>
    update("icon_modules", settings.icon_modules.map((m) => (m.id === id ? { ...m, ...patch } : m)));
  const removeIconModule = (id: string) =>
    update("icon_modules", settings.icon_modules.filter((m) => m.id !== id));

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader settings={settings} />

      <main className="mx-auto max-w-4xl px-6 py-10 space-y-8">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-foreground">后台设置</h1>
          <button
            onClick={saveAll}
            className="h-10 rounded-md bg-primary px-5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            {saved ? "已保存 ✓" : "保存全部设置"}
          </button>
        </div>
        <p className="text-xs text-muted-foreground">
          提示：发布与编辑笔记现已支持直接在<strong className="text-foreground">首页</strong>操作（仅管理员可见）。
        </p>

        {/* 站点基本设置 */}
        <Section title="站点基本设置">
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
                onChange={(e) => e.target.files?.[0] && handleImageFile(e.target.files[0], (d) => update("logo", d))}
                className="text-sm"
              />
              {settings.logo && (
                <button onClick={() => update("logo", "")} className="text-xs text-muted-foreground underline">
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
        </Section>

        {/* 标签管理 */}
        <Section title="标签设置">
          <p className="text-xs text-muted-foreground">添加常用标签，发布笔记时从此列表选择。</p>
          <div className="flex gap-2">
            <input
              value={newTag}
              onChange={(e) => setNewTag(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addTag())}
              placeholder="输入新标签后回车"
              className="h-10 flex-1 rounded-md border border-input bg-background px-3 text-sm"
            />
            <button onClick={addTag} className="h-10 rounded-md bg-foreground px-4 text-sm text-background">
              添加
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {settings.available_tags.map((t) => (
              <span key={t} className="inline-flex items-center gap-1 rounded-full bg-muted px-3 py-1 text-xs">
                #{t}
                <button onClick={() => removeTag(t)} className="text-muted-foreground hover:text-destructive">
                  ×
                </button>
              </span>
            ))}
            {settings.available_tags.length === 0 && (
              <span className="text-xs text-muted-foreground">暂无标签</span>
            )}
          </div>
        </Section>

        {/* 副标题下方模块 */}
        <Section title="副标题下方 · 文字模块">
          <button
            onClick={addTextModule}
            className="inline-flex items-center gap-1 rounded-md border border-border px-3 py-1.5 text-xs hover:bg-accent"
          >
            <Plus className="h-3 w-3" /> 添加文字
          </button>
          {settings.text_modules.map((m) => (
            <div key={m.id} className="flex flex-wrap items-center gap-2 rounded border border-border p-3">
              <input
                value={m.text}
                onChange={(e) => updateTextModule(m.id, { text: e.target.value })}
                placeholder="显示文字"
                className="h-9 min-w-[160px] flex-1 rounded-md border border-input bg-background px-3 text-sm"
              />
              <input
                value={m.url}
                onChange={(e) => updateTextModule(m.id, { url: e.target.value })}
                placeholder="跳转链接 (可选)"
                className="h-9 min-w-[200px] flex-1 rounded-md border border-input bg-background px-3 text-sm"
              />
              <button onClick={() => removeTextModule(m.id)} className="text-destructive">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </Section>

        <Section title="副标题下方 · 图标模块">
          <button
            onClick={addIconModule}
            className="inline-flex items-center gap-1 rounded-md border border-border px-3 py-1.5 text-xs hover:bg-accent"
          >
            <Plus className="h-3 w-3" /> 添加图标
          </button>
          {settings.icon_modules.map((m) => (
            <div key={m.id} className="space-y-3 rounded border border-border p-3">
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2">
                  {m.icon && <img src={m.icon} alt="" className="h-10 w-10 rounded-full object-cover" />}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) =>
                      e.target.files?.[0] &&
                      handleImageFile(e.target.files[0], (d) => updateIconModule(m.id, { icon: d }))
                    }
                    className="text-xs"
                  />
                </div>
                <input
                  value={m.label}
                  onChange={(e) => updateIconModule(m.id, { label: e.target.value })}
                  placeholder="名称"
                  className="h-9 w-32 rounded-md border border-input bg-background px-3 text-sm"
                />
                <select
                  value={m.mode}
                  onChange={(e) => updateIconModule(m.id, { mode: e.target.value as "link" | "qr" })}
                  className="h-9 rounded-md border border-input bg-background px-2 text-sm"
                >
                  <option value="link">点击跳转链接</option>
                  <option value="qr">点击弹出二维码</option>
                </select>
                <button onClick={() => removeIconModule(m.id)} className="ml-auto text-destructive">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
              {m.mode === "link" ? (
                <input
                  value={m.link_url}
                  onChange={(e) => updateIconModule(m.id, { link_url: e.target.value })}
                  placeholder="跳转链接 URL"
                  className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                />
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    {m.qr_url && <img src={m.qr_url} alt="qr" className="h-16 w-16 rounded object-contain" />}
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) =>
                        e.target.files?.[0] &&
                        handleImageFile(e.target.files[0], (d) => updateIconModule(m.id, { qr_url: d }))
                      }
                      className="text-xs"
                    />
                    <span className="text-xs text-muted-foreground">上传二维码图片</span>
                  </div>
                  <input
                    value={m.popup_title}
                    onChange={(e) => updateIconModule(m.id, { popup_title: e.target.value })}
                    placeholder="弹窗标题"
                    className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                  />
                  <textarea
                    value={m.popup_text}
                    onChange={(e) => updateIconModule(m.id, { popup_text: e.target.value })}
                    placeholder="弹窗说明文字"
                    rows={2}
                    className="w-full rounded-md border border-input bg-background p-2 text-sm"
                  />
                </div>
              )}
            </div>
          ))}
        </Section>

        {/* 密码保护 */}
        <Section title="访问密码保护">
          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={settings.password_enabled}
              onChange={(e) => update("password_enabled", e.target.checked)}
              className="h-4 w-4"
            />
            <span className="text-sm">开启密码保护（未输入密码前下方笔记将以模糊形式锁定）</span>
          </label>
          <Field label="访问密码">
            <input
              type="text"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="设置密码"
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            />
          </Field>
          <Field label="弹窗标题">
            <input
              value={settings.password_prompt_title}
              onChange={(e) => update("password_prompt_title", e.target.value)}
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            />
          </Field>
          <Field label="弹窗说明文字">
            <textarea
              value={settings.password_prompt_text}
              onChange={(e) => update("password_prompt_text", e.target.value)}
              rows={3}
              className="w-full rounded-md border border-input bg-background p-3 text-sm"
            />
          </Field>
          <Field label="弹窗内引流链接 文字">
            <input
              value={settings.password_prompt_link_text}
              onChange={(e) => update("password_prompt_link_text", e.target.value)}
              placeholder="如：联系作者获取密码"
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            />
          </Field>
          <Field label="弹窗内引流链接 URL">
            <input
              value={settings.password_prompt_link_url}
              onChange={(e) => update("password_prompt_link_url", e.target.value)}
              placeholder="https://..."
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            />
          </Field>
        </Section>

        <div className="flex justify-end">
          <button
            onClick={saveAll}
            className="h-10 rounded-md bg-primary px-5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            {saved ? "已保存 ✓" : "保存全部设置"}
          </button>
        </div>
      </main>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-4 rounded-lg border border-border bg-card p-6">
      <h2 className="text-lg font-bold text-foreground">{title}</h2>
      {children}
    </section>
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
