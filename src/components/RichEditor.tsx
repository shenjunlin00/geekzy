import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

/** Downscale + re-encode a pasted image so notes stay light. */
async function compressImage(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const max = 1600;
  const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  return await new Promise<Blob>((resolve) =>
    canvas.toBlob((b) => resolve(b ?? file), "image/webp", 0.8),
  );
}

/** Upload to the images bucket; returns a lightweight URL (falls back to data URL). */
async function uploadImage(file: File): Promise<string> {
  try {
    const blob = await compressImage(file);
    const name = `${crypto.randomUUID()}.webp`;
    const { error } = await supabase.storage
      .from("note-images")
      .upload(name, blob, { contentType: "image/webp", upsert: true });
    if (error) throw error;
    return `/api/public/img/${name}`;
  } catch (e) {
    console.error("image upload failed, embedding inline", e);
    return await new Promise<string>((resolve) => {
      const r = new FileReader();
      r.onload = () => resolve(String(r.result));
      r.readAsDataURL(file);
    });
  }
}

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
