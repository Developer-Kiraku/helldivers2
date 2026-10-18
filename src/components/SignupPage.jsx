'use client';
import {Button,Input,Label} from './ui';

import Link from 'next/link';
import {useEffect,useState} from 'react';
import {useRouter} from 'next/navigation';
import AuthLayout,{KakaoButton} from './AuthLayout';
import PolicyDialog from './PolicyDialog';
import PageSkeleton from './PageSkeleton';
import {useCommunity} from './CommunityProvider';
import {nicknamePattern,nicknameFormatMessage,nicknameTakenMessage} from '@/lib/nicknames';
export default function SignupPage(){
 const [loading,setLoading]=useState(true);
 const {api,refresh,notify}=useCommunity(),router=useRouter();
 const [verified,setVerified]=useState(false),[nickname,setNickname]=useState(''),[agreements,setAgreements]=useState({age:false,terms:false,collect:false}),[policy,setPolicy]=useState(null),[error,setError]=useState(''),[busy,setBusy]=useState(false);
 useEffect(()=>{fetch('/api/auth/signup-info',{cache:'no-store'}).then(r=>r.json()).then(data=>setVerified(data.verified)).catch(()=>setError('카카오 인증 상태를 확인하지 못했습니다.')).finally(()=>setLoading(false))},[]);
 const [nicknameCheck,setNicknameCheck]=useState({nickname:'',status:'idle',message:''}),[retry,setRetry]=useState(0),[composing,setComposing]=useState(false);
 const normalizedNickname=nickname.trim();
 const validNickname=nicknamePattern.test(normalizedNickname);
 const checked=nicknameCheck.nickname===normalizedNickname;
 const canJoin=validNickname&&!composing&&checked&&nicknameCheck.status==='available';
 const nicknameStatus=!normalizedNickname||composing?'idle':!validNickname?'invalid':checked?nicknameCheck.status:'checking';
 const nicknameMessage=nicknameStatus==='idle'?'':nicknameStatus==='invalid'?nicknameFormatMessage:nicknameStatus==='checking'?'닉네임 중복을 확인하고 있습니다…':nicknameCheck.message;
 useEffect(()=>{
  if(!verified||!validNickname||composing)return;
  const controller=new AbortController();let active=true;
  setNicknameCheck({nickname:normalizedNickname,status:'checking',message:'닉네임 중복을 확인하고 있습니다…'});
  const timer=setTimeout(async()=>{
   try{
    const response=await fetch('/api/auth/nickname-check',{method:'POST',cache:'no-store',signal:controller.signal,headers:{'Content-Type':'application/json'},body:JSON.stringify({nickname:normalizedNickname})});
    const data=await response.json();if(!response.ok)throw Error(data.error||'닉네임을 확인하지 못했습니다.');
    if(active)setNicknameCheck({nickname:normalizedNickname,status:data.available===true&&data.nickname===normalizedNickname?'available':'taken',message:data.message||'닉네임을 다시 확인해주세요.'});
   }catch(error){if(active&&error.name!=='AbortError')setNicknameCheck({nickname:normalizedNickname,status:'error',message:error.message||'닉네임을 확인하지 못했습니다. 다시 시도해주세요.'});}
  },350);
  return()=>{active=false;clearTimeout(timer);controller.abort()};
 },[verified,normalizedNickname,validNickname,retry,composing]);
 const all=Object.values(agreements).every(Boolean);
 async function join(event){event.preventDefault();if(busy)return;if(!canJoin){setError('사용 가능한 닉네임인지 먼저 확인해주세요.');return}if(!all){setError('필수 동의 항목을 모두 확인해주세요.');return}setError('');setBusy(true);try{await api('auth/register',{method:'POST',body:{nickname:normalizedNickname,agreements}});await refresh();notify('가입이 완료되었습니다. 환영합니다!');router.replace('/');router.refresh()}catch(error){setError(error.message);if(error.message===nicknameTakenMessage)setNicknameCheck({nickname:normalizedNickname,status:'taken',message:error.message})}finally{setBusy(false)}}
 if(loading)return <PageSkeleton path="/signup"/>;
 return <><AuthLayout signup><ol className="signup-progress"><li className={!verified?'active':''}>01 카카오 인증</li><li className={verified?'active':''}>02 가입 정보</li><li>03 완료</li></ol><p className="field-hint">가입 후 한 달 동안 견습회원으로 활동합니다. 운영자·부운영자의 승인을 받으면 일반회원으로 전환되며, 기한 내 미승인 시 자동 탈퇴됩니다.</p>{!verified?<><p className="auth-kicker">카카오계정 하나면 충분해요</p><h1>함께 강하할 준비,<br/>되셨나요?</h1><p className="auth-intro">카카오 인증 후 닉네임과 필수 약관을 확인합니다.</p><KakaoButton onClick={()=>location.assign('/api/auth/kakao')}>카카오로 시작하기</KakaoButton><p className="field-hint">카카오 인증을 완료한 계정만 가입할 수 있습니다.<br/>카카오 비밀번호는 이 사이트에서 받지 않습니다.</p><Link className="auth-profile-link" href="/login">이미 회원이신가요? 로그인 →</Link></>:<><p className="auth-kicker">● 카카오 인증 완료</p><h1>작전실에서 사용할<br/>이름을 알려주세요.</h1><p className="auth-intro">프로필 사진은 가입 후 선택해서 등록할 수 있어요.</p><form onSubmit={join}><div className="field"><Label htmlFor="signup-name">닉네임 <span>필수</span></Label><Input id="signup-name" value={nickname} onChange={e=>{setNickname(e.target.value);if(e.target.value.trim()!==normalizedNickname)setNicknameCheck({nickname:'',status:'idle',message:''});setError('')}} onCompositionStart={()=>{setComposing(true);setNicknameCheck({nickname:'',status:'idle',message:''})}} onCompositionEnd={()=>setComposing(false)} disabled={busy} aria-describedby="nickname-format nickname-status" aria-invalid={['invalid','taken'].includes(nicknameStatus)} maxLength={16} placeholder="닉네임을 입력해주세요" required/><p className="field-hint" id="nickname-format">2~16자 · 한글, 영문, 숫자, 밑줄</p><p id="nickname-status" className={`nickname-status ${nicknameStatus}`} role="status" aria-live="polite" aria-atomic="true">{nicknameMessage}</p>{nicknameStatus==='error'&&<Button type="button" className="text-link" onClick={()=>setRetry(current=>current+1)}>중복 확인 다시 시도</Button>}</div><div className="agreement-list"><Label className="checkbox-label all-agreements"><Input type="checkbox" checked={all} onChange={e=>setAgreements({age:e.target.checked,terms:e.target.checked,collect:e.target.checked})}/><strong>필수 항목 모두 확인·동의</strong></Label><div className="agreement-row"><Label className="checkbox-label"><Input type="checkbox" checked={agreements.age} onChange={e=>setAgreements(current=>({...current,age:e.target.checked}))}/><span>[필수] 만 14세 이상입니다</span></Label></div>{[['terms','서비스 이용약관 동의'],['collect','개인정보 수집·이용 동의']].map(([name,label])=><div className="agreement-row" key={name}><Label className="checkbox-label"><Input type="checkbox" checked={agreements[name]} onChange={e=>setAgreements(current=>({...current,[name]:e.target.checked}))}/><span>[필수] {label}</span></Label><Button className="text-link" type="button" onClick={()=>setPolicy(name)}>보기 ↗</Button></div>)}</div><details className="privacy-summary"><summary>어떤 정보를 수집하나요?</summary><dl><dt>항목</dt><dd>카카오 회원 식별자, 등급, 닉네임, 가입·최근 로그인·동의 이력. 프로필 사진은 선택.</dd><dt>목적</dt><dd>회원 식별, 로그인, 커뮤니티 및 회원 관리</dd><dt>기간</dt><dd>회원 탈퇴 시까지. 별도 법정 보존은 근거·기간을 안내합니다.</dd><dt>거부권</dt><dd>동의를 거부할 수 있지만 필수 정보 처리에 동의하지 않으면 가입이 제한됩니다.</dd></dl></details><p className="field-hint"><Button className="text-link" type="button" onClick={()=>setPolicy('privacy')}>개인정보 처리방침</Button>을 확인해주세요.</p><p className="form-error" role="alert">{error}</p><Button className="button primary full-width" disabled={busy||!all||!canJoin}>{busy?'가입 중…':'동의하고 가입 완료 →'}</Button></form></>}{!verified&&<p className="form-error" role="alert">{error}</p>}</AuthLayout><div className="policy-links"><Button onClick={()=>setPolicy('terms')}>이용약관</Button><Button onClick={()=>setPolicy('privacy')}>개인정보 처리방침</Button></div>{policy&&<PolicyDialog name={policy} onClose={()=>setPolicy(null)}/>}</>;
}
