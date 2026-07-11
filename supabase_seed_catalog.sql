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
  "envioGratis" boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'products' and column_name = 'preciooriginal'
  ) and not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'products' and column_name = 'precioOriginal'
  ) then
    alter table public.products rename column preciooriginal to "precioOriginal";
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'products' and column_name = 'enviogratis'
  ) and not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'products' and column_name = 'envioGratis'
  ) then
    alter table public.products rename column enviogratis to "envioGratis";
  end if;
end $$;

create table if not exists public.admin_banner (
  id uuid primary key default gen_random_uuid(),
  titulo text not null,
  subtitulo text default null,
  descripcion text default null,
  cta_label text default 'Ver ofertas',
  cta_link text default '/catalogo',
  imagen text default null,
  splash_image text default null,
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.admin_banner
add column if not exists splash_image text default null;

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  customer_name text not null,
  customer_email text not null,
  notas text default null,
  pickup_date date not null,
  created_at timestamptz not null default now(),
  status text not null default 'pending' check (status in ('pending','confirmed','cancelled','ready')),
  total integer not null check (total >= 0),
  items jsonb not null default '[]'::jsonb
);

create table if not exists public.appointments (
  id uuid primary key default gen_random_uuid(),
  customer_name text not null,
  customer_email text not null,
  servicio text not null,
  fecha date not null,
  hora text not null,
  status text not null default 'scheduled' check (status in ('scheduled','confirmed','completed','cancelled')),
  notes text default null,
  created_at timestamptz not null default now()
);

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

alter table public.products enable row level security;
alter table public.admin_banner enable row level security;
alter table public.orders enable row level security;
alter table public.appointments enable row level security;

drop policy if exists products_read_public on public.products;
create policy products_read_public on public.products
for select to anon, authenticated
using (true);

drop policy if exists products_admin_write on public.products;
create policy products_admin_write on public.products
for all to authenticated
using (true)
with check (true);

drop policy if exists banner_read_public on public.admin_banner;
create policy banner_read_public on public.admin_banner
for select to anon, authenticated
using (enabled = true);

drop policy if exists banner_admin_write on public.admin_banner;
create policy banner_admin_write on public.admin_banner
for all to authenticated
using (true)
with check (true);

drop policy if exists orders_insert_public on public.orders;
create policy orders_insert_public on public.orders
for insert to anon, authenticated
with check (true);

drop policy if exists orders_admin_select on public.orders;
create policy orders_admin_select on public.orders
for select to authenticated
using (true);

drop policy if exists appointments_insert_public on public.appointments;
create policy appointments_insert_public on public.appointments
for insert to anon, authenticated
with check (true);

drop policy if exists appointments_admin_manage on public.appointments;
create policy appointments_admin_manage on public.appointments
for all to authenticated
using (true)
with check (true);

grant usage on schema public to anon, authenticated;
grant select on public.products, public.admin_banner to anon, authenticated;
grant insert on public.orders, public.appointments to anon, authenticated;
grant all on public.products, public.admin_banner, public.orders, public.appointments to authenticated;

update public.admin_banner set enabled = false where enabled = true;

insert into public.admin_banner (
  titulo,
  subtitulo,
  descripcion,
  cta_label,
  cta_link,
  imagen,
  splash_image,
  enabled
) values (
  'Transmisiones Dago',
  'Refacciones, transmisiones y servicio listo para salir a carretera.',
  'Promociones de temporada, atencion directa y pedidos claros para que encuentres la pieza correcta sin vueltas.',
  'Ver ofertas',
  '/catalogo',
  'https://images.unsplash.com/photo-1486262715619-67b85e0b08d3?auto=format&fit=crop&w=1600&q=80',
  'https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?auto=format&fit=crop&w=1400&q=80',
  true
);

insert into public.products (
  sku,
  nombre,
  marca,
  categoria,
  precio,
  "precioOriginal",
  descuento,
  imagen,
  rating,
  stock,
  "envioGratis"
) values
  ('TDG-ATF-001','Aceite ATF Dexron VI 1L','Dago Select','Aceites y fluidos',189,239,'20% OFF','https://images.unsplash.com/photo-1635435592616-8fb1a8ff7bbf?auto=format&fit=crop&w=900&q=80',5,34,true),
  ('TDG-FLT-002','Filtro para transmision automatica','Duralast','Filtros',349,429,'Oferta','https://images.unsplash.com/photo-1607860108855-64acf2078ed9?auto=format&fit=crop&w=900&q=80',5,18,true),
  ('TDG-KIT-003','Kit de servicio transmision completa','Dago Pro','Kits de servicio',1299,1599,'Ahorra $300','https://images.unsplash.com/photo-1619642751034-765dfdf7c58e?auto=format&fit=crop&w=900&q=80',5,12,true),
  ('TDG-SOL-004','Solenoide de cambio universal','TransTech','Electronica automotriz',899,1099,'18% OFF','https://images.unsplash.com/photo-1581092918056-0c4c3acd3789?auto=format&fit=crop&w=900&q=80',4,9,true),
  ('TDG-JNT-005','Juego de juntas para transmision','Precision','Sellos y juntas',279,349,'Oferta','https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=900&q=80',5,25,true),
  ('TDG-REP-006','Repuesto de gobernador hidraulico','Dago Parts','Transmision automatica',749,899,'15% OFF','https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=900&q=80',4,7,true),
  ('TDG-CVT-007','Fluido CVT alto rendimiento 1L','Valvoline','Aceites y fluidos',219,279,'Temporada','https://images.unsplash.com/photo-1625047509253-ec1f1b0f3e50?auto=format&fit=crop&w=900&q=80',5,31,true),
  ('TDG-BND-008','Banda para transmision automatica','Raybestos','Bandas y clutch',649,799,'Oferta','https://images.unsplash.com/photo-1621993202323-f438eec934a9?auto=format&fit=crop&w=900&q=80',4,11,true),
  ('TDG-SCN-009','Escaneo y diagnostico de transmision','Dago Service','Servicio tecnico',499,699,'Cita express','https://images.unsplash.com/photo-1581091215367-59ab6b727a0f?auto=format&fit=crop&w=900&q=80',5,50,true),
  ('TDG-HER-010','Juego de dados para taller automotriz','Dago Tools','Herramientas',579,729,'20% OFF','https://images.unsplash.com/photo-1581166397057-235af2b3c6dd?auto=format&fit=crop&w=900&q=80',5,16,true),
  ('TDG-ENF-011','Enfriador auxiliar para transmision','Hayden','Enfriamiento',1199,1499,'Promocion','https://images.unsplash.com/photo-1599256872237-5dcc0fbe9668?auto=format&fit=crop&w=900&q=80',4,6,true),
  ('TDG-SOP-012','Soporte de transmision reforzado','Anchor','Soportes',429,529,'Oferta','https://images.unsplash.com/photo-1563720223185-11003d516935?auto=format&fit=crop&w=900&q=80',5,20,true)
on conflict (sku) do update set
  nombre = excluded.nombre,
  marca = excluded.marca,
  categoria = excluded.categoria,
  precio = excluded.precio,
  "precioOriginal" = excluded."precioOriginal",
  descuento = excluded.descuento,
  imagen = excluded.imagen,
  rating = excluded.rating,
  stock = excluded.stock,
  "envioGratis" = excluded."envioGratis",
  updated_at = now();
