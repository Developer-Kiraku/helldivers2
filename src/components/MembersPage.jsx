'use client';
import Nickname from './Nickname';
import {ActionLink,Button,Input,Label,Select,TextArea} from './ui';

import {useCallback,useEffect,useState} from 'react';
import {useCommunity} from './CommunityProvider';
import {roleLabels} from '@/lib/roles';
import Icon from './Icon';
import PageSkeleton from './PageSkeleton';
import Avatar from './Avatar';
import Modal from './Modal';
import Link from 'next/link';
const date=value=>value?new Date(value).toLocaleString('ko-KR',{timeZone:'Asia/Seoul'}):'-';
export default function MembersPage(){
 const {api,role,refresh,notify}=useCommunity();
 const [users,setUsers]=useState([]),[search,setSearch]=useState(''),[grade,setGrade]=useState('all'),[error,setError]=useState(''),[action,setAction]=useState(null),[reason,setReason]=useState(''),[busy,setBusy]=useState(false);
 const [loading,setLoading]=useState(true);
 const operator=role==='operator';
 const load=useCallback(async()=>{try{const data=await api('admin/users');setUsers(data.users);setError('')}catch(error){setError(error.message)}finally{setLoading(false)}},[api]);
 useEffect(()=>{load()},[load]);
 async function submit(event){
  event.preventDefault();setBusy(true);setError('');
  try{
   if(action.mode==='expel')await api(`admin/users/${action.user.id}/expel`,{method:'POST',body:{reason}});
   else await api('admin/requests',{method:'POST',body:{type:'user_expel',targetId:action.user.id,reason}});
   notify(action.mode==='expel'?'회원을 강퇴하고 세션을 종료했습니다.':'운영자에게 강퇴 요청을 보냈습니다.');
   setAction(null);await load();await refresh();
  }catch(error){setError(error.message)}finally{setBusy(false)}
 }
 async function changeRole(user,value){setBusy(true);try{await api(`admin/users/${user.id}`,{method:'PATCH',body:{role:value}});await load();await refresh();notify('회원 등급을 변경했습니다.')}catch(error){notify(error.message)}finally{setBusy(false)}}
 function openAction(mode,user){setAction({mode,user});setReason('');setError('')}
 const filtered=users.filter(user=>(grade==='all'||user.role===grade)&&`${user.nickname} ${user.loginId||''} ${roleLabels[user.role]}`.toLowerCase().includes(search.toLowerCase()));
 if(loading)return <PageSkeleton path="/admin/users"/>;
 return <section className="admin-page">
  <header className="page-heading"><div><div className="eyebrow">CREW MANAGEMENT</div><h1>회원 리스트</h1><p>{operator?'부운영자 이하 회원의 등급을 변경하거나 직접 강퇴할 수 있습니다.':'회원 정보를 조회하고 일반·견습회원의 강퇴를 운영자에게 요청할 수 있습니다.'}</p></div><span className="badge">{operator?'운영자 관리 화면':'부운영자 조회·요청 화면'}</span></header>
  <div className="member-management-note"><strong>{operator?'운영자 권한':'부운영자 권한'}</strong><span>{operator?'하위 등급 변경 · 직접 강퇴 · 가입 승인':'일반·견습회원 강퇴 요청 · 가입 승인'}</span><ActionLink className="button secondary" href="/admin/approvals"><Icon name="approvals" size={17}/>요청 승인 목록</ActionLink></div>
  <div className="board-toolbar"><span>전체 {users.length}명 · 검색 {filtered.length}명</span><Label>회원 등급 <Select aria-label="회원 등급 필터" value={grade} onChange={e=>setGrade(e.target.value)}><option value="all">전체</option>{Object.entries(roleLabels).map(([value,label])=><option key={value} value={value}>{label}</option>)}</Select></Label><Input className="admin-search" aria-label="회원 검색" placeholder="닉네임·아이디·등급 검색" value={search} onChange={e=>setSearch(e.target.value)}/></div>
  <p className="form-error" role="alert">{error}</p>
  <div className="member-cards">{filtered.map(user=><article className="panel member-card" key={user.id}>
   <header><Avatar name={user.nickname} photo={user.photo}/><div><h2><Nickname name={user.nickname} role={user.role}/></h2><span className="badge">{roleLabels[user.role]}</span> <span className={`status-label ${user.status}`}>{user.status==='active'?'활성':'강퇴'}</span></div></header>
   <dl className="member-info"><dt>아이디</dt><dd>{user.loginId||'카카오 계정'}</dd><dt>카카오 회원번호</dt><dd>{user.kakao?.id||'미연결'}</dd><dt>최근 로그인</dt><dd>{date(user.lastLoginAt)}</dd><dt>생성일</dt><dd>{date(user.createdAt)}</dd>{user.role==='apprentice'&&<><dt>승인 기한</dt><dd>{date(user.probationExpiresAt)}<br/>기한 내 미승인 시 자동 탈퇴</dd></>}{user.approvedAt&&<><dt>승인일</dt><dd>{date(user.approvedAt)}</dd></>}</dl>
   {user.canChangeRole&&<Label className="member-grade">회원 등급<Select aria-label={`${user.nickname} 회원 등급 변경`} value={user.role} disabled={busy} onChange={e=>changeRole(user,e.target.value)}>{['deputy','member','apprentice'].map(value=><option key={value} value={value}>{roleLabels[value]}</option>)}</Select></Label>}
   <footer>{user.canApprove&&<ActionLink className="button secondary" href="/admin/approvals"><Icon name="shield" size={17}/>가입 승인 목록</ActionLink>}{user.canExpel&&<Button className="button danger-outline" disabled={busy} onClick={()=>openAction('expel',user)}><Icon name="expel" size={17}/>직접 강퇴</Button>}{user.canRequestExpel&&<Button className="button secondary" disabled={busy} onClick={()=>openAction('request',user)}><Icon name="send" size={17}/>운영자에게 강퇴 요청</Button>}{!user.canApprove&&!user.canExpel&&!user.canRequestExpel&&<span className="member-readonly">조회 전용</span>}</footer>
  </article>)}</div>
  {!filtered.length&&<div className="empty-state">해당 회원이 없습니다.</div>}
  {action&&<Modal title={action.mode==='expel'?'회원 직접 강퇴':'회원 강퇴 요청'} onClose={()=>setAction(null)}><form onSubmit={submit}><p><strong><Nickname name={action.user.nickname} role={action.user.role}/></strong> · {roleLabels[action.user.role]}</p><Label htmlFor="expel-reason">사유</Label><TextArea id="expel-reason" value={reason} onChange={e=>setReason(e.target.value)} required minLength={2} maxLength={1000}/><p className="field-hint">{action.mode==='expel'?'강퇴 즉시 해당 회원의 모든 로그인 세션이 종료됩니다.':'운영자가 요청 승인 목록에서 승인한 뒤 강퇴가 적용됩니다.'}</p><p className="form-error" role="alert">{error}</p><div className="form-actions"><Button type="button" className="button secondary" onClick={()=>setAction(null)}>취소</Button><Button className="button primary" disabled={busy}>{busy?'처리 중…':action.mode==='expel'?'강퇴하기':'요청 보내기'}</Button></div></form></Modal>}
 </section>;
}
