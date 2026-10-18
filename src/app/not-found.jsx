import Link from 'next/link';
export default function NotFound() { return <section className="access-panel"><span className="eyebrow">MISSION NOT FOUND</span><h1>길을 잃으셨나요?</h1><p>요청하신 화면을 찾을 수 없습니다.</p><Link className="button primary" href="/">작전실로 돌아가기</Link></section>; }
