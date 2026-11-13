# Despliegue del back office en Vercel con Supabase

El back office (`apps/backoffice`) corre en Vercel. La base de datos y los archivos van en Supabase, en región UE (París), porque los datos tienen que quedar en la UE. Las funciones de Vercel corren en `cdg1` (París), la misma ciudad que la base de datos (lo fija `apps/backoffice/vercel.json`). Proveedores, regiones y pendientes de RGPD en `docs/residencia-datos.md`.

## 1. Supabase

1. Crea un proyecto en https://supabase.com/dashboard con el nombre `bullhaus` y la región de la UE (el proyecto actual quedó en París, `eu-west-3`). Guarda la contraseña de la base de datos en un gestor de contraseñas.
2. **Connect** → **ORMs** → **Prisma** muestra las dos URL:
   - `DATABASE_URL`: la del pooler, puerto 6543. Agrégale `?pgbouncer=true&connection_limit=1`.
   - `DIRECT_URL`: la conexión directa, puerto 5432.
3. **Storage** → crea dos buckets, los dos **privados** (sin marcar "Public bucket"):
   - `fotos`: fotos de las propiedades. Salen al navegador solo a través de `/media`.
   - `documentos`: mandatos firmados y otros documentos de la operación.

   Los documentos de KYC no van en ninguno de los dos: tendrán su propio almacenamiento aparte cuando se construya ese módulo.
4. **Project Settings** → **API**: copia la **Project URL** y la clave **service_role**. Esa clave da acceso total, así que va solo en las variables del servidor de Vercel. Nunca en el código, en el chat ni en una variable `NEXT_PUBLIC_`.

## 2. Migraciones y usuario inicial

Los deploys de **producción** del back office aplican solos las migraciones pendientes antes de compilar (`scripts/vercel-build.mjs`, con la `DIRECT_URL` que ya tiene Vercel). Las vistas previas no migran. Si hace falta hacerlo a mano, desde tu equipo:

```bash
cd /c/dev/bullhaus/packages/db
export PATH="/c/dev/tools/node-v22.23.4-win-x64:$PATH"
DATABASE_URL="<url del pooler>" DIRECT_URL="<url directa>" pnpm migrate:deploy
DATABASE_URL="<url del pooler>" DIRECT_URL="<url directa>" SEED_ADMIN_EMAIL="<tu email>" SEED_ADMIN_PASSWORD="<contraseña de 12+ caracteres>" pnpm seed:env
```

El administrador inicial se crea con `scripts/configurar-produccion.mjs` (ver la sección 5).

## 3. Vercel

En **Add New → Project**, importa `neiladlerb/bullhaus`:

| Campo | Valor |
|---|---|
| Root Directory | `apps/backoffice` |
| Framework Preset | Next.js |
| Build / Install Command | sin cambiar (Vercel detecta pnpm y el monorepo) |

Variables de entorno (Production y Preview):

| Variable | Valor |
|---|---|
| `DATABASE_URL` | URL del pooler de Supabase |
| `DIRECT_URL` | URL directa de Supabase |
| `SUPABASE_URL` | Project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | clave service_role (márcala como Sensitive) |

`STORAGE_DIR` y las variables `SEED_*` no van en Vercel. Si faltan las de Supabase, la aplicación se niega a arrancar en Vercel en vez de guardar archivos en un disco que se borra.

Lo ideal es que las vistas previas (Preview) usen un segundo proyecto de Supabase con datos de prueba, no el de producción.

## 4. Límites que hay que conocer

- **4,5 MB por petición.** Vercel corta las peticiones más grandes. Por eso el navegador reduce cada foto a 2400 px y la sube en su propia petición, y los PDF de mandato tienen un máximo de 4 MB.
- **HEIC.** Las fotos HEIC de iPhone que el navegador no sabe abrir se envían tal cual; si pesan más de 4 MB, hay que exportarlas como JPG.
- **Plan Hobby.** Sirve para probar, pero Vercel no permite uso comercial en Hobby. Para que Bull Haus lo use a diario hace falta el plan Pro.
- **Dominio.** Cuando esté listo, conviene un subdominio propio, por ejemplo `panel.bullhaus.cl`, configurado en **Settings → Domains**.

## 5. Usuarios y contraseñas

- El primer administrador lo crea `scripts/configurar-produccion.mjs` (o `pnpm seed:env`) con una contraseña temporal.
- Todos los demás se crean en **Usuarios** con una contraseña inicial. Quien entra con una contraseña inicial o temporal solo ve **Mi cuenta** hasta elegir una propia.
- Cada persona cambia su contraseña en **Mi cuenta**; al hacerlo se cierran sus sesiones en otros equipos.
- Si alguien la olvida, un administrador usa **Restablecer contraseña** en **Usuarios**: el sistema genera una temporal de 16 caracteres, la muestra una sola vez y cierra todas las sesiones de esa persona.
- Mínimo 12 caracteres, sin el nombre ni el email de la persona. Cada cambio y restablecimiento queda en la auditoría.

## 6. Sitio web público (`apps/web`)

El sitio público es un segundo proyecto de Vercel (`bullhaus-web`, Root Directory `apps/web`, región `cdg1`). No tiene credenciales de la base de datos: lee las fichas desde la API pública del back office (`/api/publico/propiedades`), que solo entrega propiedades **disponibles** y marcadas **Publicar en la web**, sin la dirección exacta ni datos del propietario. Las fotos salen por `/media` del back office.

| Variable | Proyecto | Valor |
|---|---|---|
| `BACKOFFICE_URL` | web | URL del back office, sin barra final |
| `WEB_API_KEY` | web y back office | La misma clave aleatoria en los dos. Permite que los formularios de la web creen leads (fuente "Sitio web") |
| `SITE_URL` | web | Dominio público, p. ej. `https://www.bullhaus.cl` |
| `NEXT_PUBLIC_META_PIXEL_ID` | web (opcional) | Píxel de Meta. Solo se carga si la persona acepta las cookies |
| `NEXT_PUBLIC_GA4_ID` | web (opcional) | ID de medición de GA4 (`G-XXXXXXX`). Solo se carga si la persona acepta las cookies; cada formulario enviado manda el evento `generate_lead` |

## 7. Carga de datos

**Carga de datos** (menú del back office, solo administradores):

1. **Propiedades de bullhaus.cl**: lee cada ficha del sitio anterior y la crea o actualiza, con su corredor (si no existe, se crea sin acceso hasta que un administrador le restablezca la contraseña) y hasta 8 fotos. Se puede repetir sin duplicar. Venta y arriendo de una misma propiedad quedan como dos fichas (la de arriendo con sufijo `-A`).
2. **Campañas de Instagram**: borradores de captación, venta y arriendo con textos tomados de las fichas. Quedan en revisión hasta que un administrador las aprueba en **Campañas Instagram**.
3. **Datos de demostración**: leads ficticios, movimientos del pipeline y campañas pasadas con métricas, marcados `isDemo`. Se borran con un botón. Antes de usar el sistema con clientes reales, bórralos.
