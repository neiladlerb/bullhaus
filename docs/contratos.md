# Contratos tipo y documentos de la propiedad

Versión 1.0, 11/11/2026. Complementa `docs/plataforma.md` (secciones 3.3 a 3.6). Estado: borrador.

Importante: las plantillas de `docs/contratos/` son borradores de trabajo para que el sistema sepa qué datos pedir y cómo armar cada documento. Antes de usar cualquiera con clientes, un abogado chileno de Bull Haus tiene que revisarlas y aprobarlas. Cada plantilla lleva versión y quién la aprobó, y el sistema no genera contratos con una plantilla sin aprobar.

## 1. Qué contratos genera el sistema

| Documento | Partes | Cuándo se genera | Quién lo redacta | Firma |
|---|---|---|---|---|
| Orden de corretaje (mandato de venta o arriendo) | Propietario y Bull Haus | Etapa "Propuesta enviada" del pipeline de captación | Sistema, con plantilla aprobada | Electrónica |
| Orden de visita | Interesado y Bull Haus | Al agendar una visita (opcional) | Sistema | Aceptación por WhatsApp o electrónica |
| Carta oferta y reserva | Comprador o arrendatario, dirigida al propietario a través de Bull Haus | Etapa "Oferta" | Sistema | Electrónica |
| Contrato de arrendamiento | Arrendador, arrendatario, codeudor si hay, Bull Haus como corredora | Etapa "Contrato" (arriendo) | Sistema, con plantilla aprobada | Ante notario o firma electrónica avanzada [VALIDAR ABOGADO] |
| Promesa de compraventa | Vendedor y comprador | Etapa "Promesa" (venta) | Abogado de las partes o de Bull Haus. El sistema entrega la minuta con todos los datos | Escritura pública ante notario |
| Compraventa | Vendedor y comprador (y banco si hay crédito) | Etapa "Escritura" | Abogado o banco. El sistema entrega la minuta | Escritura pública e inscripción en el Conservador |

La promesa y la compraventa de un inmueble van por escritura pública y las redacta un abogado. Lo que hace el sistema en esos dos casos es armar una minuta completa con los datos verificados de las partes y de la propiedad, para que el abogado no tenga que pedirlos de nuevo.

Plantillas en este repositorio:

- `docs/contratos/orden-corretaje.md`
- `docs/contratos/carta-oferta.md`
- `docs/contratos/contrato-arriendo.md`
- `docs/contratos/minuta-promesa.md`
- Orden de visita: pendiente; es corta y conviene partir de la que use Bull Haus hoy.

## 2. De dónde sale cada dato

Todo contrato se arma con tres fuentes. Si falta un dato obligatorio, el sistema no genera el documento y muestra qué falta.

| Fuente | Qué aporta | Tabla |
|---|---|---|
| KYC de cada parte | Nombre completo, RUT o pasaporte, nacionalidad, estado civil y régimen patrimonial, profesión u oficio, domicilio, email, teléfono. En personas jurídicas: razón social, RUT, domicilio, representante legal y personería | `clients`, `kyc_cases`, `client_relations` |
| Escritura y certificados de la propiedad | Dirección y unidad, comuna, inscripción de dominio (fojas, número, año, Conservador), rol de avalúo, avalúo fiscal, superficie según título, deslindes, hipotecas, gravámenes y prohibiciones, régimen de copropiedad, roles de estacionamiento y bodega | `property_legal`, `property_documents` |
| Mandato y operación | Comisión pactada, exclusividad, plazo, precio, forma de pago, reserva, garantía, renta, reajuste, fechas | `mandates`, `deals` |

Reglas:

- Solo se usan datos de un KYC con estado `aprobado`. Si el KYC vence o se rechaza, los contratos pendientes de esa persona se bloquean.
- El estado civil y el régimen patrimonial se piden solo a quien firma como propietario, comprador, arrendador o codeudor, porque determinan quién tiene que firmar (por ejemplo, si un bien es de la sociedad conyugal puede hacer falta la autorización del cónyuge). No se usan para nada más, y nunca para decidir a quién se le ofrece una propiedad (Ley 20.609).
- Los datos de la propiedad salen de los certificados cargados, no de la ficha comercial. Si la ficha dice 220 m² y el título dice 205 m², el contrato usa el título y el back office avisa la diferencia para corregir la ficha.
- Cada contrato generado guarda una copia congelada de los datos que usó, para que un cambio posterior en la ficha o en el KYC no altere un documento ya enviado.

