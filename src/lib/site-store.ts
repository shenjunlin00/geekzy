// Cloud-backed site settings, with localStorage cache to avoid flash of defaults.
import { supabase } from "@/integrations/supabase/client";

export interface TextModule {
  id: string;
  text: string;
  url: string;
  color?: string; // hex/css color for the link
  blink?: boolean; // whether to apply blink/pulse animation
}

export interface IconModule {
  id: string;
  icon: string;
  label: string;
  mode: "link" | "qr";
  link_url: string;
  qr_url: string;
  popup_title: string;
  popup_text: string;
}

export interface SiteSettings {
  site_name: string;
  logo: string;
  hero_title: string;
  subtitle: string;
  text_modules: TextModule[];
  icon_modules: IconModule[];
  available_tags: string[];
  password_enabled: boolean;
  password_prompt_title: string;
  password_prompt_text: string;
  password_prompt_link_text: string;
  password_prompt_link_url: string;
}

export const DEFAULT_SETTINGS: SiteSettings = {
  site_name: "极客软件馆",
  logo: "",
  hero_title: "软件目录",
  subtitle: "精选软件、网站与教程",
  text_modules: [],
  icon_modules: [],
  available_tags: [],
  password_enabled: false,
  password_prompt_title: "查看完整内容",
  password_prompt_text: "请输入访问密码以查看全部资源",
  password_prompt_link_text: "",
  password_prompt_link_url: "",
};

const CACHE_KEY = "site_settings_v2";
const UNLOCK_KEY = "site_unlocked_at";
const UNLOCK_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

export function getCachedSettings(): SiteSettings | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return null;
  }
}

function cache(s: SiteSettings) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(s));
  } catch {}
}

export async function fetchSettings(): Promise<SiteSettings> {
  const { data } = await supabase
    .from("site_settings")
    .select(
      "site_name, logo, hero_title, subtitle, text_modules, icon_modules, available_tags, password_enabled, password_prompt_title, password_prompt_text, password_prompt_link_text, password_prompt_link_url",
    )
    .eq("id", 1)
    .maybeSingle();
  const d = (data ?? {}) as Record<string, unknown>;
  const merged: SiteSettings = {
    ...DEFAULT_SETTINGS,
    ...(data ?? {}),
    text_modules: (d.text_modules as unknown as TextModule[]) ?? [],
    icon_modules: (d.icon_modules as unknown as IconModule[]) ?? [],
    available_tags: (d.available_tags as string[]) ?? [],
  };
  cache(merged);
  return merged;
}

export async function updateSettings(s: SiteSettings) {
  const payload = {
    site_name: s.site_name,
    logo: s.logo,
    hero_title: s.hero_title,
    subtitle: s.subtitle,
    text_modules: s.text_modules as unknown as never,
    icon_modules: s.icon_modules as unknown as never,
    available_tags: s.available_tags,
    password_enabled: s.password_enabled,
    password_prompt_title: s.password_prompt_title,
    password_prompt_text: s.password_prompt_text,
    password_prompt_link_text: s.password_prompt_link_text,
    password_prompt_link_url: s.password_prompt_link_url,
    updated_at: new Date().toISOString(),
  };
  const { error } = await supabase.from("site_settings").update(payload).eq("id", 1);
  if (error) throw error;
  cache(s);
}

export async function fetchUnlockPassword(): Promise<string> {
  const { data } = await supabase.from("site_secrets").select("unlock_password").eq("id", 1).maybeSingle();
  return data?.unlock_password ?? "";
}

export async function saveUnlockPassword(p: string) {
  const { error } = await supabase
    .from("site_secrets")
    .update({ unlock_password: p, updated_at: new Date().toISOString() })
    .eq("id", 1);
  if (error) throw error;
}

export async function verifyUnlockPassword(input: string): Promise<boolean> {
  const { data, error } = await (supabase.rpc as unknown as (
    fn: string,
    args: Record<string, unknown>,
  ) => Promise<{ data: boolean | null; error: unknown }>)(
    "verify_unlock_password",
    { _input: input },
  );
  if (error) {
    console.error(error);
    return false;
  }
  return data === true;
}

export function isUnlocked(): boolean {
  if (typeof window === "undefined") return false;
  const ts = localStorage.getItem(UNLOCK_KEY);
  if (!ts) return false;
  const t = Number(ts);
  if (!Number.isFinite(t)) return false;
  if (Date.now() - t > UNLOCK_TTL_MS) {
    localStorage.removeItem(UNLOCK_KEY);
    return false;
  }
  return true;
}

export function setUnlocked(v: boolean) {
  if (typeof window === "undefined") return;
  if (v) localStorage.setItem(UNLOCK_KEY, String(Date.now()));
  else localStorage.removeItem(UNLOCK_KEY);
}
