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

## 17/11/2026, dictado del corredor v1.0

- Dos prompts nuevos en cinco piezas en `packages/core/src/dictation.ts`: `EXTRACTION_SYSTEM` (del dictado a campos de la ficha, en JSON con la frase de origen) y `DESCRIPTION_SYSTEM` (descripción desde la ficha revisada).
- Lenguaje de terreno en el contexto: piezas o dormis, est, gc, lucas o mil, números en palabras.
- Controles en código, no en el prompt: se descarta todo dato cuya frase no esté en el dictado, y una descripción con cifras que no están en la ficha se reemplaza por la plantilla o no se deja aprobar.
- Casos de prueba en `evals/escenarios/dictado.yaml`.
