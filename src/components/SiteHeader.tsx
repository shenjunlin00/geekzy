import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import type { SiteSettings } from "@/lib/site-store";
import { useAuth } from "@/lib/use-auth";
import { supabase } from "@/integrations/supabase/client";

export function SiteHeader({ settings }: { settings: SiteSettings }) {
  const { pathname } = useLocation();
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();

  const logout = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/" });
  };

  return (
    <header className="w-full border-b border-border bg-background">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <Link to="/" className="flex items-center gap-3">
          {settings.logo ? (
            <img src={settings.logo} alt={settings.site_name} className="h-8 w-8 rounded-md object-cover" />
          ) : (
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-foreground text-background text-xs font-bold">
              {settings.site_name.slice(0, 1)}
            </div>
          )}
          <span className="text-lg font-bold tracking-tight text-foreground">{settings.site_name}</span>
        </Link>
        <nav className="flex items-center gap-6 text-sm">
          <Link
            to="/"
            className={pathname === "/" ? "font-medium text-foreground" : "text-muted-foreground hover:text-foreground"}
          >
            首页
          </Link>
          {isAdmin && (
            <Link
              to="/admin"
              className={pathname === "/admin" ? "font-medium text-foreground" : "text-muted-foreground hover:text-foreground"}
            >
              后台
            </Link>
          )}
          {user ? (
            <button onClick={logout} className="text-muted-foreground hover:text-foreground">
              退出
            </button>
          ) : (
            <Link
              to="/login"
              className={pathname === "/login" ? "font-medium text-foreground" : "text-muted-foreground hover:text-foreground"}
            >
              登录
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
