import { supabase } from "@/integrations/supabase/client";

export interface Note {
  id: string;
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

export async function fetchNotes(opts: { includeUnpublished?: boolean } = {}) {
  let q = supabase
    .from("notes")
    .select("id, content, tags, published, created_at, updated_at")
    .order("updated_at", { ascending: false });
  if (!opts.includeUnpublished) q = q.eq("published", true);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as Note[];
}

export async function createNote(content: string, tags: string[] = [], published = true) {
  const { data, error } = await supabase
    .from("notes")
    .insert({ content, tags, published })
    .select()
    .single();
  if (error) throw error;
  return data as Note;
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
