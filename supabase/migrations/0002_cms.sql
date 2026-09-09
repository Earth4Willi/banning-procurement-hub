-- 0002_cms.sql — Admin panel + DB-backed catalog
-- Apply via the Supabase SQL Editor. Idempotent: safe to run twice.

create table if not exists public.categories (
  id text primary key,
  name text not null,
  short text not null default '',
  description text not null default '',
  image_url text not null default '',
  sort_order integer not null default 0,
  visible boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  category_id text not null references public.categories(id) on delete cascade,
  name text not null,
  brand text not null default '',
  unit text not null default '',
  unit_price text not null default '',
  image_url text not null default '',
  description text not null default '',
  stock text not null default 'in',
  pricing_mode text not null default 'quote',
  kind text not null default 'unit',
  visible boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text not null,
  email text not null default '',
  area text not null default '',
  message text not null default '',
  read boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.customers (
  phone text primary key,
  name text not null default '',
  email text not null default '',
  notes text not null default '',
  status text not null default 'new',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.quotes add column if not exists source text not null default 'web';

-- Seeds (idempotent)
insert into public.categories (id, name, short, description, image_url, sort_order, visible) values
  ('cement', 'Cement', 'Every bag counted, every delivery verified.', 'Quality cement brands for foundations, blocks and finishing, delivered bag-for-bag.', '/materials/cat-cement.jpg', 1, true),
  ('blocks', 'Blocks', 'Hollow and solid blocks, counted and delivered to your gate.', 'Sandcrete hollow and solid blocks in the sizes your walling plan needs, counted block-for-block on delivery.', '/materials/cat-blocks.jpg', 2, true),
  ('iron-rods', 'Iron Rods', 'Structural steel cut, counted and delivered as specified.', 'Reinforcement bars in the sizes and tonnages your structural plan requires.', '/materials/cat-iron-rods.jpg', 3, true),
  ('roofing', 'Roofing Sheets', 'Roofing sheets, nails and accessories in one order.', 'Aluminium and long-span roofing sheets with the accessories to match.', '/materials/cat-roofing.jpg', 4, true),
  ('plumbing', 'Plumbing', 'PVC pipes, fittings and full bathroom rough-ins.', 'Pipes, fittings, valves and accessories for complete plumbing installations.', '/materials/cat-plumbing.jpg', 5, true),
  ('electricals', 'Electricals', 'Cables, conduits, fittings and smart switches.', 'Cable, conduit, sockets, switches and wiring accessories for safe installations.', '/materials/cat-electricals.jpg', 6, true),
  ('paint', 'Paint', 'Interior, exterior, primer and thinner for complete finishes.', 'Emulsion, enamel, primer and thinners for interior and exterior finishing.', '/materials/cat-paint.jpg', 7, true),
  ('tiles', 'Tiles', 'Porcelain, ceramic and wall tiles for every room.', 'Floor and wall tiles for homes, offices and commercial finishes.', '/materials/cat-tiles.jpg', 8, true),
  ('other', 'Other Materials', 'Everything else a site needs, from sand to tools.', 'A catch-all for the rest of your list — sand, tools and site essentials.', '/materials/cat-other.jpg', 9, true)
on conflict (id) do nothing;

insert into public.products (slug, category_id, name, brand, unit, unit_price, image_url, description, stock, pricing_mode, kind, sort_order) values
  ('ghacem-supacem-42-5', 'cement', 'Ghacem Super Cement 42.5R', 'GHACEM', 'bag (50kg)', 'GH₵ 120', '/materials/ghacem-supacem-42-5.jpg', 'General-purpose portland cement for blocks, foundations and slabs.', 'limited', 'fixed', 'unit', 1),
  ('dangote-cement-42-5', 'cement', 'Dangote Cement 42.5', 'Dangote', 'bag (50kg)', 'GH₵ 118', '/materials/dangote-cement-42-5.jpg', 'Consistent-setting portland cement, ideal for site work at scale.', 'in', 'fixed', 'unit', 2),
  ('cestos-cement-32-5', 'cement', 'CESTOS Cement 32.5', 'CESTOS', 'bag (50kg)', 'GH₵ 110', '/materials/cestos-cement-32-5.jpg', 'Value portland cement for render, screed and non-structural work.', 'in', 'fixed', 'unit', 3),
  ('hollow-block-6-inch', 'blocks', 'Hollow Block 6 inch', 'Sandcrete', 'block', 'GH₵ 13', '/materials/hollow-block-6-inch.jpg', 'Sandcrete hollow block for partitions and boundary walls.', 'in', 'fixed', 'unit', 1),
  ('hollow-block-9-inch', 'blocks', 'Hollow Block 9 inch', 'Sandcrete', 'block', 'GH₵ 17', '/materials/hollow-block-9-inch.jpg', 'Load-bearing sandcrete hollow block for main walls.', 'in', 'fixed', 'unit', 2),
  ('sandcrete-solid-block', 'blocks', 'Solid Block 6x9', 'Sandcrete', 'block', 'GH₵ 19', '/materials/sandcrete-solid-block.jpg', 'Solid sandcrete block where extra strength is needed.', 'limited', 'fixed', 'unit', 3),
  ('deformed-bar-12mm', 'iron-rods', 'Deformed Bar 12mm', 'Standard', 'piece (12m)', 'GH₵ 95', '/materials/deformed-bar-12mm.jpg', 'High-yield deformed bar for beams, columns and slabs.', 'in', 'quote', 'unit', 1),
  ('deformed-bar-16mm', 'iron-rods', 'Deformed Bar 16mm', 'Standard', 'piece (12m)', 'GH₵ 168', '/materials/deformed-bar-16mm.jpg', 'Heavy structural reinforcement for columns and transfer beams.', 'limited', 'quote', 'unit', 2),
  ('binding-wire-roll', 'iron-rods', 'Binding Wire', 'Standard', 'roll (3kg)', 'GH₵ 55', '/materials/binding-wire-roll.jpg', 'Soft iron binding wire for tying reinforcement cages.', 'in', 'fixed', 'unit', 3),
  ('long-span-roofing-sheet', 'roofing', 'Long-Span Roofing Sheet', 'Aluworks', 'sheet (6m)', 'GH₵ 165', '/materials/long-span-roofing-sheet.jpg', 'Zincalume long-span sheet with a 10-year warranty.', 'limited', 'quote', 'unit', 1),
  ('roofing-roofmate-r', 'roofing', 'Roofing Sheet Roofmate R', 'Roofmate', 'sheet (6m)', 'GH₵ 175', '/materials/roofing-roofmate-r.jpg', 'Popular corrugated profile for residential roofing.', 'in', 'quote', 'unit', 2),
  ('roofing-nails-2kg', 'roofing', 'Roofing Nails', 'Standard', 'pack (2kg)', 'GH₵ 40', '/materials/roofing-nails-2kg.jpg', 'Galvanised roofing nails with washers, roof-ready.', 'in', 'fixed', 'unit', 3),
  ('pvc-pipe-6-inch', 'plumbing', 'PVC Pipe 6 inch', 'Polytank/Javelin', 'piece (6m)', 'GH₵ 145', '/materials/pvc-pipe-6-inch.jpg', 'High-pressure PVC drainage pipe with sockets.', 'out', 'fixed', 'unit', 1),
  ('pvc-pipe-1-5-inch', 'plumbing', 'PVC Pipe 1.5 inch', 'Javelin', 'piece (6m)', 'GH₵ 32', '/materials/pvc-pipe-1-5-inch.jpg', 'Cold-water supply pipe, pressure rated.', 'in', 'fixed', 'unit', 2),
  ('bathroom-faucet-set', 'plumbing', 'Bathroom Faucet Set', 'Local/PBG', 'set', 'GH₵ 220', '/materials/bathroom-faucet-set.jpg', 'Complete basin, shower and sink mixer set.', 'limited', 'fixed', 'unit', 3),
  ('electric-cable-2-5mm', 'electricals', 'Electric Cable 2.5mm', 'CCA/Oman', 'roll (90m)', 'GH₵ 260', '/materials/electric-cable-2-5mm.jpg', 'Solid copper PVC cable for power circuits and sockets.', 'in', 'fixed', 'unit', 1),
  ('surface-mount-socket', 'electricals', 'Surface Mount Socket', 'Panasonic', 'piece', 'GH₵ 45', '/materials/surface-mount-socket.jpg', 'Double-pole power socket with plain cover.', 'in', 'fixed', 'unit', 2),
  ('led-bulb-15w', 'electricals', 'LED Bulb 15W', 'Philips', 'piece', 'GH₵ 28', '/materials/led-bulb-15w.jpg', 'Warm-white LED, long life, low energy.', 'out', 'fixed', 'unit', 3),
  ('interior-emulsion-20l', 'paint', 'Interior Emulsion 20L', 'Kansai', 'bucket (20L)', 'GH₵ 320', '/materials/interior-emulsion-20l.jpg', 'Washable interior emulsion, single pack.', 'in', 'fixed', 'unit', 1),
  ('exterior-paint-20l', 'paint', 'Exterior Paint 20L', 'Kansai', 'bucket (20L)', 'GH₵ 360', '/materials/exterior-paint-20l.jpg', 'Weather-resistant exterior emulsion or enamel.', 'limited', 'fixed', 'unit', 2),
  ('paint-primer-20l', 'paint', 'Primer 20L', 'Standard', 'bucket (20L)', 'GH₵ 190', '/materials/paint-primer-20l.jpg', 'Wall primer to seal surfaces before the top coat.', 'in', 'fixed', 'unit', 3),
  ('paint-thinner-5l', 'paint', 'Paint Thinner 5L', 'Standard', 'gallon (5L)', 'GH₵ 95', '/materials/paint-thinner-5l.jpg', 'For thinning and cleaning enamel surfaces.', 'in', 'fixed', 'unit', 4),
  ('porcelain-floor-60x60', 'tiles', 'Porcelain Floor 60x60', 'Twyford', 'box (4 pcs)', 'GH₵ 210', '/materials/porcelain-floor-60x60.jpg', 'Matte porcelain floor tile, low water absorption, heavy traffic.', 'in', 'fixed', 'unit', 1),
  ('ceramic-wall-30x60', 'tiles', 'Ceramic Wall 30x60', 'Twyford', 'box (6 pcs)', 'GH₵ 160', '/materials/ceramic-wall-30x60.jpg', 'Glazed ceramic wall tile for bathrooms and kitchens.', 'in', 'fixed', 'unit', 2),
  ('porcelain-floor-80x80', 'tiles', 'Porcelain Floor 80x80', 'Mosaic', 'box (3 pcs)', 'GH₵ 290', '/materials/porcelain-floor-80x80.jpg', 'Large-format polished porcelain for living spaces.', 'limited', 'fixed', 'unit', 3),
  ('sharp-sand', 'other', 'Sharp Sand', 'Local', 'trip (tipper)', 'GH₵ 850', '/materials/sharp-sand.jpg', 'Washed sharp sand for blockwork and plastering, priced by delivery distance.', 'in', 'quote', 'measure', 1),
  ('wheelbarrow', 'other', 'Wheelbarrow', 'Local', 'piece', 'GH₵ 450', '/materials/wheelbarrow.jpg', 'Heavy-duty single-wheel barrow for site use.', 'limited', 'fixed', 'unit', 2),
  ('shovel-spade-set', 'other', 'Shovel & Spade Set', 'Local', 'set', 'GH₵ 180', '/materials/shovel-spade-set.jpg', 'Basic digging and mixing tools for site work.', 'in', 'fixed', 'unit', 3)
on conflict (slug) do nothing;