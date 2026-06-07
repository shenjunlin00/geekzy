ALTER FUNCTION public.gen_note_slug() SECURITY DEFINER;
GRANT EXECUTE ON FUNCTION public.gen_note_slug() TO authenticated, anon, service_role;