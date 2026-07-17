-- Transmisiones Nunez - Security hardening for Supabase.
-- Run this in Supabase SQL Editor after reviewing ADMIN_EMAIL.
-- This complements the frontend protections; RLS is the real server-side gate.

create extension if not exists pgcrypto;

-- Keep RLS enabled on every exposed public table.
alter table public.products enable row level security;
alter table public.admin_banner enable row level security;
alter table public.repair_promotions enable row level security;
alter table public.work_showcase enable row level security;
alter table public.orders enable row level security;
alter table public.appointments enable row level security;
alter table public.appointment_availability enable row level security;

-- Basic data-shape constraints reduce abuse and malformed payloads.
alter table public.products
  drop constraint if exists products_sku_safe,
  add constraint products_sku_safe check (sku ~ '^[A-Za-z0-9._-]{2,40}$') not valid;

alter table public.orders
  drop constraint if exists orders_customer_email_safe,
  add constraint orders_customer_email_safe check (customer_email ~* '^[A-Z0-9._%+-]+@([A-Z0-9-]+\.)+[A-Z]{2,}$') not valid,
  drop constraint if exists orders_items_limited,
  add constraint orders_items_limited check (jsonb_typeof(items) = 'array' and jsonb_array_length(items) between 1 and 30) not valid,
  drop constraint if exists orders_pickup_date_window;

alter table public.appointments
  drop constraint if exists appointments_customer_email_safe,
  add constraint appointments_customer_email_safe check (customer_email ~* '^[A-Z0-9._%+-]+@([A-Z0-9-]+\.)+[A-Z]{2,}$') not valid,
  drop constraint if exists appointments_phone_safe,
  add constraint appointments_phone_safe check (phone is null or phone ~ '^[0-9]{10}$') not valid,
  drop constraint if exists appointments_date_window,
  drop constraint if exists appointments_hour_safe,
  add constraint appointments_hour_safe check (hora ~ '^[0-2][0-9]:[0-5][0-9]$') not valid;

create or replace function public.enforce_order_pickup_date_window()
returns trigger as $$
begin
  if new.pickup_date < current_date
     or new.pickup_date > current_date + interval '1 year' then
    raise exception 'pickup_date fuera del rango permitido';
  end if;

  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_orders_pickup_date_window on public.orders;
create trigger trg_orders_pickup_date_window
before insert or update of pickup_date on public.orders
for each row execute function public.enforce_order_pickup_date_window();

create or replace function public.enforce_appointment_date_window()
returns trigger as $$
begin
  if new.fecha < current_date
     or new.fecha > current_date + interval '1 year' then
    raise exception 'fecha fuera del rango permitido';
  end if;

  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_appointments_date_window on public.appointments;
create trigger trg_appointments_date_window
before insert or update of fecha on public.appointments
for each row execute function public.enforce_appointment_date_window();

