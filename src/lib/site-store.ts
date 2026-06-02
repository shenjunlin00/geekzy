// Cloud-backed site settings. Reads via supabase RLS (public read).
import { supabase } from "@/integrations/supabase/client";

export interface SiteSettings {
  site_name: string;
  logo: string;
  hero_title: string;
  subtitle: string;
}

export const DEFAULT_SETTINGS: SiteSettings = {
  site_name: "极客软件馆",
  logo: "",
  hero_title: "软件目录",
  subtitle: "精选软件、网站与教程",
};

export async function fetchSettings(): Promise<SiteSettings> {
  const { data } = await supabase
    .from("site_settings")
    .select("site_name, logo, hero_title, subtitle")
    .eq("id", 1)
    .maybeSingle();
  return data ?? DEFAULT_SETTINGS;
}

export async function updateSettings(s: SiteSettings) {
  const { error } = await supabase
    .from("site_settings")
    .update({ ...s, updated_at: new Date().toISOString() })
    .eq("id", 1);
  if (error) throw error;
}
