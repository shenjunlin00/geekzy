import { createFileRoute } from "@tanstack/react-router";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;

/** Serves note images from the private storage bucket with long-lived caching. */
export const Route = createFileRoute("/api/public/img/$")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const path = (params as { _splat?: string })._splat ?? "";
        if (!path || path.includes("..")) return new Response("Bad path", { status: 400 });

        const upstream = await fetch(
          `${SUPABASE_URL}/storage/v1/object/note-images/${path}`,
          { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` } },
        );
        if (!upstream.ok) return new Response("Not found", { status: 404 });

        return new Response(upstream.body, {
          headers: {
            "Content-Type": upstream.headers.get("content-type") ?? "image/webp",
            "Cache-Control": "public, max-age=31536000, immutable",
          },
        });
      },
    },
  },
});
