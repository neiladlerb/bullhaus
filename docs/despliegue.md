# Despliegue del back office en Vercel con Supabase

El back office (`apps/backoffice`) corre en Vercel. La base de datos y los archivos van en Supabase, en región UE (Frankfurt), porque los datos tienen que quedar en la UE. Las funciones de Vercel corren en `fra1`, la misma ciudad que la base de datos (lo fija `apps/backoffice/vercel.json`).

## 1. Supabase

1. Crea un proyecto en https://supabase.com/dashboard con el nombre `bullhaus` y la región **Central EU (Frankfurt)**. Guarda la contraseña de la base de datos en un gestor de contraseñas.
2. **Connect** → **ORMs** → **Prisma** muestra las dos URL:
   - `DATABASE_URL`: la del pooler, puerto 6543. Agrégale `?pgbouncer=true&connection_limit=1`.
   - `DIRECT_URL`: la conexión directa, puerto 5432.
3. **Storage** → crea dos buckets, los dos **privados** (sin marcar "Public bucket"):
   - `fotos`: fotos de las propiedades. Salen al navegador solo a través de `/media`.
   - `documentos`: mandatos firmados y otros documentos de la operación.

   Los documentos de KYC no van en ninguno de los dos: tendrán su propio almacenamiento aparte cuando se construya ese módulo.
4. **Project Settings** → **API**: copia la **Project URL** y la clave **service_role**. Esa clave da acceso total, así que va solo en las variables del servidor de Vercel. Nunca en el código, en el chat ni en una variable `NEXT_PUBLIC_`.

## 2. Migraciones y usuario inicial

Desde tu equipo, con las URL de Supabase (no se ejecutan en cada deploy, para que una vista previa nunca toque la base de producción):

```bash
cd /c/dev/bullhaus/packages/db
export PATH="/c/dev/tools/node-v22.23.4-win-x64:$PATH"
DATABASE_URL="<url del pooler>" DIRECT_URL="<url directa>" pnpm migrate:deploy
DATABASE_URL="<url del pooler>" DIRECT_URL="<url directa>" SEED_ADMIN_EMAIL="<tu email>" SEED_ADMIN_PASSWORD="<contraseña de 12+ caracteres>" pnpm seed:env
```

Cada migración nueva se aplica igual, antes de desplegar el código que la necesita.

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
