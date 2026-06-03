CREATE OR REPLACE FUNCTION public.verify_unlock_password(_input text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.site_secrets
    WHERE id = 1
      AND unlock_password <> ''
      AND unlock_password = _input
  );
$$;

REVOKE ALL ON FUNCTION public.verify_unlock_password(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.verify_unlock_password(text) TO anon, authenticated, service_role;