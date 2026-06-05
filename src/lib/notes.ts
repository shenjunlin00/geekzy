import { supabase } from "@/integrations/supabase/client";

export interface Note {
  id: string;
  slug: string;
  content: string;
  tags: string[];
  published: boolean;
  created_at: string;
  updated_at: string;
}

export interface NoteRevision {
  id: string;
  note_id: string;
  content: string;
  tags: string[];
  edited_at: string;
}

const NOTES_CACHE_KEY = "notes_cache_v2";

export function getCachedNotes(): Note[] | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(NOTES_CACHE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as Note[];
  } catch {
    return null;
  }
}

function cacheNotes(notes: Note[]) {
  try {
    localStorage.setItem(NOTES_CACHE_KEY, JSON.stringify(notes));
  } catch {}
}

const SELECT = "id, slug, content, tags, published, created_at, updated_at";

export async function fetchNotes(opts: { includeUnpublished?: boolean } = {}) {
  let q = supabase
    .from("notes")
    .select(SELECT)
    .order("updated_at", { ascending: false });
  if (!opts.includeUnpublished) q = q.eq("published", true);
  const { data, error } = await q;
  if (error) throw error;
  const notes = (data ?? []) as unknown as Note[];
  if (!opts.includeUnpublished) cacheNotes(notes);
  return notes;
}

/** Lookup a note by slug (5-char share code) or by UUID id (legacy links). */
export async function fetchNoteBySlugOrId(key: string) {
  // Try slug first
  const bySlug = await supabase.from("notes").select(SELECT).eq("slug", key).maybeSingle();
  if (bySlug.data) return bySlug.data as unknown as Note;
  // UUID fallback
  if (/^[0-9a-f-]{36}$/i.test(key)) {
    const byId = await supabase.from("notes").select(SELECT).eq("id", key).maybeSingle();
    if (byId.data) return byId.data as unknown as Note;
  }
  return null;
}

export async function createNote(content: string, tags: string[] = [], published = true) {
  const { data, error } = await supabase
    .from("notes")
    .insert({ content, tags, published })
    .select(SELECT)
    .single();
  if (error) throw error;
  return data as unknown as Note;
}

export async function updateNote(
  id: string,
  patch: Partial<Pick<Note, "content" | "published" | "tags">>,
) {
  const { error } = await supabase.from("notes").update(patch).eq("id", id);
  if (error) throw error;
}

export async function deleteNote(id: string) {
  const { error } = await supabase.from("notes").delete().eq("id", id);
  if (error) throw error;
}

export async function fetchRevisions(noteId: string) {
  const { data, error } = await supabase
    .from("note_revisions")
    .select("id, note_id, content, tags, edited_at")
    .eq("note_id", noteId)
    .order("edited_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as NoteRevision[];
}
