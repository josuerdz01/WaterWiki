import {useEffect,useState} from 'react';
// WebSocket is preferred; HTTP keeps reports fresh when a proxy or network drops it.
export function useReportSync(onReports){const[status,S]=useState('connecting');useEffect(()=>{let closed=false,ws,retry,ping,watchdog,httpTimer,controller,attempt=0,last=0,httpBusy=false;const timeouts=new Set();
function later(fn,ms){const t=setTimeout(()=>{timeouts.delete(t);fn()},ms);timeouts.add(t);return t}
async function refresh(){if(closed||httpBusy)return;httpBusy=true;controller=new AbortController();const timeout=setTimeout(()=>controller.abort(),12000);try{const r=await fetch('/api/reports',{cache:'no-store',signal:controller.signal});if(!r.ok)throw Error();const data=await r.json();if(!Array.isArray(data))throw Error();if(!closed){onReports(data);if(!ws||ws.readyState!==1||!last)S('polling')}}catch{if(!closed&&(!ws||ws.readyState!==1||!last))S('offline')}finally{clearTimeout(timeout);httpBusy=false}}
function fallback(){if(closed)return;if(!httpTimer){refresh();httpTimer=setInterval(refresh,15000)}}
function stopFallback(){clearInterval(httpTimer);httpTimer=null}
function connect(){if(closed)return;last=0;try{ws=new WebSocket(`${location.protocol==='https:'?'wss':'ws'}://${location.host}/live`)}catch{fallback();retry=later(connect,10000);return}const socket=ws;
watchdog=later(()=>{if(ws===socket&&!last){fallback();socket.close()}},8000);
socket.onopen=()=>{if(closed)return;ping=setInterval(()=>{if(socket.readyState===1){if(last&&Date.now()-last>20000){fallback();socket.close();return}socket.send('sync')}},5000)};
socket.onmessage=e=>{if(closed||ws!==socket)return;try{const data=JSON.parse(e.data);if(!Array.isArray(data))throw Error();onReports(data);last=Date.now();attempt=0;S('live');stopFallback();clearTimeout(watchdog)}catch{fallback()}};
socket.onerror=()=>{if(!closed)fallback()};socket.onclose=()=>{if(ws!==socket)return;clearInterval(ping);clearTimeout(watchdog);if(closed)return;fallback();retry=later(connect,Math.min(30000,2000*2**Math.min(attempt++,4)))};
}
const online=()=>{refresh();if(!ws||ws.readyState>1){clearTimeout(retry);connect()}};const visible=()=>{if(document.visibilityState==='visible')online()};window.addEventListener('online',online);document.addEventListener('visibilitychange',visible);refresh();connect();return()=>{closed=true;timeouts.forEach(clearTimeout);clearInterval(ping);stopFallback();controller?.abort();ws?.close();window.removeEventListener('online',online);document.removeEventListener('visibilitychange',visible)}},[onReports]);return status}
