# Invitación digital · Gabo 50 años

Invitación privada con enlaces individuales, RSVP, límite de asistentes, WhatsApp, calendario, mapas, hoteles y panel administrativo.

## Configuración

Variables requeridas:

- `SUPABASE_SECRET_KEY`: clave privada de Supabase para las rutas del servidor. Nunca debe usar el prefijo `NEXT_PUBLIC_`.
- `SUPABASE_URL`: URL del proyecto de Supabase. Si se omite, este proyecto usa la URL configurada para Invitacion_50_Gabo.
- `ADMIN_PASSWORD`: contraseña del panel.
- `ADMIN_SESSION_SECRET`: secreto aleatorio para firmar la sesión.
- `NEXT_PUBLIC_SITE_URL`: URL pública del despliegue.

La base se crea con `supabase/schema.sql`. Las tablas tienen RLS activo, sin permisos públicos; las consultas se realizan únicamente desde las rutas del servidor mediante la Secret Key.

`DATABASE_URL` ya no es necesaria.

## Desarrollo

```bash
npm install
npm run dev
```

## Producción

```bash
npm run build
npm start
```

Panel privado: `/admin`
