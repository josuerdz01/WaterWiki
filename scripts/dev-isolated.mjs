import {execFileSync, spawn} from 'node:child_process';
const branch = execFileSync('git', ['branch', '--show-current'], {encoding:'utf8'}).trim();
const ports = {'codex/login-social':'5181', 'feature/login':'5181', 'feature/josue':'5182'};
if (!ports[branch]) throw new Error('Usa feature/login o feature/josue en su propia carpeta.');
try { process.loadEnvFile('.env.local'); } catch (e) { if(e.code !== 'ENOENT') throw e; }
console.log('Desarrollo aislado:', branch, 'puerto', ports[branch], 'SQLite local; cloud desactivado');
const child = spawn(process.execPath, ['server.mjs'], {stdio:'inherit', env:{...process.env, PORT:ports[branch], DATA_DIR:'runtime', CLOUD_API_ORIGIN:'', LOAD_LOCAL_ENV:'0'}});
for (const signal of ['SIGINT','SIGTERM']) process.on(signal, () => child.kill(signal));
child.on('exit', code => { process.exitCode = code ?? 1; });
