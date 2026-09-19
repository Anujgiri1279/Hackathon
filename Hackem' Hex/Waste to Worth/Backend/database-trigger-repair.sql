-- Select and run this entire file in Supabase SQL Editor.
-- It is safe when the project has only been partially initialized.
CREATE TABLE IF NOT EXISTS public.user_profiles (
  id UUID PRIMARY KEY,
  full_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  location TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
  IF to_regclass('public.user_profiles') IS NOT NULL THEN
    DROP TRIGGER IF EXISTS update_user_profiles_updated_at ON public.user_profiles;
    CREATE TRIGGER update_user_profiles_updated_at
    BEFORE UPDATE ON public.user_profiles
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
  END IF;
  IF to_regclass('public.analyses') IS NOT NULL THEN
    DROP TRIGGER IF EXISTS update_analyses_updated_at ON public.analyses;
    CREATE TRIGGER update_analyses_updated_at
    BEFORE UPDATE ON public.analyses
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
  END IF;
  IF to_regclass('public.marketplace_listings') IS NOT NULL THEN
    DROP TRIGGER IF EXISTS update_marketplace_updated_at ON public.marketplace_listings;
    CREATE TRIGGER update_marketplace_updated_at
    BEFORE UPDATE ON public.marketplace_listings
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
  END IF;
  IF to_regclass('public.services') IS NOT NULL THEN
    DROP TRIGGER IF EXISTS update_services_updated_at ON public.services;
    CREATE TRIGGER update_services_updated_at
    BEFORE UPDATE ON public.services
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
  END IF;
END;
$$;

-- Prevent duplicate service seed records on future setup runs.
DELETE FROM public.services AS first
USING public.services AS duplicate
WHERE lower(first.name) = lower(duplicate.name)
  AND first.type = duplicate.type
  AND first.location = duplicate.location
  AND first.id > duplicate.id;

CREATE UNIQUE INDEX IF NOT EXISTS idx_services_provider_identity
ON public.services (lower(name), type, location);
