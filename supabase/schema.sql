-- Shared trip data: one flexible table + realtime. Already created in the family's
-- Supabase project by the Montreal app; kept here for reference / a fresh project.
-- Rows for this trip are scoped by trip_id = 'nyc-2026-tatyana' (config.js → TRIP_ID).
create table if not exists mtlqc_items (
  id uuid primary key default gen_random_uuid(),
  trip_id text not null,
  kind text not null,          -- 'vote' | 'agenda' | 'custom' | 'note' | 'check' | 'resv' | 'settings' | 'daynote'
  k text not null,             -- item key (place id, day key, timestamp…)
  v jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  unique (trip_id, kind, k)
);
alter table mtlqc_items enable row level security;
-- The app uses the public anon key; access is scoped only by knowing the trip_id.
create policy "anon read"  on mtlqc_items for select using (true);
create policy "anon write" on mtlqc_items for insert with check (true);
create policy "anon update" on mtlqc_items for update using (true);
alter publication supabase_realtime add table mtlqc_items;
