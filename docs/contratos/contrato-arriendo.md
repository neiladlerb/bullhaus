<!--
Plantilla: arriendo
Versión: 0.1 (borrador)
Estado: SIN APROBAR. No usar con clientes hasta que la apruebe el abogado de Bull Haus.
Marco: Ley N° 18.101 sobre arrendamiento de predios urbanos y sus modificaciones (entre otras, Ley N° 21.461),
Código Civil y, si es departamento o condominio, Ley N° 21.442 de copropiedad inmobiliaria.
Fuentes: arrendadores[] y arrendatarios[] y codeudores[] (clients + kyc_cases aprobados),
propiedad.* (properties + property_legal), arriendo.* (deals), empresa.*.
-->

# CONTRATO DE ARRENDAMIENTO

N° {{contrato.numero}}

En {{contrato.ciudad}}, a {{contrato.fecha_larga}}, entre:

**Arrendador:**
{{#each arrendadores}}
- {{#if es_persona_natural}}**{{nombre_completo}}**, {{nacionalidad}}, {{estado_civil}}, {{profesion}}, cédula de identidad N° {{rut}}, domicilio {{domicilio}}, email {{email}}{{else}}**{{razon_social}}**, RUT N° {{rut}}, domicilio {{domicilio}}, representada por {{representante.nombre_completo}}, cédula de identidad N° {{representante.rut}}{{/if}}.
{{/each}}
{{#if arriendo.apoderado}}Representado(s) por {{arriendo.apoderado.nombre_completo}}, cédula de identidad N° {{arriendo.apoderado.rut}}, según poder otorgado en {{arriendo.apoderado.poder_texto}}.{{/if}}

**Arrendatario:**
{{#each arrendatarios}}
- {{#if es_persona_natural}}**{{nombre_completo}}**, {{nacionalidad}}, {{estado_civil}}, {{profesion}}, cédula de identidad N° {{rut}}, email {{email}}, teléfono {{telefono}}{{else}}**{{razon_social}}**, RUT N° {{rut}}, representada por {{representante.nombre_completo}}, cédula de identidad N° {{representante.rut}}{{/if}}.
{{/each}}

{{#if codeudores}}
**Codeudor solidario:**
{{#each codeudores}}
- **{{nombre_completo}}**, {{nacionalidad}}, {{estado_civil}}, {{profesion}}, cédula de identidad N° {{rut}}, domicilio {{domicilio}}, email {{email}}.
{{/each}}
{{/if}}

Y con la intervención de **{{empresa.razon_social}}**, RUT N° {{empresa.rut}}, como corredora de propiedades ("Bull Haus"), se acuerda el siguiente contrato:

## PRIMERO. Propiedad arrendada

El Arrendador da en arrendamiento al Arrendatario, que acepta para sí, la propiedad ubicada en **{{propiedad.direccion}}{{#if propiedad.unidad}}, {{propiedad.unidad}}{{/if}}, comuna de {{propiedad.comuna}}**{{#if propiedad.estacionamientos_texto}}, junto con {{propiedad.estacionamientos_texto}}{{/if}}{{#if propiedad.bodegas_texto}} y {{propiedad.bodegas_texto}}{{/if}}, rol de avalúo N° {{propiedad.rol_avaluo}}, inscrita a fojas {{propiedad.fojas}} número {{propiedad.numero}} del Registro de Propiedad del Conservador de Bienes Raíces de {{propiedad.conservador}} del año {{propiedad.anio}}.

La propiedad se arrienda {{#if arriendo.amoblado}}amoblada, con los muebles y artefactos que se detallan en el inventario anexo{{else}}sin muebles{{/if}}, y se destinará exclusivamente a **{{arriendo.destino}}**.

## SEGUNDO. Plazo

El arrendamiento comienza el **{{arriendo.fecha_inicio}}** y dura **{{arriendo.plazo_texto}}**. {{#if arriendo.renovacion_automatica}}Se renovará automática y sucesivamente por períodos de {{arriendo.periodo_renovacion_texto}} si ninguna de las partes avisa a la otra su voluntad de no renovar, por carta certificada o por correo electrónico a las direcciones de este contrato, con al menos {{arriendo.aviso_no_renovacion_dias}} días de anticipación al vencimiento.{{/if}} [VALIDAR ABOGADO: forma de aviso válida]

## TERCERO. Renta

La renta mensual es de **{{arriendo.renta_texto}}**, que el Arrendatario pagará por anticipado dentro de los primeros **{{arriendo.dia_pago}} días** de cada mes, mediante transferencia a la cuenta {{arriendo.cuenta_pago_texto}}.

{{#if arriendo.reajuste}}
La renta se reajustará cada {{arriendo.reajuste_periodo_texto}} según la variación del Índice de Precios al Consumidor (IPC) del período{{#if arriendo.renta_en_uf}}; si la renta está pactada en UF, no aplica este reajuste{{/if}}.
{{/if}}

El atraso en el pago genera {{arriendo.interes_mora_texto}}. [VALIDAR ABOGADO: interés máximo convencional]

## CUARTO. Gastos y servicios

Son de cargo del Arrendatario los gastos comunes{{#if arriendo.gastos_comunes_estimados}} (aproximadamente {{arriendo.gastos_comunes_estimados}} al mes){{/if}}, y los consumos de luz, agua, gas{{#if arriendo.otros_servicios}}, {{arriendo.otros_servicios}}{{/if}}, que deberá mantener al día y acreditar cuando el Arrendador lo pida. Las contribuciones de bienes raíces son de cargo del Arrendador.

## QUINTO. Garantía

El Arrendatario entrega en este acto la suma de **{{arriendo.garantia_texto}}** como garantía de la conservación de la propiedad, de la devolución de las especies del inventario y del pago de consumos y gastos comunes. El Arrendador la devolverá, reajustada en la misma proporción que la renta, dentro de los **{{arriendo.dias_devolucion_garantia}} días** siguientes a la restitución, descontando los daños y deudas que se acrediten. La garantía no puede imputarse a la última renta.

## SEXTO. Estado de la propiedad y entrega

La propiedad se entrega en el estado que consta en el acta de entrega, el inventario y las fotografías anexas, que las partes firman junto con este contrato. El Arrendatario la restituirá al término del contrato en el mismo estado, salvo el desgaste por uso legítimo.

## SÉPTIMO. Obligaciones del Arrendatario

1. Pagar puntualmente la renta, los gastos comunes y los consumos.
2. Usar la propiedad solo para el destino pactado y mantenerla en buen estado, haciendo las reparaciones locativas.
3. No subarrendar ni ceder el contrato sin autorización escrita del Arrendador.
4. No hacer modificaciones sin autorización escrita del Arrendador.
5. Respetar el reglamento de copropiedad{{#if propiedad.copropiedad}}, que declara conocer y del que recibe copia{{/if}}.
6. Permitir que el Arrendador o Bull Haus visiten la propiedad con aviso previo de {{arriendo.aviso_visita_horas}} horas{{#if arriendo.permitir_visitas_ultimo_mes}}, y en el último mes del contrato para mostrarla a interesados{{/if}}.
{{#if arriendo.mascotas}}7. Se permiten mascotas en las condiciones del anexo de cláusulas especiales.{{else}}7. No mantener mascotas sin autorización escrita del Arrendador, salvo lo que disponga la ley.{{/if}} [VALIDAR ABOGADO]

## OCTAVO. Obligaciones del Arrendador

1. Entregar la propiedad en estado de servir para el fin arrendado.
2. Hacer las reparaciones necesarias que no sean locativas.
3. Librar al Arrendatario de toda turbación en el goce de la propiedad.

## NOVENO. Término anticipado

El Arrendador podrá poner término inmediato al contrato si el Arrendatario no paga la renta en el plazo pactado o infringe gravemente sus obligaciones, sin perjuicio de las acciones que correspondan conforme a la Ley N° 18.101. {{#if arriendo.salida_anticipada}}El Arrendatario podrá poner término anticipado avisando con {{arriendo.salida_anticipada_aviso_dias}} días de anticipación y pagando {{arriendo.salida_anticipada_multa_texto}}.{{/if}} [VALIDAR ABOGADO]

{{#if codeudores}}
## DÉCIMO. Codeudor solidario

El o los codeudores se constituyen en fiadores y codeudores solidarios del Arrendatario por todas las obligaciones de este contrato, sus renovaciones y prórrogas.
{{/if}}

## UNDÉCIMO. Comisión de Bull Haus

Las partes reconocen que este arriendo se celebra por intermediación de Bull Haus. La comisión de Bull Haus es de **{{arriendo.comision_arrendador_texto}}** de cargo del Arrendador y **{{arriendo.comision_arrendatario_texto}}** de cargo del Arrendatario{{#if arriendo.comision_mas_iva}}, más IVA{{/if}}, pagaderas a la firma de este contrato contra la emisión del documento tributario correspondiente.

{{#if arriendo.administracion}}
Bull Haus administrará el arriendo por cuenta del Arrendador en los términos del contrato de administración suscrito entre ambos.
{{/if}}

## DUODÉCIMO. Datos personales

Los datos personales de las partes se tratarán solo para la celebración, ejecución y término de este contrato, para obligaciones legales y para facturación, según la política de privacidad de Bull Haus en {{empresa.url_privacidad}}.

## DECIMOTERCERO. Comunicaciones, firma y domicilio

Las comunicaciones se harán a los correos electrónicos indicados en la comparecencia. Las partes fijan domicilio en la comuna de {{propiedad.comuna}} y se someten a sus tribunales. {{contrato.texto_forma_firma}} [VALIDAR ABOGADO: firma ante notario o firma electrónica avanzada y sus efectos]

{{#each clausulas_especiales}}
## {{ordinal}}. {{titulo}}

{{texto}}
{{/each}}

Anexos: acta de entrega, inventario y fotografías{{#if propiedad.copropiedad}}, copia del reglamento de copropiedad{{/if}}.

---

{{#each arrendadores}}
______________________________
{{nombre_o_razon_social}} · RUT {{rut}} · Arrendador

{{/each}}
{{#each arrendatarios}}
______________________________
{{nombre_o_razon_social}} · RUT {{rut}} · Arrendatario

{{/each}}
{{#each codeudores}}
______________________________
{{nombre_completo}} · RUT {{rut}} · Codeudor solidario

{{/each}}
______________________________
p.p. {{empresa.razon_social}} · Corredora
