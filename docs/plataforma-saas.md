# Plataforma SaaS para corredoras

Decisiones del 13/11/2026:

- Todo lo construido para Bull Haus (web pública y back office) pasa a ser una plataforma SaaS para otras corredoras. Bull Haus es el primer cliente, no un caso especial.
- **Por ahora todo sigue en la UE (París).** Cuando la plataforma opere de verdad en Chile, se revisan las alternativas y los costos de alojar allá. La sección 1 queda como punto de partida para esa revisión: hay que volver a verificarla, porque las regiones cambian (AWS Chile, por ejemplo, aún no abría para todos).
- La ley que aplica sigue siendo la chilena (`PROJECT_JURISDICTION = "cl"`). Alojar en la UE es compatible con ella.

## 1. Cuando toque: alojar en Chile (revisión del 13/11/2026)

Hoy todo está en París (Vercel `cdg1` y Supabase `eu-west-3`). Ninguno de los dos tiene región en Chile:

- Las regiones de Vercel en Sudamérica son solo `gru1`, en São Paulo ([vercel.com/docs/regions](https://vercel.com/docs/regions), revisado el 13/11/2026).
- Supabase ofrece solo `sa-east-1` (São Paulo) en Sudamérica ([supabase.com/docs/guides/platform/regions](https://supabase.com/docs/guides/platform/regions)).

Opciones con región en Santiago:

| Proveedor | Estado al 13/11/2026 | Qué cubre | Fuente |
|---|---|---|---|
| **Google Cloud `southamerica-west1`** | Disponible para todos | Cloud Run (web, back office, API y worker) y Cloud SQL para PostgreSQL. Cloud Storage para fotos y documentos | [Cloud Run](https://docs.cloud.google.com/run/docs/locations), [Cloud SQL](https://docs.cloud.google.com/sql/docs/postgres/locations) |
| Microsoft Azure Chile Central | Disponible desde 2025 | PostgreSQL flexible confirmado; App Service sin confirmar en la documentación oficial | [Azure Speed](https://www.azurespeed.com/Information/AzureRegions/ChileCentral) |
| AWS Chile (Santiago) | Solo para clientes seleccionados desde el 11/11/2026; apertura general prometida antes de fin de año. Bedrock llegará "dentro del primer año" | Cómputo, almacenamiento y bases de datos | [About Amazon](https://www.aboutamazon.com/news/aws/aws-south-america-chile-region-launch) |

**Recomendación: Google Cloud en Santiago.** Es la única región disponible hoy con todo lo que la plataforma necesita confirmado en la documentación oficial. Además, ya usas Google (Antigravity, Analytics, Calendar). AWS Chile queda como alternativa cuando abra para todos.

Qué se pierde al dejar Vercel y Supabase:

- Previsualizaciones automáticas por cada rama. En Cloud Run se arman con un flujo de despliegue propio.
- El panel de Supabase. Cloud SQL es PostgreSQL normal, así que Prisma y las migraciones no cambian.
- Más operación: actualizar, respaldar y vigilar pasa a ser parte del trabajo. Por eso conviene contenedores administrados (Cloud Run) y no servidores propios.

[FALTA: costo mensual de Google Cloud en Santiago para Bull Haus y para N clientes. Se calcula con la skill `costes-proyectos` y precios verificados, nunca de memoria. Santiago es una región de precio "Tier 2" para Cloud Run.]

### Lo que no puede quedar en Chile

Aunque la base de datos esté en Santiago, el contenido viaja fuera en estos casos:

- **Modelo de IA:** Claude (Anthropic) y OpenAI procesan en EE. UU. No encontré confirmación de modelos de Claude servidos desde Santiago. La Ley 21.719 permite esta transferencia con garantías contractuales; queda en `SUBPROCESSORS` con su contrato. [FALTA: revisar si Vertex AI sirve Claude en `southamerica-east1` o `southamerica-west1`]
- **Meta:** los mensajes de WhatsApp, Instagram y Facebook pasan por los servidores de Meta. Es inevitable si se usa ese canal.
- **Google Analytics y Ads:** solo con consentimiento de cookies, como ya está.

Así se lo explicamos a cada corredora: los datos se guardan en Chile, y lo que sale para el modelo de IA y la mensajería sale con contrato.

## 2. De Bull Haus a SaaS: qué falta

La base ya es multi-tenant: casi todas las tablas tienen `tenantId` y el back office filtra por él. Lo que falta:

| Pieza | Hoy | Para el SaaS |
|---|---|---|
| Niveles | Solo `Tenant` (una corredora) | Plataforma → agencia → corredora, como dice la base de proyectos. Una agencia ve y gestiona a sus corredoras |
| Marca | Logo, colores, teléfono, dirección y redes de Bull Haus fijos en el código (`CONTACT` en `apps/web/src/components/site.tsx`). "Bull Haus" aparece en 113 archivos de la web y el back office | Ficha de marca por corredora en la base: nombre, logo, colores, contacto, redes, comunas y textos legales. La web y el back office la leen |
| Web pública | Una corredora por despliegue (`PUBLIC_TENANT_SLUG`) | Una sola web que reconoce a la corredora por su dominio (`bullhaus.cl`, `otra.cl`) o por subdominio de prueba |
| Alta de clientes | Manual, con semilla | Alta de corredora desde el panel de la plataforma: dominio, marca, usuarios y planilla de propiedades |
| Integraciones | Claves de WhatsApp, Meta y Google en variables de entorno de un solo cliente | Credenciales por corredora, cifradas en la base; cada corredora conecta sus propias cuentas |
| Prompts y reglas | Prompt del agente con datos de Bull Haus | Prompt en cinco piezas por corredora: las reglas fijas en el código, y los datos del negocio en su ficha y base de conocimiento |
| Cobro | No existe | Planes y facturación de la plataforma a cada corredora o agencia, separados de la facturación de comisiones |
| Topes de gasto | Uno global | Tope de gasto de modelo y de campañas por corredora |
| Aislamiento | Filtro por `tenantId` en el código | Además, pruebas automáticas que intenten leer datos de otra corredora y fallen |

## 3. Orden propuesto

1. **Ficha de marca por corredora:** se sacan del código los datos de Bull Haus y Bull Haus pasa a ser la primera ficha. Termina cuando una segunda corredora de prueba se ve con su propia marca.
2. **Web por dominio:** una web para todas las corredoras.
3. **Niveles agencia y plataforma**, con el alta de corredoras desde el panel.
4. **Credenciales por corredora** para WhatsApp, Meta y Google.
5. **Planes y cobro de la plataforma.**
6. **Mudanza a Chile, cuando opere allá:** revisar de nuevo las regiones y calcular costos con la skill `costes-proyectos`, y recién entonces mover la base, los archivos y la app. `HOSTING_REGIONS` y su test cambian a la región nueva.

Mientras tanto Bull Haus sigue funcionando: cada paso deja a Bull Haus igual que antes.
