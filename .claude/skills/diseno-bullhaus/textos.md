# Textos de interfaz

Las palabras son parte del diseño. Cada texto hace un solo trabajo.

## Voz

- Español de Chile, trato de **tú**, cercano y profesional. Sin chilenismos coloquiales en la web ("cachai", "al tiro").
- Frases cortas, voz activa, verbos simples. Sin relleno ("¡Bienvenido a nuestra plataforma!").
- Se nombra lo que la persona entiende, no cómo está hecho el sistema: "Conectar Instagram", no "Configurar webhook".
- Mayúscula solo al inicio de la frase y en nombres propios, también en títulos y botones ("Agendar visita", no "Agendar Visita").

## Vocabulario fijo

| Usar | No usar |
|---|---|
| departamento | piso, apartamento |
| arriendo, arrendar, arrendatario | alquiler, inquilino |
| celular | móvil |
| gastos comunes | expensas, comunidad |
| estacionamiento | parking, cochera, garaje |
| bodega | trastero |
| m² útiles, m² terreno, m² construidos | metros cuadrados (en datos) |
| propietario | dueño (en textos formales) |
| corredor, corredora | agente, asesor inmobiliario |
| valorización | tasación online (la tasación es en terreno) |
| ficha | anuncio (dentro del back office) |

Una acción conserva su nombre en todo el flujo: el botón "Publicar" produce el aviso "Publicada" y el filtro "Publicadas".

## Botones

Verbo + objeto cuando hace falta: "Guardar cambios", "Aprobar ficha", "Emitir factura", "Agendar visita", "Pedir valorización". Nunca "Enviar", "Aceptar" (salvo cookies), "OK", "Continuar" sin contexto, ni flechas pegadas.

## Errores

Dicen qué pasó y cómo arreglarlo, con la voz de la interfaz, sin disculparse y sin códigos técnicos.

| Mal | Bien |
|---|---|
| "Error 500" | "No pudimos guardar la ficha. Revisa tu conexión e inténtalo de nuevo." |
| "Campo inválido" | "Ingresa el celular con 9 dígitos, por ejemplo 9 1234 5678." |
| "Ocurrió un error inesperado" | "No pudimos cargar las propiedades. Recarga la página; si sigue, avísale a administración." |
| "Acción no permitida" | "Solo finanzas puede emitir facturas. Pídele a quien tenga ese rol que la revise." |

## Estados vacíos

Qué falta + por qué importa + acción. Ver `componentes.md`, Estados vacíos.

## Confirmaciones

En pasado, con el objeto: "Ficha aprobada. Ya aparece en la web." "Visita agendada para el 20/11/2026 a las 16:00."

## Números, fechas y precios

- Fechas dd/mm/aaaa; en listas se puede usar "hoy", "ayer", "hace 3 días" con la fecha completa en el `title`.
- Horas en 24 h: "16:00".
- Miles con punto, decimales con coma: "UF 18.500", "UF 2,5", "$1.450.000".
- Superficies: "120 m² útiles".

## Textos de marketing en la web

- Concretos y verificables: "Cinco corredores, oficina en Las Condes", no "Los mejores expertos del mercado".
- Ninguna cifra, plazo o garantía que no esté en la base de conocimiento o la ficha (regla del proyecto).
- No se describen condiciones personales de compradores o arrendatarios (Ley 20.609).
