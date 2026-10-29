import {validPassword,hashPassword,checkPassword} from './password.mjs';
import {createRemoteJWKSet, jwtVerify} from 'jose';

const SESSION_SECONDS = 7 * 24 * 60 * 60;
const providers = {
  google:{authorization:'https://accounts.google.com/o/oauth2/v2/auth', token:'https://oauth2.googleapis.com/token', issuer:['https://accounts.google.com','accounts.google.com'], keys:'https://www.googleapis.com/oauth2/v3/certs'},
};
const keySets = Object.fromEntries(Object.entries(providers).map(([name,p]) => [name,createRemoteJWKSet(new URL(p.keys))]));
const random = () => Array.from(crypto.getRandomValues(new Uint8Array(32)), b => b.toString(16).padStart(2,'0')).join('');
const hash = async value => Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value))), b => b.toString(16).padStart(2,'0')).join('');
const base64url = bytes => btoa(String.fromCharCode(...new Uint8Array(bytes))).replaceAll('+','-').replaceAll('/','_').replaceAll('=','');
function readCookie(request, name) {
  const values = (request.headers.get('cookie') || '').split(';').map(v => v.trim()).filter(v => v.startsWith(name+'='));
  return values.length === 1 ? values[0].slice(name.length+1) : '';
}
function originConfig(env) {
  try {
    const url = new URL(env.AUTH_ORIGIN);
    if (url.origin !== env.AUTH_ORIGIN || (url.protocol !== 'https:' && !(url.protocol === 'http:' && ['localhost','127.0.0.1'].includes(url.hostname)))) return null;
    return url;
  } catch { return null; }
}
export function authConfiguration(env) {
  const origin = originConfig(env);
  const google = !!(origin && env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET);
  return {google,email:!!origin};
}
const cookieName = origin => origin.protocol === 'https:' ? '__Host-ww_session' : 'ww_session';
function cookie(name,value,seconds,origin) {
  return name+'='+value+'; Path=/; HttpOnly; SameSite=Lax; Max-Age='+seconds+(origin.protocol==='https:'?'; Secure':'');
}
function response(body,status=200,headers={}) {
  return new Response(JSON.stringify(body),{status,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','Referrer-Policy':'no-referrer',...headers}});
}
function redirect(path,cookies=[]) {
  const headers = new Headers({'Location':path,'Cache-Control':'no-store','Referrer-Policy':'no-referrer'});
  for (const value of cookies) headers.append('Set-Cookie',value);
  return new Response(null,{status:303,headers});
}

async function readInput(request) {
  const reader=request.body?.getReader();
  if(!reader)return {status:400};
  const buffer=new Uint8Array(4096);
  let length=0;
  try{
    while(true){
      const {value,done}=await reader.read();
      if(done)break;
      if(length+value.byteLength>buffer.length){await reader.cancel();return {status:413}}
      buffer.set(value,length);length+=value.byteLength;
    }
    return {value:JSON.parse(new TextDecoder().decode(buffer.subarray(0,length)))};
  }catch{return {status:400}}
  finally{reader.releaseLock()}
}

export async function getAuthSession(request,env,getStore) {
  const origin=originConfig(env);
  if(!origin)return null;
  const token=readCookie(request,cookieName(origin));
  return token?await (await getStore()).session(await hash(token)):null;
}

// Standard Request/Response handler shared by Express and the production Worker.
export async function handleAuth(request,env,getStore,dependencies={}) {
  const url = new URL(request.url), path = url.pathname;
  if (!path.startsWith('/api/auth/')) return null;
  const origin = originConfig(env), configured = authConfiguration(env);
  if (path === '/api/auth/providers' && request.method === 'GET') return response(configured);
  if (!origin) return response({error:'Configura AUTH_ORIGIN para habilitar las cuentas.'},503);
  if (url.origin !== origin.origin) return response({error:'Origen no autorizado.'},403);
  if (path === '/api/auth/email/status' || path === '/api/auth/email/verify-demo') {
    const session=await getAuthSession(request,env,getStore);
    if(!session)return response({error:'Inicia sesión para validar tu correo.'},401);
    const demoAvailable=dependencies.localDemo===true && env.AUTH_DEMO_EMAIL_VERIFICATION==='1' && origin.protocol==='http:' && ['localhost','127.0.0.1'].includes(origin.hostname);
    if(path.endsWith('/status') && request.method==='GET')return response({demoAvailable});
    if(path.endsWith('/status'))return response({error:'Método no permitido.'},405);
    if(!demoAvailable)return response({error:'La validación de demostración está desactivada.'},403);
    if(request.method!=='POST')return response({error:'Método no permitido.'},405);
    if(request.headers.get('origin')!==origin.origin)return response({error:'Origen no autorizado.'},403);
    if(session.user.provider!=='email')return response({error:'Esta cuenta usa otro proveedor.'},400);
    if(!request.headers.get('content-type')?.startsWith('application/json'))return response({error:'Solicitud no válida.'},400);
    const input=await readInput(request);
    if(input.status)return response({error:'Solicitud no válida.'},input.status);
    if(typeof input.value?.code!=='string' || !/^[0-9]{6}$/.test(input.value.code))return response({error:'Introduce un código de 6 números.'},400);
    const store=await getStore();
    if(!await store.allow('demo-email:'+session.user.id,10,60000))return response({error:'Espera un minuto antes de intentar de nuevo.'},429);
    await store.markDemoEmail(session.user.id);
    return response(await getAuthSession(request,env,getStore));
  }
  if (path === '/api/auth/profile') {
    const session=await getAuthSession(request,env,getStore);
    if(!session)return response({error:'Inicia sesión para ver tu perfil.'},401);
    if(request.method==='GET') {
      const reports=await dependencies.reports(session.user.id);
      return response({user:session.user,reports:reports.filter(report=>!report.demo)});
    }
    if(request.method!=='POST')return response({error:'Método no permitido.'},405);
    if(request.headers.get('origin')!==origin.origin)return response({error:'Origen no autorizado.'},403);
    if(!request.headers.get('content-type')?.startsWith('application/json'))return response({error:'Solicitud no válida.'},400);
    const input=await readInput(request);
    if(input.status)return response({error:'Solicitud no válida.'},input.status);
    const name=typeof input.value?.name==='string'?input.value.name.trim():'';
    const bio=typeof input.value?.bio==='string'?input.value.bio.trim():'';
    if(!name || name.length>80 || bio.length>160)return response({error:'Revisa el nombre (80 caracteres) y la descripción (160 caracteres).'},400);
    await (await getStore()).saveProfile(session.user.id,name,bio);
    return response(await getAuthSession(request,env,getStore));
  }
  if (path === '/api/auth/session' && request.method === 'GET') {
    const token = readCookie(request,cookieName(origin));
    return response(token ? await (await getStore()).session(await hash(token)) : null);
  }
  if (path === '/api/auth/logout' && request.method === 'POST') {
    if (request.headers.get('origin') !== origin.origin) return response({error:'Origen no autorizado.'},403);
    const token = readCookie(request,cookieName(origin));
    if (token) await (await getStore()).logout(await hash(token));
    return response({ok:true},200,{'Set-Cookie':cookie(cookieName(origin),'',0,origin)});
  }
  if (path === '/api/auth/register' || path === '/api/auth/login') {
    if(request.method!=='POST')return response({error:'Método no permitido.'},405);
    if(request.headers.get('origin')!==origin.origin)return response({error:'Origen no autorizado.'},403);
    if(!request.headers.get('content-type')?.startsWith('application/json'))return response({error:'Solicitud no válida.'},400);
    const parsed=await readInput(request);
    if(parsed.status)return response({error:parsed.status===413?'Solicitud demasiado grande.':'Solicitud no válida.'},parsed.status);
    const input=parsed.value;
    if(!input||typeof input!=='object')return response({error:'Solicitud no válida.'},400);
    const email=typeof input.email==='string'?input.email.trim().toLowerCase():'';
    if(email.length>254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !validPassword(input.password))return response({error:'Introduce un correo válido y una contraseña de al menos 10 caracteres (máximo 72 bytes).'},400);
    const store=await getStore(),ip=request.headers.get('cf-connecting-ip') || 'unknown';
    const prefix=await hash('auth-ip:'+ip);
    if(!await store.allow('all:'+prefix,50,900000) || !await store.allow('login:'+await hash(ip+':'+email),10,900000))return response({error:'Demasiados intentos. Espera 15 minutos antes de intentar de nuevo.'},429,{'Retry-After':'900'});
    let user;
    if(path==='/api/auth/register'){
      if(!await store.allow('register:'+prefix,5,3600000))return response({error:'Demasiados registros. Intenta más tarde.'},429,{'Retry-After':'3600'});
      const name=typeof input.name==='string'?input.name.trim():'';
      if(!name || name.length>80)return response({error:'Escribe tu nombre (máximo 80 caracteres).'},400);
      user={id:'email:'+crypto.randomUUID(),provider:'email',name,email};
      const passwordHash=await hashPassword(input.password);
      if(!await store.createCredential(email,user.id,name,passwordHash))return response({error:'No se pudo crear esta cuenta. Si ya tienes una, inicia sesión.'},400);
    }else{
      const credential=await store.credential(email);
      const valid=await checkPassword(input.password,credential?.password_hash);
      if(!credential || !valid)return response({error:'El correo o la contraseña no son correctos.'},401);
      user={id:credential.user_id,provider:'email',name:credential.name,email};
    }
    await store.saveUser(user);
    const token=random();
    await store.saveSession(await hash(token),user.id,Date.now()+SESSION_SECONDS*1000);
    const old=readCookie(request,cookieName(origin));
    if(old)await store.logout(await hash(old));
    return response(await store.session(await hash(token)),200,{'Set-Cookie':cookie(cookieName(origin),token,SESSION_SECONDS,origin)});
  }
  const match = path.match(/^\/api\/auth\/(google)\/(start|callback)$/);
  if (!match) return response({error:'Ruta no disponible.'},404);
  const [,provider,action] = match, config = providers[provider];
  const clientId = env.GOOGLE_CLIENT_ID;
  const flowCookie = (origin.protocol === 'https:' ? '__Host-' : '')+'ww_flow_'+provider;
  const clearFlow = cookie(flowCookie,'',0,origin);
  if (!configured[provider]) return redirect('/login?auth_error=not_configured');
  if (action === 'start') {
    if (request.method !== 'GET') return response({error:'Método no permitido.'},405);
    const store=await getStore();
    const ip=request.headers.get('cf-connecting-ip') || 'unknown';
    if(!await store.allow('google:'+await hash(ip),30,900000))return response({error:'Demasiados intentos. Espera 15 minutos.'},429,{'Retry-After':'900'});
    const state=random(),binding=random(),nonce=random(),verifier=random();
    await (await getStore()).saveFlow({state:await hash(state),binding:await hash(binding),provider,nonce,verifier,expires:Date.now()+600000});
    const target = new URL(config.authorization);
    target.search = new URLSearchParams({client_id:clientId,redirect_uri:origin.origin+'/api/auth/'+provider+'/callback',response_type:'code',scope:'openid email profile',state,nonce}).toString();
    {
      target.searchParams.set('code_challenge',base64url(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(verifier))));
      target.searchParams.set('code_challenge_method','S256');
    }
    return redirect(target.href,[cookie(flowCookie,binding,600,origin)]);
  }
  if (request.method !== 'GET') return response({error:'Método no permitido.'},405);
  try {
    if (Number(request.headers.get('content-length')||0)>16384) throw Error('Body too large');
    let params=url.searchParams;
    const state=params.get('state'), binding=readCookie(request,flowCookie);
    if (!state || state.length>256 || !binding || binding.length>256) throw Error('Missing state');
    const store=await getStore(),flow=await store.takeFlow(await hash(state),await hash(binding),provider);
    if (!flow || flow.expires<Date.now()) throw Error('Invalid state');
    if (params.has('error')) return redirect('/login?auth_error=cancelled',[clearFlow]);
    const code=params.get('code');
    if (!code || code.length>4096) throw Error('Missing code');
    const body=new URLSearchParams({grant_type:'authorization_code',code,client_id:clientId,client_secret:env.GOOGLE_CLIENT_SECRET,redirect_uri:origin.origin+'/api/auth/'+provider+'/callback'});
    if (provider==='google') body.set('code_verifier',flow.verifier);
    const upstream=await (dependencies.fetch || fetch)(config.token,{method:'POST',body,headers:{'Content-Type':'application/x-www-form-urlencoded'},signal:AbortSignal.timeout(15000)});
    if (!upstream.ok) throw Error('Token exchange failed');
    const tokens=await upstream.json();
    const {payload}=await jwtVerify(tokens.id_token,dependencies.keys?.[provider] || keySets[provider],{issuer:config.issuer,audience:clientId,algorithms:['RS256'],requiredClaims:['sub','iat','exp','nonce'],maxTokenAge:'10m',clockTolerance:10});
    if (payload.nonce!==flow.nonce || typeof payload.sub!=='string' || !payload.sub) throw Error('Invalid identity');
    // Never merge accounts by email. Each provider's verified subject is a distinct identity.
    const emailVerified=payload.email_verified===true || payload.email_verified==='true';
    const user={id:provider+':'+payload.sub,provider,name:provider==='google'&&typeof payload.name==='string'?payload.name.slice(0,120):'',email:emailVerified&&typeof payload.email==='string'?payload.email.slice(0,320):null};
    await store.saveUser(user);
    const token=random();
    await store.saveSession(await hash(token),user.id,Date.now()+SESSION_SECONDS*1000);
    const old=readCookie(request,cookieName(origin));
    if (old) await store.logout(await hash(old));
    return redirect('/login',[clearFlow,cookie(cookieName(origin),token,SESSION_SECONDS,origin)]);
  } catch {
    return redirect('/login?auth_error=failed',[clearFlow]);
  }
}
