# Activar Google Maps

La aplicación usa **Maps JavaScript API**, centrada inicialmente en Guadalajara. El selector también incluye CDMX y Monterrey. Cambiar de ciudad cambia centro, zoom, colonias, aportes, resumen, formulario y contexto de consultas. Guadalajara incluye 21 escenarios ficticios con fotos de referencia; Monterrey conserva el estado sin aportes.

## Clave local con Vite

1. Copia `.env.example` a `.env.local`.
2. Completa esta variable:

```dotenv
VITE_GOOGLE_MAPS_API_KEY=TU_KEY_DE_GOOGLE_MAPS
```

3. Reinicia `pnpm dev`. Para el bundle, ejecuta `pnpm build` después de configurar la variable.

## Clave de la demo publicada

Puedes ponerla en `public/maps-config.json`, sin modificar componentes:

```json
{"apiKey":"TU_KEY_DE_GOOGLE_MAPS"}
```

Luego compila y publica. Este archivo se copia a `dist/maps-config.json` y se consulta al abrir la aplicación. Si configuras ambos mecanismos, la variable de Vite tiene prioridad. No se ofrece un formulario de configuración a los usuarios de la app.

## Google Cloud

Activa **Maps JavaScript API** y la facturación del proyecto. Crea una clave para navegador con restricción de aplicación **Websites / HTTP referrers** y restricción de API **Maps JavaScript API**. Autoriza:

```text
http://localhost:5173/*
http://127.0.0.1:5173/*
https://clara-agua-comunidad.nicelemur6.chatgpt.site/*
```

Añade el dominio definitivo cuando exista. No hace falta Geocoding API ni Places API para esta implementación. Las claves de Maps JavaScript son visibles en el navegador por diseño: se protegen con restricciones de origen/API y cuotas, no ocultándolas como una credencial de servidor. `.env.local` está excluido de Git.

Documentación de Google:
- https://developers.google.com/maps/documentation/javascript/load-maps-js-api
- https://developers.google.com/maps/api-security-best-practices

## Capa por colonia

La base de mapa viene de Google. Las colonias no se obtienen automáticamente de Google Maps: sus límites deben venir de una fuente geográfica autorizada.

La capa de datos ya carga estos archivos mediante `google.maps.Data`:

- `public/data/colonias-gdl.geojson`
- `public/data/colonias-cdmx.geojson`
- `public/data/colonias-mty.geojson`

Por ahora contienen FeatureCollections vacías. No hay polígonos inventados. Para activar la segmentación, reemplázalos por GeoJSON de límites verificados, coordenadas WGS84 en orden `[longitud, latitud]`, con `properties.zoneId` igual al identificador de la colonia en `src/data.js`. Admite Polygon y MultiPolygon. Para ampliar cobertura añade los identificadores, nombres, ciudad y centros en `src/data.js`.

Contrato mínimo de cada Feature:

```json
{
  "type":"Feature",
  "properties":{"zoneId":100},
  "geometry":{"type":"Polygon","coordinates":[]}
}
```

Este fragmento describe el contrato, no constituye una geometría válida: las coordenadas deben ser los anillos cerrados de la fuente oficial. La capa colorea por la última muestra hasta la fecha elegida, responde a filtros y abre el detalle/historial al hacer clic.

Mientras no haya límites oficiales se muestran círculos en centros aproximados de colonias; no representan toda su superficie ni la dirección de una persona. La selección también está disponible en la lista, incluso sin clave o ante un fallo de Google Maps.

## Verificación y límites

Se comprobó compilación, validación de IDs por servidor, aporte de Guadalajara, persistencia y difusión por WebSocket. En navegador: Guadalajara inicial, cambio de ciudad, resumen aislado por ciudad, formulario con colonias locales y estado sin clave. Google Maps se comprobó con la clave configurada y ambos temas. Los límites oficiales todavía requieren GeoJSON autorizado.
