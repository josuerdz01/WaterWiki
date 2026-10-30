# WaterWiki

**Observa y documenta cómo cambia el agua en tu comunidad.**

WaterWiki es una plataforma comunitaria nacida ante la crisis del agua en Guadalajara. Reúne fotografías y observaciones en un mapa y una línea del tiempo para consultar muestras por colonia o municipio. Su buscador permite ubicar los **2,478 municipios y demarcaciones de México**; las muestras de demostración se concentran en Guadalajara.

La evaluación con IA describe la apariencia visible de una fotografía y resume registros por zona. No mide contaminantes ni determina si el agua es potable.

**Demo:** [waterwiki.nicelemur6.chatgpt.site](https://waterwiki.nicelemur6.chatgpt.site/) · **Prototipo de producción:** [explorar muestras en Guadalajara](https://waterwiki.nicelemur6.chatgpt.site/explorar?ciudad=gdl&colonia=80034) · **Código:** [GitHub](https://github.com/josuerdz01/WaterWiki)

## Qué construimos para el Build Day

- Mapa de Guadalajara con selección por colonia, búsqueda de municipios en México, filtros y detalle de cada zona.
- Historial visual por muestra, con fechas, fotografías, observaciones y clasificación. La línea del tiempo permite ver qué tan alimentado está el registro de cada zona.
- Aportación de una fotografía con evaluación visual mediante OpenAI y confirmación antes de guardar.
- Resumen de los registros de una zona y almacenamiento/sincronización en la nube.
- Escenarios ficticios para demostrar la exploración. En la demo, Guadalajara muestra datos de prueba en 1,401 de 2,335 colonias y asentamientos (60%). **No son mediciones reales ni resultados de laboratorio.**
- Búsqueda municipal nacional. Fuera del catálogo metropolitano de Guadalajara, el registro se organiza a nivel de municipio; no se inventan límites de colonias.

## Ejecutar localmente

Requisitos: Node.js 22.13 o posterior y pnpm.

```bash
git clone https://github.com/josuerdz01/WaterWiki.git
cd WaterWiki
pnpm install
cp .env.example .env.local
```

Edita `.env.local` y deja `CLOUD_API_ORIGIN` vacío para usar una base SQLite local independiente. Añade tus propias claves si quieres habilitar Google Maps y el análisis con OpenAI:

```dotenv
VITE_GOOGLE_MAPS_API_KEY=
OPENAI_API_KEY=
OPENAI_MODEL=gpt-4.1-mini
OPENAI_VISION_MODEL=gpt-5.4-mini
CLOUD_API_ORIGIN=
```

La clave de Google debe restringirse al dominio local y a Maps JavaScript API. La clave de OpenAI es sólo del servidor: no uses el prefijo `VITE_`.

```bash
pnpm dev
```

Abre [http://localhost:5173](http://localhost:5173). Sin una clave de OpenAI, la aplicación puede explorar los datos de prueba, pero no evaluar nuevas fotografías. Consulta [AI_SETUP.md](AI_SETUP.md) y [MAPS_SETUP.md](MAPS_SETUP.md) para más detalles.

Para generar el Worker de publicación:

```bash
pnpm build
```

La configuración de producción usa Cloudflare Worker, D1 para registros y R2 para fotografías. Las credenciales de producción no se incluyen en el repositorio.

## Forks y adaptación a otros países

Los forks están habilitados en GitHub. Puedes crear uno con **Fork** en la página del repositorio y después clonarlo:

```bash
git clone https://github.com/TU-USUARIO/WaterWiki.git
cd WaterWiki
pnpm install
```

Para adaptarlo, prepara fuentes geográficas verificadas para el país y agrega su catálogo de municipios y límites de zonas. Revisa cómo se documentan las fuentes del Área Metropolitana de Guadalajara en [COLONIAS.md](public/data/COLONIAS.md) y los límites de estados en [STATE_BOUNDARIES.md](public/data/STATE_BOUNDARIES.md). Configura tus propias claves y servicios, identifica claramente los datos de demostración y conserva la atribución y licencia de mapas, fotografías y otros recursos. La cobertura del buscador mexicano no equivale a cobertura de muestras reales: cada adaptación requiere datos geográficos propios.

Las mejoras se pueden proponer mediante pull requests al repositorio original.

## Qué falta

- Incorporar límites verificados de colonias para más ciudades; actualmente el catálogo detallado corresponde al Área Metropolitana de Guadalajara.
- Reunir aportes comunitarios reales y suficientes para que los historiales representen cada zona. Los registros sembrados sólo sirven para probar la interfaz.
- Validar la evaluación visual con un conjunto de muestras etiquetadas y condiciones variadas. La IA describe apariencia; no sustituye mediciones ni análisis de laboratorio.
- Documentar y probar una receta completa para instalar una adaptación nacional independiente, incluidos mapa, datos, claves y almacenamiento.

## Datos, seguridad y límites

Las muestras de prueba se identifican en la aplicación y no describen condiciones reales de esas colonias. Las fotos proporcionadas para la demo son recursos de referencia; consulta [fuentes y atribuciones](public/demo/SOURCES.md) y [fuentes de las imágenes de prueba](public/demo/user/SOURCES.md). Respeta sus términos antes de redistribuirlas.

No subas claves, archivos `.env.local`, fotos personales ni datos privados al repositorio. Cada instalación debe usar sus propias credenciales y backend. Una evaluación visual no certifica potabilidad ni identifica causas o contaminantes.

## Licencia

El código original de WaterWiki se distribuye bajo la licencia MIT; consulta [LICENSE](LICENSE). Fotografías, mapas, catálogos y otros recursos de terceros mantienen sus propias licencias y atribuciones.
