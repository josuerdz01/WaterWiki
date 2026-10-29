import municipalities from './mexico-municipalities.json' with {type:'json'};
import {gdlColonias} from './gdl-colonias.js';
export const cities = [
  {id:'gdl',name:'Guadalajara metropolitana',region:'Jalisco',center:{lat:20.6736,lng:-103.3618},zoom:11},
  {id:'cdmx',name:'Ciudad de México',region:'Ciudad de México',center:{lat:19.417,lng:-99.151},zoom:13},
  {id:'mty',name:'Monterrey',region:'Nuevo León',center:{lat:25.675,lng:-100.322},zoom:13},
  ...municipalities.map(m=>({id:'mx-'+m.code,name:m.name,region:m.state,center:{lat:m.lat,lng:m.lng},zoom:11,municipalityCode:m.code,bounds:m.bounds})),
];
// These positions identify approximate neighborhood centers, never administrative boundaries.
const cdmx=[['Roma Norte',19.419,-99.162,0],['Juárez',19.427,-99.163,1],['Condesa',19.413,-99.174,0],['Hipódromo',19.406,-99.169,1],['Roma Sur',19.406,-99.159,2],['Doctores',19.414,-99.145,2],['Obrera',19.407,-99.139,1],['Centro',19.432,-99.134,1],['San Rafael',19.439,-99.163,0],['Santa María la Ribera',19.448,-99.156,3],['Tabacalera',19.436,-99.154,3],['Escandón',19.4,-99.182,3],['Del Valle Norte',19.391,-99.164,0],['Buenos Aires',19.402,-99.144,3],['Tránsito',19.419,-99.129,3]];
const mty=[['Centro',25.671,-100.31],['Obispado',25.677,-100.346],['Mitras Centro',25.702,-100.353],['Roma',25.645,-100.3],['Del Valle',25.653,-100.371]];
function toZones(rows,city,offset){return rows.map(([name,lat,lng,state=3],i)=>({id:offset+i,name,city,lat,lng,state}))}
export const zones=[...toZones(cdmx,'cdmx',0),...gdlColonias,...toZones(mty,'mty',200),...municipalities.map(m=>({id:1000000+Number(m.code),name:m.name,city:'mx-'+m.code,municipality:m.name,region:m.state,lat:m.lat,lng:m.lng,municipal:true}))];
export const labels=['Clara','Alterada','Muy alterada','Sin aportes','No evaluable'];
export const colors=['#8cddc3','#e9cc7c','#dc9489','#777b80','#b5a1d5'];
const cdmxReports=zones.filter(z=>z.city==='cdmx').flatMap(z=>z.state===3?[]:Array.from({length:3+z.id%4},(_,i)=>({id:`demo-${z.id}-${i}`,zone:z.id,state:i===0?z.state:(z.state+i)%3,date:`2026-10-${String(28-i*3).padStart(2,'0')}T${String(10+i).padStart(2,'0')}:00:00-06:00`,note:['Sin cambios al dejar reposar.','Muestra tomada directamente de la llave.','Se observan pequeñas partículas.'][i%3],demo:true,source:'Llave de cocina'})));

// Reused user-supplied images are explicit UI fixtures, never lab data or AI results.
const imageStates=[1,2,2,2,0,0,2,0,2,0,1,2,0,0,0,1,1,2,0,2,4,2,2,1,2];
const latestImages=[6,1,9,16,13,21,15];
export const gdlDemoReports=Array.from({length:7},(_,zoneIndex)=>Array.from({length:60},(_,i)=>{
  const imageNumber=i===0?latestImages[zoneIndex]:((i+zoneIndex*7)%25)+1;
  const state=imageStates[imageNumber-1],zone=zoneIndex===1?100:100+zoneIndex;
  const datePart=new Date(Date.UTC(2026,9,28)-Math.floor(i/2)*86400000).toISOString().slice(0,10);
  const hour=String(9+(i%2)*7).padStart(2,'0'),minute=String((i*7+zoneIndex*3)%60).padStart(2,'0');
  return {id:`demo-gdl-v2-${100+zoneIndex}-${i}`,zone,state,date:`${datePart}T${hour}:${minute}:00-06:00`,note:`Escenario ficticio de apariencia ${labels[state].toLowerCase()}. Imagen reutilizada para probar el histórico; no corresponde a una muestra tomada en esta colonia.`,demo:true,source:'Escenario de prueba',photo:`/demo/user/agua-${String(imageNumber).padStart(2,'0')}.jpeg`,photoCredit:'Imagen proporcionada para la demo',photoSource:'/demo/user/SOURCES.md'};
})).flat();
export const initialReports=[...gdlDemoReports];

// Lafayette belongs to Americana in this source. Keep prior stored reports accessible.
export const canonicalReport=r=>r.zone===101?{...r,zone:100}:r;
export const normalizeSearch=value=>value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
export const matchesColonia=(zone,query)=>normalizeSearch(`${zone.name} ${zone.municipality||''}`).includes(normalizeSearch(query.trim()));
