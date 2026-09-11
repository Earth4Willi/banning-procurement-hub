-- 0006_hardening.sql - Defense-in-depth hardening
-- Apply via `npm run supabase:migrate 0006` (runner). Idempotent: safe to run twice.
-- REVIEW BEFORE APPLYING: the app talks to Postgres only through the service-role
-- key (which bypasses RLS), so enabling RLS with zero policies cannot break the
-- app; its purpose is to make a leaked anon key inert.

-- ---------------------------------------------------------------------------
-- 1. Change-type vocabulary constraint on inventory_history
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'chk_inventory_history_change_type'
      AND conrelid = 'public.inventory_history'::regclass
  ) THEN
    ALTER TABLE public.inventory_history
      ADD CONSTRAINT chk_inventory_history_change_type
      CHECK (change_type IN (
        'initial_stock',
        'stock_addition',
        'stock_adjustment',
        'manual_correction',
        'order',
        'order_cancellation'
      ));
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 2. Enable RLS with no policies on every table the backend touches.
--    With no policies, non-service-role access (anon/authenticated) is
--    fully denied. Add explicit policies here if a public role is ever needed
--    (e.g. a future direct client read of the public catalog).
-- ---------------------------------------------------------------------------
ALTER TABLE IF EXISTS public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.site_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.inventory_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.security_events ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'users' AND relnamespace = 'public'::regnamespace) THEN
    ALTER TABLE public.users FORCE ROW LEVEL SECURITY;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'categories' AND relnamespace = 'public'::regnamespace) THEN
    ALTER TABLE public.categories FORCE ROW LEVEL SECURITY;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'products' AND relnamespace = 'public'::regnamespace) THEN
    ALTER TABLE public.products FORCE ROW LEVEL SECURITY;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'messages' AND relnamespace = 'public'::regnamespace) THEN
    ALTER TABLE public.messages FORCE ROW LEVEL SECURITY;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'customers' AND relnamespace = 'public'::regnamespace) THEN
    ALTER TABLE public.customers FORCE ROW LEVEL SECURITY;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'quotes' AND relnamespace = 'public'::regnamespace) THEN
    ALTER TABLE public.quotes FORCE ROW LEVEL SECURITY;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'site_settings' AND relnamespace = 'public'::regnamespace) THEN
    ALTER TABLE public.site_settings FORCE ROW LEVEL SECURITY;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'inventory_history' AND relnamespace = 'public'::regnamespace) THEN
    ALTER TABLE public.inventory_history FORCE ROW LEVEL SECURITY;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'security_events' AND relnamespace = 'public'::regnamespace) THEN
    ALTER TABLE public.security_events FORCE ROW LEVEL SECURITY;
  END IF;
END $$;