# Tokens

Un solo juego de tokens para web y back office. Hoy cada app define el suyo en `src/app/globals.css` y ya no coinciden (`ink` es #2F2F2E en la web y #3F3F3E en el back office; los bordes también difieren). Se mueven a `packages/ui/tokens.css` (decisión del 14/11/2026), que ambas apps importan.

## Color

### De marca (vienen de la ficha de cada corredora)

| Token | Bull Haus | Uso | No usar para |
|---|---|---|---|
| `--color-brand` | #EA2B94 | Relleno de la acción principal con texto grande (≥ 18,66 px en negrita), anillo de foco, indicador de selección, un detalle gráfico por pantalla | Texto pequeño, enlaces, texto sobre `coal` |
| `--color-brand-dark` | #C8177A | Fondo de botones de acción principal, enlaces y texto de acento | — |
| `--color-ink` | #3F3F3E | Texto principal y fondos oscuros (menú del back office, pie de la web) | — |
| `--color-coal` | #3F3F3E | Botón secundario oscuro | — |

Origen: bullhaus.cl, revisado el 11/11/2026 (magenta #EA2B94, carbón #3F3F3E, títulos #3A464E, fondo #EBF1F5, Raleway).

### Neutros (fijos, los mismos para todas las corredoras)

| Token | Valor | Uso |
|---|---|---|
| `--color-heading` | #3A464E | Títulos h1 y h2 |
| `--color-text` | #464646 | Texto de párrafos |
| `--color-muted` | #5C636B | Texto secundario, ayudas, etiquetas de campo. Reemplaza a #6B7178 y #6B6F74, que no pasan contraste sobre el fondo |
| `--color-paper` | #EBF1F5 | Fondo de página del back office y de secciones alternas de la web. Reemplaza al `sand` crema |
| `--color-surface` | #FFFFFF | Tarjetas, tablas, campos |
| `--color-line` | #DDE4EA | Separadores y bordes decorativos (no transmiten información) |
| `--color-line-strong` | #8A95A1 | Borde de campos, casillas y controles: necesita contraste 3:1 con el blanco |

### Semánticos (estados)

Siempre en pares: texto oscuro sobre fondo claro del mismo tono. Todos pasan AA.

| Token | Texto | Fondo | Significa |
|---|---|---|---|
| `success` | #1F7A4D | #E7F4EC | Listo, aprobado, disponible, pagado |
| `warning` | #9A5B00 | #FDF3E1 | Por vencer, pendiente de aprobación, falta un dato |
| `danger` | #B42318 | #FDECEA | Vencido, rechazado, error, acción destructiva |
| `info` | #2F5F8A | #E8F0F8 | Aviso neutro, modo demostración, en proceso |

No uses colores de Tailwind sueltos (`violet-600`, `emerald-500`, `red-50`) para estados: el aviso violeta del modo demostración pasa a `info`.

### Contraste medido (WCAG 2, objetivo AA)

| Par | Contraste | Resultado |
|---|---|---|
| Blanco sobre `brand` #EA2B94 | 3,98 | Solo texto grande o negrita ≥ 18,66 px |
| Blanco sobre `brand-dark` #C8177A | 5,44 | Pasa |
| `brand` sobre blanco | 3,98 | Solo texto grande |
| `brand` sobre `paper` | 3,50 | Solo texto grande |
| `brand` sobre `ink` | 2,65 | **No usar** (ni siquiera grande) |
| `brand-dark` sobre `paper` | 4,78 | Pasa |
| `muted` #5C636B sobre `paper` | 5,34 | Pasa |
| `muted` anterior #6B7178 sobre `paper` | 4,33 | No pasa (por eso se reemplaza) |
| `line-strong` sobre blanco | 3,05 | Pasa para bordes de controles |
| `line` sobre blanco | 1,28 | Solo decorativo |
| Blanco sobre `ink` | 10,54 | Pasa |

Para otra corredora: `node .claude/skills/diseno-bullhaus/scripts/contraste.mjs <brand> <brandDark> <ink>` y ajusta los usos si su color no pasa.

## Tipografía

- Familia única: **Raleway** (la de la marca), con `font-variant-numeric: lining-nums tabular-nums` en `body`. Sin esto, los precios y las tablas usan números de estilo antiguo, de alturas distintas.
- Sin tipografía monoespaciada para datos.
- Largo de línea máximo: 70 caracteres en párrafos (`max-w-prose` o `max-w-[65ch]`).

| Rol | Tamaño / interlineado | Peso | Dónde |
|---|---|---|---|
| Display | 40/44 en celular, 56/60 en escritorio | 700 | Solo el título del hero de la web |
| H1 | 28/34 | 700 | Título de página |
| H2 | 20/28 | 700 | Secciones |
| H3 | 16/24 | 600 | Subsecciones, títulos de tarjeta |
| Cuerpo | 16/26 en la web, 14/22 en el back office | 400 | Párrafos |
| Pequeño | 13/20 | 500 | Ayudas, metadatos, celdas secundarias |
| Precio | 22/28 en tarjeta, 32/38 en ficha | 700 | Ver `componentes.md`, Precio |

Mínimo 13 px para cualquier texto. Hoy hay textos de 10 y 11 px ("Pronto", "8 fotos"): suben a 13.

## Espaciado

Escala de 4 px: 4, 8, 12, 16, 24, 32, 48, 64, 96. Entre secciones de la web: 64 en celular, 96 en escritorio. Dentro de tarjetas: 16 en celular, 24 en escritorio.

## Bordes y radios

El radio indica jerarquía; no se pone el mismo a todo.

| Elemento | Radio |
|---|---|
| Campos, botones del back office, chips de tabla | 6 px |
| Tarjetas y paneles | 10 px |
| Fotos de propiedades | 10 px arriba si van en tarjeta; sin radio en la galería de la ficha |
| Botones de la web | 999 px (píldora, como bullhaus.cl) |

## Sombras

Solo dos niveles: ninguna (por defecto: los paneles se separan con `line` o con el fondo `paper`) y `0 8px 24px rgb(0 0 0 / .12)` para lo que flota (menús desplegables, diálogos, aviso de cookies). Las tarjetas no llevan sombra.

## Capas (z-index)

| Capa | z | Elementos |
|---|---|---|
| Contenido | 0 | — |
| Encabezado fijo | 30 | Menú de la web |
| Flotante | 40 | Botón de WhatsApp, calculadora UF |
| Desplegables | 50 | Menús, selectores |
| Avisos | 60 | Aviso de cookies, notificaciones |
| Diálogos | 70 | Modales |

## Movimiento

- Duración 150 ms para estados (hover, foco), 250 ms para abrir y cerrar.
- Solo movimiento que responde a una acción de la persona. Ninguna animación de entrada por sección.
- Todo dentro de `@media (prefers-reduced-motion: no-preference)`.
