import { useEffect, useState } from "react";
import type { SiteSettings } from "@/lib/site-store";
import { verifyUnlockPassword, setUnlocked } from "@/lib/site-store";

/**
 * Viewport-anchored gradient lock that appears AFTER the user scrolls past
 * ~1.6 screens. Above that threshold, the page is freely viewable so the
 * user gets a real taste of the content before the paywall kicks in.
 */
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
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      const vh = window.innerHeight || 1;
      setVisible(window.scrollY > vh * 1.6);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true); setErr("");
    const ok = await verifyUnlockPassword(input);
    setSubmitting(false);
    if (ok) { setUnlocked(true); setOpen(false); onUnlock(); }
    else setErr("密码错误，请重试");
  };

  return (
    <>
      {visible && (
        <div className="pointer-events-none fixed inset-x-0 bottom-0 z-30 h-[55vh] transition-opacity duration-300">
          <div className="absolute inset-0 bg-gradient-to-b from-background/0 via-background/60 to-background" />
          <div className="absolute inset-0 backdrop-blur-[2px] [mask-image:linear-gradient(to_bottom,transparent,black_30%)]" />
          <div className="absolute inset-0 backdrop-blur-md [mask-image:linear-gradient(to_bottom,transparent,black_55%)]" />
          <div className="absolute inset-0 backdrop-blur-xl [mask-image:linear-gradient(to_bottom,transparent,black_75%)]" />
          <div className="pointer-events-auto absolute inset-x-0 bottom-[18vh] flex flex-col items-center gap-3 px-4 text-center">
            <p className="text-sm font-medium text-foreground/70">🔒 更多内容已加密</p>
            <button
              onClick={() => setOpen(true)}
              className="rounded-full bg-foreground px-8 py-3 text-sm font-semibold text-background shadow-2xl shadow-foreground/30 transition hover:scale-[1.03] hover:opacity-95"
            >
              查看更多 →
            </button>
          </div>
        </div>
      )}

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
          onClick={() => setOpen(false)}
        >
          <form onSubmit={submit} onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-2xl bg-background p-6 shadow-2xl">
            <h3 className="mb-2 text-center text-xl font-bold text-foreground">
              {settings.password_prompt_title || "查看完整内容"}
            </h3>
            {settings.password_prompt_text && (
              <p className="mb-4 whitespace-pre-line text-center text-sm text-muted-foreground">
                {settings.password_prompt_text}
              </p>
            )}
            {settings.password_prompt_link_url && settings.password_prompt_link_text && (
              <a href={settings.password_prompt_link_url} target="_blank" rel="noopener noreferrer"
                className="mb-4 block text-center text-sm font-medium text-primary underline underline-offset-4">
                {settings.password_prompt_link_text}
              </a>
            )}
            <input autoFocus type="password" value={input}
              onChange={(e) => setInput(e.target.value)} placeholder="请输入访问密码"
              className="h-11 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring" />
            {err && <p className="mt-2 text-center text-xs text-destructive">{err}</p>}
            <p className="mt-3 text-center text-[11px] text-muted-foreground">解锁后 24 小时内有效</p>
            <div className="mt-4 flex gap-2">
              <button type="button" onClick={() => setOpen(false)}
                className="h-10 flex-1 rounded-md border border-border text-sm">取消</button>
              <button type="submit" disabled={submitting}
                className="h-10 flex-1 rounded-md bg-primary text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60">
                {submitting ? "验证中..." : "解锁"}
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
