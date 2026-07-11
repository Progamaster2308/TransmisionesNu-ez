# Transmisiones Nunez - Plan de implementacion

## Fase 1: Descubrimiento y base
- [x] Revisar `index.html`, `main.jsx`, estilos base y montaje (`src/index.css` restaurado; no existe `App.css` en esta version).
- [x] Inspeccionar componentes existentes: la carpeta vieja `src/components` ya no existe; se reemplazo el Navbar legado por navegacion en `AppShell`.

## Fase 2: Arquitectura
- [x] Integrar React Router y convertir `vistaActual` en rutas reales.
- [x] Ajustes de lint (eliminar imports/variables/directivas innecesarias).
- [x] Crear providers/estado: carrito, auth (Supabase), toast.
- [x] Separar UI de logica de datos mediante `src/shared/datastore/supabaseDataStore.js`.

## Fase 3: Supabase DataStore
- [x] Implementar `src/shared/datastore/supabaseDataStore.js` con CRUD/operaciones para:
  - [x] Productos (catalog/admin datastore)
  - [x] Stock/precios (admin datastore)
  - [x] Ordenes (checkout)
  - [x] Citas (user + admin)
  - [x] Promociones de reparacion
  - [x] Disponibilidad semanal de citas
  - [x] Reportes mensuales de pedidos
- [x] Configurar `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` desde `import.meta.env`.
- [ ] Ejecutar `src/app/schema.sql` actualizado en Supabase.

## Fase 4: Carrito + Checkout
- [x] Refactor de carrito: eliminar total manual y derivar total desde items.
- [x] Solucionar incompatibilidad de JSX en providers `.js` (migrado compat a `.jsx`).
- [x] Implementar `CheckoutPage` con validacion estricta.
- [x] Persistir orden en Supabase y mostrar estado/toast.

## Fase 5: Citas
- [x] Implementar calendario/slots interactivos.
- [x] Implementar formulario de cita con nombre, correo, celular, auto, modelo, anio y descripcion de falla.
- [x] Admin page para listar por dia/hora, actualizar y cancelar citas.
- [x] Admin puede configurar dias y horas disponibles.

## Fase 6: Admin + Seguridad UX
- [x] Proteger rutas `admin/*` con sesion de Supabase.
- [x] Reforzar validaciones y sanitizacion en formularios y datastore.
- [x] Eliminar login simulado; usar `supabase.auth.signInWithPassword`.
- [x] Agregar panel admin para productos nuevos/edicion/eliminacion.
- [x] Agregar panel de pedidos con cancelacion/devolucion/confirmacion.
- [x] Generar reporte mensual PDF de pedidos.
- [x] Chatbot consulta catalogo y estado de pedido por ID.

## Fase 7: Estetica automotriz blue/white
- [x] Unificar tipografia, tokens de color y componentes (botones/cards) en un estilo consistente.
- [x] Reducir estilos inline del shell/admin y moverlos a CSS reutilizable.
- [x] Pulir responsive desktop/mobile con una direccion visual mas profesional.

## Fase 8: QA
- [x] `npm run lint`
- [x] `npm run build`
- [ ] Prueba manual de flujos: tienda -> carrito -> checkout; agendar cita; admin CRUD.
- [ ] Probar con `.env` real de Supabase y usuario admin creado.
