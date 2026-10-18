import { communityLinks } from '@/lib/community-links';
import Icon from './Icon';

export function DiscordLink() {
  return <a className="discord-link" href={communityLinks.discord} target="_blank" rel="noopener noreferrer"><Icon name="discord" /><span>DISCORD 참여하기</span><small>퇴근 후, 함께 강하할 동료를 만나세요.</small></a>;
}

export function KakaoChatLink() {
  return <a className="kakao-chat-link" href={communityLinks.kakaoChat} target="_blank" rel="noopener noreferrer"><Icon name="kakao" /><span>카카오톡 오픈채팅</span><small>채팅방에서 편하게 이야기 나눠요.</small></a>;
}

export function MobileCommunityLinks() {
  return <details className="mobile-community"><summary><Icon name="talk" /><span>채팅방</span></summary><div className="mobile-community-popover"><a href={communityLinks.kakaoChat} target="_blank" rel="noopener noreferrer"><Icon name="kakao" size={18} />카카오톡 오픈채팅</a><a href={communityLinks.discord} target="_blank" rel="noopener noreferrer"><Icon name="discord" size={18} />디스코드</a></div></details>;
}
