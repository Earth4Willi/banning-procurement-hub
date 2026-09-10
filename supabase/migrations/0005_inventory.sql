-- 0005_inventory.sql - Automatic inventory & stock status system
-- Apply via `npm run supabase:migrate 0005` (runner). Idempotent: safe to run twice.

-- ---------------------------------------------------------------------------
-- 1. Add new columns to products
-- ---------------------------------------------------------------------------
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS stock_quantity integer NOT NULL DEFAULT 0;

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS low_stock_threshold integer NOT NULL DEFAULT 10;

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS track_inventory boolean NOT NULL DEFAULT true;

-- ---------------------------------------------------------------------------
-- 2. Backfill from legacy stock labels, then drop the legacy column.
--    Guarded on column existence so re-running the migration is a no-op
--    (the UPDATEs would fail once `stock` is gone).
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'products'
      AND column_name = 'stock'
  ) THEN
    UPDATE public.products SET stock_quantity = 100 WHERE stock = 'in';
    UPDATE public.products SET stock_quantity = 5   WHERE stock = 'limited';
    UPDATE public.products SET stock_quantity = 0   WHERE stock = 'out';

    -- Mark measure/bulk products as non-tracked (Available on Request)
    UPDATE public.products SET track_inventory = false WHERE kind = 'measure';

    ALTER TABLE public.products DROP COLUMN stock;
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 3. Non-negative constraint (backstop)
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'chk_stock_quantity_non_negative'
      AND conrelid = 'public.products'::regclass
  ) THEN
    ALTER TABLE public.products
      ADD CONSTRAINT chk_stock_quantity_non_negative
      CHECK (stock_quantity >= 0);
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 4. Inventory history table
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.inventory_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  previous_quantity integer NOT NULL DEFAULT 0,
  quantity_changed integer NOT NULL,
  new_quantity integer NOT NULL,
  change_type text NOT NULL,
  reference_id text,
  changed_by text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_inventory_history_product
  ON public.inventory_history (product_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_inventory_history_created
  ON public.inventory_history (created_at DESC);

-- ---------------------------------------------------------------------------
-- 5. Seed initial inventory history entries for existing products
-- ---------------------------------------------------------------------------
INSERT INTO public.inventory_history (
  product_id, previous_quantity, quantity_changed, new_quantity, change_type, changed_by
)
SELECT
  p.id,
  0,
  p.stock_quantity,
  p.stock_quantity,
  'initial_stock',
  'system'
FROM public.products p
WHERE NOT EXISTS (
  SELECT 1 FROM public.inventory_history h WHERE h.product_id = p.id
);