-- Public checkout entrypoint: validates items, locks product rows, decrements
-- stock, recalculates the total from server prices and creates the order atomically.
create or replace function public.create_order_with_stock(
  p_id uuid,
  p_customer_name text,
  p_customer_email text,
  p_notas text,
  p_pickup_date date,
  p_total integer,
  p_items jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order_id uuid := coalesce(p_id, gen_random_uuid());
  v_item jsonb;
  v_product_id uuid;
  v_quantity integer;
  v_stock integer;
  v_price integer;
  v_sku text;
  v_name text;
  v_clean_items jsonb := '[]'::jsonb;
  v_calculated_total integer := 0;
begin
  if length(trim(coalesce(p_customer_name, ''))) < 2 then
    raise exception 'Nombre de cliente invalido';
  end if;

  if coalesce(p_customer_email, '') !~* '^[A-Z0-9._%+-]+@([A-Z0-9-]+\.)+[A-Z]{2,}$' then
    raise exception 'Correo de cliente invalido';
  end if;

  if p_pickup_date < current_date
     or p_pickup_date > current_date + interval '1 year' then
    raise exception 'pickup_date fuera del rango permitido';
  end if;

  if coalesce(p_total, 0) < 0 then
    raise exception 'Total invalido';
  end if;

  if jsonb_typeof(p_items) <> 'array'
     or jsonb_array_length(p_items) < 1
     or jsonb_array_length(p_items) > 30 then
    raise exception 'Items de pedido invalidos';
  end if;

  for v_item in select value from jsonb_array_elements(p_items) as item(value) loop
    if coalesce(v_item ->> 'productId', '') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
      raise exception 'Producto invalido';
    end if;

    v_product_id := (v_item ->> 'productId')::uuid;
    v_quantity := greatest(1, least(999, floor(coalesce((v_item ->> 'cantidad')::numeric, 1))::integer));

    select products.stock, products.precio, products.sku, products.nombre
      into v_stock, v_price, v_sku, v_name
      from public.products
      where products.id = v_product_id
      for update;

    if not found then
      raise exception 'Producto no encontrado';
    end if;

    if v_stock < v_quantity then
      raise exception 'Stock insuficiente para %', v_sku;
    end if;

    update public.products
      set stock = stock - v_quantity,
          updated_at = now()
      where id = v_product_id;

    v_calculated_total := v_calculated_total + (v_price * v_quantity);
    v_clean_items := v_clean_items || jsonb_build_array(jsonb_build_object(
      'productId', v_product_id,
      'sku', v_sku,
      'nombre', v_name,
      'cantidad', v_quantity,
      'precioUnitario', v_price,
      'precioLinea', v_price * v_quantity
    ));
  end loop;

  insert into public.orders (
    id,
    customer_name,
    customer_email,
    notas,
    pickup_date,
    total,
    items,
    status
  ) values (
    v_order_id,
    trim(p_customer_name),
    lower(trim(p_customer_email)),
    nullif(trim(coalesce(p_notas, '')), ''),
    p_pickup_date,
    v_calculated_total,
    v_clean_items,
    'pending'
  );

  return jsonb_build_object(
    'id', v_order_id,
    'total', v_calculated_total,
    'items', v_clean_items
  );
end;
$$;

revoke all on function public.create_order_with_stock(uuid, text, text, text, date, integer, jsonb) from public;
grant execute on function public.create_order_with_stock(uuid, text, text, text, date, integer, jsonb) to anon, authenticated;

-- Avoid double booking active appointments in the same slot.
create unique index if not exists appointments_active_slot_unique
  on public.appointments (fecha, hora)
  where status in ('scheduled', 'confirmed');

-- Public can read catalog/public content and insert only public requests.
grant usage on schema public to anon, authenticated;
grant select on public.products to anon, authenticated;
grant select on public.admin_banner to anon, authenticated;
grant select on public.repair_promotions to anon, authenticated;
grant select on public.work_showcase to anon, authenticated;
grant select on public.appointment_availability to anon, authenticated;
grant insert on public.orders to anon, authenticated;
grant insert on public.appointments to anon, authenticated;

-- Admin email gate. Prefer moving this to app_metadata role claims later.
-- Current frontend admin: ADMIN_EMAIL_HERE
drop policy if exists "products_read_public" on public.products;
create policy "products_read_public" on public.products
for select to anon, authenticated using (true);

drop policy if exists "products_admin_write" on public.products;
create policy "products_admin_write" on public.products
for all to authenticated
using ((auth.jwt() ->> 'email') = 'ADMIN_EMAIL_HERE')
with check ((auth.jwt() ->> 'email') = 'ADMIN_EMAIL_HERE');

drop policy if exists "banner_read_public" on public.admin_banner;
create policy "banner_read_public" on public.admin_banner
for select to anon, authenticated using (enabled = true);

drop policy if exists "banner_admin_write" on public.admin_banner;
create policy "banner_admin_write" on public.admin_banner
for all to authenticated
using ((auth.jwt() ->> 'email') = 'ADMIN_EMAIL_HERE')
with check ((auth.jwt() ->> 'email') = 'ADMIN_EMAIL_HERE');

drop policy if exists "repair_promotions_read_public" on public.repair_promotions;
create policy "repair_promotions_read_public" on public.repair_promotions
for select to anon, authenticated using (enabled = true);

drop policy if exists "repair_promotions_admin_write" on public.repair_promotions;
create policy "repair_promotions_admin_write" on public.repair_promotions
for all to authenticated
using ((auth.jwt() ->> 'email') = 'ADMIN_EMAIL_HERE')
with check ((auth.jwt() ->> 'email') = 'ADMIN_EMAIL_HERE');

drop policy if exists "work_showcase_read_public" on public.work_showcase;
create policy "work_showcase_read_public" on public.work_showcase
for select to anon, authenticated using (enabled = true);

drop policy if exists "work_showcase_admin_write" on public.work_showcase;
create policy "work_showcase_admin_write" on public.work_showcase
for all to authenticated
using ((auth.jwt() ->> 'email') = 'ADMIN_EMAIL_HERE')
with check ((auth.jwt() ->> 'email') = 'ADMIN_EMAIL_HERE');

drop policy if exists "availability_read_public" on public.appointment_availability;
create policy "availability_read_public" on public.appointment_availability
for select to anon, authenticated using (true);

drop policy if exists "availability_admin_write" on public.appointment_availability;
create policy "availability_admin_write" on public.appointment_availability
for all to authenticated
using ((auth.jwt() ->> 'email') = 'ADMIN_EMAIL_HERE')
with check ((auth.jwt() ->> 'email') = 'ADMIN_EMAIL_HERE');

drop policy if exists "orders_insert_public" on public.orders;
create policy "orders_insert_public" on public.orders
for insert to anon, authenticated
with check (
  status = 'pending'
  and total >= 0
  and jsonb_typeof(items) = 'array'
  and jsonb_array_length(items) between 1 and 30
);

drop policy if exists "orders_admin_select" on public.orders;
create policy "orders_admin_select" on public.orders
for select to authenticated
using ((auth.jwt() ->> 'email') = 'ADMIN_EMAIL_HERE');

drop policy if exists "orders_admin_update" on public.orders;
create policy "orders_admin_update" on public.orders
for update to authenticated
using ((auth.jwt() ->> 'email') = 'ADMIN_EMAIL_HERE')
with check ((auth.jwt() ->> 'email') = 'ADMIN_EMAIL_HERE');

drop policy if exists "orders_admin_delete" on public.orders;
create policy "orders_admin_delete" on public.orders
for delete to authenticated
using ((auth.jwt() ->> 'email') = 'ADMIN_EMAIL_HERE');

drop policy if exists "appointments_insert_public" on public.appointments;
create policy "appointments_insert_public" on public.appointments
for insert to anon, authenticated
with check (
  status = 'scheduled'
  and fecha between current_date and current_date + interval '1 year'
);

drop policy if exists "appointments_admin_select" on public.appointments;
create policy "appointments_admin_select" on public.appointments
for select to authenticated
using ((auth.jwt() ->> 'email') = 'ADMIN_EMAIL_HERE');

drop policy if exists "appointments_admin_update" on public.appointments;
create policy "appointments_admin_update" on public.appointments
for update to authenticated
using ((auth.jwt() ->> 'email') = 'ADMIN_EMAIL_HERE')
with check ((auth.jwt() ->> 'email') = 'ADMIN_EMAIL_HERE');

drop policy if exists "appointments_admin_delete" on public.appointments;
create policy "appointments_admin_delete" on public.appointments
for delete to authenticated
using ((auth.jwt() ->> 'email') = 'ADMIN_EMAIL_HERE');
