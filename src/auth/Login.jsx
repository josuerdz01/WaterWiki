import EmailVerification from './EmailVerification';
import EmailForm from './EmailForm';
import React, {useState, useEffect} from 'react';
import {Droplets, ArrowLeft, ArrowUpRight, ShieldCheck, Monitor, Moon, Sun} from 'lucide-react';
import {useTheme} from '../useTheme';
import './login.css';

function ProviderIcon({provider}) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true"><path fill="#4285F4" d="M21.6 12.23c0-.71-.06-1.39-.18-2.05H12v3.88h5.38a4.6 4.6 0 0 1-2 3.02v2.51h3.24c1.9-1.75 2.98-4.33 2.98-7.36Z"/><path fill="#34A853" d="M12 22c2.7 0 4.96-.9 6.62-2.41l-3.24-2.51c-.9.6-2.04.96-3.38.96-2.6 0-4.8-1.76-5.59-4.12H3.07v2.59A10 10 0 0 0 12 22Z"/><path fill="#FBBC05" d="M6.41 13.92a6 6 0 0 1 0-3.84V7.49H3.07a10 10 0 0 0 0 9.02Z"/><path fill="#EA4335" d="M12 5.96c1.47 0 2.79.5 3.82 1.5l2.87-2.87A9.6 9.6 0 0 0 12 2a10 10 0 0 0-8.93 5.49l3.34 2.59C7.2 7.72 9.4 5.96 12 5.96Z"/></svg>
  );
}

export default function Login() {
  const messages={cancelled:'Cancelaste el inicio de sesión. Puedes intentarlo de nuevo.',failed:'No pudimos verificar tu cuenta. Intenta iniciar sesión de nuevo.',not_configured:'Este proveedor todavía no está configurado.'};
  const [error, setError] = useState(() => messages[new URLSearchParams(location.search).get('auth_error')] || '');
  const [account, setAccount] = useState(null);
  const [providers, setProviders] = useState(null);
  const [busy, setBusy] = useState('');
  const [loadError, setLoadError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const controller=new AbortController();
    const json=async path=>{const result=await fetch(path,{signal:controller.signal});if(!result.ok)throw Error();return result.json()};
    setLoadError(false);
    Promise.all([json('/api/auth/providers'),json('/api/auth/session')])
      .then(([available,session])=>{setProviders(available);setAccount(session)})
      .catch(e=>{if(e.name!=='AbortError')setLoadError(true)});
    return ()=>controller.abort();
  },[attempt]);
  useEffect(()=>{if(account)location.replace('/profile')},[account]);
  function start(provider) {
    const id=provider.toLowerCase();
    if(!providers?.[id]){setError('El acceso con Google todavía necesita configurarse. Puedes explorar sin cuenta.');return}
    setError('');setBusy(id);location.assign('/api/auth/'+id+'/start');
  }
  async function logout() {
    setBusy('logout');setError('');
    try{const result=await fetch('/api/auth/logout',{method:'POST'});if(!result.ok)throw Error();setAccount(null)}
    catch{setError('No se pudo cerrar la sesión. Intenta de nuevo.')}
    finally{setBusy('')}
  }
  const {theme, preference, setPreference} = useTheme();
  const AppearanceIcon = preference === 'system' ? Monitor : theme === 'dark' ? Moon : Sun;
  return <div className="ww-login">
    <header>
      <a className="brand" href="/"><span className="brand-icon"><Droplets size={21}/></span>WaterWiki</a>
      <div className="header-note">Registro comunitario del agua</div>
      <div className="header-right"><label className="theme-control"><AppearanceIcon size={17}/><select aria-label="Apariencia" value={preference} onChange={event => setPreference(event.target.value)}><option value="system">Sistema</option><option value="light">Claro</option><option value="dark">Oscuro</option></select></label></div>
    </header>
    <main className="ww-login-main">
      <div className="intro"><div><h1>El agua que compartimos</h1><p>Forma parte del registro comunitario de tu colonia.</p></div><a className="primary ww-login-back" href="/"><ArrowLeft size={16}/>Volver al mapa</a></div>
      <section className="workspace ww-login-card" aria-labelledby="login-title">
        <div className="toolbar ww-login-card-heading"><Droplets size={18}/><span>Tu cuenta en WaterWiki</span></div>
        <div className="ww-login-content">
          {account ? <>
            <h2 id="login-title">Tu cuenta</h2>
            <p>Sesión iniciada con {account.user.provider === 'google' ? 'Google' : 'correo electrónico'}.</p>
            <div className="ww-login-account"><strong>{account.user.name || 'Miembro de WaterWiki'}</strong>{account.user.email && <span>{account.user.email}</span>}</div>
            <EmailVerification user={account.user} onVerified={user=>setAccount(previous=>({...previous,user}))}/>
            <a className="primary ww-login-continue" href="/">Continuar al mapa<ArrowUpRight size={15}/></a>
            <button className="text-button ww-login-guest" disabled={!!busy} onClick={logout}>{busy==='logout'?'Cerrando sesión…':'Cerrar sesión'}</button>
          </> : <>
            <h2 id="login-title">Inicia sesión</h2>
            <p>Elige cómo quieres continuar para compartir tus muestras con la comunidad.</p>
            <div className="ww-login-providers">{['Google'].map(provider => <button className="outline" key={provider} disabled={!providers || !!busy} onClick={() => start(provider)}><ProviderIcon provider={provider}/>{busy===provider.toLowerCase()?'Conectando…':'Continuar con '+provider}<ArrowUpRight size={15}/></button>)}</div>
            {!providers && !loadError && <p className="ww-login-loading" role="status">Comprobando las opciones de acceso…</p>}
            {loadError && <p className="ww-login-notice" role="alert">No pudimos conectar con el servidor. <button className="text-button" onClick={()=>setAttempt(value=>value+1)}>Reintentar</button></p>}
            <div className="ww-login-divider"><span/>o usa tu correo<span/></div>
            <EmailForm busy={busy} setBusy={setBusy} onAuthenticated={session=>{setAccount(session);setError('')}}/>
            <a className="text-button ww-login-guest" href="/">Explorar sin cuenta<ArrowUpRight size={14}/></a>
          </>}
          {error && <p className="ww-login-notice" role="alert">{error}</p>}
        </div>
        <div className="workspace-footer ww-login-privacy"><ShieldCheck size={16}/><span>Tu cuenta es personal. Tus aportes ayudan a todos.</span></div>
      </section>
      <footer><span>WaterWiki<small>Registro comunitario · México</small></span><a className="ww-login-footer-link" href="/">Explorar el mapa<ArrowUpRight size={14}/></a></footer>
    </main>
  </div>;
}
