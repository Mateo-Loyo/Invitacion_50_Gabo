# Invitación digital · Gabo 50 años

Invitación privada con enlaces individuales, RSVP, límite de asistentes, WhatsApp, calendario, mapas, hoteles y panel administrativo.

## Funciones de operación

- Confirmación modificable desde el mismo enlace personal.
- Seguimiento de envío y recordatorio por WhatsApp.
- Registro de primera apertura, última apertura y total de aperturas por invitación.
- Filtros, tasa de respuesta y exportación CSV desde `/admin`.
- El seguimiento no almacena IP, ubicación, navegador ni información adicional del invitado.

## Recorrido de la invitación

- Portada cinematográfica, bienvenida personalizada y cuenta regresiva.
- Lugar con acceso a Google Maps.
- Recomendación, dress code Cuban vibes y hoteles proporcionados por la organizadora.
- RSVP individual limitado al número de lugares autorizado.
- Cierre cinematográfico.

Los apartados sin información aprobada —historia, enlace de calendario, Waze, horarios, sitio para fotografías y taxi ejecutivo— permanecen ocultos hasta recibir su contenido.

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

Diagnóstico privado de conexión: `/api/health` (no expone credenciales).
