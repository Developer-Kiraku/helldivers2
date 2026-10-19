'use client';
import Link from 'next/link';
import { ArrowLeft, Camera } from 'lucide-react';
import { useCommunity } from './CommunityProvider';
import AccessGate from './AccessGate';
import HelstagramPost from './HelstagramPost';
import './helstagram.css';

export default function HelstagramDetail({ id }) {
  const { posts } = useCommunity();
  const post = posts.helstagram.find(item => item.id === id || item.id === `helstagram-${id}`);
  return <AccessGate><div className="helstagram-page helsta-detail-page"><header className="helsta-detail-heading"><Link href="/boards/helstagram" aria-label="헬스타그램으로 돌아가기"><ArrowLeft size={24}/></Link><Link href="/boards/helstagram">Helstagram<span>.</span></Link><Link href="/boards/helstagram/write" aria-label="사진 올리기"><Camera size={24}/></Link></header>{post ? <HelstagramPost key={post.id} post={post} detail/> : <div className="helsta-empty"><h1>사진을 찾을 수 없습니다.</h1><Link href="/boards/helstagram">피드로 돌아가기</Link></div>}</div></AccessGate>;
}
