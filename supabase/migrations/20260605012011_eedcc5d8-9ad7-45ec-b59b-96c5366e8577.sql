
CREATE OR REPLACE FUNCTION public.gen_note_slug() RETURNS TEXT
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  chars TEXT := 'abcdefghijkmnpqrstuvwxyz23456789';
  result TEXT;
  i INT;
  cnt INT;
BEGIN
  LOOP
    result := '';
    FOR i IN 1..5 LOOP
      result := result || substr(chars, 1 + floor(random()*length(chars))::int, 1);
    END LOOP;
    SELECT count(*) INTO cnt FROM public.notes WHERE slug = result;
    EXIT WHEN cnt = 0;
  END LOOP;
  RETURN result;
END$$;

REVOKE EXECUTE ON FUNCTION public.gen_note_slug() FROM PUBLIC, anon, authenticated;
