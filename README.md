# Transmisiones Núñez

Aplicación React + Vite para catálogo de refacciones, citas, pedidos, panel admin y contenido dinámico conectado a Supabase.

## Desarrollo local

1. Instalar dependencias:

```bash
npm install
```

2. Crear `.env.local` usando `.env.example` como base:

```bash
VITE_SUPABASE_URL=
VITE_SUPABASE_PUBLISHABLE_KEY=
```

3. Iniciar el servidor:

```bash
npm run dev
```

## Variables en Netlify

Netlify no usa `.env.local` del repositorio. Para que la app funcione publicada, agrega estas variables en:

`Site configuration` -> `Environment variables`

Variables requeridas:

```bash
VITE_SUPABASE_URL
VITE_SUPABASE_PUBLISHABLE_KEY
```

Después de agregarlas, ejecuta:

`Deploys` -> `Trigger deploy` -> `Clear cache and deploy site`

## Supabase

Ejecuta los SQL de `src/app/schema.sql` y, si solo necesitas reparar la sección de trabajos realizados, `src/app/work-showcase.sql` en el SQL Editor de Supabase.

Para login admin, el usuario autorizado se controla por correo en `src/app/config/adminConfig.js` y en las políticas RLS de Supabase.

### Email real al admin

El frontend envía notificaciones automáticas solo al admin. Primero intenta usar la Edge Function `send-order-email`; si no está configurada, usa FormSubmit con `ADMIN_EMAIL`. El cliente no recibe correos automáticos; el dueño responde manualmente desde el correo o celular registrado en la orden/cita.

Secrets opcionales para usar la Edge Function:

```bash
RESEND_API_KEY=
ADMIN_EMAIL=transmisionesnunezz@gmail.com
FROM_EMAIL=Transmisiones Núñez <notificaciones@tu-dominio.com>
REPLY_TO_EMAIL=transmisionesnunezz@gmail.com
```

`FROM_EMAIL` debe usar un dominio verificado en Resend si se usa la Edge Function. Si no se configura, FormSubmit sigue enviando al admin sin abrir `mailto:` ni Chrome.

## QA

```bash
npm run lint
npm run build
```
