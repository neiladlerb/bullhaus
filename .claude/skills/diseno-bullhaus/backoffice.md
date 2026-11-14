# Back office (apps/backoffice)

Lo usan cinco corredores en el celular, en terreno, y administración, finanzas y cumplimiento en escritorio. Cada pantalla responde primero "¿qué tengo que hacer ahora?".

## Menú

Hoy son 19 enlaces sueltos, sin íconos y sin marcar dónde estás. Se agrupan por área de trabajo; cada grupo se muestra solo si el rol tiene al menos un permiso dentro (la lógica `can()` actual se mantiene).

| Grupo | Enlaces |
|---|---|
| (sin título) | Inicio |
| Cartera | Propiedades, Importar planilla, Revisión de precios |
| Clientes | Leads y redes, Pipeline, Brochures |
| Operaciones | Operaciones, KYC, Contratos, Facturación |
| Marketing | Campañas Instagram, Redes sociales, Agentes IA |
| Análisis | Control de gestión |
| Administración | Usuarios, Marca y sitio web, Integraciones, Carga de datos, Auditoría |

- Título de grupo 13 px semibold `white/60`, sin mayúsculas forzadas.
- Ícono de 20 px + texto en cada enlace.
- Activo: `aria-current="page"`, fondo `white/12`, barra izquierda blanca de 3 px. Se marca también al estar en una subpágina (`/propiedades/123` marca Propiedades).
- Usuario, rol, "Mi cuenta" y "Cerrar sesión" abajo del menú.
- **Celular**: barra inferior fija con 4 accesos según rol (para corredor: Inicio, Propiedades, Pipeline, Leads) + "Más", que abre el menú completo en un panel. No una fila de enlaces con scroll horizontal arriba.

## Inicio

Ordenado por urgencia, no por tipo de dato:

1. **Para hoy**: lista de tareas accionables (compromisos de contacto vencidos y de hoy, fichas por aprobar, mandatos por vencer en 15 días, KYC pendientes según rol). Cada fila con chip de estado, contacto o propiedad, y la acción directa ("Llamar", "Revisar ficha"). Si no hay nada: "Estás al día."
2. **Tus números del mes** (o del equipo, según rol): 3 a 4 cifras con su comparación con el mes anterior o con la meta del corredor. No una grilla de seis contadores en cero.
3. Detalle (días en mercado, embudo, demanda) más abajo o en Control de gestión.

Contadores en cero no se muestran como tarjetas grandes: se agrupan en una línea ("Sin reservas ni retiradas este mes").

## Listas (propiedades, leads, operaciones, KYC, facturas)

- Tabla según `componentes.md`, con paginación de 25, búsqueda y filtros guardados en la URL (se puede compartir y volver).
- Filtros rápidos como pestañas con contador, por ejemplo tres pestañas "Disponibles 65", "Reservadas 0" y "Borradores 3".
- Acción principal arriba a la derecha ("Crear propiedad"), una sola.
- En celular: lista de bloques, búsqueda arriba, botón flotante solo si la acción principal es frecuente en terreno (por ejemplo, "Registrar visita").

## Detalle (propiedad, lead, operación)

- Encabezado: título, chip de estado, dato clave (precio en propiedad, etapa en lead, monto en operación) y las acciones de ese estado (máximo una principal).
- Debajo, pestañas o secciones: Datos, Actividad, Documentos, según el objeto.
- La actividad (historial) en orden cronológico inverso con fecha dd/mm/aaaa y hora 24 h.
- Lo bloqueado se explica: "No se puede pasar a Promesa: falta aprobar el KYC del comprador." con enlace a resolverlo.

## Formularios largos (ficha de propiedad, operación)

- Agrupados en secciones con título (Datos comerciales, Superficie, Características, Fotos, Mandato).
- Una columna en celular, dos en escritorio solo para campos cortos relacionados (dormitorios y baños).
- Guardado explícito con "Guardar cambios" fijo al pie en celular; aviso si sales con cambios sin guardar.
- Los campos que exige la aprobación se marcan desde el principio, no al final.

## Aprobaciones

Las reglas del proyecto exigen aprobación humana para fichas, publicaciones, campañas, contratos y facturas. El diseño las hace visibles: chip "Pendiente de aprobación", quién debe aprobar, y en la vista del aprobador una cola propia en Inicio.

## Gráficos

Usa la skill `dataviz` para cualquier gráfico. Hoy hay gráficos hechos a mano (`bars.tsx`, `line-chart.tsx`): al tocarlos, aplicar sus reglas (ejes, colores, accesibilidad).

## Modo demostración

Aviso `info` (no violeta), una línea, con "Administrar" si el rol puede.

## Portales públicos del back office

Las páginas `/b/[token]` (brochure) y `/verificacion/[token]` (KYC) las ve el cliente final, no el corredor: llevan la marca de la corredora, una sola tarea por pantalla, y en KYC el texto explica para qué se piden los datos y quién los ve.
