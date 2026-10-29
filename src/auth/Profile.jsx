import EmailVerification from './EmailVerification';
import React,{useEffect,useMemo,useState} from 'react';
import {Droplets,ArrowLeft,ArrowUpRight,Monitor,Moon,Sun,Pencil,Check,LogOut,Plus,MapPin,GlassWater,ChevronDown,UserRound,Activity} from 'lucide-react';
import {useTheme} from '../useTheme';
import {zones,cities,labels} from '../data';
import './profile.css';

const zoneIndex=new Map(zones.map(zone=>[zone.id,zone]));
const dateLabel=value=>new Intl.DateTimeFormat('es-MX',{day:'numeric',month:'short',year:'numeric',timeZone:'America/Mexico_City'}).format(new Date(value));
const monthKey=value=>new Intl.DateTimeFormat('en-CA',{year:'numeric',month:'2-digit',timeZone:'America/Mexico_City'}).format(new Date(value));
const initials=name=>(name || 'Mi perfil').trim().split(/\s+/).slice(0,2).map(part=>part[0]).join('').toUpperCase();

export default function Profile(){
 const {theme,preference,setPreference,colors}=useTheme();
 const AppearanceIcon=preference==='system'?Monitor:theme==='dark'?Moon:Sun;
 const [profile,setProfile]=useState(null),[loading,setLoading]=useState(true),[error,setError]=useState(''),[unauthorized,setUnauthorized]=useState(false),[attempt,retry]=useState(0);
 const [editing,setEditing]=useState(false),[saving,setSaving]=useState(false),[loggingOut,setLoggingOut]=useState(false),[feedback,setFeedback]=useState(''),[filter,setFilter]=useState('all');
 useEffect(()=>{
  const controller=new AbortController();
  setLoading(true);setError('');setUnauthorized(false);
  fetch('/api/auth/profile',{signal:controller.signal}).then(async response=>{
   if(response.status===401){setUnauthorized(true);return}
   if(!response.ok)throw Error();
   const data=await response.json();setProfile({...data,reports:data.reports.sort((a,b)=>new Date(b.date)-new Date(a.date))});
  }).catch(error=>{if(error.name!=='AbortError')setError('No pudimos cargar tu perfil. Intenta de nuevo.')}).finally(()=>{if(!controller.signal.aborted)setLoading(false)});
  return()=>controller.abort();
 },[attempt]);
 const reports=profile?.reports || [];
 const currentMonth=monthKey(Date.now());
 const months=useMemo(()=>{
  const now=new Date(),parts=new Intl.DateTimeFormat('en-CA',{year:'numeric',month:'2-digit',timeZone:'America/Mexico_City'}).formatToParts(now);
  const year=Number(parts.find(part=>part.type==='year').value),month=Number(parts.find(part=>part.type==='month').value);
  return Array.from({length:6},(_,index)=>{
   const date=new Date(Date.UTC(year,month-6+index,15));
   const key=monthKey(date);
   return {key,label:new Intl.DateTimeFormat('es-MX',{month:'short',timeZone:'America/Mexico_City'}).format(date),count:reports.filter(report=>monthKey(report.date)===key).length};
  });
 },[profile]);
 const total=reports.length,colonias=new Set(reports.map(report=>report.zone)).size;
 const cityCount=new Set(reports.map(report=>zoneIndex.get(report.zone)?.city).filter(Boolean)).size;
 const thisMonth=reports.filter(report=>monthKey(report.date)===currentMonth).length;
 const visible=filter==='month'?reports.filter(report=>monthKey(report.date)===currentMonth):reports;
 async function save(event){
  event.preventDefault();setSaving(true);setFeedback('');
  const form=new FormData(event.currentTarget);
  try{
   const response=await fetch('/api/auth/profile',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:form.get('name'),bio:form.get('bio')})});
   const data=await response.json();
   if(!response.ok){setFeedback(data.error || 'No se pudo guardar el perfil.');return}
   setProfile(previous=>({...previous,user:data.user}));setEditing(false);setFeedback('Perfil actualizado.');
  }catch{setFeedback('No se pudo guardar el perfil. Intenta de nuevo.')}
  finally{setSaving(false)}
 }
 async function logout(){
  setLoggingOut(true);setFeedback('');
  try{const result=await fetch('/api/auth/logout',{method:'POST'});if(!result.ok)throw Error();location.assign('/login')}
  catch{setFeedback('No se pudo cerrar la sesión. Intenta de nuevo.');setLoggingOut(false)}
 }
 return <div className="ww-profile">
  <header><a className="brand" href="/"><span className="brand-icon"><Droplets size={21}/></span>WaterWiki</a><div className="header-note">Registro comunitario del agua</div><div className="header-right"><label className="theme-control"><AppearanceIcon size={17}/><select aria-label="Apariencia" value={preference} onChange={event=>setPreference(event.target.value)}><option value="system">Sistema</option><option value="light">Claro</option><option value="dark">Oscuro</option></select></label></div></header>
  <main className="ww-profile-main">
   <div className="intro"><div><h1>Mi perfil</h1><p>Tu historia en el agua que compartimos.</p></div><a className="primary" href="/"><ArrowLeft size={16}/>Volver al mapa</a></div>
   {loading?<section className="workspace ww-profile-message" role="status">Cargando tu perfil…</section>:unauthorized?<section className="workspace ww-profile-message"><UserRound size={32}/><h2>Tu comunidad empieza contigo</h2><p>Inicia sesión para ver tu perfil y los aportes de tu cuenta.</p><a className="primary" href="/login">Iniciar sesión<ArrowUpRight size={16}/></a></section>:error?<section className="workspace ww-profile-message" role="alert"><p>{error}</p><button className="outline" onClick={()=>retry(value=>value+1)}>Reintentar</button></section>:profile&&<>
    <div className="ww-profile-layout">
     <section className="workspace ww-profile-summary" aria-label="Datos de mi perfil">
      <div className="ww-profile-identity"><div className="ww-profile-avatar" aria-label={'Iniciales de '+profile.user.name}>{initials(profile.user.name)}<span><Droplets size={15}/></span></div><h2>{profile.user.name || 'Miembro de WaterWiki'}</h2><span className="ww-profile-member">Miembro de la comunidad</span><p className="ww-profile-email">{profile.user.email}</p>{profile.user.bio&&<p className="ww-profile-bio">{profile.user.bio}</p>}<button className="text-button" onClick={()=>{setEditing(value=>!value);setFeedback('')}} aria-expanded={editing} aria-controls="profile-edit"><Pencil size={14}/>{editing?'Cancelar edición':'Editar perfil'}</button></div>
      {editing&&<form id="profile-edit" className="ww-profile-edit" onSubmit={save}><label htmlFor="profile-name">Nombre<input id="profile-name" name="name" defaultValue={profile.user.name} maxLength={80} required disabled={saving}/></label><label htmlFor="profile-bio">Sobre ti <span>Opcional</span><textarea id="profile-bio" name="bio" defaultValue={profile.user.bio} maxLength={160} rows={3} disabled={saving}/></label><button className="outline" disabled={saving}>{saving?'Guardando…':<><Check size={15}/>Guardar cambios</>}</button></form>}
      {feedback&&<p className="ww-profile-feedback" role="status">{feedback}</p>}
      <div className="ww-profile-account"><span><Check size={14}/>Acceso con {profile.user.provider==='google'?'Google':'correo electrónico'}</span><EmailVerification user={profile.user} onVerified={user=>setProfile(previous=>({...previous,user}))}/><button className="text-button" onClick={logout} disabled={loggingOut}><LogOut size={14}/>{loggingOut?'Cerrando sesión…':'Cerrar sesión'}</button></div>
     </section>
     <div className="ww-profile-dashboard">
      <section className="workspace ww-profile-overview" aria-labelledby="overview-title"><div className="toolbar"><span id="overview-title">Mi participación</span><Droplets size={17}/></div><div className="ww-profile-stats">{[[total,'Aportes'],[colonias,'Colonias'],[thisMonth,'Este mes'],[cityCount,'Ciudades']].map(([value,label])=><div key={label}><strong>{value}</strong><span>{label}</span></div>)}</div></section>
      <section className="workspace ww-profile-activity" aria-labelledby="activity-title"><div className="toolbar"><span id="activity-title"><Activity size={16}/>Actividad reciente</span><small>Últimos 6 meses</small></div><div className="ww-profile-chart" role="img" aria-label={months.map(month=>month.label+': '+month.count+' aportes').join(', ')}>{months.map(month=><div className="ww-profile-chart-month" key={month.key}><span>{month.count}</span><div className="ww-profile-chart-track"><i style={{height:(month.count?Math.max(8,month.count/Math.max(1,...months.map(item=>item.count))*100):0)+'%'}}/></div><small>{month.label}</small></div>)}</div>{!total&&<p className="ww-profile-chart-note">Tu actividad aparecerá cuando registres tu primera muestra con esta cuenta.</p>}</section>
     </div>
    </div>
    <section className="workspace ww-profile-reports" aria-labelledby="reports-title">
     <div className="toolbar ww-profile-reports-heading"><div><h2 id="reports-title">Mis aportes</h2><p>Las muestras que has compartido con tu cuenta.</p></div><a className="primary" href="/?contribute=1"><Plus size={16}/>Registrar muestra</a></div>
     <div className="ww-profile-filters"><div className="tabs" aria-label="Filtrar mis aportes"><button className={filter==='all'?'active':''} aria-pressed={filter==='all'} onClick={()=>setFilter('all')}>Todos <span>{total}</span></button><button className={filter==='month'?'active':''} aria-pressed={filter==='month'} onClick={()=>setFilter('month')}>Este mes <span>{thisMonth}</span></button></div><span>{visible.length} {visible.length===1?'muestra registrada':'muestras registradas'}</span></div>
     {visible.length?<div className="ww-profile-report-list">{visible.map(report=>{
      const zone=zoneIndex.get(report.zone),city=cities.find(city=>city.id===zone?.city);
      return <details className="ww-profile-report" key={report.id}><summary>{report.photo?<img src={report.photo} alt={'Muestra de '+(zone?.name || 'agua')} loading="lazy"/>:<span className="ww-profile-report-placeholder"><GlassWater size={24}/></span>}<div><strong>{zone?.name || 'Colonia registrada'}</strong><span><MapPin size={11}/>{[zone?.municipality,city?.name].filter(Boolean).join(' · ')}</span></div><span className="ww-profile-report-state"><i style={{background:colors[report.state]}}/>{labels[report.state]}</span><time dateTime={report.date}>{dateLabel(report.date)}</time><ChevronDown size={16}/></summary><div className="ww-profile-report-detail"><p><strong>Origen:</strong> {report.source || 'Llave'}</p>{report.note&&<p>{report.note}</p>}{report.analysis?.reason&&<p>{report.analysis.reason}</p>}</div></details>;
     })}</div>:<div className="ww-profile-empty"><span><GlassWater size={28}/></span><h3>{filter==='month'&&total?'Todavía no hay aportes este mes':'Tu primera muestra cuenta'}</h3><p>{filter==='month'&&total?'Puedes consultar tus muestras anteriores en Todos.':'Registra una muestra desde el mapa. Aquí podrás consultar tu actividad y cada aporte que compartas.'}</p><a className="outline" href="/?contribute=1"><Plus size={15}/>Compartir una muestra</a></div>}
     <div className="workspace-footer"><Droplets size={14}/><span>Solo se muestran aportes vinculados a tu cuenta. Las muestras anteriores sin autor no se asignan automáticamente.</span></div>
    </section>
   </>}
   <footer><span>WaterWiki<small>Registro comunitario · México</small></span><a className="ww-profile-footer-link" href="/">Explorar el mapa<ArrowUpRight size={14}/></a></footer>
  </main>
 </div>;
}
