import React,{useRef} from 'react';
// Same continuous object / 380ms transition used by Sobre's SlidingPill.
export default function SlidingPill({index,count=3}){const last=useRef(0),hidden=index<0||index>=count;if(!hidden)last.current=index;const position=Math.min(Math.max(hidden?last.current:index,0),count-1);return <span aria-hidden="true" className="sliding-nav-pill" style={{width:`${100/count}%`,transform:`translateX(${position*100}%)`,opacity:hidden?0:1}}/>}
