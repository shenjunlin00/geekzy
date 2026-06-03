import { useState } from "react";
import type { SiteSettings } from "@/lib/site-store";
import { verifyUnlockPassword, setUnlocked } from "@/lib/site-store";

export function PasswordGateOverlay({
  settings,
  onUnlock,
}: {
  settings: SiteSettings;
  onUnlock: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [err, setErr] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setErr("");
    const ok = await verifyUnlockPassword(input);
    setSubmitting(false);
    if (ok) {
      setUnlocked(true);
      setOpen(false);
      onUnlock();
    } else {
      setErr("密码错误，请重试");
    }
  };

  return (
    <>
      {/* Gradient blur lock over the bottom content */}
      <div className="pointer-events-none absolute inset-x-0 top-32 bottom-0 z-10 bg-gradient-to-b from-background/0 via-background/70 to-background backdrop-blur-md" />
      <div className="absolute inset-x-0 top-1/2 z-20 flex flex-col items-center">
        <button
          onClick={() => setOpen(true)}
          className="rounded-full bg-foreground px-6 py-3 text-sm font-medium text-background shadow-lg transition hover:opacity-90"
        >
          查看更多 →
        </button>
      </div>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onClick={() => setOpen(false)}
        >
          <form
            onSubmit={submit}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-xl bg-background p-6 shadow-2xl"
          >
            <h3 className="mb-2 text-center text-xl font-bold text-foreground">
              {settings.password_prompt_title || "查看完整内容"}
            </h3>
            {settings.password_prompt_text && (
              <p className="mb-4 whitespace-pre-line text-center text-sm text-muted-foreground">
                {settings.password_prompt_text}
              </p>
            )}
            {settings.password_prompt_link_url && settings.password_prompt_link_text && (
              <a
                href={settings.password_prompt_link_url}
                target="_blank"
                rel="noopener noreferrer"
                className="mb-4 block text-center text-sm font-medium text-primary underline underline-offset-4"
              >
                {settings.password_prompt_link_text}
              </a>
            )}
            <input
              autoFocus
              type="password"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="请输入访问密码"
              className="h-11 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
            {err && <p className="mt-2 text-center text-xs text-destructive">{err}</p>}
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="h-10 flex-1 rounded-md border border-border text-sm"
              >
                取消
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="h-10 flex-1 rounded-md bg-primary text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
              >
                {submitting ? "验证中..." : "解锁"}
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
