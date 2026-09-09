-- 0003_quote_documents.sql — Quotation/Receipt lifecycle on quotes
-- Apply via Supabase SQL Editor. Idempotent (safe to paste twice / after 0002).

alter table public.quotes add column if not exists valid_until date;
alter table public.quotes add column if not exists accepted_at timestamptz;
alter table public.quotes add column if not exists paid_at timestamptz;
alter table public.quotes add column if not exists payment_method text;
alter table public.quotes add column if not exists total_amount numeric(12,2);
alter table public.quotes add column if not exists doc_token text;
create unique index if not exists quotes_doc_token_key on public.quotes (doc_token);
