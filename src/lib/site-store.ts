// Simple localStorage-backed site settings + content store.
// All defaults are only used until the user saves anything in 后台.

export interface SiteSettings {
  siteName: string;
  logo: string; // data URL or http url
  heroTitle: string;
  subtitle: string;
  contentHtml: string;
}

const KEY = "geek-resource-site:v1";

export const DEFAULT_SETTINGS: SiteSettings = {
  siteName: "极客软件馆",
  logo: "",
  heroTitle: "软件目录",
  subtitle: "精选软件、网站与教程，点击名称即可查看对应文章，文章底部免费获取软件！",
  contentHtml: "",
};

export function loadSettings(): SiteSettings {
  if (typeof window === "undefined") return DEFAULT_SETTINGS;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(raw);
    return { ...DEFAULT_SETTINGS, ...parsed };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(s: SiteSettings) {
  localStorage.setItem(KEY, JSON.stringify(s));
  window.dispatchEvent(new CustomEvent("site-settings-updated"));
}

export function hasCustomSettings(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(KEY) !== null;
}
