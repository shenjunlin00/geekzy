import { createServerFn } from "@tanstack/react-start";

/**
 * Public read of settings + published notes. Used by the index route loader
 * so the SSR HTML already contains data and the page paints with zero
 * visible loading time.
 */
export const getPublicSiteData = createServerFn({ method: "GET" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const [s, n] = await Promise.all([
    supabaseAdmin
      .from("site_settings")
      .select(
        "site_name, logo, hero_title, subtitle, text_modules, icon_modules, available_tags, password_enabled, password_prompt_title, password_prompt_text, password_prompt_link_text, password_prompt_link_url",
      )
      .eq("id", 1)
      .maybeSingle(),
    supabaseAdmin
      .from("notes")
      .select("id, slug, content, tags, published, created_at, updated_at")
      .eq("published", true)
      .order("updated_at", { ascending: false }),
  ]);
  return { settings: s.data ?? null, notes: n.data ?? [] };
});
