# Tasación comercial por comparables

Pantalla **Cartera > Tasaciones** del back office (`/tasaciones`). Sirve para fijar el precio de publicación y para captar: el corredor llega donde el propietario con un informe que muestra en qué se basa el valor.

## ¿Necesita IA?

No. El valor es una mediana del precio por m² de propiedades parecidas, y eso es un cálculo, no una opinión de un modelo. Así cada número del informe se puede rastrear hasta un comparable. El límite real son los datos, no el cálculo.

## Cómo calcula (`packages/core/src/valuation.ts`)

1. **Candidatos.** Propiedades de la misma operación, tipo, moneda y comuna, con superficie entre 60 % y 160 % de la tasada. Terrenos y parcelas se comparan por m² de terreno; lo demás, por m² útiles. No se convierte UF a pesos: una propiedad en otra moneda no entra.
2. **Orden por parecido.** Primero las del mismo sector, después las de superficie más cercana y las de igual número de dormitorios y baños. Las operaciones cerradas pesan un poco más.
3. **Resultado.** El valor sugerido es la mediana del precio por m² por la superficie. El rango va del percentil 25 al 75. El valor se redondea a la decena de UF o a la decena de mil pesos.
4. **Confianza.** Alta con 6 comparables o más, media con 3 a 5 y baja con menos de 3. Un comparable a más de 40 % de la mediana se marca como atípico, y el corredor decide si lo saca del cálculo.

## De dónde salen los comparables

| Fuente | Precio | Cómo entra |
|---|---|---|
| Operaciones cerradas de Bull Haus (escritura o cerrada, últimos 3 años) | Precio real de cierre | Automático |
| Cartera de Bull Haus (disponible o reservada) | Precio publicado | Automático |
| Avisos de portales (Portal Inmobiliario, TocToc...) | Precio publicado | El corredor copia los datos a mano, con el enlace |

No hay datos de demostración entre los comparables. Los comparables se guardan como foto fija al crear la tasación, así que el informe no cambia si después se mueve la cartera. "Buscar de nuevo en Bull Haus" agrega los nuevos sin tocar los que ya se revisaron.

No se descargan datos de portales en forma automática, porque sus condiciones de uso lo prohíben. Si la cartera propia no alcanza, la opción es contratar datos de mercado (por ejemplo TocToc, Data Inmobiliaria o GI) y sumarlos como cuarta fuente. Antes hay que comparar su precio y su cobertura por comuna.

## Informe para el cliente (`/informe-tasacion/[id]`)

- Muestra solo los comparables que quedaron en el cálculo, con el método y el aviso de que no es una tasación bancaria ni pericial. Se imprime o se guarda en PDF desde el navegador.
- Las operaciones cerradas aparecen como "Operación cerrada por Bull Haus", sin código ni número de operación, para no identificar el precio de cierre de otro cliente ante terceros.
- Nunca muestra direcciones exactas.
- "Preparada para" lleva solo un nombre, sin RUT ni datos de contacto.
