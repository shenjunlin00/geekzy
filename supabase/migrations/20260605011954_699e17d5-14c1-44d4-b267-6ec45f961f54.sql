
-- Add short slug for note share links
ALTER TABLE public.notes ADD COLUMN IF NOT EXISTS slug TEXT;

CREATE OR REPLACE FUNCTION public.gen_note_slug() RETURNS TEXT
LANGUAGE plpgsql AS $$
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

UPDATE public.notes SET slug = public.gen_note_slug() WHERE slug IS NULL;

ALTER TABLE public.notes ALTER COLUMN slug SET DEFAULT public.gen_note_slug();
ALTER TABLE public.notes ALTER COLUMN slug SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS notes_slug_unique_idx ON public.notes (slug);
