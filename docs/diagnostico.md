# Diagnóstico de potencial: Bull Haus

Etapa 2 de la skill `nuevo-proyecto`, 13/11/2026. Solo con fuentes públicas: todavía no hay accesos de Bull Haus a GA4, Search Console ni Meta. Cada dato lleva su fuente y fecha.

## 1. Cómo está hoy

### Web (www.bullhaus.cl, Convecta), revisada el 13/11/2026

| Punto | Hallazgo | Por qué importa |
|---|---|---|
| Título de la página | Solo "Bull Haus" | Google muestra ese título. No dice qué hace ni dónde, así que no compite por "corredora Las Condes" |
| Descripción (meta description) | "Propiedades y Real Estate" | Genérica, en spanglish, sin comunas ni servicios |
| Encabezado principal (H1) | Dos: "Intermediación y gestión inmobiliaria" y "Bull Haus V Región Costa" | Google espera uno solo, con la frase clave |
| Imágenes sin texto alternativo | 11 de 13 | Se pierde posicionamiento en búsqueda de imágenes y accesibilidad |
| Mapa del sitio (`sitemap.xml`) | No existe (redirige a 404) | Google descubre las fichas más lento o no las descubre |
| Medición (GA4, Google Tag Manager, píxel de Meta) | No se detectó ninguna etiqueta en el HTML | Hoy no se puede saber cuántas visitas ni contactos genera la web. Sin esto no hay ROI medible |
| Propiedades en la portada | 6, todas en venta; el menú tiene arriendo, pero no hay ninguna destacada | El arriendo no se ve |
| Captación de propietarios | No hay formulario ni botón "vende o arrienda tu propiedad". Las valorizaciones se mencionan sin llamado a la acción | Los propietarios son los contactos más valiosos (traen cartera) y la web no los capta |
| Formulario de contacto | No hay; solo WhatsApp y buscador por código | Todo contacto depende de WhatsApp, sin registro del origen |
| Contenido (blog, guías) | No hay | Sin contenido no hay tráfico orgánico por búsquedas informativas |
| Zonas en el filtro | Aventura, Colina, La Reina, Las Condes, Lo Barnechea, Macul, Ñuñoa, Providencia, Puchuncaví, Santiago, Valparaíso, Vitacura; regiones Metropolitana, Valparaíso e "Internacional" | Hay más comunas que las cuatro de la ficha del cliente: confirmar cuáles atienden de verdad |
| Velocidad (PageSpeed) | No se pudo medir: la API pública respondió "demasiadas solicitudes". La portada carga en ~1 s desde el servidor | [FALTA: medir en pagespeed.web.dev] |

### Redes y publicidad

| Punto | Hallazgo | Fuente |
|---|---|---|
| Instagram @bullhaus_propiedades | No se pudo leer: Instagram exige iniciar sesión | [FALTA: seguidores, publicaciones al mes e interacción. Se obtienen con acceso a Meta Insights en la etapa 3] |
| Facebook BullHauspropiedades | No revisado (misma restricción) | [FALTA] |
| Anuncios activos en Meta | La biblioteca de anuncios no mostró resultados para "bull haus" en Chile, pero tampoco cargó resultados para competidores conocidos, así que **no es concluyente** | [FALTA: confirmar con Bull Haus si pauta hoy] |
| Portales (Portal Inmobiliario, Toctoc, Yapo) | Una búsqueda no encontró a Bull Haus | No concluyente; [FALTA: confirmar con Bull Haus] |
| Demanda en Google (Trends) | No se pudo medir: Google Trends bloqueó la consulta automática | [FALTA: revisar a mano o con Keyword Planner al tener acceso a Google Ads] |

## 2. Competencia (candidatas, por confirmar con Bull Haus)

