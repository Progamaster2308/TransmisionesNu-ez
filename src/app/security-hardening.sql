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

-- Orders are inserted directly by the public checkout. Stock is kept as a
-- visible reference only, so remove the old stock-decrement RPC if present.
drop function if exists public.create_order_with_stock(uuid, text, text, text, date, integer, jsonb);

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

-- Refresh PostgREST schema cache so new RPC functions are available immediately.
notify pgrst, 'reload schema';
