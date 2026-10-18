'use client';
import {useState} from 'react';
import {useCommunity} from './CommunityProvider';
import Icon from './Icon';
export default function VoteButtons({postId,likes=0,dislikes=0,myVote=0}){
 const {api,refresh,notify}=useCommunity();const [busy,setBusy]=useState(false);
 async function vote(value){if(!postId)return;setBusy(true);try{await api(`posts/${postId}/vote`,{method:'POST',body:{value:myVote===value?0:value}});await refresh()}catch(error){notify(error.message)}finally{setBusy(false)}}
 return <div className="vote-buttons"><button className={myVote===1?'chosen':''} aria-pressed={myVote===1} disabled={busy} onClick={()=>vote(1)}><Icon name="up" size={16}/>추천 <span>{likes}</span></button><button className={myVote===-1?'chosen':''} aria-pressed={myVote===-1} disabled={busy} onClick={()=>vote(-1)}><Icon name="down" size={16}/>비추천 <span>{dislikes}</span></button></div>;
}
