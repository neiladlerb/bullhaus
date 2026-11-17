# Web pública (apps/web)

Objetivo de cada pantalla: que la persona encuentre una propiedad que le sirve o pida una valorización, y que confíe en Bull Haus para hacerlo. Contactos más valiosos: propietarios (traen cartera).

## Encabezado

- Máximo **5 enlaces** visibles en escritorio: Comprar, Arrendar, Vender mi propiedad, Nosotros, Contacto. "Cómo vendemos", "Servicios" y "Equipo" pasan a ser secciones de Nosotros o de Vender.
- Redes sociales e "Ingreso corredores" van al pie, no al encabezado.
- A la derecha, un solo botón: WhatsApp (principal).
- Nunca en dos líneas: bajo 1024 px se pasa al menú de hamburguesa.
- Fondo blanco sólido al hacer scroll; transparente sobre el hero solo si el contraste del texto con la foto está asegurado con un degradado oscuro.

## Hero

- La protagonista es una foto real de una propiedad de la cartera (no de banco de imágenes) y el **buscador**: es lo que vino a hacer la mayoría.
- Título directo, una sola idea, sin palabra destacada: "Propiedades en el sector oriente y la costa". Sin etiqueta en mayúsculas encima.
- Bajo el buscador, una sola línea para propietarios con enlace: "¿Quieres vender o arrendar tu propiedad? Pide una valorización".
- El buscador: operación, tipo, comuna y botón "Buscar". Los selectores muestran su texto completo (hoy se corta: "Venta y arriendi"); si no cabe, se acorta el texto ("Operación"), no se corta la palabra.

## Elementos flotantes

Hecho el 16/11/2026: queda solo el botón de WhatsApp.

- En celular, **un solo flotante**: el botón de WhatsApp, abajo a la derecha, 56 px.
- La calculadora UF está en la ficha de la propiedad (junto al precio: "Calcular en pesos"), en Propiedades (junto al conteo), en el pie y, desde 768 px, como pestaña vertical fija a la derecha con el valor del día (`UfSideTab`, pedido del cliente 17/11/2026, fondo `brand-dark`). En el celular no hay pestaña: sería un segundo flotante junto a WhatsApp.
- El aviso de cookies aparece abajo, de ancho completo en celular, y mientras está visible el botón de WhatsApp sube para no quedar tapado (`consent.tsx` fija `--cookie-offset` en `<html>` y el botón usa `bottom: calc(1.25rem + var(--cookie-offset, 0px))`). Botones "Aceptar" y "Solo necesarias" con el mismo peso visual: los dos con borde blanco, mismo tamaño, en dos columnas iguales.

## Listado de propiedades

- Filtros arriba en una fila en escritorio; en celular, "Filtros (2)" abre un panel inferior y "Ordenar" va al lado.
- Los enlaces de comunas como chips debajo de los filtros solo si llevan a una página de comuna (sirven para SEO); máximo una línea con "Ver todas".
- Grilla de tarjetas: 1 columna en celular, 2 en tablet, 3 en escritorio. Tarjeta según `componentes.md`.
- Paginación con números ("1 2 3 … 6") y URL propia por página (SEO), no scroll infinito.
- Contador claro: "65 propiedades", y si hay filtros, "12 propiedades en Las Condes".

## Ficha de propiedad

Orden:

1. Galería: foto principal grande + miniaturas; en celular, carrusel deslizable con contador "1 / 8". Sin radio en la galería.
2. Bloque de decisión, fijo a la derecha en escritorio y al pie en celular: precio, comuna, tipo y operación, gastos comunes si existen, botones "Agendar visita" (principal) y "Escribir por WhatsApp" (secundario).
3. Datos clave en una grilla: dormitorios, baños, m² útiles, m² terreno, estacionamientos, bodega, año, orientación. Un dato que no está en la ficha **no se muestra** (ni "—" ni "Consultar").
4. Descripción aprobada.
5. Ubicación: comuna y sector en un mapa aproximado. Nunca la dirección exacta.
6. Corredor a cargo con foto, nombre y WhatsApp.
7. Propiedades similares (misma comuna y operación).

## Página de comuna

Encabezado con el nombre de la comuna y un párrafo corto propio (no genérico), cantidad de propiedades disponibles y el listado filtrado. Sirve para SEO local (`docs/informe-seo.md`).

## Vender mi propiedad

Página para propietarios: qué hace Bull Haus (proceso real en pasos: ahí sí corresponde numerar), el formulario de valorización y testimonios solo si son reales y autorizados.

## Formularios de contacto

- Pocos campos: nombre, celular, correo opcional, mensaje opcional. Comuna y tipo de propiedad solo en el de valorización.
- Consentimiento de datos con texto claro y enlace a privacidad.
- Confirmación en la misma página: "Recibimos tu mensaje. Un corredor te escribe por WhatsApp hoy en horario hábil." (ajustar al horario real de atención, hoy pendiente en `docs/cliente.md`).

## Pie

Logo, contacto (correo, teléfono, dirección de oficina), comunas con enlace, redes sociales, enlace a privacidad, "Ingreso corredores" y la calculadora UF.
