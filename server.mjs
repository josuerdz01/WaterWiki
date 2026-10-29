import {mountAuth} from './server/auth/express.mjs';
import {chatContext} from './server/chat-context.mjs';
import express from 'express';
import {createServer} from 'node:http';
import WebSocket,{WebSocketServer} from 'ws';
import {openReports} from './server/sqlite.mjs';
import {createServer as createVite} from 'vite';
import {initialReports,zones,cities,labels} from './src/data.js';
import {createAI,ApiError,validatePhoto} from './server/ai.mjs';
if(process.env.LOAD_LOCAL_ENV!=='0'){try{process.loadEnvFile('.env.local')}catch(error){if(error.code!=='ENOENT')throw error}}
const ai=createAI({apiKey:process.env.OPENAI_API_KEY,model:process.env.OPENAI_MODEL||'gpt-4.1-mini',visionModel:process.env.OPENAI_VISION_MODEL||'gpt-5.4-mini'});
const cloudOrigin=process.env.CLOUD_API_ORIGIN?.replace(/\/$/,'');
const app=express(),server=createServer(app),wss=new WebSocketServer({noServer:true});
const dataDir=process.env.DATA_DIR||'runtime';const storage=await openReports(dataDir,initialReports);let reports=storage.all();const auth=mountAuth(app,process.env,dataDir,()=>reports);app.use(express.json({limit:'6mb'}));
app.use('/api',(req,res,next)=>{res.set('Cache-Control','no-store');if(req.method==='POST'&&req.get('origin')&&new URL(req.get('origin')).host!==req.get('host'))return res.status(403).json({error:'Origen no autorizado.'});next()});
if(cloudOrigin){app.use(['/api','/media'],async(req,res)=>{try{const upstream=await fetch(cloudOrigin+req.originalUrl,{method:req.method,headers:req.method==='POST'?{'Content-Type':'application/json'}:{},body:req.method==='POST'?JSON.stringify(req.body):undefined,signal:AbortSignal.timeout(60000)});res.status(upstream.status);for(const key of ['content-type','cache-control'])if(upstream.headers.has(key))res.setHeader(key,upstream.headers.get(key));res.send(Buffer.from(await upstream.arrayBuffer()))}catch{res.status(502).json({error:'No pudimos conectar con la base de datos en la nube. Intenta de nuevo.'})}})}
const safe=fn=>(req,res,next)=>Promise.resolve(fn(req,res)).catch(next);
let active=0;async function metered(fn){if(active>=3)throw new ApiError(429,'Hay otras consultas en curso. Intenta en unos segundos.');active++;try{return await fn()}finally{active--}}
app.get('/api/reports',(_,res)=>res.json(reports));app.get('/api/ai/status',(_,res)=>res.json({configured:ai.configured}));
app.post('/api/analyze',safe(async(req,res)=>res.json(await metered(()=>ai.analyze(req.body.photo)))));
app.post('/api/chat',safe(async(req,res)=>{const {city:cityId,date,question,history,selected}=req.body;const city=cities.find(c=>c.id===cityId);if(!city||typeof question!=='string'||!question.trim()||question.length>2000||!/^\d{4}-\d{2}-\d{2}$/.test(date||'')||history&&!Array.isArray(history))throw new ApiError(400,'Revisa la ciudad, la fecha y tu pregunta.');res.json(await metered(()=>ai.chat({question:question.trim(),history:(history||[]).filter(x=>x&&typeof x==='object'),context:chatContext({city:cityId,date,selected,question,records:reports})})))}));
let queue=Promise.resolve();
app.post('/api/reports',safe(async(req,res)=>{const account=await auth.session(req);const b=req.body;if(!Number.isInteger(b.zone)||!zones.some(z=>z.id===b.zone)||b.confirmed!==true)throw new ApiError(400,'Selecciona la colonia y confirma que quieres compartir la muestra.');validatePhoto(b.photo);await(queue=queue.catch(()=>{}).then(async()=>{const analysis=await ai.ticket(b.analysisToken,b.photo);const r={id:crypto.randomUUID(),zone:b.zone,state:analysis.state,photo:b.photo,analysis,note:String(b.note||'').slice(0,500),source:String(b.source||'Llave').slice(0,60),date:new Date().toISOString(),demo:false};if(account)await auth.ownReport(r.id,account.user.id);storage.add(r);reports=storage.all();ai.consume(b.analysisToken);for(const c of wss.clients)if(c.readyState===1)c.send(JSON.stringify(reports));res.status(201).json(r)}))}));
app.use('/api',(error,req,res,next)=>{res.status(error.status||500).json({error:error instanceof ApiError?error.message:error.type==='entity.too.large'?'La imagen es demasiado grande.':'No se pudo completar la operación.'})});
server.on('upgrade',(req,socket,head)=>{if(req.url==='/live')wss.handleUpgrade(req,socket,head,ws=>wss.emit('connection',ws,req))});
wss.on('connection',ws=>{if(cloudOrigin){const remote=new WebSocket(cloudOrigin.replace(/^http/,'ws')+'/live');remote.on('message',data=>{if(ws.readyState===1)ws.send(data.toString())});ws.on('message',data=>{if(remote.readyState===1)remote.send(data.toString())});remote.on('error',()=>ws.close(1011,'No se pudo conectar con la nube'));remote.on('close',()=>ws.close());ws.on('close',()=>remote.close());return}ws.send(JSON.stringify(reports));ws.on('message',message=>{if(message.toString()==='sync')ws.send(JSON.stringify(reports))})});
app.use((await createVite({server:{middlewareMode:true,hmr:{server},watch:{ignored:['**/work/**','**/dist/**','**/runtime/**','**/worker/assets.generated.js']},fs:{deny:['.env','.env.*','*.{crt,pem}','**/.git/**','**/runtime/**','**/*.sqlite*','**/server/**','**/worker/**','**/drizzle/**','**/.openai/**']}},appType:'spa'})).middlewares);
server.listen(Number(process.env.PORT||5173),'127.0.0.1',()=>console.log(`WaterWiki: http://localhost:${process.env.PORT||5173}`));
