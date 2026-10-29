import React from 'react';import {MorphIcon} from 'morphicons/react';import{Sun,Moon,Monitor,ScanEye,Check,LoaderCircle,MessageCircle,X,Plus,Wifi,WifiOff}from'lucide';
const rawIcons={sun:Sun,moon:Moon,monitor:Monitor,scan:ScanEye,check:Check,loading:LoaderCircle,chat:MessageCircle,close:X,plus:Plus,online:Wifi,offline:WifiOff};
// Lucide 0.468 exports an SVG tuple; Morphicons consumes the child IconNodes.
const icons=Object.fromEntries(Object.entries(rawIcons).map(([key,value])=>[key,value[0]==='svg'?value[2]:value]));
export default function AnimatedIcon({name,size=18,className=''}){return <MorphIcon icon={icons[name]||icons.plus} size={size} strokeWidth={1.8} spring="smooth" reducedMotion="user" className={className}/>}
