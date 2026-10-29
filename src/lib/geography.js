import {cities} from '../data.js';
function inRing([x,y],ring){let inside=false;for(let i=0,j=ring.length-1;i<ring.length;j=i++){const[a,b]=ring[i],[c,d]=ring[j];if((b>y)!==(d>y)&&x<(c-a)*(y-b)/(d-b)+a)inside=!inside}return inside}
function inPolygon(point,rings){return rings.length>0&&inRing(point,rings[0])&&!rings.slice(1).some(r=>inRing(point,r))}
export function stateAt(lat,lng,collection){if(!Number.isFinite(lat)||!Number.isFinite(lng))return null;return collection.features.find(f=>{const g=f.geometry;if(!g)return false;return g.type==='Polygon'?inPolygon([lng,lat],g.coordinates):g.type==='MultiPolygon'?g.coordinates.some(p=>inPolygon([lng,lat],p)):false})?.properties||null}
export function coveredCity(state){const name=(state?.shapeName||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();const id={'jalisco':'gdl','distrito federal':'cdmx','ciudad de mexico':'cdmx','nuevo leon':'mty'}[name];return cities.find(c=>c.id===id)||null}
