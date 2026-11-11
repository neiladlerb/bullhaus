<!--
Plantilla: carta_oferta
Versión: 0.1 (borrador)
Estado: SIN APROBAR. No usar con clientes hasta que la apruebe el abogado de Bull Haus.
Fuentes: oferente[] (clients + kyc_cases aprobados), propiedad.* (properties + property_legal), oferta.* (deals).
-->

# CARTA OFERTA {{#if oferta.es_venta}}DE COMPRA{{else}}DE ARRIENDO{{/if}} Y RESERVA

N° {{contrato.numero}} · {{contrato.ciudad}}, {{contrato.fecha_larga}}

Señor(es)
{{#each propietarios}}{{nombre_o_razon_social}}{{#unless @last}}, {{/unless}}{{/each}}
Propietario(s)
A través de {{empresa.razon_social}}

## 1. Oferente

{{#each oferentes}}
{{#if es_persona_natural}}
**{{nombre_completo}}**, {{nacionalidad}}, {{estado_civil}}{{#if regimen_patrimonial}}, {{regimen_patrimonial}}{{/if}}, {{profesion}}, cédula de identidad N° {{rut}}, domicilio {{domicilio}}, email {{email}}, teléfono {{telefono}}.
{{else}}
**{{razon_social}}**, RUT N° {{rut}}, domicilio {{domicilio}}, representada por {{representante.nombre_completo}}, cédula de identidad N° {{representante.rut}}.
{{/if}}
{{/each}}

## 2. Propiedad

{{propiedad.direccion}}{{#if propiedad.unidad}}, {{propiedad.unidad}}{{/if}}, comuna de {{propiedad.comuna}}. Rol de avalúo N° {{propiedad.rol_avaluo}}. Código Bull Haus {{propiedad.codigo}}.

## 3. Oferta

{{#if oferta.es_venta}}
- Precio ofrecido: **{{oferta.precio_texto}}**.
- Forma de pago: {{oferta.forma_pago_texto}}.
{{#if oferta.con_credito}}- Parte del precio se pagará con crédito hipotecario {{#if oferta.credito_preaprobado}}preaprobado por {{oferta.banco}}{{else}}en trámite{{/if}}. Si el crédito no se aprueba dentro de {{oferta.plazo_credito_dias}} días, el Oferente podrá retirar la oferta y se le devolverá la reserva. [VALIDAR ABOGADO]{{/if}}
- Fecha propuesta para firmar la promesa: {{oferta.fecha_promesa}}. Fecha propuesta para la escritura: {{oferta.fecha_escritura}}.
{{else}}
- Renta mensual ofrecida: **{{oferta.renta_texto}}**.
- Fecha de inicio propuesta: {{oferta.fecha_inicio}}. Plazo: {{oferta.plazo_texto}}.
- Garantía ofrecida: {{oferta.garantia_texto}}.
{{#if oferta.codeudor}}- Codeudor solidario: {{oferta.codeudor.nombre_completo}}, cédula de identidad N° {{oferta.codeudor.rut}}.{{/if}}
{{/if}}
{{#if oferta.condiciones}}- Condiciones adicionales: {{oferta.condiciones}}.{{/if}}

Esta oferta tiene una vigencia de **{{oferta.vigencia_dias}} días** desde su fecha. Si el Propietario no la acepta por escrito en ese plazo, se entiende rechazada.

## 4. Reserva

El Oferente entrega a Bull Haus la suma de **{{oferta.reserva_texto}}** como reserva, mediante {{oferta.reserva_medio}}.

- Si el Propietario no acepta la oferta, Bull Haus devuelve la reserva íntegra dentro de {{oferta.dias_devolucion}} días hábiles.
- Si el Propietario acepta y la operación se concreta, la reserva se imputa {{oferta.imputacion_reserva_texto}}.
- Si el Propietario acepta y el Oferente desiste sin causa justificada, {{oferta.desistimiento_texto}}. [VALIDAR ABOGADO: tratamiento de la reserva ante desistimiento y su compatibilidad con la Ley 19.496]

## 5. Declaraciones del Oferente

- Que sus datos de identidad fueron verificados por Bull Haus y son verdaderos.
- {{#if oferta.es_venta}}Que los fondos con los que pagará el precio provienen de {{oferta.origen_fondos}}, y que no provienen de actividades ilícitas.{{/if}}
- {{#if oferente_principal.pep}}Que es persona expuesta políticamente, en calidad de {{oferente_principal.pep_cargo}}.{{else}}Que no es persona expuesta políticamente.{{/if}}
- Que conoce la propiedad y su estado.

## 6. Datos personales

Bull Haus tratará los datos del Oferente para gestionar esta oferta, para las obligaciones de prevención de lavado de activos y para la facturación, según su política de privacidad en {{empresa.url_privacidad}}. Los datos se comunicarán al Propietario solo en lo necesario para evaluar y formalizar la oferta.

______________________________
{{oferente_principal.nombre_o_razon_social}}
RUT {{oferente_principal.rut}}
Oferente

---

## Aceptación del Propietario

El Propietario acepta la oferta en los términos indicados.

Fecha: ____ / ____ / ______

{{#each propietarios}}
______________________________
{{nombre_o_razon_social}}
RUT {{rut}}

{{/each}}
