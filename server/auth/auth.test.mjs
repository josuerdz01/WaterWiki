import {test,after} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {generateKeyPair,SignJWT} from 'jose';
import {handleAuth,authConfiguration} from './handler.mjs';
import {localAuthStore} from './local.mjs';
const dir=await mkdtemp(join(tmpdir(),'waterwiki-auth-'));
const store=await localAuthStore(dir);
const env={AUTH_ORIGIN:'http://localhost:5181',GOOGLE_CLIENT_ID:'client-test',GOOGLE_CLIENT_SECRET:'secret-test'};
const {publicKey,privateKey}=await generateKeyPair('RS256');
const request=(path,options={})=>new Request(env.AUTH_ORIGIN+path,options);
const call=(path,options={},deps={})=>handleAuth(request(path,options),env,()=>store,deps);
const cookies=response=>response.headers.getSetCookie().map(v=>v.split(';')[0]).join('; ');
const hash=async value=>Buffer.from(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value))).toString('hex');
async function begin(){
 const response=await call('/api/auth/google/start');
 assert.equal(response.status,303);
 const url=new URL(response.headers.get('location'));
 assert.equal(url.origin,'https://accounts.google.com');
 assert.equal(url.searchParams.get('code_challenge_method'),'S256');
 assert.equal(url.searchParams.get('redirect_uri'),env.AUTH_ORIGIN+'/api/auth/google/callback');
 assert.match(response.headers.get('set-cookie'),/HttpOnly; SameSite=Lax/);
 return {url,cookie:cookies(response)};
}
async function finish(flow,claims={},key=privateKey){
 const token=await new SignJWT({sub:'test-user',nonce:flow.url.searchParams.get('nonce'),email:'test@example.com',email_verified:true,name:'Persona de prueba',...claims}).setProtectedHeader({alg:'RS256'}).setIssuer('https://accounts.google.com').setAudience(env.GOOGLE_CLIENT_ID).setIssuedAt().setExpirationTime('5m').sign(key);
 let exchanges=0;
 const result=await call('/api/auth/google/callback?state='+flow.url.searchParams.get('state')+'&code=example',{headers:{cookie:flow.cookie}},{
 keys:{google:publicKey},fetch:async(url,options)=>{
  exchanges++;
  assert.equal(url,'https://oauth2.googleapis.com/token');
  const verifier=options.body.get('code_verifier');
  assert.equal(Buffer.from(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(verifier))).toString('base64url'),flow.url.searchParams.get('code_challenge'));
  assert.equal(options.body.get('client_secret'),'secret-test');
  return Response.json({id_token:token});
 }});
 return {result,exchanges};
}
test('configuration stays unavailable without credentials and rejects unsafe origin',async()=>{
 assert.deepEqual(authConfiguration({}),{google:false,email:false});
 assert.deepEqual(authConfiguration({...env,AUTH_ORIGIN:'http://public.example'}),{google:false,email:false});
 const noConfig=await handleAuth(request('/api/auth/google/start'),{AUTH_ORIGIN:env.AUTH_ORIGIN},()=>store);
 assert.equal(noConfig.headers.get('location'),'/login?auth_error=not_configured');
});
test('Google login validates PKCE and token, persists only hashed session, supports logout',async()=>{
 const flow=await begin(),{result,exchanges}=await finish(flow);
 assert.equal(exchanges,1);assert.equal(result.headers.get('location'),'/login');
 const sessionCookie=cookies(result).split('; ').find(v=>v.startsWith('ww_session='));
 assert(sessionCookie);
 const session=await (await call('/api/auth/session',{headers:{cookie:sessionCookie}})).json();
 assert.equal(session.user.id,'google:test-user');
 assert.equal(session.user.email,'test@example.com');
 const raw=sessionCookie.split('=')[1];
 assert.equal(await store.session(raw),null);
 assert.equal((await store.session(await hash(raw))).user.id,session.user.id);
 assert.equal((await call('/api/auth/logout',{method:'POST',headers:{cookie:sessionCookie,origin:'https://evil.example'}})).status,403);
 const logout=await call('/api/auth/logout',{method:'POST',headers:{cookie:sessionCookie,origin:env.AUTH_ORIGIN}});
 assert.equal(logout.status,200);assert.match(logout.headers.get('set-cookie'),/Max-Age=0/);
 assert.equal(await (await call('/api/auth/session',{headers:{cookie:sessionCookie}})).json(),null);
 const replay=await finish(flow);
 assert.equal(replay.exchanges,0);assert.equal(replay.result.headers.get('location'),'/login?auth_error=failed');
});
test('callback requires browser binding and cannot consume another browser flow',async()=>{
 const flow=await begin();
 const invalid=await call('/api/auth/google/callback?state='+flow.url.searchParams.get('state')+'&code=example');
 assert.equal(invalid.headers.get('location'),'/login?auth_error=failed');
 assert.equal((await finish(flow)).result.headers.get('location'),'/login');
});
test('wrong nonce or signature never creates a session',async()=>{
 for(const claims of [{nonce:'wrong'}]){
  const {result}=await finish(await begin(),claims);
  assert.equal(result.headers.get('location'),'/login?auth_error=failed');
  assert(!cookies(result).includes('ww_session='));
 }
 const {privateKey:other}=await generateKeyPair('RS256');
 const {result}=await finish(await begin(),{},other);
 assert.equal(result.headers.get('location'),'/login?auth_error=failed');
});
test('expired state is single use and cancelled login is recoverable',async()=>{
 const state='expired-state',binding='expired-binding';
 await store.saveFlow({state:await hash(state),binding:await hash(binding),provider:'google',nonce:'nonce',verifier:'verifier',expires:Date.now()-1000});
 const expired=await call('/api/auth/google/callback?state='+state+'&code=example',{headers:{cookie:'ww_flow_google='+binding}});
 assert.equal(expired.headers.get('location'),'/login?auth_error=failed');
 const flow=await begin();
 const cancelled=await call('/api/auth/google/callback?state='+flow.url.searchParams.get('state')+'&error=access_denied',{headers:{cookie:flow.cookie}});
 assert.equal(cancelled.headers.get('location'),'/login?auth_error=cancelled');
});
test('production session and flow cookies are secure and host-only',async()=>{
 const config={...env,AUTH_ORIGIN:'https://water.example'};
 const result=await handleAuth(new Request(config.AUTH_ORIGIN+'/api/auth/google/start'),config,()=>store);
 assert.match(result.headers.get('set-cookie'),/__Host-ww_flow_google=.*HttpOnly; SameSite=Lax.*Secure/);
 assert(!result.headers.get('set-cookie').includes('Domain='));
});

