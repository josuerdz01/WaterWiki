# Imágenes y chat con OpenAI

La integración se ejecuta en `server/ai.mjs`, detrás de Express, mediante Responses API. Modelo configurable con `OPENAI_MODEL`; chat `gpt-4.1-mini` y visión `gpt-5.4-mini`. No se envían claves al cliente ni se usan variables `VITE_` para OpenAI.

## Configurar en local

Edita `.env.local` (ignorado por Git):

```dotenv
OPENAI_API_KEY=TU_CLAVE_VALIDA
OPENAI_MODEL=gpt-4.1-mini
OPENAI_VISION_MODEL=gpt-5.4-mini
```

Reinicia `pnpm dev`. La clave debe proceder de https://platform.openai.com/api-keys. La clave vigente fue validada contra la API y está configurada en `.env.local` ignorado por Git y como secreto del backend en Sites. Las claves inválidas anteriores no se guardaron.

## Flujo de muestra

1. Al seleccionar la foto se prepara y analiza automáticamente; antes del selector se informa del envío a OpenAI. Se puede cambiar de foto mientras corre el análisis; se cancelan respuestas anteriores. Se admite JPG/PNG/WebP hasta 12 MB, se reduce a 2048 px sin filtros ni recorte y se envía JPEG con calidad .92.
2. `POST /api/analyze` valida formato/tamaño, pide verificar un solo vaso transparente y devuelve una clasificación estructurada de color, turbidez y partículas.
3. Imágenes no válidas, varios vasos, mala iluminación y salidas incompletas se rechazan. No se guardan como aportes.
4. Una evaluación aceptada genera un token temporal de 30 minutos ligado al hash de la foto (persistido en D1 en la nube). El usuario confirma guardar.
5. `POST /api/reports` ignora cualquier estado suministrado por el cliente: usa el análisis guardado en servidor, verifica la foto y consume el token al persistir. Difunde el nuevo snapshot por WebSocket.

No se puede registrar una foto sin análisis válido. La aceptación de un modelo visual no es infalible ni certifica potabilidad. No se infieren concentraciones, causas de contaminación ni valores de laboratorio. `store:false` en Responses evita guardar la respuesta como objeto recuperable; no constituye una promesa de retención cero del proveedor.

## Chat

`POST /api/chat` calcula el contexto a partir de los registros del servidor, filtrado por ciudad y fecha. Incluye cantidades, últimas muestras y cuáles son ficticias. No envía las fotografías ni notas libres al modelo. Soporta historial acotado, carga, error y cancelación al cambiar ciudad/fecha. No hay respuestas locales disfrazadas de IA cuando la API falla.

## Alcance del hosting

La publicación ejecuta un Worker con D1 (SQLite), R2 y WebSockets. El chat y el análisis corren en ese backend. Configura OPENAI_API_KEY como variable de entorno de servidor del Site; nunca en public/. Localhost puede utilizar ese backend mediante CLOUD_API_ORIGIN, o una SQLite local aislada si se omite. La IA tiene límite por ventana y origen. La clave vigente tiene acceso a los modelos. La comprobación de visión con una fotografía en navegador no se completó: se rechazó el permiso de subida durante QA.

## Verificación

- La API real rechazó ambas claves recibidas con 401; no se completó inferencia real.
- `node verify.mjs` prueba HTTP, 420 registros de Guadalajara, fechas válidas, validación de fotos, estado derivado en servidor, token ligado a imagen y de un solo uso, rechazo de muestra, chat filtrado por ciudad, persistencia y difusión WS. El límite externo OpenAI se simula exclusivamente en el proceso de prueba.
- La interfaz muestra miniaturas en lista e historial, fuentes y aviso de datos de prueba.

Documentación: https://developers.openai.com/api/docs/guides/images-vision · https://developers.openai.com/api/docs/guides/structured-outputs
