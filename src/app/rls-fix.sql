-- Transmisiones Nunez - Fix RLS para checkout y citas publicas.
-- Ejecuta este archivo en Supabase SQL Editor si pedidos/citas fallan con:
-- "new row violates row-level security policy".

grant usage on schema public to anon, authenticated;
grant insert on public.orders to anon, authenticated;
grant insert on public.appointments to anon, authenticated;
grant select on public.products to anon, authenticated;
grant select on public.admin_banner to anon, authenticated;
grant select on public.repair_promotions to anon, authenticated;
grant select on public.appointment_availability to anon, authenticated;

drop policy if exists "orders_insert_public" on public.orders;
create policy "orders_insert_public" on public.orders
for insert to public
with check (true);

drop policy if exists "appointments_insert_public" on public.appointments;
create policy "appointments_insert_public" on public.appointments
for insert to public
with check (true);

drop policy if exists "orders_admin_select" on public.orders;
create policy "orders_admin_select" on public.orders
for select to authenticated
using (true);

drop policy if exists "orders_admin_update" on public.orders;
create policy "orders_admin_update" on public.orders
for update to authenticated
using (true)
with check (true);

drop policy if exists "appointments_admin_select" on public.appointments;
create policy "appointments_admin_select" on public.appointments
for select to authenticated
using (true);

drop policy if exists "appointments_admin_update" on public.appointments;
create policy "appointments_admin_update" on public.appointments
for update to authenticated
using (true)
with check (true);
