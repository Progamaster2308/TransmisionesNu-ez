# Transmisiones Nunez

Aplicacion React + Vite para catalogo de refacciones, citas, pedidos, panel admin y contenido dinamico conectado a Supabase.

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

Despues de agregarlas, ejecuta:

`Deploys` -> `Trigger deploy` -> `Clear cache and deploy site`

## Supabase

Ejecuta los SQL de `src/app/schema.sql` y, si solo necesitas reparar la seccion de trabajos realizados, `src/app/work-showcase.sql` en el SQL Editor de Supabase.

Para login admin, el usuario autorizado se controla por correo en `src/app/config/adminConfig.js` y en las politicas RLS de Supabase.

## QA

```bash
npm run lint
npm run build
```
