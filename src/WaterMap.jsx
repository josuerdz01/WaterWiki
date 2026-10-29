import layerCatalog from './map-layers.json' with {type:'json'};
import React,{useEffect,useRef,useState} from 'react';
import {MapPin,RotateCw} from 'lucide-react';
import {getMapsConfig,loadGoogleMaps,mapStyles} from './lib/googleMaps';
import {colors,labels,matchesColonia} from './data';

const geometryCache=new globalThis.Map();
const geometry=id=>{if(!geometryCache.has(id))geometryCache.set(id,fetch(`/data/colonias-${id}.geojson`).then(r=>{if(!r.ok)throw Error('No se pudo cargar la capa de colonias');return r.json()}).catch(error=>{geometryCache.delete(id);throw error}));return geometryCache.get(id)};
export default function WaterMap({city,zones,reports,selected,onSelect,filter,search,municipality='all',theme,palette=colors}){
  const canvas=useRef(null),map=useRef(null),layerRef=useRef(null),pointsRef=useRef([]),layersRef=useRef([]),preserveCamera=useRef(false),view=useRef(null);const index=new globalThis.Map();for(const r of reports){if(!index.has(r.zone))index.set(r.zone,[]);index.get(r.zone).push(r)}for(const rows of index.values())rows.sort((a,b)=>Date.parse(b.date)-Date.parse(a.date));const zoneIndex=new globalThis.Map(zones.map(z=>[z.id,z]));view.current={city,zones,selected,onSelect,filter,search,municipality,palette,index,zoneIndex};
  const [status,setStatus]=useState('loading'),[attempt,retry]=useState(0),[ready,setReady]=useState(0),[layerError,setLayerError]=useState(false),[coverage,setCoverage]=useState('');
  useEffect(()=>{let alive=true;const oldAuthFailure=window.gm_authFailure;
    window.gm_authFailure=()=>{if(alive)setStatus('error');oldAuthFailure?.()};
    setStatus('loading');
    getMapsConfig().then(async config=>{
      if(!alive)return;
      if(!config.apiKey){setStatus('unconfigured');return}
      await loadGoogleMaps(config.apiKey);if(!alive)return;
      map.current=new window.google.maps.Map(canvas.current,{center:city.center,zoom:city.zoom,styles:theme==='light'?[]:mapStyles,mapTypeControl:false,streetViewControl:false,fullscreenControl:true,zoomControl:true,gestureHandling:matchMedia('(max-width:700px), (pointer:coarse)').matches?'greedy':'cooperative',backgroundColor:'#202421'});
      setStatus('ready');setReady(n=>n+1);
    }).catch(()=>{if(alive)setStatus('error')});
    return()=>{alive=false;window.gm_authFailure=oldAuthFailure;if(map.current)window.google?.maps.event.clearInstanceListeners(map.current);map.current=null};
  },[attempt]);
  useEffect(()=>{map.current?.setOptions({styles:theme==='light'?[]:mapStyles})},[theme,ready]);
  useEffect(()=>{const el=canvas.current;if(!el)return;const stop=e=>{if(e.type.startsWith('gesture')||e.touches?.length>1)e.preventDefault()};for(const name of ['gesturestart','gesturechange','touchstart','touchmove'])el.addEventListener(name,stop,{passive:false});return()=>{for(const name of ['gesturestart','gesturechange','touchstart','touchmove'])el.removeEventListener(name,stop)}},[]);
  useEffect(()=>{const media=matchMedia('(max-width:700px), (pointer:coarse)'),update=()=>map.current?.setOptions({gestureHandling:media.matches?'greedy':'cooperative'});update();media.addEventListener('change',update);return()=>media.removeEventListener('change',update)},[ready]);
  useEffect(()=>{if(!map.current)return;if(preserveCamera.current){preserveCamera.current=false;return}map.current.setCenter(city.center);map.current.setZoom(city.zoom);if(city.bounds){const [west,south,east,north]=city.bounds;map.current.fitBounds({west,south,east,north},30)}},[city,ready]);
  useEffect(()=>{if(!map.current)return;let cancelled=false;const api=window.google.maps,overlays=[],listeners=[];
    setLayerError(false);
    const latest=id=>view.current.index.get(id)||[];
    const matches=z=>{const v=view.current;return (v.filter==='all'||(latest(z.id)[0]?.state??3)===v.filter)&&matchesColonia(z,v.search)};
    const open=zone=>{if(zone.city!==view.current.city.id)preserveCamera.current=true;view.current.onSelect(zone.id)};
    const style=feature=>{const v=view.current,z=v.zoneIndex.get(Number(feature.getProperty('zoneId')));if(!z||!matches(z))return {visible:false};const st=latest(z.id)[0]?.state??3,active=v.selected===z.id;return {visible:true,fillColor:v.palette[st],fillOpacity:active?.45:st===3?.07:.38,strokeColor:active?v.palette[st]:st===3?'#8c9096':v.palette[st],strokeOpacity:active?1:.55,strokeWeight:active?2:.65,zIndex:active?3:1}};
    const loaded=new globalThis.Map(),pending=new Set();
    const inside=(bounds,z)=>bounds.contains({lat:z.lat,lng:z.lng});
    function refreshPoints(){const bounds=map.current?.getBounds();if(!bounds)return;overlays.splice(0).forEach(o=>o.setMap(null));const v=view.current;
      for(const z of v.zones.filter(z=>z.city!=='gdl'&&latest(z.id).length&&inside(bounds,z)&&matches(z)).slice(0,300)){const st=latest(z.id)[0]?.state??3;const circle=new api.Circle({map:map.current,center:{lat:z.lat,lng:z.lng},radius:z.municipal?350:95,fillColor:v.palette[st],fillOpacity:.45,strokeColor:v.palette[st],strokeWeight:1,clickable:true});circle.__zone=z;overlays.push(circle);circle.addListener('click',()=>open(z,{lat:z.lat,lng:z.lng}))}pointsRef.current=overlays;
    }
    function updateCoverage(){const bounds=map.current?.getBounds();if(!bounds)return;const sw=bounds.getSouthWest(),ne=bounds.getNorthEast();const active=layerCatalog.filter(l=>{const[w,s,e,n]=l.bounds;return ne.lat()>=s&&sw.lat()<=n&&(sw.lng()<=ne.lng()?ne.lng()>=w&&sw.lng()<=e:ne.lng()>=w||sw.lng()<=e)});setCoverage(active.length?'Límites de colonias disponibles · INEGI / IIEG':'Sin límites de colonias disponibles en esta zona');
      for(const entry of active){if(loaded.has(entry.id)||pending.has(entry.id))continue;pending.add(entry.id);geometry(entry.id).then(geo=>{if(cancelled)return;const layer=new api.Data({map:map.current});layer.addGeoJson(geo);layer.setStyle(style);layer.__claraStyle=style;loaded.set(entry.id,layer);layersRef.current=[...loaded.values()];listeners.push(layer.addListener('click',event=>{const z=view.current.zoneIndex.get(Number(event.feature.getProperty('zoneId')));if(z)open(z,event.latLng)}));setLayerError(false)}).catch(()=>{if(!cancelled)setLayerError(true)}).finally(()=>pending.delete(entry.id))}refreshPoints();
    }
    listeners.push(map.current.addListener('idle',updateCoverage));updateCoverage();layerRef.current={refresh:refreshPoints};
    return()=>{cancelled=true;listeners.forEach(l=>l.remove());overlays.forEach(o=>o.setMap(null));loaded.forEach(layer=>layer.setMap(null));pointsRef.current=[];layersRef.current=[];layerRef.current=null};
  },[ready]);
  useEffect(()=>{for(const layer of layersRef.current)layer.setStyle(layer.__claraStyle);layerRef.current?.refresh()},[reports,selected,filter,search,municipality,theme,palette,ready]);
  useEffect(()=>{if(map.current&&!city.municipalityCode)map.current.setZoom(Math.max(14,map.current.getZoom()||11))},[selected]);
  useEffect(()=>{if(!map.current||municipality==='all')return;const bounds=new window.google.maps.LatLngBounds();zones.filter(z=>z.municipality===municipality).forEach(z=>bounds.extend({lat:z.lat,lng:z.lng}));if(!bounds.isEmpty())map.current.fitBounds(bounds,35)},[municipality,ready]);
  useEffect(()=>{const z=zones.find(z=>z.id===selected);if(z&&map.current)map.current.panTo({lat:z.lat,lng:z.lng})},[selected,ready]);
  return <div className="google-map-shell"><div className="google-map-canvas" ref={canvas} aria-label={`Mapa de ${city.name}`}/>{status!=='ready'&&<div className="map-unavailable" role="status"><MapPin size={26}/><h3>{status==='loading'?'Cargando mapa…':'Mapa no disponible'}</h3><p>{status==='loading'?city.name:'Puedes consultar las colonias y registrar aportes en la lista.'}</p>{status==='error'&&<button className="outline" onClick={()=>retry(n=>n+1)}><RotateCw size={14}/>Volver a intentar</button>}</div>}</div>
}