| Nombre | Por qué aparece | Fuente |
|---|---|---|
| RE/MAX First | Oficina en Providencia, con páginas posicionadas para "corredora Las Condes" y "sector oriente" | [remax-first.cl](https://www.remax-first.cl/corredora-de-propiedades-las-condes/) |
| Lo BA Propiedades | Boutique del sector oriente, foco en Lo Barnechea, atendida por sus dueños (perfil parecido a Bull Haus) | [Mercado Libre](https://www.mercadolibre.cl/pagina/lobapropiedades) |
| Boetsch Propiedades | Tienda oficial en Mercado Libre y Portal Inmobiliario | [Mercado Libre](https://www.mercadolibre.cl/tienda/boetsch-propiedades) |

Lo que ya se ve: RE/MAX First tiene páginas específicas por comuna ("corredora de propiedades Las Condes"), y Bull Haus no tiene ninguna. Las otras dos publican en portales, donde no se encontró a Bull Haus.

## 3. Brechas frente a la competencia

1. **Búsqueda orgánica:** la competencia tiene páginas por comuna y por servicio; Bull Haus tiene una portada con título "Bull Haus".
2. **Portales:** la competencia publica en Portal Inmobiliario y Mercado Libre; Bull Haus, por lo encontrado, no.
3. **Medición:** sin etiquetas de medición, Bull Haus no sabe qué canal le trae contactos. Con eso, cualquier presupuesto de publicidad sería a ciegas.

## 4. Tres oportunidades, por impacto y costo

| # | Oportunidad | Impacto | Costo | Qué ya existe en el repo |
|---|---|---|---|---|
| 1 | **Captar propietarios:** página "Vende o arrienda tu propiedad" con formulario de valorización, más llamado a la acción en portada y en cada ficha | Alto: cada propietario es cartera nueva y dos comisiones posibles | Bajo | La web nueva (`apps/web`) ya tiene la página `/vender` y sus formularios crean leads en el back office (con `WEB_API_KEY`). Falta medir de qué canal viene cada lead |
| 2 | **Base de SEO y medición:** título y descripción por página, un H1, texto alternativo, sitemap, páginas por comuna y por servicio, y GA4 con consentimiento de cookies | Alto y acumulativo; además es requisito para medir el ROI | Bajo (está en la web nueva) | La web nueva carga el píxel de Meta solo con consentimiento. Faltan `sitemap.xml` y `robots.txt` (no existen en `apps/web`), metadatos por ficha y por comuna, páginas por comuna, y GA4 (no está instalado) |
| 3 | **Piloto de anuncios click-to-WhatsApp** con 3 o 4 propiedades y un presupuesto chico, para medir el costo por lead real | Medio: da el dato que necesita la calculadora de ROI | Presupuesto de pauta (lo fija Bull Haus) + mensajes de WhatsApp | Está planificado como fase 8 de la propuesta; depende de la verificación de Meta (etapa 3) |

Recomendación: primero 1 y 2, porque cuestan poco, ya están casi construidas y sin medición la oportunidad 3 no se puede evaluar.

## 5. Lo que se necesita para completar el diagnóstico

Con acceso de Bull Haus (se pide en la etapa 3):

- **GA4 y Search Console:** visitas, búsquedas por las que aparece y fichas más vistas. Hoy probablemente no hay datos, porque no se detectó GA4.
- **Meta Insights:** seguidores, alcance e interacción de Instagram y Facebook.
- **Administrador de anuncios de Meta y Google Ads:** si hay campañas, el gasto y el costo por lead históricos.

A mano, sin accesos:

- PageSpeed Insights de la portada y de una ficha.
- Google Trends o Keyword Planner para "arriendo departamento Las Condes", "venta casa Lo Barnechea" y "tasación de propiedades".

## 6. Pendientes de la etapa 2

1. Comunas: las del filtro de la web (respuesta del usuario, 13/11/2026). [FALTA: confirmar si "Internacional" sigue vigente]
2. [FALTA: si pautan hoy en Meta o Google, y con qué presupuesto]
3. Portales: quieren publicar en Portal Inmobiliario y en los principales portales. Se revisa en la etapa 3 junto con lo que hace Convecta y su SEO
4. [FALTA: competencia directa según Bull Haus (las tres de arriba son candidatas)]
5. [FALTA: métricas de Instagram y Facebook, con acceso a Insights]
6. [FALTA: velocidad (PageSpeed) y demanda de búsqueda (Trends o Keyword Planner)]
