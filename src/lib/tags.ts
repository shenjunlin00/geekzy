// Strip HTML for plain text use (search, copy fallback).
export function stripHtml(html: string) {
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

// Convert note HTML to a plain-text representation for copy/share.
export function htmlToPlainText(html: string): string {
  if (typeof window === "undefined") {
    return html.replace(/<br\s*\/?>/gi, "\n").replace(/<[^>]+>/g, "").trim();
  }
  const tmp = document.createElement("div");
  tmp.innerHTML = html;
  // Convert <br>, <p>, <div> to newlines for cleaner copy
  tmp.querySelectorAll("br").forEach((br) => br.replaceWith("\n"));
  tmp.querySelectorAll("p, div").forEach((el) => {
    el.append("\n");
  });
  return (tmp.textContent ?? "").replace(/\n{3,}/g, "\n\n").trim();
}
