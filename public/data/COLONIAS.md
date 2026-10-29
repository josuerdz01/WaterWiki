# Colonias del Área Metropolitana de Guadalajara

Fuente: [IIEG · Información Sociodemográfica por Colonia, INE 2024](https://iieg.gob.mx/ns/?page_id=881). [Archivo original](https://iieg.gob.mx/ns/wp-content/uploads/2024/11/SHAPEColonias20202024.zip).

Se incluyen **todos los 2,335 registros** del archivo en los nueve municipios del [AMG definidos por IMEPLAN](https://www.imeplan.mx/area-metropolitana-de-guadalajara): Guadalajara 292; Zapopan 770; San Pedro Tlaquepaque 276; Tonalá 356; Tlajomulco de Zúñiga 379; El Salto 113; Juanacatlán 27; Ixtlahuacán de los Membrillos 56; Zapotlanejo 66. Incluye colonias y otros tipos de asentamiento conforme al campo Tipo de la fuente. No se eliminan registros por nombres repetidos.

Esta cobertura es completa **respecto de esa edición**, no un inventario actualizado en tiempo real. Nuevos desarrollos o nombres vecinales pueden no figurar. Los límites son los publicados en esa fuente, no una certificación jurídica ni datos de calidad del agua. No se usan códigos postales como polígonos de colonia.

GEOCOL se conserva como sourceId. El .prj original indica UTM 13N WGS84 (EPSG:32613); se transforma a WGS84 longitud/latitud (EPSG:4326), con simplificación de 2 metros que preserva topología y coordenadas a seis decimales. Los centros son puntos interiores de cada geometría. El manifiesto JSON conserva conteos y SHA-256 del ZIP original.

Los identificadores anteriores de siete colonias se conservan donde existe coincidencia. Los reportes del antiguo punto Lafayette (101) se consultan bajo Americana (100), conforme al polígono de esta fuente. No se elimina ningún aporte. Las fotografías y fechas de prueba siguen siendo escenarios ficticios, separados de observaciones reales.

Reproducción: descargar y descomprimir el ZIP en `work/iieg`, instalar `pyshp`, `shapely` y `pyproj` en el entorno de Python, y ejecutar `scripts/geography/import-colonias.py` desde la raíz del proyecto. El script exige el conteo de esta versión y genera catálogo, GeoJSON y manifiesto. `node verify-geography.mjs` comprueba correspondencia uno a uno, municipios, puntos interiores, referencias históricas y contexto del chat.
