# WaterWiki

Registro comunitario de apariencia del agua. React + Google Maps, SQLite en Cloudflare D1 y fotografías en R2. Guadalajara es la ciudad inicial si no se permite ubicación; CDMX y Monterrey también tienen cobertura piloto.

## Uso local

Node 22.13+ y pnpm: `pnpm install`, `pnpm dev`. Abre http://localhost:5173.

Si `.env.local` contiene `CLOUD_API_ORIGIN=https://clara-agua-comunidad.nicelemur6.chatgpt.site`, la interfaz local utiliza el backend compartido en nube mediante proxy REST, fotos y WebSocket. Sin esa variable, usa una base SQLite aislada en `runtime/clara.sqlite`; los antiguos registros JSON se importan sin borrarse. Los entornos de pruebas usan bases temporales independientes.

## Implementado

- Google Maps, selector de ciudad, búsqueda y filtros. Tocar un punto abre directamente las fotos, fechas y observaciones. Guadalajara metropolitana incluye 2,335 polígonos y un filtro de sus nueve municipios (IIEG / INE 2024). CDMX y Monterrey conservan centros de referencia.
- Histórico manipulable: deslizador por muestra, miniaturas, anterior/siguiente y detalle visible. Línea de tiempo del mapa por fecha, hitos y regreso a hoy.
- Permiso de ubicación al entrar: se identifica el estado usando límites INEGI/geoBoundaries en el navegador. No se guardan ni envían coordenadas al servidor. La cobertura piloto y sus límites se explican si no hay datos para ese estado. Nunca se sobrescribe una ciudad seleccionada manualmente con una detección tardía. Se invita a aportar en la ciudad mostrada.
- Tres tarjetas de instrucciones con iconos Lucide. Apariencia fija en modo claro y materiales/gradientes exactos de Sobre. Morphicons para cambios de estado; respeta movimiento reducido.
- Panorama con conteo de 650 ms, easing cuártico y replay al tocar, adaptado del hook de Sobre; barras de 48 pares de puntos con puntero animado. Sin introducir reglas de nómina en datos de agua.
- 420 escenarios ficticios de Guadalajara, 25 imágenes proporcionadas por el usuario y reutilizadas, miniaturas e historial. Fuente visible; no describen la calidad real de esas colonias.
- Clasificación automática al subir una imagen. Reducción a 2048 px, JPEG .92 sin filtros ni recorte; una sola llamada de visión a GPT-5.4 mini sin razonamiento extendido, detalle alto y salida JSON estricta. Modelo configurable. No se afirma precisión ni latencia medidas: la clave de servidor está configurada.
- Chat implementado con datos de ciudad/fecha del servidor. No consulta fotos ni notas libres. OpenAI está configurado mediante una clave secreta de servidor.
- SQLite D1 para registros y análisis temporales, R2 para fotos. Tokens de análisis ligados a la imagen y de un solo uso; el cliente no puede imponer la clasificación. Límite de consultas de IA por ventana y origen.
- WebSockets: el servidor local aislado difunde al guardar; el backend cloud responde a sincronización cada 5 segundos para compartir datos entre instancias sin depender de memoria de un proceso.

## Construcción y comprobaciones

`pnpm build`: compila React y lo empaqueta en un Worker ESM con sus assets. `.openai/hosting.json` conserva el Site y declara `DB`/`BUCKET`. Las migraciones están en `drizzle/` y se aplican durante la publicación. `pnpm db:generate` genera nuevas migraciones; no editar las aplicadas.

`node verify.mjs`: flujo local HTTP, validación y rechazo de foto, tokens, clasificación derivada, persistencia SQLite y difusión WS (OpenAI simulado sólo en el proceso de prueba).

`node verify-cloud.mjs`: API Worker, migración SQLite real con adaptador D1, persistencia entre clientes, fotos con adaptador R2, tokens, chat sin clave y detección de estados.

`node scripts/validate-cloud.mjs`: artefacto ESM y bindings. La comprobación desplegada se registra al terminar la publicación.

## Documentación

- [Google Maps](MAPS_SETUP.md)
- [OpenAI y fotografía](AI_SETUP.md)
- Masa de prueba: 420 registros, seis colonias del catálogo: Americana con 120 y otras cinco con 60 cada una, 30 días y 25 imágenes suministradas y reutilizadas. No son resultados de IA ni datos reales de esas colonias. Analco permanece sin aportes.
- Fotografías: `public/demo/SOURCES.md`
- Colonias AMG y alcance del catálogo: `public/data/COLONIAS.md`
- Límites de estados: `public/data/STATE_BOUNDARIES.md`

Las fotos y el color sólo permiten describir apariencia, no certificar potabilidad ni inferir contaminantes, causas o valores de laboratorio. Los datos de prueba se identifican en mapa, historial, resumen y chat.

## Cobertura nacional

El buscador de ciudad o municipio incluye 2,478 municipios y demarcaciones de las 32 entidades, a partir del servicio oficial INEGI (Marco Geoestadístico diciembre de 2025, consultado el 29 de octubre de 2026). Permite buscar sin acentos por nombre, estado o clave. La cobertura se limita a México.

Los datos de prueba se muestran únicamente en Guadalajara. Sus nueve municipios mantienen el catálogo de colonias existente. Fuera de ese catálogo, la selección encuadra el municipio y los nuevos aportes se guardan a nivel municipal: no se inventan colonias ni se afirma contar con sus límites. Los centros de encuadre se calcularon desde la extensión oficial del municipio y no ubican al usuario ni a su muestra. Véase `public/data/MUNICIPIOS.md`.
