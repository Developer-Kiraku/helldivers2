import {createContext,useContext,useEffect,useMemo,useState} from 'react';
const RouteContext=createContext(null);
const current=()=>location.hash.startsWith('#/')?decodeURI(location.hash.slice(1)):'/';
export function PreviewRouter({children}){
 const [pathname,setPathname]=useState(current);
 useEffect(()=>{const changed=()=>{setPathname(current());window.scrollTo(0,0)};window.addEventListener('hashchange',changed);return()=>window.removeEventListener('hashchange',changed)},[]);
 const router=useMemo(()=>({push:path=>{location.hash=path},replace:path=>{history.replaceState(null,'',`#${path}`);setPathname(path)},refresh:()=>{}}),[]);
 return <RouteContext.Provider value={{pathname,router}}>{children}</RouteContext.Provider>;
}
export const usePathname=()=>useContext(RouteContext).pathname;
export const useRouter=()=>useContext(RouteContext).router;
export default function Link({href,children,prefetch,replace,scroll,...props}){return <a href={typeof href==='string'&&href.startsWith('/')?`#${href}`:href} {...props}>{children}</a>}