test('email registration, wrong password, login, persistence and account separation',async()=>{
 const headers={'Content-Type':'application/json',origin:env.AUTH_ORIGIN,'cf-connecting-ip':'email-test'};
 const input={name:'Persona local',email:'Local@example.com',password:'a-local-test-password-123'};
 const post=(path,body)=>call(path,{method:'POST',headers,body:JSON.stringify(body)});
 const registered=await post('/api/auth/register',input);
 assert.equal(registered.status,200);
 const session=await registered.json();
 assert.equal(session.user.provider,'email');assert.equal(session.user.email,'local@example.com');
 assert(!('password' in session.user));
 const credential=await store.credential('local@example.com');
 assert.match(credential.password_hash,/^\$2[ab]\$12\$/);
 assert.notEqual(credential.password_hash,input.password);
 assert.equal((await post('/api/auth/login',{email:input.email,password:'wrong-password-123'})).status,401);
 const logged=await post('/api/auth/login',input);
 assert.equal(logged.status,200);
 assert.equal((await logged.json()).user.id,session.user.id);
 assert.equal((await post('/api/auth/register',input)).status,400);
 const google=await finish(await begin(),{email:'local@example.com'});
 const googleCookie=cookies(google.result).split('; ').find(v=>v.startsWith('ww_session='));
 const googleSession=await (await call('/api/auth/session',{headers:{cookie:googleCookie}})).json();
 assert.notEqual(googleSession.user.id,session.user.id);
});
test('password endpoints reject cross-site requests, weak and truncated passwords',async()=>{
 const input={name:'Test',email:'valid@example.com',password:'long-enough-password'};
 assert.equal((await call('/api/auth/register',{method:'POST',headers:{origin:'https://evil.example','Content-Type':'application/json'},body:JSON.stringify(input)})).status,403);
 for(const password of ['short','x'.repeat(73),'é'.repeat(40)]){
  const result=await call('/api/auth/register',{method:'POST',headers:{origin:env.AUTH_ORIGIN,'Content-Type':'application/json'},body:JSON.stringify({...input,password})});
  assert.equal(result.status,400);
 }
});
test('persistent attempt limits and expired sessions',async()=>{
 assert(await store.allow('limit-test',2,10000));
 assert(await store.allow('limit-test',2,10000));
 assert.equal(await store.allow('limit-test',2,10000),false);
 await store.saveSession('expired-session','google:test-user',Date.now()-1000);
 assert.equal(await store.session('expired-session'),null);
 const headers={origin:env.AUTH_ORIGIN,'Content-Type':'application/json','cf-connecting-ip':'limit-test'};
 const input={email:'nobody@example.com',password:'long-enough-password'};
 for(let i=0;i<10;i++)await store.allow('login:'+await hash('limit-test:'+input.email),10,900000);
 const result=await call('/api/auth/login',{method:'POST',headers,body:JSON.stringify(input)});
 assert.equal(result.status,429);assert.equal(result.headers.get('retry-after'),'900');
});

