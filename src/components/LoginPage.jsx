'use client';
import {Button,Input,Label} from './ui';

import Link from 'next/link';
import { useEffect,useState } from 'react';
import AuthLayout,{KakaoButton} from './AuthLayout';
import PolicyDialog from './PolicyDialog';
import {useCommunity} from './CommunityProvider';
export default function LoginPage(){
 const {login}=useCommunity();const [policy,setPolicy]=useState(null),[loginId,setLoginId]=useState(''),[password,setPassword]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState(''),[demo,setDemo]=useState(false);
 useEffect(()=>{fetch('/api/auth/me',{cache:'no-store'}).then(r=>r.json()).then(data=>setDemo(data.demoAuthEnabled)).catch(()=>{});const code=new URLSearchParams(location.search).get('error');const messages={'kakao-not-configured':'카카오 로그인 키와 콜백 주소를 먼저 설정해주세요.','kakao-invalid-state':'카카오 인증이 만료되었습니다. 다시 로그인해주세요.','kakao-auth-failed':'카카오 인증에 실패했습니다. 다시 시도해주세요.','account-blocked':'이용이 제한된 계정입니다.'};if(code)setError(messages[code]||'로그인 정보를 확인해주세요.')},[]);
 async function submit(event){event.preventDefault();setBusy(true);setError('');try{await login(loginId,password)}catch(error){setError(error.message)}finally{setBusy(false)}}
 return <><AuthLayout><div className="eyebrow">WELCOME, HELLDIVER</div><h1>퇴근 후,<br/>작전실에서 만나요.</h1><p className="auth-intro">로그인하고 동료들의 이야기와 공략을 만나보세요.</p><KakaoButton onClick={()=>location.assign('/api/auth/kakao')}>카카오로 로그인</KakaoButton>{demo&&<form onSubmit={submit} className="temporary-login"><h2>임시 계정 로그인</h2><Label htmlFor="login-id">아이디</Label><Input id="login-id" autoComplete="username" value={loginId} onChange={event=>setLoginId(event.target.value)} required/><Label htmlFor="login-password">비밀번호</Label><Input id="login-password" type="password" autoComplete="current-password" value={password} onChange={event=>setPassword(event.target.value)} required/><Button className="button primary full-width" disabled={busy}>{busy?'로그인 중…':'로그인'}</Button><details className="demo-accounts"><summary>테스트 계정 보기</summary><p>공통 비밀번호: 1234</p><ul><li>admin · 라미아 · 운영자</li><li>subadmin · 부운영자</li><li>user1 · 헬다이버 · 일반회원</li><li>user2 · 견습헬다이버 · 견습회원</li></ul></details></form>}<p className="form-error" role="alert">{error}</p><div className="auth-switch"><span>처음 오셨나요?</span><Link href="/signup">카카오로 회원가입 →</Link></div><p className="auth-legal"><Button onClick={()=>setPolicy('terms')}>이용약관</Button> · <Button onClick={()=>setPolicy('privacy')}>개인정보 처리방침</Button></p></AuthLayout>{policy&&<PolicyDialog name={policy} onClose={()=>setPolicy(null)}/>}</>;
}
