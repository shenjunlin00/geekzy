import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/use-auth";

export const Route = createFileRoute("/login")({
  head: () => ({ meta: [{ title: "登录" }] }),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (user) navigate({ to: "/admin" });
  }, [user, navigate]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin },
        });
        if (error) throw error;
        setMsg("注册成功，请检查邮箱完成验证后再登录。首位注册者将自动获得管理员权限。");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        navigate({ to: "/admin" });
      }
    } catch (err) {
      setMsg((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <form onSubmit={submit} className="w-full max-w-sm space-y-4 rounded-lg border border-border bg-card p-6 shadow-sm">
        <h1 className="text-xl font-bold text-foreground">{mode === "login" ? "登录" : "注册"}</h1>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="邮箱"
          className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
        />
        <input
          type="password"
          required
          minLength={6}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="密码 (至少 6 位)"
          className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
        />
        <button
          type="submit"
          disabled={busy}
          className="h-10 w-full rounded-md bg-primary text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          {busy ? "处理中..." : mode === "login" ? "登录" : "注册"}
        </button>
        {msg && <p className="text-xs text-muted-foreground">{msg}</p>}
        <button
          type="button"
          onClick={() => setMode(mode === "login" ? "signup" : "login")}
          className="block w-full text-center text-xs text-muted-foreground hover:text-foreground"
        >
          {mode === "login" ? "首次使用？注册账号" : "已有账号？去登录"}
        </button>
      </form>
    </div>
  );
}
