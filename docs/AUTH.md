# Cuentas de WaterWiki

Esta rama añade Google y correo con contraseña. Apple fue retirado.

## Probar ahora, sin claves

1. `pnpm install --frozen-lockfile`
2. `node scripts/dev-isolated.mjs`
3. Abre [el login local](http://localhost:5181/login).
4. Elige **Crea una cuenta**, escribe nombre, correo y una contraseña de al menos 10 caracteres. Después puedes cerrar sesión e iniciar de nuevo.

Las cuentas locales se guardan en `runtime/auth.sqlite`, independiente de las muestras y de otras carpetas. No subir runtime ni bases de datos a Git. El lanzador sigue desactivando el backend cloud.

El correo de una cuenta creada con contraseña **no está verificado**. No se envían mensajes y todavía no hay recuperación de contraseña. No se vinculan automáticamente las cuentas de Google y correo, aunque compartan dirección. No usar estas cuentas como prueba de propiedad de una dirección ni para autorizaciones basadas en dominio.

## Habilitar Google

No necesitas Apple Developer. Las claves de Maps tampoco sirven para iniciar sesión.

1. Entra a [Google Cloud Console](https://console.cloud.google.com/) con tu cuenta y selecciona o crea un proyecto.
2. Abre **Google Auth Platform**. Configura **Branding** con WaterWiki y tus correos de contacto.
3. Configura **Audience**. Si el proyecto está en pruebas, agrega las cuentas que probarán el acceso como usuarios de prueba.
4. En **Clients**, crea un cliente de tipo **Web application**.
5. Agrega este URI en **Authorized redirect URIs**, exactamente:
   `http://localhost:5181/api/auth/google/callback`
6. Crea un archivo `.env.local` dentro de esta carpeta, sin sobrescribir claves existentes:
   ```dotenv
   AUTH_ORIGIN=http://localhost:5181
   GOOGLE_CLIENT_ID=tu-id.apps.googleusercontent.com
   GOOGLE_CLIENT_SECRET=tu-secreto
   ```
7. Reinicia `node scripts/dev-isolated.mjs` y abre **Continuar con Google**.

Nunca pegues el secreto en código, en el navegador ni en una variable VITE_. No lo compartas en el chat.

Para otra carpeta en 5182 usa su propio AUTH_ORIGIN y registra también `http://localhost:5182/api/auth/google/callback`. Usa siempre el mismo host: localhost y 127.0.0.1 son orígenes diferentes.

Documentación oficial: [crear el cliente](https://developers.google.com/identity/gsi/web/guides/get-google-api-clientid) y [OpenID Connect](https://developers.google.com/identity/openid-connect/openid-connect).

## Producción

Configura AUTH_ORIGIN con el origen HTTPS exacto, sin barra final, y GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET como variables o secretos del Worker. Registra `https://TU-DOMINIO/api/auth/google/callback` en Google. No se ha publicado esta rama.

El Worker comparte el mismo handler y usa D1, con tablas auth_* creadas por `server/auth/schema.mjs`; Express usa SQLite local. Ninguna ruta depende de Node en el Worker.

**Contraseñas y CPU:** bcrypt usa coste 12 tanto local como en el Worker. Debes comprobar que el alojamiento permita suficiente CPU por petición antes de habilitar contraseñas en producción. El plan gratuito de Cloudflare limita la CPU a 10 ms y no es adecuado para este cálculo; no reducir el coste para esquivar el límite. Ver [límites oficiales](https://developers.cloudflare.com/workers/platform/limits/).

## Contrato para integrar con el producto

- GET /api/auth/providers → { google: boolean, email: boolean }; sólo disponibilidad, sin secretos.
- POST /api/auth/register → { name, email, password }.
- POST /api/auth/login → { email, password }.
- GET /api/auth/google/start → redirección al consentimiento de Google.
- GET /api/auth/google/callback → valida código, state, nonce, firma, emisor y audiencia.
- GET /api/auth/session → null o { user: { id, provider, name, email }, expiresAt }.
- POST /api/auth/logout → revoca la sesión del servidor y elimina la cookie.

POST exige Origin coincidente. Las sesiones duran siete días, son revocables y sólo se conserva el hash del token. Cookies HttpOnly, SameSite=Lax y Secure en HTTPS, con prefijo __Host- en producción. No se usa localStorage para tokens. Las contraseñas se guardan como bcrypt, nunca en claro, con límite explícito de 72 bytes para evitar truncamiento.

El mapa y los aportes conservan su comportamiento actual; agregar autenticación no impone nuevas restricciones a reportes. Para restringir acciones en el futuro, validar la sesión también en cada endpoint del servidor.

## Verificación

```sh
node --test server/auth/auth.test.mjs server/auth/worker.test.mjs
pnpm build
node scripts/validate-cloud.mjs
node verify-cloud.mjs
node verify.mjs
```

verify.mjs usa el puerto 5174 y debe ejecutarse por separado. Las pruebas de Google usan claves de prueba y simulan únicamente el proveedor externo; no reemplazan una prueba real con el cliente OAuth configurado.

## Perfil y aportes

La ruta /profile permite editar nombre y descripción, consultar métricas, actividad de seis meses e historial de aportes. El avatar muestra las iniciales. El acceso Mi cuenta del mapa apunta al perfil y el login redirige al perfil cuando existe una sesión.

GET /api/auth/profile devuelve { user, reports } sólo para la sesión vigente. POST /api/auth/profile recibe { name, bio } y sólo modifica el perfil de esa sesión. La respuesta de sesión incorpora user.bio.

La tabla privada auth_report_owners vincula los nuevos reportes a la sesión del servidor, sin exponer identificadores de cuenta en la API pública. Express guarda la relación en auth.sqlite; el Worker la añade en la misma transacción D1 del reporte. No se asignan aportes históricos sin autor ni se aceptan propietarios enviados desde el cliente. Los invitados conservan la posibilidad de aportar anónimamente.

## Validación simulada para la demo local

AUTH_DEMO_EMAIL_VERIFICATION=1 en .env.local permite escribir cualquier código de seis dígitos en el perfil. Se muestra Validado en demo. Esto NO prueba la propiedad del correo: user.emailVerified permanece false y user.emailDemoVerified refleja sólo la simulación. No utilizar este campo para autorizar acciones.

La ruta POST /api/auth/email/verify-demo requiere sesión, Origin válido y el adaptador local de Express, además de origen HTTP localhost y la variable explícita. El Worker la rechaza incluso si recibe esa variable. La configuración de ejemplo deja el modo apagado. No se envía ningún correo ni se crean enlaces de verificación reales.
