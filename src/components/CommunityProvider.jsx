'use client';

import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
const CommunityContext=createContext(null);
const emptyPosts={notice:[],guide:[],talk:[]};

export function CommunityProvider({children,initialUser=null}){
 const [user,setUser]=useState(initialUser),[posts,setPosts]=useState(emptyPosts),[stats,setStats]=useState({totalMembers:0,onlineMembers:0}),[ready,setReady]=useState(false),[toast,setToast]=useState('');
 const router=useRouter(),pathname=usePathname(),timer=useRef(null);
 const notify=useCallback(message=>{clearTimeout(timer.current);setToast(message);timer.current=setTimeout(()=>setToast(''),3500)},[]);
 const api=useCallback(async(path,options={})=>{
  const response=await fetch(`/api/${path}`,{...options,cache:'no-store',headers:{'Content-Type':'application/json',...options.headers},body:options.body===undefined?undefined:JSON.stringify(options.body)});
  const data=await response.json();if(!response.ok){if(response.status===401&&!path.startsWith('auth/')){setUser(null);setPosts(emptyPosts);router.replace('/login');router.refresh()}throw new Error(data.error||'요청을 처리하지 못했습니다.')}return data;
 },[router]);
 const refresh=useCallback(async()=>{
  try{const response=await fetch('/api/bootstrap',{cache:'no-store'});if(response.status===401){setUser(null);setPosts(emptyPosts);return}const data=await response.json();if(!response.ok)throw new Error(data.error);setUser(data.user);setPosts(data.posts);setStats(data.stats);}catch(error){notify(error.message||'데이터를 불러오지 못했습니다.')}finally{setReady(true)}
 },[notify]);
 useEffect(()=>{refresh()},[refresh,pathname]);
 useEffect(()=>()=>clearTimeout(timer.current),[]);
 async function login(loginId,password){await api('auth/login',{method:'POST',body:{loginId,password}});await refresh();router.replace('/');router.refresh()}
 async function logout(){try{await api('auth/logout',{method:'POST'});setUser(null);setPosts(emptyPosts);router.replace('/login');router.refresh()}catch(error){notify(error.message)}}
 async function updateProfile(changes){const data=await api('profile',{method:'PATCH',body:changes});setUser(data.user);await refresh();return data.user}
 async function addPost(board,draft){const data=await api('posts',{method:'POST',body:{...draft,board}});await refresh();return data.post.id}
 const signedIn=Boolean(user),role=user?.role||null,profile=user?{nickname:user.nickname,photo:user.photo}:{nickname:'',photo:''};
 return <CommunityContext.Provider value={{user,signedIn,role,profile,posts,stats,ready,notify,api,refresh,login,logout,updateProfile,addPost,canWriteNotice:signedIn&&['operator','deputy'].includes(role)}}>{children}{toast&&<div className="toast" role="status">{toast}</div>}</CommunityContext.Provider>;
}
export function useCommunity(){const context=useContext(CommunityContext);if(!context)throw Error('CommunityProvider is required');return context;}
