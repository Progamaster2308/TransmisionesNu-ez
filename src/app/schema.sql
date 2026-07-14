-- Transmisiones Nunez - Esquema Supabase
-- Ejecuta este SQL en el SQL Editor de Supabase.

create extension if not exists pgcrypto;

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  sku text unique not null,
  nombre text not null,
  marca text not null,
  categoria text not null,
  precio integer not null check (precio >= 0),
  "precioOriginal" integer not null default 0 check ("precioOriginal" >= 0),
  descuento text default null,
  imagen text default null,
  rating integer not null default 5 check (rating >= 0 and rating <= 5),
  stock integer not null default 0 check (stock >= 0),
  "envioGratis" boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.products add column if not exists "precioOriginal" integer not null default 0;
alter table public.products add column if not exists "envioGratis" boolean not null default false;
alter table public.products add column if not exists descuento text default null;
alter table public.products add column if not exists imagen text default null;
alter table public.products add column if not exists rating integer not null default 5;
alter table public.products add column if not exists stock integer not null default 0;

create table if not exists public.admin_banner (
  id uuid primary key default gen_random_uuid(),
  titulo text not null,
  subtitulo text default null,
  descripcion text default null,
  cta_label text default 'Ver catalogo',
  cta_link text default '/catalogo',
  imagen text default null,
  splash_image text default null,
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.admin_banner add column if not exists subtitulo text default null;
alter table public.admin_banner add column if not exists descripcion text default null;
alter table public.admin_banner add column if not exists cta_label text default 'Ver catalogo';
alter table public.admin_banner add column if not exists cta_link text default '/catalogo';
alter table public.admin_banner add column if not exists imagen text default null;
alter table public.admin_banner add column if not exists splash_image text default null;
alter table public.admin_banner add column if not exists enabled boolean not null default true;
alter table public.admin_banner add column if not exists updated_at timestamptz not null default now();

create table if not exists public.repair_promotions (
  id uuid primary key default gen_random_uuid(),
  titulo text not null,
  subtitulo text default null,
  descripcion text default null,
  cta_label text default 'Agendar diagnostico',
  cta_link text default '/citas',
  imagen text default null,
  splash_image text default null,
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.repair_promotions add column if not exists subtitulo text default null;
alter table public.repair_promotions add column if not exists descripcion text default null;
alter table public.repair_promotions add column if not exists cta_label text default 'Agendar diagnostico';
alter table public.repair_promotions add column if not exists cta_link text default '/citas';
alter table public.repair_promotions add column if not exists imagen text default null;
alter table public.repair_promotions add column if not exists splash_image text default null;
alter table public.repair_promotions add column if not exists enabled boolean not null default true;
alter table public.repair_promotions add column if not exists updated_at timestamptz not null default now();

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
alter table public.work_showcase add column if not exists descripcion text not null default 'Descripción del trabajo realizado.';
alter table public.work_showcase add column if not exists imagen text default null;
alter table public.work_showcase add column if not exists enabled boolean not null default true;
alter table public.work_showcase add column if not exists created_at timestamptz not null default now();
alter table public.work_showcase add column if not exists updated_at timestamptz not null default now();

create unique index if not exists work_showcase_slot_key on public.work_showcase (slot);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  customer_name text not null,
  customer_email text not null,
  notas text default null,
  pickup_date date not null,
  created_at timestamptz not null default now(),
  status text not null default 'pending' check (status in ('pending','confirmed','cancelled','ready','returned')),
  total integer not null check (total >= 0),
  items jsonb not null default '[]'::jsonb
);

alter table public.orders add column if not exists customer_name text not null default 'Cliente';
alter table public.orders add column if not exists customer_email text not null default 'cliente@example.com';
alter table public.orders add column if not exists notas text default null;
alter table public.orders add column if not exists pickup_date date not null default current_date;
alter table public.orders add column if not exists created_at timestamptz not null default now();
alter table public.orders add column if not exists status text not null default 'pending';
alter table public.orders add column if not exists total integer not null default 0;
alter table public.orders add column if not exists items jsonb not null default '[]'::jsonb;

alter table public.orders
drop constraint if exists orders_status_check;

alter table public.orders
add constraint orders_status_check
check (status in ('pending','confirmed','cancelled','ready','returned'));

create table if not exists public.appointments (
  id uuid primary key default gen_random_uuid(),
  customer_name text not null,
  customer_email text not null,
  phone text default null,
  car text default null,
  model text default null,
  year integer default null,
  problem_description text default null,
  servicio text not null,
  fecha date not null,
  hora text not null,
  status text not null default 'scheduled' check (status in ('scheduled','confirmed','completed','cancelled')),
  notes text default null,
  created_at timestamptz not null default now()
);

alter table public.appointments add column if not exists customer_name text not null default 'Cliente';
alter table public.appointments add column if not exists customer_email text not null default 'cliente@example.com';
alter table public.appointments add column if not exists phone text default null;
alter table public.appointments add column if not exists car text default null;
alter table public.appointments add column if not exists model text default null;
alter table public.appointments add column if not exists year integer default null;
alter table public.appointments add column if not exists problem_description text default null;
alter table public.appointments add column if not exists servicio text not null default 'Diagnostico';
alter table public.appointments add column if not exists fecha date not null default current_date;
alter table public.appointments add column if not exists hora text not null default '09:00';
alter table public.appointments add column if not exists status text not null default 'scheduled';
alter table public.appointments add column if not exists notes text default null;
alter table public.appointments add column if not exists created_at timestamptz not null default now();

create table if not exists public.appointment_availability (
  weekday integer primary key check (weekday >= 0 and weekday <= 6),
  day_label text not null,
  slots text[] not null default '{}',
  enabled boolean not null default true,
  updated_at timestamptz not null default now()
);

alter table public.appointment_availability add column if not exists day_label text not null default 'Dia';
alter table public.appointment_availability add column if not exists slots text[] not null default '{}';
alter table public.appointment_availability add column if not exists enabled boolean not null default true;
alter table public.appointment_availability add column if not exists updated_at timestamptz not null default now();

insert into public.appointment_availability (weekday, day_label, slots, enabled)
values
  (0, 'Domingo', '{}', false),
  (1, 'Lunes', '{"09:00","10:00","11:00","12:00","14:00","15:00"}', true),
  (2, 'Martes', '{"09:00","10:00","11:00","12:00","14:00","15:00"}', true),
  (3, 'Miercoles', '{"09:00","10:00","11:00","12:00","14:00","15:00"}', true),
  (4, 'Jueves', '{"09:00","10:00","11:00","12:00","14:00","15:00"}', true),
  (5, 'Viernes', '{"09:00","10:00","11:00","12:00","14:00"}', true),
  (6, 'Sabado', '{"09:00","10:00","11:00"}', false)
on conflict (weekday) do nothing;

create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_products_updated_at on public.products;
create trigger trg_products_updated_at
before update on public.products
for each row execute function public.set_updated_at();

drop trigger if exists trg_banner_updated_at on public.admin_banner;
create trigger trg_banner_updated_at
before update on public.admin_banner
for each row execute function public.set_updated_at();

drop trigger if exists trg_repair_promotions_updated_at on public.repair_promotions;
create trigger trg_repair_promotions_updated_at
before update on public.repair_promotions
for each row execute function public.set_updated_at();

drop trigger if exists trg_work_showcase_updated_at on public.work_showcase;
create trigger trg_work_showcase_updated_at
before update on public.work_showcase
for each row execute function public.set_updated_at();

drop trigger if exists trg_availability_updated_at on public.appointment_availability;
create trigger trg_availability_updated_at
before update on public.appointment_availability
for each row execute function public.set_updated_at();

alter table public.products enable row level security;
alter table public.admin_banner enable row level security;
alter table public.repair_promotions enable row level security;
alter table public.work_showcase enable row level security;
alter table public.orders enable row level security;
alter table public.appointments enable row level security;
alter table public.appointment_availability enable row level security;

grant usage on schema public to anon, authenticated;
grant select on public.products to anon, authenticated;
grant select on public.admin_banner to anon, authenticated;
grant select on public.repair_promotions to anon, authenticated;
grant select on public.work_showcase to anon, authenticated;
grant select on public.appointment_availability to anon, authenticated;
grant insert on public.orders to anon, authenticated;
grant insert on public.appointments to anon, authenticated;
grant select, insert, update, delete on public.products to authenticated;
grant select, insert, update, delete on public.admin_banner to authenticated;
grant select, insert, update, delete on public.repair_promotions to authenticated;
grant select, insert, update, delete on public.work_showcase to authenticated;
grant select, update, delete on public.orders to authenticated;
grant select, update, delete on public.appointments to authenticated;
grant select, insert, update, delete on public.appointment_availability to authenticated;

drop policy if exists "products_read_public" on public.products;
create policy "products_read_public" on public.products
for select to anon, authenticated using (true);

drop policy if exists "products_admin_write" on public.products;
create policy "products_admin_write" on public.products
for all to authenticated
using ((auth.jwt() ->> 'email') = 'transmisionesnunezz@gmail.com')
with check ((auth.jwt() ->> 'email') = 'transmisionesnunezz@gmail.com');

drop policy if exists "banner_read_public" on public.admin_banner;
create policy "banner_read_public" on public.admin_banner
for select to anon, authenticated using (enabled = true);

drop policy if exists "banner_admin_write" on public.admin_banner;
create policy "banner_admin_write" on public.admin_banner
for all to authenticated
using ((auth.jwt() ->> 'email') = 'transmisionesnunezz@gmail.com')
with check ((auth.jwt() ->> 'email') = 'transmisionesnunezz@gmail.com');

drop policy if exists "repair_promotions_read_public" on public.repair_promotions;
create policy "repair_promotions_read_public" on public.repair_promotions
for select to anon, authenticated using (enabled = true);

drop policy if exists "repair_promotions_admin_write" on public.repair_promotions;
create policy "repair_promotions_admin_write" on public.repair_promotions
for all to authenticated
using ((auth.jwt() ->> 'email') = 'transmisionesnunezz@gmail.com')
with check ((auth.jwt() ->> 'email') = 'transmisionesnunezz@gmail.com');

drop policy if exists "work_showcase_read_public" on public.work_showcase;
create policy "work_showcase_read_public" on public.work_showcase
for select to anon, authenticated using (enabled = true);

drop policy if exists "work_showcase_admin_write" on public.work_showcase;
create policy "work_showcase_admin_write" on public.work_showcase
for all to authenticated
using ((auth.jwt() ->> 'email') = 'transmisionesnunezz@gmail.com')
with check ((auth.jwt() ->> 'email') = 'transmisionesnunezz@gmail.com');

drop policy if exists "orders_insert_public" on public.orders;
create policy "orders_insert_public" on public.orders
for insert to public with check (true);

drop policy if exists "orders_admin_select" on public.orders;
create policy "orders_admin_select" on public.orders
for select to authenticated using ((auth.jwt() ->> 'email') = 'transmisionesnunezz@gmail.com');

drop policy if exists "orders_public_status_lookup" on public.orders;

drop policy if exists "orders_admin_update" on public.orders;
create policy "orders_admin_update" on public.orders
for update to authenticated
using ((auth.jwt() ->> 'email') = 'transmisionesnunezz@gmail.com')
with check ((auth.jwt() ->> 'email') = 'transmisionesnunezz@gmail.com');

drop policy if exists "orders_admin_delete" on public.orders;
create policy "orders_admin_delete" on public.orders
for delete to authenticated
using ((auth.jwt() ->> 'email') = 'transmisionesnunezz@gmail.com');

drop policy if exists "appointments_insert_public" on public.appointments;
create policy "appointments_insert_public" on public.appointments
for insert to public with check (true);

drop policy if exists "appointments_admin_select" on public.appointments;
create policy "appointments_admin_select" on public.appointments
for select to authenticated using ((auth.jwt() ->> 'email') = 'transmisionesnunezz@gmail.com');

drop policy if exists "appointments_admin_update" on public.appointments;
create policy "appointments_admin_update" on public.appointments
for update to authenticated
using ((auth.jwt() ->> 'email') = 'transmisionesnunezz@gmail.com')
with check ((auth.jwt() ->> 'email') = 'transmisionesnunezz@gmail.com');

drop policy if exists "appointments_admin_delete" on public.appointments;
create policy "appointments_admin_delete" on public.appointments
for delete to authenticated
using ((auth.jwt() ->> 'email') = 'transmisionesnunezz@gmail.com');

drop policy if exists "availability_read_public" on public.appointment_availability;
create policy "availability_read_public" on public.appointment_availability
for select to anon, authenticated using (true);

drop policy if exists "availability_admin_write" on public.appointment_availability;
create policy "availability_admin_write" on public.appointment_availability
for all to authenticated
using ((auth.jwt() ->> 'email') = 'transmisionesnunezz@gmail.com')
with check ((auth.jwt() ->> 'email') = 'transmisionesnunezz@gmail.com');

-- Datos base para iniciar el catálogo y contenido público.
insert into public.products (sku, nombre, marca, categoria, precio, "precioOriginal", descuento, imagen, rating, stock, "envioGratis")
values
  ('TN-FILTRO-001', 'Filtro para transmision automatica', 'TransNunez', 'Filtros', 850, 1100, 'Promo', null, 5, 12, false),
  ('TN-ACEITE-DEX', 'Aceite Dexron VI', 'ACDelco', 'Aceites', 280, 350, '20%', null, 5, 24, false),
  ('TN-KIT-REPAR', 'Kit de reparacion de transmision', 'TransNunez', 'Kits', 4200, 4800, 'Oferta', null, 5, 5, false)
on conflict (sku) do update
set
  nombre = excluded.nombre,
  marca = excluded.marca,
  categoria = excluded.categoria,
  precio = excluded.precio,
  "precioOriginal" = excluded."precioOriginal",
  descuento = excluded.descuento,
  rating = excluded.rating,
  stock = excluded.stock,
  "envioGratis" = excluded."envioGratis";

insert into public.admin_banner (titulo, subtitulo, descripcion, cta_label, cta_link, imagen, splash_image, enabled)
select
  'Transmisiones Nunez',
  'Catalogo, pedidos y citas en un solo lugar.',
  'Consulta refacciones, genera pedidos y agenda revision para tu vehiculo con seguimiento del equipo.',
  'Ver catalogo',
  '/catalogo',
  'https://images.unsplash.com/photo-1486262715619-67b85e0b08d3?auto=format&fit=crop&w=1600&q=80',
  'https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?auto=format&fit=crop&w=1400&q=80',
  true
where not exists (select 1 from public.admin_banner where enabled = true);

insert into public.repair_promotions (titulo, subtitulo, descripcion, cta_label, cta_link, imagen, enabled)
select
  'Promocion de diagnostico de transmision',
  'Revision inicial para detectar fallas de cambios, ruido o fugas.',
  'Agenda una cita y comparte los sintomas de tu vehiculo para preparar mejor la revision.',
  'Agendar cita',
  '/citas',
  'https://images.unsplash.com/photo-1632823469850-1b7b1e8b7e1e?auto=format&fit=crop&w=1400&q=80',
  true
where not exists (select 1 from public.repair_promotions where enabled = true);
