---
name: diseno-bullhaus
description: Sistema de diseño de la web pública (apps/web) y del back office (apps/backoffice) de Bull Haus y de cada corredora de la plataforma. Úsala antes de crear, rediseñar o revisar cualquier pantalla, componente, formulario, tabla, tarjeta de propiedad, menú, estado vacío o texto de interfaz, y al tocar colores, tipografía o espaciado. Complementa a frontend-design con las decisiones ya tomadas para este proyecto.
---

# Sistema de diseño Bull Haus

Las decisiones de diseño de este proyecto ya están tomadas y escritas aquí. Tu trabajo es **aplicarlas**, no reinventarlas en cada pantalla. Si una pantalla necesita algo que no está, propónlo como agregado a esta skill (tokens o componente nuevo) en vez de resolverlo a mano en esa pantalla.

## Para quién diseñamos

- **Web pública**: compradores, arrendatarios y sobre todo **propietarios** del sector oriente de Santiago y la V Región Costa. Propiedades de UF 4.000 a UF 34.000. Buscan confianza y datos claros, no efectos. La propiedad (fotos, precio, comuna) es la protagonista; la marca acompaña.
- **Back office**: cinco corredores que lo usan **en el celular, en terreno**, más administración, finanzas y cumplimiento en escritorio. Necesitan saber qué hacer hoy, encontrar rápido una propiedad o un contacto y cargar datos sin errores.
- **Multi-corredora**: los colores `brand`, `brandDark`, `ink` y `coal` llegan de la ficha de marca de cada corredora (`packages/core/src/brand.ts`). Nunca escribas un hex de marca en un componente: usa siempre los tokens.

## Archivos de referencia (léelos según la tarea)

| Archivo | Cuándo leerlo |
|---|---|
| `tokens.md` | Siempre que toques colores, tipografía, espaciado, bordes, sombras o capas. Incluye la tabla de contraste. |
| `componentes.md` | Al crear o cambiar botones, campos, chips de estado, tablas, paginación, filtros, avisos, estados vacíos, tarjeta de propiedad o precio. |
| `web.md` | Cualquier pantalla de `apps/web`: hero, menú, flotantes, listado, ficha, comunas, formularios. |
| `backoffice.md` | Cualquier pantalla de `apps/backoffice`: menú, inicio, listas, detalle, formularios, celular. |
| `textos.md` | Todo texto visible: botones, títulos, errores, vacíos, confirmaciones. |
| `scripts/contraste.mjs` | Para verificar el contraste de un par de colores o de la ficha de marca de una corredora. |

## Proceso en cada tarea de interfaz

1. **Lee** el archivo de referencia que corresponde y el código de la pantalla.
2. **Plan corto** antes de escribir código: qué componentes del sistema usas, qué es lo más importante de la pantalla (una sola cosa) y cómo se ve en 375 px.
3. **Revisa el plan contra la lista de "Nunca"** de abajo. Si algo calza, cámbialo y di por qué.
4. **Construye** con los tokens y las clases del sistema (`btn-*`, `field`, `chip-*`, etc.). Nada de colores de Tailwind sueltos (`violet-600`, `red-500`) para significar estados: usa los tokens semánticos.
5. **Verifica** con el navegador integrado a 375 px y a 1280 px: captura, foco con teclado (Tab), y contraste de cualquier color nuevo con `scripts/contraste.mjs`.

## Principios

1. **La propiedad manda.** En la web, foto, precio y comuna van primero; textos de marketing después.
2. **Lo urgente arriba.** En el back office, cada pantalla responde primero "¿qué tengo que hacer ahora?" (vencidos, pendientes de aprobar), después muestra datos.
3. **Celular primero en el back office.** Toda pantalla del corredor se diseña a 375 px y luego se amplía, no al revés.
4. **Un solo acento por pantalla.** El magenta se usa en una cosa (la acción principal o el dato clave), no en etiquetas, bordes y títulos a la vez.
5. **La estructura informa.** Bordes, números, chips y separadores existen solo si dicen algo (estado, orden real, grupo). Si son adorno, se sacan.
6. **Números legibles.** Precios, superficies y métricas siempre con cifras alineadas (`tabular-nums lining-nums`): Raleway trae por defecto números de estilo antiguo que se ven desalineados.
7. **Accesible sin anunciarlo.** Contraste AA, foco visible, objetivos táctiles de 44 px en celular, `prefers-reduced-motion` respetado, `aria-current` en el menú.

## Nunca

Son los rasgos que hoy hacen ver al proyecto genérico o hecho con IA. Ninguno se usa salvo que el usuario lo pida explícitamente:

- Etiquetas en MAYÚSCULAS con letras espaciadas sobre los títulos (la clase `eyebrow` actual).
- Una sola palabra del título en otro color, negrita o cursiva.
- Textos de metadatos unidos con puntos medios ("Casa · Lo Barnechea · Cód. 109.975"): usa jerarquía (comuna como dato principal, código en pequeño).
- Fondo crema (#F4F1EA y similares, como el `sand` actual #F6F3EF).
- Grillas de tarjetas idénticas con la misma sombra para mostrar datos de distinta importancia.
- Zoom de la imagen al pasar el mouse en cada tarjeta, y animaciones de entrada en cada sección.
- Números en marcadores (01 / 02 / 03) si el contenido no es una secuencia real.
- Flechas "→" pegadas al texto de los botones.
- Magenta para texto pequeño o enlaces sobre blanco (no pasa contraste: 3,98 a 1).
- Más de un elemento flotante fijo en la pantalla del celular al mismo tiempo.

## Reglas del proyecto que el diseño también cumple

- Español de Chile: departamento, arriendo, celular, gastos comunes, estacionamiento. Fechas dd/mm/aaaa, horas 24 h.
- Precios en la moneda de la ficha: "UF 18.500", "$1.450.000". No convertir UF a CLP en la interfaz.
- La web no carga etiquetas de publicidad hasta aceptar cookies: el aviso de cookies tiene dos botones con el mismo peso visual ("Aceptar" y "Solo necesarias").
- La dirección exacta nunca aparece en la web ni en listados: solo comuna y sector.
- Imágenes con amoblado virtual llevan la etiqueta visible "Imagen referencial".
