-- 0004_phase3.sql - Accounts, online orders, site settings + catalog sync
-- Apply via Supabase SQL Editor. Idempotent: safe to run twice.

create extension if not exists citext;

-- Users
create table if not exists public.users (
  id uuid primary key default gen_random_uuid(),
  email citext not null unique,
  phone text not null unique,
  name text not null default '',
  area text not null default '',
  address text not null default '',
  password_hash text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Quote attachments
alter table public.quotes add column if not exists user_id uuid references public.users(id) on delete set null;
alter table public.quotes add column if not exists delivery_address text not null default '';
alter table public.quotes add column if not exists intended_payment_method text not null default '';
create index if not exists quotes_user_id_idx on public.quotes (user_id);
create index if not exists users_phone_idx on public.users (phone);

-- Site settings (key -> jsonb, seeded from src/lib/site.ts)
create table if not exists public.site_settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);

insert into public.site_settings (key, value) values
  ('site', '{"name":"Banning Procurement Hub","tagline":"Your one-stop source for quality building materials across Ghana.","phoneDisplay":"055 885 0667","phoneIntl":"+233558850667","whatsappNumber":"233558850667","email":"banning173@gmail.com","address":"Office location shared on request. Serving all 16 regions of Ghana.","addressShort":"Accra, Ghana","hours":{"summary":"Mon to Sat, 8am to 6pm","detail":"Monday to Saturday: 8:00am to 6:00pm. Sunday: by appointment."},"mapEmbedUrl":"https://maps.google.com/maps?q=Accra%2C%20Ghana&t=&z=12&ie=UTF8&iwloc=&output=embed","responsePromise":"Quotes within 24 hours","guarantee":"Every material is quality-checked before delivery. Replacements or refunds for genuine defects."}'::jsonb),
  ('marquee', '{"messages":["Quotes within 24 hours","Delivered across all 16 regions"]}'::jsonb),
  ('payments', '{"methods":["mobile_money","bank","cash"],"bank":{"bankName":"","accountName":"","accountNumber":""}}'::jsonb),
  ('delivery', '{"areas":["Greater Accra","Ashanti","Central","Western","Eastern","Volta","Ahafo","Bono","Bono East","Oti","Northern","North East","Savannah","Upper East","Upper West","Western North"]}'::jsonb)
on conflict (key) do nothing;