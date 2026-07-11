-- Transmisiones Nunez - Trabajos realizados en inicio.
-- Ejecuta este SQL una vez en Supabase SQL Editor.

create table if not exists public.work_showcase (
  id uuid primary key default gen_random_uuid(),
  slot integer not null unique check (slot >= 1 and slot <= 3),
  titulo text not null,
  descripcion text not null,
  imagen text default null,
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.work_showcase add column if not exists slot integer not null default 1;
alter table public.work_showcase add column if not exists titulo text not null default 'Trabajo realizado';
alter table public.work_showcase add column if not exists descripcion text not null default 'Descripcion del trabajo realizado.';
alter table public.work_showcase add column if not exists imagen text default null;
alter table public.work_showcase add column if not exists enabled boolean not null default true;
alter table public.work_showcase add column if not exists created_at timestamptz not null default now();
alter table public.work_showcase add column if not exists updated_at timestamptz not null default now();

create unique index if not exists work_showcase_slot_key on public.work_showcase (slot);

create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_work_showcase_updated_at on public.work_showcase;
create trigger trg_work_showcase_updated_at
before update on public.work_showcase
for each row execute function public.set_updated_at();

alter table public.work_showcase enable row level security;

grant usage on schema public to anon, authenticated;
grant select on public.work_showcase to anon, authenticated;
grant select, insert, update, delete on public.work_showcase to authenticated;

drop policy if exists "work_showcase_read_public" on public.work_showcase;
create policy "work_showcase_read_public" on public.work_showcase
for select to anon, authenticated using (enabled = true);

drop policy if exists "work_showcase_admin_write" on public.work_showcase;
create policy "work_showcase_admin_write" on public.work_showcase
for all to authenticated
using ((auth.jwt() ->> 'email') = 'transmisionesnunezz@gmail.com')
with check ((auth.jwt() ->> 'email') = 'transmisionesnunezz@gmail.com');
