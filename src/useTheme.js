import {useEffect} from 'react';
export function useTheme(){useEffect(()=>{document.documentElement.dataset.theme='light';document.querySelector('meta[name="theme-color"]')?.setAttribute('content','#f2f2f7')},[]);return {theme:'light',colors:['#077a46','#7a4b00','#d92d3e','#62606f','#9333ea']}}
