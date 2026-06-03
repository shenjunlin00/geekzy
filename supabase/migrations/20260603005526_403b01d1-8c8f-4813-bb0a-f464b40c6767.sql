-- Add new site settings columns
ALTER TABLE public.site_settings
  ADD COLUMN IF NOT EXISTS text_modules jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS icon_modules jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS available_tags text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS password_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS password_prompt_title text NOT NULL DEFAULT '查看完整内容',
  ADD COLUMN IF NOT EXISTS password_prompt_text text NOT NULL DEFAULT '请输入访问密码以查看全部资源',
  ADD COLUMN IF NOT EXISTS password_prompt_link_text text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS password_prompt_link_url text NOT NULL DEFAULT '';

-- Separate secrets table: only admins can read/write, never exposed to anon
CREATE TABLE IF NOT EXISTS public.site_secrets (
  id integer PRIMARY KEY DEFAULT 1,
  unlock_password text NOT NULL DEFAULT '',
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT site_secrets_singleton CHECK (id = 1)
);

GRANT SELECT, INSERT, UPDATE ON public.site_secrets TO authenticated;
GRANT ALL ON public.site_secrets TO service_role;

ALTER TABLE public.site_secrets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admins read secrets" ON public.site_secrets;
CREATE POLICY "admins read secrets" ON public.site_secrets
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "admins update secrets" ON public.site_secrets;
CREATE POLICY "admins update secrets" ON public.site_secrets
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "admins insert secrets" ON public.site_secrets;
CREATE POLICY "admins insert secrets" ON public.site_secrets
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

INSERT INTO public.site_secrets (id, unlock_password) VALUES (1, '')
ON CONFLICT (id) DO NOTHING;