import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const refreshRole = async (u: User | null) => {
      if (!u) {
        if (mounted) setIsAdmin(false);
        return;
      }
      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", u.id);
      if (mounted) setIsAdmin(!!data?.some((r) => r.role === "admin"));
    };

    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user ?? null);
      setTimeout(() => refreshRole(session?.user ?? null), 0);
    });

    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null);
      refreshRole(data.session?.user ?? null).finally(() => mounted && setLoading(false));
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  return { user, isAdmin, loading };
}
