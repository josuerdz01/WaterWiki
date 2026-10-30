import {test} from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import worker from '../../worker/index.js';

test('Worker account endpoints use D1 without loading report tables',async()=>{
 const db=new DatabaseSync(':memory:');
 class Statement {
  constructor(sql,values=[]){this.sql=sql;this.values=values}
  bind(...values){return new Statement(this.sql,values)}
  async run(){const result=db.prepare(this.sql).run(...this.values);return {meta:{changes:Number(result.changes)}}}
  async all(){return {results:db.prepare(this.sql).all(...this.values)}}
  async first(){return db.prepare(this.sql).get(...this.values) || null}
 }
 const env={AUTH_ORIGIN:'https://water.example',DB:{prepare:sql=>new Statement(sql)}};
 const call=(path,options={})=>worker.fetch(new Request(env.AUTH_ORIGIN+path,options),env,{});
 try{
  assert.deepEqual(await (await call('/api/auth/providers')).json(),{google:false,email:true});
  assert.equal(await (await call('/api/auth/session')).json(),null);
  const headers={origin:env.AUTH_ORIGIN,'Content-Type':'application/json'};
  const input={name:'Worker test',email:'worker@example.com',password:'worker-test-password-123'};
  const created=await call('/api/auth/register',{method:'POST',headers,body:JSON.stringify(input)});
  assert.equal(created.status,200);
  const account=await created.json();assert.equal(account.user.provider,'email');
  const cookie=created.headers.getSetCookie()[0].split(';')[0];
  assert.match(cookie,/^__Host-ww_session=/);
  assert.match(created.headers.get('set-cookie'),/Secure/);
  assert.equal((await (await call('/api/auth/session',{headers:{cookie}})).json()).user.id,account.user.id);
  const demo=await worker.fetch(new Request(env.AUTH_ORIGIN+'/api/auth/email/verify-demo',{method:'POST',headers:{...headers,cookie},body:JSON.stringify({code:'123456'})}),{...env,AUTH_DEMO_EMAIL_VERIFICATION:'1'},{});
  assert.equal(demo.status,403);
  assert.equal((await call('/api/auth/logout',{method:'POST',headers:{cookie,origin:env.AUTH_ORIGIN}})).status,200);
  assert.equal(await (await call('/api/auth/session',{headers:{cookie}})).json(),null);
  const logged=await call('/api/auth/login',{method:'POST',headers,body:JSON.stringify(input)});
  assert.equal(logged.status,200);
  assert.equal((await logged.json()).user.id,account.user.id);
  assert(!db.prepare("SELECT name FROM sqlite_master WHERE name='reports'").get());
 }finally{db.close()}
});
