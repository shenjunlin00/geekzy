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

interface Props {
  value: string;
  onChange: (html: string) => void;
}

/**
 * ContentEditable rich editor with auto link detection and pasted-image inline embed.
 */
export function RichEditor({ value, onChange }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  // Sync external value -> editor only when different (avoid caret jumps while typing)
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

    // 1) Pasted image file(s)
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

    // 2) Plain text — auto-linkify URLs, keep line breaks
    const text = cd.getData("text/plain");
    if (text) {
      e.preventDefault();
      const html = text
        .split(/\r?\n/)
        .map((line) => (line.length ? linkifyText(line) : "<br/>"))
        .join("<br/>");
      document.execCommand("insertHTML", false, html);
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
      className="min-h-[400px] w-full rounded-md border border-input bg-background p-4 text-sm leading-7 text-foreground outline-none focus:ring-2 focus:ring-ring [&_a]:text-primary [&_a]:underline [&_img]:my-2 [&_img]:max-w-full [&_img]:rounded"
    />
  );
}
