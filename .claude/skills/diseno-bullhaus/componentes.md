# Componentes

Cada componente se escribe una vez y se reutiliza. Hoy las dos apps repiten unas 1.600 cadenas de clases a mano; al tocar una pantalla, reemplaza el marcado suelto por el componente de aquí (o créalo si falta).

**Dónde viven: `packages/ui`** (aprobado por el usuario el 14/11/2026). Paquete del monorepo, importado por `apps/web` y `apps/backoffice`, con:

- `tokens.css`: los tokens de `tokens.md`, en `@theme` de Tailwind 4. Cada app lo importa en su `globals.css` y solo agrega lo propio.
- `src/`: componentes React (Button, Field, Chip, Table, Pagination, EmptyState, Banner, ConfirmDialog, PropertyCard, Price, Nav). Sin lógica de negocio ni acceso a datos: reciben props.
- Tests con Vitest para lo que tenga lógica (formato de precio, paginación, estados de chip).
- Se crea con la tarea 1 de `docs/ux/revision-2026-11-14.md` (tokens) y crece con las siguientes. Un componente pasa al paquete cuando lo usa más de una pantalla.

## Botones

| Variante | Cuándo | Estilo |
|---|---|---|
| Principal | La acción más importante de la pantalla. **Una por pantalla.** | Fondo `brand-dark`, texto blanco, hover más oscuro (mezcla 12 % negro) |
| Secundario | Acciones normales | Fondo blanco, borde `line-strong`, texto `ink` |
| Oscuro | Alternativa a la principal en fondos claros de la web | Fondo `coal`, texto blanco |
| Destructivo | Eliminar, rechazar, anular | Texto `danger`, borde `danger`; relleno solo dentro del diálogo de confirmación |
| Enlace | Navegar sin acción | Texto `brand-dark` subrayado al pasar el mouse |

- Altura: 40 px en escritorio, 44 px en celular. Texto 14 px semibold.
- El texto dice lo que pasa: "Guardar cambios", "Aprobar ficha", "Agendar visita". Nunca "Enviar", "OK" o "Submit".
- Mientras procesa: el botón se desactiva y cambia el texto ("Guardando…"); no se agrega un spinner aparte.
- Foco: anillo de 2 px `brand` con 2 px de separación (`focus-visible:ring-2 ring-brand ring-offset-2`).

## Campos

- Etiqueta siempre visible arriba (nunca solo placeholder), 13 px, `muted`, semibold.
- Borde `line-strong`, radio 6 px, alto 40 px (44 en celular), fondo blanco.
- Foco: borde `brand-dark` + anillo `brand`.
- Error: borde `danger`, mensaje debajo en `danger` que dice qué corregir ("Ingresa el precio en UF, sin puntos"). Se valida al salir del campo, no mientras escribe.
- Ayuda opcional debajo en `muted`.
- Campos de dinero: prefijo fijo ("UF" o "$") dentro del campo, números con `tabular-nums`.
- En celular: `inputmode="numeric"` para precios, superficies y teléfonos; `type="email"`, `type="tel"`.

## Chips de estado

Un chip comunica un estado con su color semántico y su texto; el color nunca va solo.

| Dominio | Estado → color |
|---|---|
| Propiedad | Disponible → success · Reservada → warning · Vendida / Arrendada → info · Borrador → neutro (`paper` + `muted`) · Retirada → neutro |
| Lead (`LeadStage`) | Nuevo → info · Contactado / Calificado / Visita / Propuesta → neutro con el nombre de la etapa · Ganado → success · Perdido → danger |
| Ficha / publicación | Pendiente de aprobación → warning · Aprobada → success · Rechazada → danger |
| KYC | Pendiente → warning · Aprobado → success · Rechazado → danger · Riesgo alto → danger con texto "Riesgo alto" |
| Compromiso de contacto | Hoy → warning · Vencido → danger · Hecho → success |
| Factura | Borrador → neutro · Por aprobar → warning · Emitida → success |

Estilo: 13 px semibold, radio 6 px, padding 2 × 8, fondo y texto del par semántico.

## Tablas (back office)

