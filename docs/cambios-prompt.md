# Cambios en el prompt

## 11/11/2026, v2.0

- El agente pasa a atender a los contactos de Bull Haus (compradores, arrendatarios y propietarios) en lugar de captar inmobiliarias para la agencia.
- Español de Chile, con lista de vocabulario permitido y prohibido.
- Nuevo objetivo: visita, tasación o llamada con un corredor. El email pasa a ser opcional.
- Nueva variable `{{propiedad_de_interes}}`, cargada desde el anuncio de origen.
- Nueva sección "Lo que nunca haces": datos fuera de la ficha, negociar precio, asesoría de crédito o legal, pedir documentos, discriminar, dar la dirección antes de confirmar.
- Objeciones adaptadas a propiedades.

## 13/11/2026, v2.1 (propuesta, pendiente de datos de Bull Haus)

- Prompt ordenado en cinco piezas (Rol, Contexto, Reglas, Formato de salida, Límites) en `docs/prompt-agente-whatsapp.md`.
- Contexto: una fuente por tipo de dato; lo que no tiene fuente no se responde.
- Reglas nuevas: lenguaje informal y abreviaturas por contexto, cifras ambiguas se preguntan, "ya" u "👍" no confirman un horario, nunca recibir documentos.
- Formato: texto plano sin markdown, máximo 3 mensajes de unas 3 líneas, ejemplo por situación.
- Límites: tabla de disparadores con urgencia y mensaje, incluidos arriendos vigentes con riesgo, reclamos, Sernac y propietarios con varias propiedades.
- Casos de prueba en `evals/escenarios/whatsapp-cinco-piezas.yaml`.
