# Informe SEO: Bull Haus Propiedades

13/11/2026. Compara la web actual (www.bullhaus.cl, sobre Convecta) con la web nueva de este repo (`apps/web`), que todavía no está publicada en el dominio. Las fuentes y el detalle están en `docs/diagnostico.md`.

## Resumen

La web actual casi no compite en Google:

- El título dice solo «Bull Haus».
- No tiene mapa del sitio.
- No tiene páginas por comuna.
- No tiene ninguna etiqueta de medición.

La web nueva corrige esos puntos. Los resultados se verán recién cuando reemplace a la actual en www.bullhaus.cl y Google la vuelva a recorrer, lo que suele tomar semanas.

## 1. Web actual (www.bullhaus.cl), revisada el 13/11/2026

| Punto | Estado | Efecto |
|---|---|---|
| Título de la portada | Solo «Bull Haus» | No aparece en búsquedas como «corredora Las Condes» |
| Descripción | «Propiedades y Real Estate» | Genérica, sin comunas ni servicios |
| Encabezado principal (H1) | Dos en la portada | Google no sabe cuál es el tema principal |
| Texto alternativo de imágenes | Falta en 11 de 13 | Se pierde la búsqueda de imágenes y la accesibilidad |
| Mapa del sitio (`sitemap.xml`) | No existe | Google tarda más en encontrar las fichas |
| Páginas por comuna o servicio | No hay | La competencia (RE/MAX First) sí tiene páginas por comuna |
| Medición (GA4, Search Console, píxel) | No se detectó ninguna | No se sabe cuántas visitas ni contactos trae la web |
| Captación de propietarios | No hay formulario | Los contactos más valiosos no tienen por dónde entrar |
| Contenido (guías, blog) | No hay | Sin tráfico por búsquedas informativas |
| Velocidad | No se pudo medir (la API pública bloqueó la consulta) | Pendiente |

## 2. Web nueva (`apps/web`): lo que ya está hecho

| Punto | Estado |
|---|---|
| Título y descripción por página | Cada página tiene los suyos. Las fichas de propiedad llevan tipo, operación, comuna y precio en el título, y los toman de la ficha de marca y de cada propiedad |
| Un solo H1 por página | Sí, en las seis plantillas de página |
| Mapa del sitio y `robots.txt` | `sitemap.xml` con portada, listado, propietarios, cada comuna con propiedades y cada ficha disponible. Se actualiza cada 5 minutos |
| URL canónica | En el listado (los filtros no dividen el posicionamiento), en cada ficha y en cada comuna |
| Páginas por comuna | `/comunas/<comuna>`, una por cada comuna con propiedades disponibles, con un título del tipo «Propiedades en venta y arriendo en Lo Barnechea» y un botón para propietarios |
| Captación de propietarios | Página `/vender` con formulario de valorización, más llamados a la acción en la portada y en cada comuna |
| Texto alternativo | La foto principal de cada ficha y las tarjetas del listado llevan «tipo en comuna». Las imágenes decorativas de fondo van vacías a propósito |
| Medición | GA4 y píxel de Meta solo si la persona acepta las cookies. Cada formulario enviado registra un contacto. Cada lead guarda su origen (campaña, anuncio, Google, redes) y el back office muestra el canal |
| Vista al compartir (Open Graph) | Las fichas comparten título y foto principal |
| Datos estructurados (JSON-LD) | La portada describe a la corredora (`RealEstateAgent`). Cada ficha lleva `RealEstateListing` con precio (UF como `CLF`), comuna, dormitorios, baños y superficie, sin la dirección exacta. Fichas y comunas llevan además la ruta de navegación (`BreadcrumbList`) |
| Texto alternativo de la galería | Cada foto dice «tipo en comuna: etiqueta de la foto», o el número de foto si no tiene etiqueta |
| URL canónica de la portada | Sí |

## 3. Lo que falta, por impacto

| # | Mejora | Impacto | Esfuerzo |
|---|---|---|---|
| 1 | **Publicar la web nueva en www.bullhaus.cl.** Hoy convive con Convecta. Hay que decidir si la web nueva toma el dominio y redirige las URLs antiguas de las fichas (redirecciones 301) para no perder lo que ya está indexado | Alto: sin esto, nada de la sección 2 cuenta para Google | Medio |
| 2 | **Search Console y GA4 a nombre de Bull Haus.** Verificar el dominio, enviar el `sitemap.xml` y cargar `NEXT_PUBLIC_GA4_ID` | Alto: es la línea base para medir | Bajo |
| 3 | **Google Business Profile** de la oficina de Las Condes, con fotos, horario y enlace a la web | Alto en búsquedas locales («corredora de propiedades Las Condes») | Bajo; lo gestiona Bull Haus |
| 4 | **Páginas por servicio**: tasación, arriendo y venta, una por servicio. Los textos los aprueba Bull Haus antes de publicar | Medio | Bajo |
| 5 | **Contenido**: guías cortas de búsquedas reales (cuánto cuesta arrendar en Las Condes, qué pide la notaría para vender). Hay que elegir los temas con datos de Search Console o Keyword Planner, no a ciegas | Medio y acumulativo | Medio (los textos los aprueba Bull Haus) |
| 6 | **Portales** (Portal Inmobiliario y otros): enlaces y visibilidad. Ya planificado; la conexión queda lista pero desconectada hasta tu autorización | Medio | Medio |

## 4. Lo que no se pudo medir

Faltan datos, no se suponen:

- Velocidad (PageSpeed) de la portada y de una ficha: medir a mano en pagespeed.web.dev.
- Búsquedas y posiciones actuales: hacen falta acceso a Search Console (si existe) o Keyword Planner.
- Visitas actuales: no hay GA4 en la web actual, así que no hay historial.

## 5. Cómo medir el avance

Al publicar la web nueva, registrar la línea base y revisarla una vez al mes:

- Páginas indexadas.
- Clics e impresiones en Search Console.
- Visitas orgánicas en GA4.
- Leads por canal en el back office.
