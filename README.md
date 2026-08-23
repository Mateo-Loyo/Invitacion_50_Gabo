# Invitación digital · Gabo 50 años

Invitación privada con enlaces individuales, RSVP, límite de asistentes, WhatsApp, calendario, mapas, hoteles y panel administrativo.

## Configuración

Variables requeridas:

- `DATABASE_URL`: conexión protegida al pool de Supabase.
- `ADMIN_PASSWORD`: contraseña del panel.
- `ADMIN_SESSION_SECRET`: secreto aleatorio para firmar la sesión.
- `NEXT_PUBLIC_SITE_URL`: URL pública del despliegue.

La base se crea con `supabase/schema.sql`. Las tablas tienen RLS activo, sin permisos públicos; las consultas se realizan únicamente desde las rutas del servidor.

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
