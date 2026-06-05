import { createServerFn } from "@tanstack/react-start";
import { DEFAULT_SETTINGS, type SiteSettings, type TextModule, type IconModule } from "@/lib/site-store";
import type { Note } from "@/lib/notes";

/**
 * Public read of settings + published notes. Used by the index route loader
 * so the SSR HTML already contains data and the page paints with zero
 * visible loading time.
 */
export const getPublicSiteData = createServerFn({ method: "GET" }).handler(
  async (): Promise<{ settings: SiteSettings; notes: Note[] }> => {
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
    const d = (s.data ?? {}) as Record<string, unknown>;
    const settings: SiteSettings = {
      ...DEFAULT_SETTINGS,
      ...(s.data ?? {}),
      text_modules: (d.text_modules as TextModule[] | null) ?? [],
      icon_modules: (d.icon_modules as IconModule[] | null) ?? [],
      available_tags: (d.available_tags as string[] | null) ?? [],
    };
    return { settings, notes: (n.data ?? []) as unknown as Note[] };
  },
);
