import {cities,zones,labels,normalizeSearch,canonicalReport} from '../src/data.js';
const day=v=>new Intl.DateTimeFormat('en-CA',{timeZone:'America/Mexico_City'}).format(new Date(v));
// Calculate city totals once; only send matching catalog rows and populated histories.
// Empty polygons never become invented observations in the model context.
export function chatContext({city:cityId,date,selected,question,records}){
 const city=cities.find(c=>c.id===cityId),catalog=zones.filter(z=>z.city===cityId),ids=new Set(catalog.map(z=>z.id)),index=new Map();
 for(const raw of records){const r=canonicalReport(raw);if(ids.has(r.zone)&&day(r.date)<=date){if(!index.has(r.zone))index.set(r.zone,[]);index.get(r.zone).push(r)}}
 const municipalities=[...new Set(catalog.map(z=>z.municipality||city.name))].map(m=>{const rows=catalog.filter(z=>(z.municipality||city.name)===m);return {municipio:m,colonias:rows.length,conAportes:rows.filter(z=>index.has(z.id)).length,muestras:rows.reduce((n,z)=>n+(index.get(z.id)?.length||0),0)}});
 const query=normalizeSearch(question),matches=catalog.filter(z=>query.includes(normalizeSearch(z.name))||z.municipality&&query.includes(normalizeSearch(z.municipality)));
 const choice=catalog.find(z=>z.id===selected);const detailed=catalog.filter(z=>index.has(z.id)||z.id===selected);
 return {ciudad:city.name,hasta:date,seleccion:choice?{colonia:choice.name,municipio:choice.municipality}:null,cobertura:{totalColonias:catalog.length,conAportes:index.size,sinAportes:catalog.length-index.size,municipios:municipalities,fuente:cityId==='gdl'?'IIEG · INE 2024 · 9 municipios IMEPLAN':'Catálogo piloto'},busquedaCatalogo:{coincidencias:matches.length,limite:40,resultados:matches.slice(0,40).map(z=>({colonia:z.name,municipio:z.municipality,total:index.get(z.id)?.length||0})),nota:'La búsqueda muestra hasta 40 coincidencias. El catálogo completo se consulta en el mapa.'},colonias:detailed.map(z=>{const rs=(index.get(z.id)||[]).sort((a,b)=>Date.parse(b.date)-Date.parse(a.date));return {id:z.id,colonia:z.name,municipio:z.municipality,total:rs.length,demo:rs.filter(r=>r.demo).length,distribucion:labels.flatMap((estado,i)=>i===3?[]:[{estado,total:rs.filter(r=>r.state===i).length}]),muestras:rs.slice(0,10).map(r=>({fecha:day(r.date),apariencia:labels[r.state],demo:!!r.demo}))}})};
}
