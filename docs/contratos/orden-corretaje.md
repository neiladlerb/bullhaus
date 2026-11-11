<!--
Plantilla: orden_corretaje
Versión: 0.1 (borrador)
Estado: SIN APROBAR. No usar con clientes hasta que la apruebe el abogado de Bull Haus.
Campos entre {{ }}. Bloques {{#each}} y {{#if}} al estilo Handlebars.
Fuentes: empresa.* (agent_settings y datos de la empresa), propietarios[] (clients + kyc_cases aprobados),
propiedad.* (properties + property_legal confirmados), mandato.* (mandates).
-->

# ORDEN DE CORRETAJE {{#if mandato.exclusivo}}EXCLUSIVA{{/if}} PARA {{mandato.operacion_texto}}

N° {{contrato.numero}}

En {{contrato.ciudad}}, a {{contrato.fecha_larga}}, comparecen:

**De una parte**, como propietario(s) y mandante(s):

{{#each propietarios}}
{{#if es_persona_natural}}
- Don(ña) **{{nombre_completo}}**, {{nacionalidad}}, {{estado_civil}}{{#if regimen_patrimonial}}, {{regimen_patrimonial}}{{/if}}, {{profesion}}, cédula de identidad N° {{rut}}, con domicilio en {{domicilio}}, correo electrónico {{email}}.
{{else}}
- **{{razon_social}}**, RUT N° {{rut}}, con domicilio en {{domicilio}}, representada por don(ña) **{{representante.nombre_completo}}**, cédula de identidad N° {{representante.rut}}, según personería que consta en {{representante.personeria}}.
{{/if}}
{{/each}}

En adelante, conjuntamente, "el Propietario".

**De la otra parte**, **{{empresa.razon_social}}**, RUT N° {{empresa.rut}}, con domicilio en {{empresa.domicilio}}, representada por don(ña) **{{empresa.representante.nombre}}**, cédula de identidad N° {{empresa.representante.rut}}, en adelante "Bull Haus" o "la Corredora".

Los comparecientes acuerdan lo siguiente:

## PRIMERO. La propiedad

El Propietario declara ser dueño de la propiedad ubicada en **{{propiedad.direccion}}{{#if propiedad.unidad}}, {{propiedad.unidad}}{{/if}}, comuna de {{propiedad.comuna}}**, Región {{propiedad.region}}{{#if propiedad.estacionamientos_roles}}, junto con {{propiedad.estacionamientos_texto}}{{/if}}{{#if propiedad.bodegas_roles}} y {{propiedad.bodegas_texto}}{{/if}}.

El dominio se encuentra inscrito a nombre del Propietario a fojas **{{propiedad.fojas}}** número **{{propiedad.numero}}** del Registro de Propiedad del Conservador de Bienes Raíces de **{{propiedad.conservador}}** correspondiente al año **{{propiedad.anio}}**. Rol de avalúo N° **{{propiedad.rol_avaluo}}** de la comuna de {{propiedad.comuna}}.

{{#if propiedad.gravamenes_texto}}
El Propietario declara que la propiedad registra los siguientes gravámenes o prohibiciones: {{propiedad.gravamenes_texto}}.
{{else}}
El Propietario declara que, según el certificado de hipotecas, gravámenes, interdicciones y prohibiciones de fecha {{propiedad.fecha_certificado_gravamenes}}, la propiedad no registra hipotecas, gravámenes, prohibiciones ni embargos.
{{/if}}

## SEGUNDO. El encargo

Por este acto, el Propietario encarga a Bull Haus {{#if mandato.exclusivo}}en forma exclusiva{{else}}en forma no exclusiva{{/if}} la {{mandato.operacion_texto_minuscula}} de la propiedad individualizada en la cláusula primera, en las siguientes condiciones:

{{#if mandato.es_venta}}
- Precio de venta: **{{mandato.precio_texto}}**, pagadero según acuerden las partes de la compraventa.
{{/if}}
{{#if mandato.es_arriendo}}
- Renta mensual: **{{mandato.renta_texto}}**{{#if mandato.gastos_comunes_incluidos}}, gastos comunes incluidos{{else}}, más gastos comunes{{/if}}.
- Garantía: {{mandato.garantia_texto}}.
- Plazo del arriendo: {{mandato.plazo_arriendo_texto}}.
{{/if}}

El Propietario podrá modificar el precio o la renta informándolo por escrito a Bull Haus. Cualquier oferta inferior será comunicada al Propietario, quien decide libremente si la acepta.

## TERCERO. Obligaciones de Bull Haus

Bull Haus se obliga a:

1. Promocionar la propiedad en sus canales, que incluyen su sitio web, sus redes sociales, portales inmobiliarios y campañas de publicidad digital, con fotografías y textos que el Propietario podrá revisar.
2. Atender a los interesados, coordinar y acompañar las visitas.
3. Verificar la identidad de los interesados que presenten ofertas, conforme a la normativa de prevención de lavado de activos aplicable.
4. Presentar al Propietario todas las ofertas que reciba.
5. Colaborar en la preparación de la documentación necesaria para la {{mandato.operacion_texto_minuscula}}.
6. Informar al Propietario del avance de la gestión cada vez que lo solicite.

## CUARTO. Obligaciones del Propietario

El Propietario se obliga a:

1. Facilitar el acceso a la propiedad para tomar fotografías y para las visitas, en horarios acordados.
2. Entregar los documentos de la propiedad que se requieran y que la información entregada sea veraz.
3. Informar a Bull Haus de cualquier gravamen, litigio, deuda o circunstancia que afecte a la propiedad.
{{#if mandato.exclusivo}}
4. No encargar la {{mandato.operacion_texto_minuscula}} a otra corredora ni a terceros mientras esté vigente esta orden, e informar a Bull Haus de cualquier interesado que lo contacte directamente.
{{/if}}

## QUINTO. Comisión

Si se celebra la {{mandato.operacion_texto_minuscula}} con un interesado presentado por Bull Haus, el Propietario pagará a Bull Haus una comisión de **{{mandato.comision_texto}}**{{#if mandato.comision_mas_iva}}, más IVA{{/if}}, que se devengará {{mandato.devengo_texto}} y se pagará contra la emisión del documento tributario correspondiente.

La comisión se deberá también si la {{mandato.operacion_texto_minuscula}} se celebra con un interesado presentado por Bull Haus dentro de los **{{mandato.dias_proteccion}} días** siguientes al término de esta orden. Bull Haus entregará al Propietario, al término de la orden, la lista de interesados que presentó. [VALIDAR ABOGADO]

{{#if mandato.exclusivo}}
Por tratarse de una orden exclusiva, si durante su vigencia el Propietario celebra la {{mandato.operacion_texto_minuscula}} directamente o a través de terceros, deberá igualmente la comisión pactada. [VALIDAR ABOGADO]
{{/if}}

## SEXTO. Plazo

Esta orden rige desde su firma y por **{{mandato.plazo_dias}} días**. {{#if mandato.renovacion_automatica}}Se renovará automáticamente por períodos iguales si ninguna de las partes avisa por escrito su término con al menos {{mandato.aviso_termino_dias}} días de anticipación.{{else}}Terminado el plazo, podrá renovarse por escrito.{{/if}}

{{#unless mandato.exclusivo}}
Cualquiera de las partes podrá poner término anticipado a esta orden avisando por escrito con {{mandato.aviso_termino_dias}} días de anticipación, sin perjuicio de lo dispuesto en la cláusula quinta.
{{/unless}}

## SÉPTIMO. Datos personales

Bull Haus tratará los datos personales del Propietario solo para cumplir este encargo, para las obligaciones legales de prevención de lavado de activos y para la facturación, conforme a la Ley N° 19.628 sobre protección de la vida privada y sus modificaciones, y a su política de privacidad disponible en {{empresa.url_privacidad}}. El Propietario puede ejercer sus derechos escribiendo a {{empresa.email_privacidad}}.

El Propietario autoriza a Bull Haus a publicar fotografías, videos y la descripción de la propiedad, sin indicar su dirección exacta.

## OCTAVO. Comunicaciones y firma

Las comunicaciones entre las partes se harán a los correos electrónicos indicados en la comparecencia. Las partes aceptan firmar este documento con firma electrónica, conforme a la Ley N° 19.799.

## NOVENO. Domicilio

Para todos los efectos de esta orden, las partes fijan domicilio en la comuna de {{contrato.comuna_jurisdiccion}} y se someten a la jurisdicción de sus tribunales.

{{#each clausulas_especiales}}
## {{ordinal}}. {{titulo}}

{{texto}}
{{/each}}

---

{{#each propietarios}}
______________________________
{{#if es_persona_natural}}{{nombre_completo}}{{else}}p.p. {{razon_social}}<br>{{representante.nombre_completo}}{{/if}}
RUT {{rut}}
Propietario

{{/each}}
______________________________
p.p. {{empresa.razon_social}}
{{empresa.representante.nombre}}
Bull Haus
