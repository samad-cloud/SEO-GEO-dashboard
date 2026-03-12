create table if not exists public.signup_requests (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  full_name text,
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected')),
  created_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by text
);

-- Allow anyone (anon) to insert a signup request
alter table public.signup_requests enable row level security;

create policy "Anyone can request signup"
  on public.signup_requests
  for insert
  to anon, authenticated
  with check (true);

-- Only service role (admin API routes) can read/update
-- No select/update policy for anon or authenticated users intentionally.
-- Service role bypasses RLS.
