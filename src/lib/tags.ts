// Auto extract tags from a note's HTML content.
// 1) Explicit hashtags: #关键词 or #keyword
// 2) Implicit: first label of each URL host (github.com -> github)
export function extractTags(html: string): string[] {
  const text = html.replace(/<[^>]+>/g, " ");
  const tags = new Set<string>();
  for (const m of text.matchAll(/#([\u4e00-\u9fa5A-Za-z0-9_-]{2,24})/g)) {
    tags.add(m[1].toLowerCase());
  }
  for (const m of html.matchAll(/https?:\/\/([^/\s"'<>]+)/g)) {
    const host = m[1].replace(/^www\./, "");
    const label = host.split(".")[0];
    if (label && label.length <= 24) tags.add(label.toLowerCase());
  }
  return Array.from(tags).slice(0, 12);
}

export function stripHtml(html: string) {
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}
