
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.snapshot_note_revision() from public, anon, authenticated;
revoke execute on function public.snapshot_note_revision_update() from public, anon, authenticated;
revoke execute on function public.has_role(uuid, public.app_role) from public, anon;
-- has_role still callable by authenticated for RLS evaluation is fine via security definer; but per linter we revoke from authenticated too since policies use it via planner with definer rights regardless.
revoke execute on function public.has_role(uuid, public.app_role) from authenticated;
