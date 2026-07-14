-- Transmisiones Nunez - Bloqueo admin por correo.
-- Ejecuta este archivo en Supabase SQL Editor para que solo
-- transmisionesnunezz@gmail.com pueda leer/editar datos administrativos.

drop policy if exists "products_admin_write" on public.products;
create policy "products_admin_write" on public.products
for all to authenticated
using ((auth.jwt() ->> 'email') = 'transmisionesnunezz@gmail.com')
with check ((auth.jwt() ->> 'email') = 'transmisionesnunezz@gmail.com');

drop policy if exists "banner_admin_write" on public.admin_banner;
create policy "banner_admin_write" on public.admin_banner
for all to authenticated
using ((auth.jwt() ->> 'email') = 'transmisionesnunezz@gmail.com')
with check ((auth.jwt() ->> 'email') = 'transmisionesnunezz@gmail.com');

drop policy if exists "repair_promotions_admin_write" on public.repair_promotions;
create policy "repair_promotions_admin_write" on public.repair_promotions
for all to authenticated
using ((auth.jwt() ->> 'email') = 'transmisionesnunezz@gmail.com')
with check ((auth.jwt() ->> 'email') = 'transmisionesnunezz@gmail.com');

drop policy if exists "work_showcase_admin_write" on public.work_showcase;
create policy "work_showcase_admin_write" on public.work_showcase
for all to authenticated
using ((auth.jwt() ->> 'email') = 'transmisionesnunezz@gmail.com')
with check ((auth.jwt() ->> 'email') = 'transmisionesnunezz@gmail.com');

drop policy if exists "orders_admin_select" on public.orders;
create policy "orders_admin_select" on public.orders
for select to authenticated
using ((auth.jwt() ->> 'email') = 'transmisionesnunezz@gmail.com');

drop policy if exists "orders_admin_update" on public.orders;
create policy "orders_admin_update" on public.orders
for update to authenticated
using ((auth.jwt() ->> 'email') = 'transmisionesnunezz@gmail.com')
with check ((auth.jwt() ->> 'email') = 'transmisionesnunezz@gmail.com');

grant delete on public.orders to authenticated;

drop policy if exists "orders_admin_delete" on public.orders;
create policy "orders_admin_delete" on public.orders
for delete to authenticated
using ((auth.jwt() ->> 'email') = 'transmisionesnunezz@gmail.com');

drop policy if exists "appointments_admin_select" on public.appointments;
create policy "appointments_admin_select" on public.appointments
for select to authenticated
using ((auth.jwt() ->> 'email') = 'transmisionesnunezz@gmail.com');

drop policy if exists "appointments_admin_update" on public.appointments;
create policy "appointments_admin_update" on public.appointments
for update to authenticated
using ((auth.jwt() ->> 'email') = 'transmisionesnunezz@gmail.com')
with check ((auth.jwt() ->> 'email') = 'transmisionesnunezz@gmail.com');

grant delete on public.appointments to authenticated;

drop policy if exists "appointments_admin_delete" on public.appointments;
create policy "appointments_admin_delete" on public.appointments
for delete to authenticated
using ((auth.jwt() ->> 'email') = 'transmisionesnunezz@gmail.com');

drop policy if exists "availability_admin_write" on public.appointment_availability;
create policy "availability_admin_write" on public.appointment_availability
for all to authenticated
using ((auth.jwt() ->> 'email') = 'transmisionesnunezz@gmail.com')
with check ((auth.jwt() ->> 'email') = 'transmisionesnunezz@gmail.com');