- Encabezado fijo al hacer scroll, 13 px semibold `muted`, fondo `paper`.
- Filas de 48 px, separador `line`, hover `paper`. La fila entera es clicable si lleva al detalle (con un enlace real en la primera celda para teclado).
- Números alineados a la derecha con `tabular-nums`. Fechas dd/mm/aaaa.
- **Paginación desde 25 filas** (hoy se cargan 100 o más en una sola tabla). Mostrar "1–25 de 107" y botones Anterior / Siguiente.
- Búsqueda y filtros arriba de la tabla, en una sola fila en escritorio; en celular, un campo de búsqueda y un botón "Filtros" que abre un panel.
- **En celular la tabla se convierte en lista**: cada fila es un bloque con el dato principal arriba (nombre o título), el estado como chip y dos datos secundarios. Nunca scroll horizontal.

## Estados vacíos

Un estado vacío es una invitación a actuar. Tres partes: qué falta, por qué importa (una línea) y el botón para resolverlo.

> **Aún no hay propiedades cargadas.** Importa la planilla de Convecta o crea la primera ficha a mano.
> [Importar planilla] [Crear propiedad]

Si el vacío es por un filtro: "Ninguna propiedad calza con estos filtros." + "Quitar filtros".

## Avisos (banners)

| Tipo | Uso |
|---|---|
| `info` | Modo demostración, cambios del sistema |
| `warning` | Algo que requiere atención pronto (mandato por vencer) |
| `danger` | Algo bloqueado (operación sin KYC aprobado) |
| `success` | Confirmación después de una acción ("Ficha aprobada. Ya está en la web.") |

Texto, nunca solo ícono. Las confirmaciones usan el mismo verbo del botón ("Publicar" → "Publicada").

## Diálogo de confirmación

Solo para acciones irreversibles o con efectos fuera del sistema (emitir factura, publicar, eliminar, enviar a un portal). Título con la acción y el objeto ("¿Emitir la factura F-0123 por $1.450.000?"), una línea de consecuencia, botón destructivo o principal con el verbo, y "Cancelar".

## Tarjeta de propiedad (web y back office)

Orden de lectura, de arriba abajo:

1. Foto en proporción 4:3, con chip de operación ("Venta" / "Arriendo") arriba a la izquierda y cantidad de fotos abajo a la derecha (13 px, no 11).
2. **Precio** (ver abajo).
3. Comuna como dato principal, en `heading`, 16 px semibold.
4. Título comercial limpio, una línea con elipsis. Si el título viene de Convecta con separadores ("1D I 1B I Vespucio I Metro…"), no se muestra tal cual: se usa el título aprobado de la ficha, o se arma "Departamento en Macul".
5. Una fila de datos con íconos o etiquetas cortas: dormitorios, baños, m² útiles (m² terreno en casas). Sin puntos medios.
6. Código de propiedad en 13 px `muted`, al final.

Sin sombra, borde `line`, radio 10 px. Sin zoom de la foto al pasar el mouse. Si no hay foto: fondo `paper` con el tipo de propiedad escrito, nunca un recuadro vacío.

## Precio

- Moneda de la ficha, formato chileno: "UF 18.500", "$1.450.000". En arriendo: "UF 45 al mes" o "$450.000 al mes" ("/ mes" se lee peor en voz alta).
- "UF" en 60 % del tamaño del número, mismo color; el número en 700 con `tabular-nums lining-nums`.
- Es el dato con más peso de la tarjeta; en la ficha va junto al título, no escondido en una tabla.
- Gastos comunes, si están en la ficha, debajo en pequeño: "Gastos comunes $180.000".
- Nunca convertir UF a pesos en la interfaz. La calculadora UF es una herramienta aparte.

## Menú del back office

Ver `backoffice.md`, Menú. Elemento activo con `aria-current="page"`, fondo `white/12` y barra izquierda de 3 px blanca (no magenta: no pasa contraste sobre `ink`).

## Íconos

Un solo set: **`lucide-react`** (licencia ISC, se importa ícono por ícono y no pesa). Aprobado por el usuario el 14/11/2026; se instala en `packages/ui` al implementar el menú (tarea 5 de `docs/ux/revision-2026-11-14.md`), con versión fija. No se agrega ningún otro set de íconos. 20 px en el menú y botones, 16 px en tablas. Ícono siempre con texto al lado, salvo botones de cerrar o menú, que llevan `aria-label`.
