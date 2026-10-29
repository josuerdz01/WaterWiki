import React,{useEffect,useState} from 'react';
import {Check,Mail} from 'lucide-react';
import './verification.css';

export default function EmailVerification({user,onVerified}){
 const [available,setAvailable]=useState(false),[code,setCode]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState('');
 useEffect(()=>{
  const controller=new AbortController();
  fetch('/api/auth/email/status',{signal:controller.signal}).then(async response=>{if(response.ok)setAvailable((await response.json()).demoAvailable)}).catch(()=>{});
  return()=>controller.abort();
 },[]);
 async function verify(event){
  event.preventDefault();setBusy(true);setError('');
  try{
   const result=await fetch('/api/auth/email/verify-demo',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({code})});
   const data=await result.json();
   if(!result.ok){setError(data.error || 'No se pudo validar el código.');return}
   setCode('');onVerified(data.user);
  }catch{setError('No pudimos conectar con el servidor. Intenta de nuevo.')}
  finally{setBusy(false)}
 }
 if(user.emailVerified)return <div className="ww-verification-success"><Check size={15}/>Correo verificado</div>;
 if(user.emailDemoVerified)return <div className="ww-verification-success"><Check size={15}/><div>Validado en demo<small>Simulación local; no verifica la propiedad del correo.</small></div></div>;
 return <section className="ww-verification" aria-label="Verificación del correo"><p><Mail size={15}/>Correo aún no verificado</p>{available&&<><small>Demo local: introduce cualquier código de 6 números. No se enviará un correo.</small><form onSubmit={verify}><label htmlFor="demo-email-code">Código de demostración</label><input id="demo-email-code" inputMode="numeric" autoComplete="off" pattern="[0-9]{6}" maxLength={6} required placeholder="123456" value={code} onChange={event=>setCode(event.target.value.replace(/[^0-9]/g,'').slice(0,6))} disabled={busy}/><button className="outline" disabled={busy || code.length!==6}>{busy?'Validando…':'Validar correo (demo)'}</button></form></>}{error&&<p role="alert">{error}</p>}</section>;
}
