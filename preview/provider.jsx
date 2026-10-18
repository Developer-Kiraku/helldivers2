import {createContext,useCallback,useContext,useMemo,useRef,useState} from 'react';
import {posts as examples} from '../src/lib/data';
import {isStaff,outranks} from '../src/lib/roles';
import {useRouter} from './router';
import {approvalList} from '../src/lib/approvals';
const Context=createContext(null);
const createdAt='2026-10-18T00:00:00.000Z';
export const accounts=[['admin','operator','라미아'],['subadmin','deputy','부운영자'],['user1','member','헬다이버'],['user2','apprentice','견습헬다이버']].map(([loginId,role,nickname])=>({id:`u-${loginId}`,loginId,role,nickname,photo:'',kakao:null,provider:'temporary',status:'active',createdAt,lastLoginAt:createdAt,probationStartedAt:role==='apprentice'?createdAt:null,probationExpiresAt:role==='apprentice'?'2026-11-18T00:00:00.000Z':null,approvedAt:null,approvedBy:null}));
const blocked=()=>{throw Error('화면 확인용 미리보기입니다. 변경사항은 저장되지 않습니다.')};
export function PreviewProvider({children}){
 const router=useRouter();
 const [account,setAccount]=useState(()=>{try{return /^#\/(login|signup)/.test(location.hash)?'guest':sessionStorage.getItem('hd-pages-account')||'admin'}catch{return 'admin'}}),[toast,setToast]=useState('');const timer=useRef(null);
 const user=accounts.find(item=>item.loginId===account)||null;
 const notify=useCallback(message=>{clearTimeout(timer.current);setToast(message);timer.current=setTimeout(()=>setToast(''),4000)},[]);
 function chooseAccount(loginId){setAccount(loginId||'guest');try{sessionStorage.setItem('hd-pages-account',loginId||'guest')}catch{}}
 const posts=useMemo(()=>Object.fromEntries(Object.entries(examples).map(([board,items])=>[board,items.map((item,index)=>{
  const author=accounts[board==='notice'?index%2:([2,1,2,3,2][index])];
  return {...item,id:`${board}-${item.id}`,board,author:author.nickname,authorId:author.id,authorRole:author.role,authorPhoto:'',own:user?.id===author.id,bodyHtml:'',images:item.image?[item.image]:[],createdAt,comments:1,myVote:0,canEdit:user?.id===author.id,canDelete:user?.id===author.id||user?.role==='operator'&&outranks(user.role,author.role),canRequestDelete:user?.role==='deputy'&&outranks(user.role,author.role)};
 })])),[user]);
 const allPosts=Object.values(posts).flat();
 const api=useCallback(async(path,options={})=>{
  if(options.method&&options.method!=='GET')return blocked();
  if(path==='admin/users')return {users:accounts.map(target=>({...target,canApprove:isStaff(user?.role)&&target.role==='apprentice',canExpel:user?.role==='operator'&&outranks(user.role,target.role),canRequestExpel:user?.role==='deputy'&&outranks(user.role,target.role),canChangeRole:user?.role==='operator'&&outranks(user.role,target.role)}))};
  if(path==='admin/approvals')return {requests:approvalList({users:accounts,posts:allPosts,audit:[],requests:[{id:'preview-request-1',type:'post_delete',targetId:'talk-2',targetUserId:'u-user2',targetSnapshot:'오늘의 한 줄: 보급은 사랑입니다.',board:'talk',requestedBy:'u-subadmin',reason:'운영 규칙에 맞는 게시글인지 검토 부탁드립니다. (예시)',status:'pending',createdAt,reviewedAt:null,reviewedBy:null,reviewNote:''},{id:'preview-request-2',type:'user_expel',targetId:'u-user1',targetUserId:'u-user1',targetSnapshot:'헬다이버',requestedBy:'u-subadmin',reason:'회원 이용 상태 검토 부탁드립니다. (예시)',status:'pending',createdAt,reviewedAt:null,reviewedBy:null,reviewNote:''}]},user)};
  if(path.startsWith('posts/')){const post=allPosts.find(item=>item.id===path.split('/')[1]);if(!post)throw Error('게시글을 찾을 수 없습니다.');return {post,comments:[{id:'preview-comment',postId:post.id,author:'헬다이버',authorPhoto:'',own:user?.loginId==='user1',body:'함께 즐길 동료가 있어서 좋네요. 오늘도 안전한 강하 하세요!',createdAt}]};}
  throw Error('화면 확인용 미리보기입니다.');
 },[user,posts]);
 async function login(loginId,password){if(!accounts.some(item=>item.loginId===loginId)||password!=='1234')throw Error('예시 아이디와 비밀번호 1234를 사용해주세요.');chooseAccount(loginId);router.replace('/')}
 async function logout(){chooseAccount(null);router.replace('/login')}
 const value={user,signedIn:Boolean(user),role:user?.role||null,profile:user||{nickname:'',photo:''},posts,stats:{totalMembers:4,onlineMembers:3},ready:true,notify,api,refresh:async()=>{},login,logout,updateProfile:blocked,addPost:blocked,canWriteNotice:isStaff(user?.role),chooseAccount,account};
 return <Context.Provider value={value}>{children}{toast&&<div className="toast" role="status">{toast}</div>}</Context.Provider>;
}
export const useCommunity=()=>useContext(Context);
