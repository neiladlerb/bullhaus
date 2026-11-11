<!--
Plantilla: minuta_promesa
Versión: 0.1 (borrador)
Estado: SIN APROBAR.
No es un contrato. Es la minuta de datos que Bull Haus envía al abogado o a la notaría para que redacte
la promesa de compraventa por escritura pública. Todos los datos vienen verificados del KYC y de
los certificados de la propiedad.
-->

# MINUTA PARA PROMESA DE COMPRAVENTA

Operación Bull Haus N° {{deal.numero}} · Preparada el {{contrato.fecha}} por {{corredor.nombre}} ({{corredor.email}})

## 1. Promitente vendedor

{{#each vendedores}}
| Campo | Dato |
|---|---|
| Nombre o razón social | {{nombre_o_razon_social}} |
| RUT | {{rut}} |
| Nacionalidad | {{nacionalidad}} |
| Estado civil y régimen patrimonial | {{estado_civil}} {{regimen_patrimonial}} |
| Requiere comparecencia o autorización del cónyuge | {{requiere_conyuge}} [a confirmar por el abogado] |
| Profesión | {{profesion}} |
| Domicilio | {{domicilio}} |
| Email y teléfono | {{email}} · {{telefono}} |
| Representante y personería (si aplica) | {{representante.nombre_completo}}, RUT {{representante.rut}}, {{representante.personeria}} |
| KYC | Aprobado el {{kyc.aprobado_el}}, nivel {{kyc.nivel}} |

{{/each}}

## 2. Promitente comprador

{{#each compradores}}
| Campo | Dato |
|---|---|
| Nombre o razón social | {{nombre_o_razon_social}} |
| RUT | {{rut}} |
| Nacionalidad | {{nacionalidad}} |
| Estado civil y régimen patrimonial | {{estado_civil}} {{regimen_patrimonial}} |
| Profesión | {{profesion}} |
| Domicilio | {{domicilio}} |
| Email y teléfono | {{email}} · {{telefono}} |
| Representante y personería (si aplica) | {{representante.nombre_completo}}, RUT {{representante.rut}}, {{representante.personeria}} |
| KYC | Aprobado el {{kyc.aprobado_el}}, nivel {{kyc.nivel}} |
| Origen de fondos declarado | {{kyc.origen_fondos}} |

{{/each}}

## 3. Propiedad

| Campo | Dato | Documento de respaldo |
|---|---|---|
| Dirección y unidad | {{propiedad.direccion}} {{propiedad.unidad}}, {{propiedad.comuna}} | Certificado de número del {{docs.numero.fecha}} |
| Inscripción de dominio | Fojas {{propiedad.fojas}} N° {{propiedad.numero}} año {{propiedad.anio}}, CBR de {{propiedad.conservador}} | Dominio vigente del {{docs.dominio_vigente.fecha}} |
| Propietario inscrito | {{propiedad.propietarios_inscritos}} | Dominio vigente |
| Rol de avalúo | {{propiedad.rol_avaluo}} | Avalúo fiscal del {{docs.avaluo_fiscal.fecha}} |
| Avalúo fiscal | {{propiedad.avaluo_fiscal_texto}} | Avalúo fiscal |
| Superficie según título | {{propiedad.superficie_titulo_m2}} m² | Título |
| Deslindes | {{propiedad.deslindes}} | Título |
| Estacionamientos y bodegas | {{propiedad.estacionamientos_texto}} {{propiedad.bodegas_texto}} | Reglamento de copropiedad |
| Hipotecas y gravámenes | {{propiedad.gravamenes_texto}} | Certificado de hipotecas y gravámenes del {{docs.hipotecas_gravamenes.fecha}} |
| Prohibiciones y embargos | {{propiedad.prohibiciones_texto}} | Mismo certificado |
| Contribuciones | {{propiedad.deuda_contribuciones_texto}} | Certificado TGR del {{docs.deuda_contribuciones.fecha}} |
| Gastos comunes | {{propiedad.deuda_gastos_comunes_texto}} | Certificado de administración del {{docs.deuda_gastos_comunes.fecha}} |
| Recepción final | {{propiedad.recepcion_final_texto}} | Certificado DOM |
| Expropiación | {{propiedad.no_expropiacion_texto}} | Certificados municipal y SERVIU |

Documentos que faltan o están desactualizados: {{docs.faltantes_texto}}

## 4. Condiciones acordadas (según carta oferta N° {{oferta.numero}} aceptada el {{oferta.aceptada_el}})

| Campo | Dato |
|---|---|
| Precio | {{oferta.precio_texto}} |
| Forma de pago | {{oferta.forma_pago_texto}} |
| Crédito hipotecario | {{oferta.credito_texto}} |
| Reserva entregada | {{oferta.reserva_texto}}, imputación: {{oferta.imputacion_reserva_texto}} |
| Pie o arras en la promesa | {{oferta.pie_promesa_texto}} |
| Plazo para la escritura definitiva | {{oferta.fecha_escritura}} |
| Entrega material | {{oferta.entrega_texto}} |
| Alzamiento de hipotecas | {{oferta.alzamiento_texto}} |
| Condiciones especiales | {{oferta.condiciones}} |

## 5. Comisión de Bull Haus

| Parte | Comisión | Devengo |
|---|---|---|
| Vendedor | {{comision.vendedor_texto}} | {{comision.devengo_texto}} |
| Comprador | {{comision.comprador_texto}} | {{comision.devengo_texto}} |

Mandato de corretaje N° {{mandato.numero}} firmado el {{mandato.firmado_el}}.

## 6. Contactos

- Abogado o notaría: {{abogado.nombre}} · {{abogado.email}}
- Corredor Bull Haus: {{corredor.nombre}} · {{corredor.telefono}} · {{corredor.email}}
- Ejecutivo del banco (si hay crédito): {{oferta.ejecutivo_banco}}
