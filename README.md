# Bull Haus · plataforma y agentes de IA

Monorepo del back office, la web y los agentes de Bull Haus. Contexto y plan en `docs/` (empieza por `docs/plataforma.md`, sección 6).

## Estado

Paso 1 del plan: núcleo del back office.

- Login con sesión propia (cookie httpOnly, contraseñas con scrypt) y cinco roles: administrador, corredor, marketing, finanzas y cumplimiento.
- Propiedades: alta y edición, filtros, historial de precio, fotos en tres tamaños con portada y orden, mandatos con aviso de vencimiento a 15 días.
- Importación de planillas `.xlsx` o `.csv` con informe de errores por fila y planilla modelo descargable.
- Usuarios y auditoría de cada acción.

Pendiente para producción: Supabase (base de datos, auth y almacenamiento) en región UE, límite de intentos de login, y el logo oficial de Bull Haus.

## Arrancar en local (Windows, sin Docker ni administrador)

Node 22 portátil en `C:\dev\tools\node-v22.23.4-win-x64`. En Git Bash:

```bash
export PATH="/c/dev/tools/node-v22.23.4-win-x64:$PATH"
pnpm install
cp .env.example .env            # y define SEED_ADMIN_PASSWORD (mínimo 12 caracteres)
cp .env apps/backoffice/.env.local
pnpm db:start                   # PostgreSQL local en el puerto 5433, déjalo corriendo
pnpm db:migrate                 # en otra terminal
pnpm db:seed                    # crea Bull Haus y el administrador
pnpm dev                        # back office en http://localhost:3100
```

`packages/db/.env` necesita la misma `DATABASE_URL` para que Prisma la encuentre.

## Comandos

- `pnpm test`: tests de Vitest.
- `pnpm typecheck`: TypeScript en todos los paquetes.
- `pnpm db:start`, `pnpm db:migrate`, `pnpm db:seed`.

## Estructura

```
apps/backoffice     Next.js 15: back office
packages/core       reglas compartidas: roles, formatos chilenos, RUT, ficha y planilla
packages/db         esquema Prisma, cliente y seed
scripts/db.mjs      PostgreSQL local embebido
docs/               propuesta, sistema IA, plataforma, contratos
```
