import React,{useState} from 'react';
import {Eye,EyeOff,Mail,ArrowRight} from 'lucide-react';

export default function EmailForm({busy,setBusy,onAuthenticated}) {
  const [register,setRegister]=useState(false);
  const [visible,setVisible]=useState(false);
  const [error,setError]=useState('');
  const [password,setPassword]=useState('');
  const [confirm,setConfirm]=useState('');
  function switchMode() {
    setRegister(value=>!value);setError('');setPassword('');setConfirm('');setVisible(false);
  }
  async function submit(event) {
    event.preventDefault();setError('');
    if(register && password!==confirm){setError('Las contraseñas no coinciden.');return}
    if(new TextEncoder().encode(password).length>72){setError('La contraseña es demasiado larga. Usa como máximo 72 bytes.');return}
    const form=new FormData(event.currentTarget);
    setBusy('email');
    try{
      const response=await fetch(register?'/api/auth/register':'/api/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:form.get('name'),email:form.get('email'),password})});
      const result=await response.json();
      if(!response.ok){setError(result.error || 'No se pudo completar el acceso.');return}
      setPassword('');setConfirm('');onAuthenticated(result);
    }catch{setError('No pudimos conectar con el servidor. Intenta de nuevo.')}
    finally{setBusy('')}
  }
  return <section className="ww-email" aria-labelledby="email-title">
    <h3 id="email-title"><Mail size={16}/>{register?'Crea tu cuenta':'Continúa con tu correo'}</h3>
    <form onSubmit={submit}>
      {register && <label htmlFor="account-name">Nombre<input id="account-name" name="name" autoComplete="name" required maxLength={80} disabled={!!busy}/></label>}
      <label htmlFor="account-email">Correo electrónico<input id="account-email" name="email" type="email" autoComplete="email" placeholder="tu@correo.com" required maxLength={254} disabled={!!busy}/></label>
      <label htmlFor="account-password">Contraseña</label>
      <div className="ww-email-password"><input id="account-password" name="password" type={visible?'text':'password'} autoComplete={register?'new-password':'current-password'} required minLength={10} maxLength={72} value={password} onChange={event=>setPassword(event.target.value)} aria-describedby={register?'password-help':undefined} disabled={!!busy}/><button type="button" aria-label={visible?'Ocultar contraseña':'Mostrar contraseña'} aria-pressed={visible} onClick={()=>setVisible(value=>!value)} disabled={!!busy}>{visible?<EyeOff size={17}/>:<Eye size={17}/>}</button></div>
      {register && <><small id="password-help">Usa al menos 10 caracteres. No reutilices contraseñas de otras cuentas.</small><label htmlFor="account-confirm">Confirma tu contraseña<input id="account-confirm" type={visible?'text':'password'} autoComplete="new-password" required minLength={10} maxLength={72} value={confirm} onChange={event=>setConfirm(event.target.value)} disabled={!!busy}/></label></>}
      {error && <p className="ww-login-notice" role="alert">{error}</p>}
      <button className="primary ww-email-submit" type="submit" disabled={!!busy}>{busy==='email'?'Un momento…':register?'Crear cuenta':'Iniciar sesión'}<ArrowRight size={16}/></button>
    </form>
    <p className="ww-email-switch">{register?'¿Ya tienes cuenta?':'¿Es tu primera vez?'}<button type="button" onClick={switchMode} disabled={!!busy}>{register?'Inicia sesión':'Crea una cuenta'}</button></p>
  </section>;
}