## 3. Documentos de la propiedad que hay que cargar

El corredor los sube en la sección "Legal" de cada propiedad. Cada documento guarda su fecha de emisión; los que tienen vigencia práctica (bancos y notarías suelen pedirlos con pocos días de antigüedad) muestran un aviso cuando están viejos. [VALIDAR ABOGADO: antigüedad máxima aceptada para cada certificado]

### 3.1 Venta

| Documento | Lo emite | Obligatorio para | Qué datos saca el sistema |
|---|---|---|---|
| Escritura de compraventa anterior (título) | Notaría / Conservador | Orden de corretaje, minuta de promesa | Deslindes, superficie según título, forma de adquisición |
| Certificado de dominio vigente (inscripción con vigencia) | Conservador de Bienes Raíces | Orden de corretaje, minuta de promesa | Propietario inscrito, fojas, número, año, Conservador |
| Certificado de hipotecas, gravámenes, interdicciones y prohibiciones | Conservador de Bienes Raíces | Minuta de promesa | Hipotecas vigentes, embargos, prohibiciones |
| Certificado de avalúo fiscal detallado | SII | Orden de corretaje, minuta de promesa | Rol de avalúo, avalúo fiscal, destino, superficie construida |
| Certificado de deuda de contribuciones | Tesorería General de la República | Minuta de promesa | Deuda o "sin deuda" |
| Certificado de número | Dirección de Obras Municipales | Minuta de promesa | Dirección oficial |
| Certificado de recepción final | Dirección de Obras Municipales | Minuta de promesa | Recepción de la construcción |
| Certificado de no expropiación | Municipalidad y SERVIU | Minuta de promesa | Afectación a utilidad pública |
| Reglamento de copropiedad y plano (departamentos y condominios) | Conservador | Minuta de promesa | Unidad, estacionamientos, bodegas, porcentaje de derechos |
| Certificado de deuda de gastos comunes | Administración del edificio o condominio | Minuta de promesa | Deuda o "al día" |
| Posesión efectiva e inscripción especial de herencia (si viene de una herencia) | Registro Civil / Conservador | Orden de corretaje | Herederos que deben firmar |
| Vigencia de la sociedad y de los poderes (si el dueño es una empresa) | Conservador de Comercio / notaría | Orden de corretaje | Quién puede firmar por la empresa |

### 3.2 Arriendo

| Documento | Obligatorio para | Qué datos saca el sistema |
|---|---|---|
| Certificado de dominio vigente o escritura | Orden de corretaje, contrato de arriendo | Propietario inscrito, inscripción |
| Certificado de avalúo fiscal | Contrato de arriendo | Rol de avalúo |
| Reglamento de copropiedad (departamentos) | Contrato de arriendo | Normas que el arrendatario debe respetar |
| Últimas boletas de luz, agua y gas, y gastos comunes al día | Contrato de arriendo (acta de entrega) | Números de cliente, estado al día |
| Inventario y fotos de entrega | Contrato de arriendo (anexo) | Estado de la propiedad al entregar |
| Poder notarial (si firma alguien en nombre del dueño) | Orden de corretaje, contrato de arriendo | Apoderado y facultades |

### 3.3 Extracción de datos con IA

Para no tipear a mano, el back office lee los certificados de dominio, de hipotecas y de avalúo con Claude y propone los campos de `property_legal`. Reglas:

- Cada campo propuesto muestra el fragmento del documento del que salió, y el corredor tiene que confirmarlo uno por uno. Nada entra al contrato sin esa confirmación.
- Si un dato no está en el documento o es ilegible, queda vacío. No se completa por deducción.
- Esto aplica a documentos de la propiedad. Los documentos de identidad del KYC (carnet, selfie, pasaporte) nunca pasan por Claude; los procesa solo el proveedor de verificación.
- Los certificados de la propiedad también traen datos personales (nombres y RUT de los propietarios), así que se guardan en el almacenamiento privado, no en el de fotos de la web.

## 4. Flujo de generación y firma

1. El corredor abre la operación o el mandato y pulsa "Generar contrato".
2. El sistema revisa:
   - KYC aprobado de todas las partes que firman.
   - Documentos obligatorios de la propiedad cargados y con los campos confirmados.
   - Datos del mandato u operación completos (precio, comisión, plazos).
   - Que el propietario inscrito en el certificado de dominio coincida con quien firma como dueño (o con sus herederos o su empresa). Si no coincide, bloquea y avisa.
