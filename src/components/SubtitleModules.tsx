import { useState } from "react";
import type { IconModule, TextModule } from "@/lib/site-store";

export function SubtitleModules({
  texts,
  icons,
}: {
  texts: TextModule[];
  icons: IconModule[];
}) {
  const [popup, setPopup] = useState<IconModule | null>(null);

  if (texts.length === 0 && icons.length === 0) return null;

  return (
    <>
      {texts.length > 0 && (
        <div className="mt-4 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-sm">
          {texts.map((t) =>
            t.url ? (
              <a
                key={t.id}
                href={t.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary underline-offset-4 hover:underline"
              >
                {t.text}
              </a>
            ) : (
              <span key={t.id} className="text-muted-foreground">
                {t.text}
              </span>
            ),
          )}
        </div>
      )}

      {icons.length > 0 && (
        <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
          {icons.map((ic) => {
            const onClick = () => {
              if (ic.mode === "link" && ic.link_url) {
                window.open(ic.link_url, "_blank", "noopener,noreferrer");
              } else {
                setPopup(ic);
              }
            };
            return (
              <button
                key={ic.id}
                onClick={onClick}
                title={ic.label}
                className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full border border-border bg-card transition hover:scale-105"
              >
                {ic.icon ? (
                  <img src={ic.icon} alt={ic.label} className="h-full w-full object-cover" />
                ) : (
                  <span className="text-xs">{ic.label.slice(0, 1) || "·"}</span>
                )}
              </button>
            );
          })}
        </div>
      )}

      {popup && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onClick={() => setPopup(null)}
        >
          <div
            className="w-full max-w-sm rounded-xl bg-background p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            {popup.popup_title && (
              <h3 className="mb-2 text-center text-lg font-bold text-foreground">
                {popup.popup_title}
              </h3>
            )}
            {popup.qr_url && (
              <img
                src={popup.qr_url}
                alt="qr"
                className="mx-auto my-3 h-48 w-48 rounded-md object-contain"
              />
            )}
            {popup.popup_text && (
              <p className="whitespace-pre-line text-center text-sm text-muted-foreground">
                {popup.popup_text}
              </p>
            )}
            <button
              onClick={() => setPopup(null)}
              className="mt-4 h-9 w-full rounded-md bg-primary text-sm text-primary-foreground hover:bg-primary/90"
            >
              关闭
            </button>
          </div>
        </div>
      )}
    </>
  );
}
