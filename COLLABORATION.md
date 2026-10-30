# Trabajo en paralelo
Repositorio: https://github.com/josuerdz01/WaterWiki
Cada persona clona el repositorio en su computadora y abre esa carpeta en Codex.
Compañero: git clone --branch feature/login https://github.com/josuerdz01/WaterWiki.git WaterWiki-login
Josué: git clone --branch feature/josue https://github.com/josuerdz01/WaterWiki.git WaterWiki-josue
Dentro de su carpeta: pnpm install --frozen-lockfile y node scripts/dev-isolated.mjs.
Requiere Node 22.13+ con SQLite integrado.
Login abre http://localhost:5181; Josué http://localhost:5182.
Cada carpeta guarda su SQLite en runtime/, ignorado por Git.
Crea .env.local con tus propias claves si necesitas IA o Google Maps. No copies el backend cloud para las pruebas; el lanzador lo desactiva.
Autoriza localhost:5181 y localhost:5182 en las restricciones de tu clave de Google Maps.
Sin claves, el servidor y los datos de prueba funcionan; las funciones de IA y el mapa de Google necesitan credenciales.
Sube con git push -u origin NOMBRE_DE_TU_RAMA (en los worktrees locales de Josué el remoto se llama github).
Abre un PR hacia main, revisa y prueba antes de integrar. Trae main periódicamente con git fetch origin y git merge origin/main desde tu rama.
Las ramas aíslan archivos durante el trabajo; los cambios simultáneos en las mismas líneas requieren resolver conflictos al integrar.
AGENTS.md contiene las instrucciones compartidas para Codex.
