let pending;
export async function getMapsConfig(){
  let runtime={};
  try{const response=await fetch('/maps-config.json',{cache:'no-store'});if(response.ok)runtime=await response.json()}catch{}
  return {apiKey:import.meta.env.VITE_GOOGLE_MAPS_API_KEY?.trim()||runtime.apiKey?.trim()||''};
}
export function loadGoogleMaps(apiKey){
  if(window.google?.maps?.importLibrary)return window.google.maps.importLibrary('maps');
  if(pending)return pending;
  pending=new Promise((resolve,reject)=>{
    const script=document.createElement('script');let timer;
    const cleanup=()=>{clearTimeout(timer);delete window.__claraMapsReady};
    window.__claraMapsReady=async()=>{try{const library=await window.google.maps.importLibrary('maps');cleanup();resolve(library)}catch(error){cleanup();reject(error)}};
    const fail=()=>{cleanup();script.remove();pending=undefined;reject(new Error('No se pudo cargar Google Maps.'))};
    script.onerror=fail;
    const params=new URLSearchParams({key:apiKey,v:'quarterly',language:'es',region:'MX',loading:'async',callback:'__claraMapsReady'});
    script.src=`https://maps.googleapis.com/maps/api/js?${params}`;
    script.async=true;script.dataset.claraMaps='true';timer=setTimeout(fail,20000);document.head.append(script);
  });return pending;
}
export const mapStyles=[
  {elementType:'geometry',stylers:[{color:'#202421'}]},
  {elementType:'labels.text.stroke',stylers:[{color:'#202421'}]},
  {elementType:'labels.text.fill',stylers:[{color:'#9da89f'}]},
  {featureType:'road',elementType:'geometry',stylers:[{color:'#343a35'}]},
  {featureType:'road.highway',elementType:'geometry',stylers:[{color:'#4a5047'}]},
  {featureType:'poi',stylers:[{visibility:'off'}]},
  {featureType:'administrative',elementType:'geometry',stylers:[{color:'#596157'}]},
  {featureType:'transit',stylers:[{visibility:'off'}]},
  {featureType:'water',elementType:'geometry',stylers:[{color:'#182c2a'}]},
  {featureType:'landscape.natural',elementType:'geometry',stylers:[{color:'#29382c'}]},
];
