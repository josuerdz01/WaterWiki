# Colaboración en WaterWiki
Antes de editar, verifica pwd, git status --short --branch y git branch --show-current.
- feature/login: módulo de autenticación. Mantén sus componentes en src/auth/ y su servidor en server/auth/ cuando sea viable.
- feature/josue: resto del producto. Coordina cualquier cambio que afecte autenticación.
- Cada chat debe usar su propia carpeta/worktree y rama. No cambies la rama de otra carpeta.
- Para probar, usa node scripts/dev-isolated.mjs. Login: puerto 5181; Josué: 5182. Bases runtime independientes. Este comando desactiva el backend cloud incluso si existe .env.local.
- Coordina cambios en src/main.jsx, server.mjs, worker/index.js, package.json, pnpm-lock.yaml y db/schema.ts. Ningún archivo es un bloqueo absoluto: explica dependencias antes de ampliar el alcance.
- Autenticación debe considerar tanto el servidor Express local como el Worker de producción. Acuerda rutas y formato de sesión antes de conectarla al resto.
- No subas .env.local, claves, bases SQLite ni runtime/. Cada desarrollador configura sus propias credenciales.
- No publiques ni integres en main sin autorización. Entrega cambios mediante pull request a main. No fuerces pushes ni reviertas cambios ajenos.
- Antes del PR ejecuta pnpm build y las verificaciones existentes pertinentes. verify.mjs usa 5174: ejecútenlo por separado si comparten computadora.
