import express from 'express';
import {handleAuth,getAuthSession} from './handler.mjs';
import {localAuthStore} from './local.mjs';

export function mountAuth(app,env,directory,getReports) {
  const config={...env,AUTH_ORIGIN:env.AUTH_ORIGIN || 'http://localhost:'+(env.PORT || '5173')};
  let store;
  const getStore=() => store ||= localAuthStore(directory);
  // Keep authentication parsing separate from the report upload API.
  app.use('/api/auth',express.raw({type:() => true,limit:'16kb'}),async (req,res) => {
    try {
      const request=new Request(new URL(req.originalUrl,config.AUTH_ORIGIN),{
        method:req.method,
        headers:{...req.headers,host:req.get('host'),'cf-connecting-ip':req.socket.remoteAddress},
        ...(req.method==='GET'||req.method==='HEAD'?{}:{body:req.body}),
      });
      // Do not trust forwarded host headers or accept a different configured origin.
      if (req.get('host')!==new URL(config.AUTH_ORIGIN).host) return res.status(403).json({error:'Origen no autorizado.'});
      const result=await handleAuth(request,config,getStore,{localDemo:true,reports:async userId=>{
        const ids=new Set(await (await getStore()).reportIds(userId));
        return getReports().filter(report=>ids.has(report.id));
      }});
      res.status(result.status);
      for (const [key,value] of result.headers) if (key!=='set-cookie') res.setHeader(key,value);
      const cookies=result.headers.getSetCookie();
      if (cookies.length) res.setHeader('Set-Cookie',cookies);
      res.send(await result.text());
    } catch { res.status(503).set('Cache-Control','no-store').json({error:'No se pudo acceder a la cuenta. Intenta de nuevo.'}); }
  });
  return {
    session:req=>getAuthSession(new Request(config.AUTH_ORIGIN,{headers:{cookie:req.get('cookie') || ''}}),config,getStore),
    ownReport:async(reportId,userId)=>(await getStore()).ownReport(reportId,userId),
  };
}