test('Worker stream reader rejects oversized bodies without Content-Length',async()=>{
 const chunks=[new Uint8Array(4096),new Uint8Array(4096)];
 let count=0,cancelled=false;
 const body=new ReadableStream({pull(controller){if(count<chunks.length)controller.enqueue(chunks[count++]);else controller.close()},cancel(){cancelled=true}});
 const result=await handleAuth(new Request(env.AUTH_ORIGIN+'/api/auth/register',{method:'POST',headers:{origin:env.AUTH_ORIGIN,'Content-Type':'application/json'},body,duplex:'half'}),env,()=>store);
 assert.equal(result.status,413);assert(cancelled);
});
test('Google start has a persistent attempt limit',async()=>{
 for(let i=0;i<30;i++)await store.allow('google:'+await hash('google-rate'),30,900000);
 const result=await call('/api/auth/google/start',{headers:{'cf-connecting-ip':'google-rate'}});
 assert.equal(result.status,429);
});
test('profile edits persist, reports are private to their authenticated owner',async()=>{
 const user={id:'email:profile-owner',provider:'email',name:'Original',email:'owner@example.com'};
 await store.saveUser(user);
 await store.saveSession(await hash('profile-session'),user.id,Date.now()+60000);
 const headers={cookie:'ww_session=profile-session',origin:env.AUTH_ORIGIN,'Content-Type':'application/json'};
 const reports=[{id:'own',demo:false},{id:'someone-else',demo:false},{id:'demo',demo:true}];
 await store.ownReport('own',user.id);await store.ownReport('demo',user.id);
 await store.ownReport('someone-else','email:other-user');
 const deps={reports:async userId=>{const ids=new Set(await store.reportIds(userId));return reports.filter(report=>ids.has(report.id))}};
 assert.equal((await call('/api/auth/profile',{},deps)).status,401);
 const profile=await (await call('/api/auth/profile?userId=email:other-user',{headers},deps)).json();
 assert.deepEqual(profile.reports.map(report=>report.id),['own']);
 const updated=await call('/api/auth/profile',{method:'POST',headers,body:JSON.stringify({name:'Nombre editado',bio:'Mi colonia',userId:'email:other-user'})},deps);
 assert.equal(updated.status,200);
 const session=await (await call('/api/auth/session',{headers})).json();
 assert.equal(session.user.name,'Nombre editado');assert.equal(session.user.bio,'Mi colonia');
 await store.saveUser(user);
 assert.equal((await (await call('/api/auth/session',{headers})).json()).user.name,'Nombre editado');
 assert.equal((await call('/api/auth/profile',{method:'POST',headers:{...headers,origin:'https://evil.example'},body:'{}'},deps)).status,403);
});


test('six-number demo verification is local-only and never becomes real verification',async()=>{
 const user={id:'email:demo-account',provider:'email',name:'Demo',email:'demo@example.com'};
 await store.saveUser(user);await store.saveSession(await hash('demo-session'),user.id,Date.now()+60000);
 const headers={cookie:'ww_session=demo-session',origin:env.AUTH_ORIGIN,'Content-Type':'application/json'};
 const config={...env,AUTH_DEMO_EMAIL_VERIFICATION:'1'};
 const verify=(code,configuration=config,deps={localDemo:true})=>handleAuth(request('/api/auth/email/verify-demo',{method:'POST',headers,body:JSON.stringify({code})}),configuration,()=>store,deps);
 assert.equal((await verify('123456',env)).status,403);
 assert.equal((await verify('123456',config,{})).status,403);
 assert.equal((await verify('12345')).status,400);
 assert.equal((await verify('abc123')).status,400);
 const result=await verify('000000');
 assert.equal(result.status,200);
 const session=await result.json();
 assert.equal(session.user.emailDemoVerified,true);
 assert.equal(session.user.emailVerified,false);
 assert.equal((await (await call('/api/auth/session',{headers})).json()).user.emailDemoVerified,true);
 const https={...config,AUTH_ORIGIN:'https://water.example'};
 const prod=await handleAuth(new Request(https.AUTH_ORIGIN+'/api/auth/email/verify-demo',{method:'POST',headers:{...headers,cookie:'__Host-ww_session=demo-session',origin:https.AUTH_ORIGIN},body:JSON.stringify({code:'123456'})}),https,()=>store,{localDemo:true});
 assert.equal(prod.status,403);
 assert.equal((await verify('987654')).status,200);
 assert.equal((await handleAuth(request('/api/auth/email/verify-demo',{method:'POST',headers:{...headers,origin:'https://evil.example'},body:'{"code":"123456"}'}),config,()=>store,{localDemo:true})).status,403);
 assert.equal((await handleAuth(request('/api/auth/email/verify-demo',{method:'POST',headers:{origin:env.AUTH_ORIGIN,'Content-Type':'application/json'},body:'{"code":"123456"}'}),config,()=>store,{localDemo:true})).status,401);
});

after(async()=>{store.close();await rm(dir,{recursive:true,force:true,maxRetries:4,retryDelay:100})});
