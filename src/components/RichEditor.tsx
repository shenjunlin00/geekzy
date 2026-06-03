import { useEffect, useRef } from "react";

const URL_RE = /(https?:\/\/[^\s<]+)/g;

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!,
  );
}

function linkifyText(text: string): string {
  return escapeHtml(text).replace(
    URL_RE,
    (url) =>
      `<a href="${url}" target="_blank" rel="noopener noreferrer" class="text-primary underline break-all">${url}</a>`,
  );
}

/**
 * Normalize pasted text:
 * - Split into "chunks" separated by one or more blank lines (a "chunk" = one resource)
 * - Within a chunk, collapse consecutive blank lines, keep single line breaks
 * - Between chunks, enforce exactly ONE blank line
 */
function normalizePastedText(text: string): string {
  const lines = text.replace(/\r\n/g, "\n").split("\n");
  const chunks: string[][] = [];
  let cur: string[] = [];
  for (const raw of lines) {
    const line = raw.trim();
    if (!line) {
      if (cur.length) {
        chunks.push(cur);
        cur = [];
      }
    } else {
      cur.push(line);
    }
  }
  if (cur.length) chunks.push(cur);

  return chunks
    .map((c) => c.map((l) => linkifyText(l)).join("<br/>"))
    .join("<br/><br/>"); // one blank line between resources
}

interface Props {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  minHeight?: string;
}

/**
 * ContentEditable rich editor with auto link detection, paste auto-format,
 * and inline-embed for pasted images.
 */
export function RichEditor({ value, onChange, placeholder, minHeight = "400px" }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (el.innerHTML !== value) el.innerHTML = value;
  }, [value]);

  const emit = () => {
    if (ref.current) onChange(ref.current.innerHTML);
  };

  const handlePaste = async (e: React.ClipboardEvent<HTMLDivElement>) => {
    const cd = e.clipboardData;
    if (!cd) return;

    const imageItems = Array.from(cd.items).filter((it) => it.type.startsWith("image/"));
    if (imageItems.length > 0) {
      e.preventDefault();
      for (const item of imageItems) {
        const file = item.getAsFile();
        if (!file) continue;
        const dataUrl = await new Promise<string>((resolve) => {
          const r = new FileReader();
          r.onload = () => resolve(String(r.result));
          r.readAsDataURL(file);
        });
        document.execCommand(
          "insertHTML",
          false,
          `<img src="${dataUrl}" alt="" style="max-width:100%;border-radius:8px;margin:8px 0;" />`,
        );
      }
      emit();
      return;
    }

    const text = cd.getData("text/plain");
    if (text) {
      e.preventDefault();
      document.execCommand("insertHTML", false, normalizePastedText(text));
      emit();
    }
  };

  return (
    <div
      ref={ref}
      contentEditable
      suppressContentEditableWarning
      onInput={emit}
      onBlur={emit}
      onPaste={handlePaste}
      data-placeholder={placeholder ?? ""}
      style={{ minHeight }}
      className="w-full rounded-md border border-input bg-background p-4 text-sm leading-7 text-foreground outline-none focus:ring-2 focus:ring-ring [&_a]:text-primary [&_a]:underline [&_img]:my-2 [&_img]:max-w-full [&_img]:rounded empty:before:content-[attr(data-placeholder)] empty:before:text-muted-foreground"
    />
  );
}
