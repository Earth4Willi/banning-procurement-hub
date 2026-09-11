-- 0007_staff.sql - Staff accounts + quote attachments + quote analytics fields
-- Apply via `npm run supabase:migrate 0007` (runner). Idempotent: safe to run twice.
-- REVIEW BEFORE APPLYING: the app talks to Postgres only through the service-role
-- key (which bypasses RLS), so enabling RLS with zero policies cannot break the
-- app; its purpose is to make a leaked anon key inert. Hardening follows 0006.

-- ---------------------------------------------------------------------------
-- 1. staff table
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.staff (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email CITEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  totp_secret TEXT,
  scopes JSONB NOT NULL DEFAULT '["messages"]'::jsonb,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.staff IS
  'Staff accounts with scoped backend access. Scopes mirror admin views: '
  'messages, customers, materials, inventory, analytics, settings, staff, profile.';
COMMENT ON COLUMN public.staff.scopes IS
  'JSON array of granted scopes; the owner is an implicit superuser.';
COMMENT ON COLUMN public.staff.totp_secret IS
  'Optional base32 TOTP secret. NULL means the staff member logs in without 2FA.';

-- ---------------------------------------------------------------------------
-- 2. quote attachments (Section 4: customer file uploads)
-- ---------------------------------------------------------------------------
ALTER TABLE public.quotes
  ADD COLUMN IF NOT EXISTS attachment_urls JSONB NOT NULL DEFAULT '[]'::jsonb;

COMMENT ON COLUMN public.quotes.attachment_urls IS
  'Array of uploaded attachment objects: { name, url, size }.';

-- Quote analytics fields feeding /api/admin/analytics.
ALTER TABLE public.quotes
  ADD COLUMN IF NOT EXISTS owned_by TEXT;

-- ---------------------------------------------------------------------------
-- 3. RLS FORCE hardening (mirrors 0006)
-- ---------------------------------------------------------------------------
ALTER TABLE IF EXISTS public.staff ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'staff' AND relnamespace = 'public'::regnamespace) THEN
    ALTER TABLE public.staff FORCE ROW LEVEL SECURITY;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'quotes' AND relnamespace = 'public'::regnamespace) THEN
    ALTER TABLE public.quotes FORCE ROW LEVEL SECURITY;
  END IF;
END $$;