3. Si falta algo, muestra la lista. Si está todo, rellena la plantilla aprobada vigente y genera un PDF con número de documento y huella (hash).
4. Revisión: el corredor lo lee. Si la operación tiene algo fuera de lo normal (cláusulas especiales, partes extranjeras, herencias, empresas), pasa también por el abogado antes de enviar.
5. Firma electrónica con un proveedor externo. Cada firmante recibe el enlace por email; el agente de WhatsApp puede avisar que le llegó, pero no envía el documento por el chat.
6. El PDF firmado se guarda en el almacenamiento privado con su hash y el registro de firmas, y la operación avanza de etapa sola (por ejemplo, orden de corretaje firmada → "Mandato firmado" y la propiedad pasa a poder publicarse).
7. En promesa y compraventa, el sistema genera la minuta y la manda al abogado o la notaría. Cuando vuelve la escritura firmada (y en la compraventa, la nueva inscripción), se carga y la operación avanza.

Cláusulas especiales: el corredor puede agregar cláusulas desde una biblioteca aprobada por el abogado (por ejemplo, "se entrega amoblado según inventario", "se permiten mascotas"). Texto libre nuevo solo con aprobación del abogado. Claude puede sugerir qué cláusula de la biblioteca aplica, pero no redacta cláusulas legales nuevas.

## 5. Datos nuevos

```
property_legal
  property_id, conservador, fojas, numero, anio, owner_names_inscribed text[],
  owner_ruts_inscribed text[], rol_avaluo, rol_estacionamientos text[], rol_bodegas text[],
  avaluo_fiscal_clp, superficie_titulo_m2, deslindes text,
  copropiedad bool, unidad text null, derechos_pct numeric null,
  hipotecas jsonb, gravamenes jsonb, prohibiciones jsonb,
  confirmed_by, confirmed_at, field_sources jsonb

property_documents
  id, property_id, kind (titulo | dominio_vigente | hipotecas_gravamenes | avaluo_fiscal |
    deuda_contribuciones | numero | recepcion_final | no_expropiacion | reglamento_copropiedad |
    deuda_gastos_comunes | posesion_efectiva | vigencia_sociedad | poder | inventario | otro),
  storage_key, sha256, issued_at date null, uploaded_by, created_at

contract_templates
  id, tenant_id, kind (orden_corretaje | orden_visita | carta_oferta | arriendo | minuta_promesa | minuta_compraventa),
  version, body text, required_fields text[], approved_by_lawyer text null, approved_at null,
  status (borrador | aprobada | retirada)

contract_clauses
  id, tenant_id, code, title, body text, applies_to text[], approved_by_lawyer, approved_at

contracts
  id, tenant_id, template_id, deal_id null, mandate_id null, number,
  data_snapshot jsonb, extra_clause_ids text[], pdf_url, sha256,
  status (borrador | en_revision | enviado | firmado | anulado),
  signature_provider_ref null, signed_pdf_url null, signed_at null, created_by, created_at

contract_signers
  id, contract_id, client_id null, user_id null, role, email, signed_at null, signature_evidence jsonb
```

## 6. Orden para Claude Code

> Lee docs/plataforma.md y docs/contratos.md. Implementa packages/contracts: tablas de la sección 5, carga de documentos de la propiedad al almacenamiento privado, extracción de campos de property_legal con claude-sonnet-5-5 desde certificados de dominio, hipotecas y avalúo con el fragmento de origen y confirmación campo a campo, motor de plantillas con los campos {{...}} de docs/contratos/, validación previa de la sección 4 (KYC aprobado, documentos, coincidencia del propietario inscrito), generación de PDF con número y hash, biblioteca de cláusulas aprobadas y adaptador intercambiable de firma electrónica. Ninguna plantilla sin approved_by_lawyer puede generar contratos. Tests de cada bloqueo.

## 7. Pendientes

- [PENDIENTE: abogado de Bull Haus que revise y apruebe las plantillas]
- [PENDIENTE: contratos que Bull Haus usa hoy, para partir de su texto y no del nuestro]
- [PENDIENTE: proveedor de firma electrónica y si el contrato de arriendo se firma ante notario o con firma electrónica avanzada]
- [PENDIENTE: comisiones y condiciones estándar de Bull Haus para venta y arriendo]
- [PENDIENTE: antigüedad máxima de cada certificado]
- [PENDIENTE: si Bull Haus redacta las promesas o las deriva a un abogado externo]
