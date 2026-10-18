import {Button} from './ui';
import Link from 'next/link';
import Icon from './Icon';

export function KakaoButton({ children, onClick }) {
  return <Button type="button" className="kakao-button" onClick={onClick}><span className="kakao-login-symbol" aria-hidden="true"><svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" focusable="false"><path d="M12 3C6.48 3 2 6.46 2 10.73c0 2.76 1.87 5.18 4.69 6.55l-1.2 4.39a.3.3 0 0 0 .46.33l5.18-3.47.87.03c5.52 0 10-3.46 10-7.73S17.52 3 12 3Z"/></svg></span><span className="kakao-login-label">{children}</span></Button>;
}

export default function AuthLayout({ children, signup = false }) {
  return <div className={`auth-page ${signup ? 'signup-page' : ''}`}>{signup && <Link href="/login" className="back-link"><Icon name="back" size={16} />로그인으로 돌아가기</Link>}<div className="auth-layout"><section className="auth-art"><img src="/images/helldivers-logo.png" alt="HELLDIVERS II" /><div><span className="eyebrow">WELCOME TO THE SQUAD</span><h2>{signup ? <>새로운 동료를<br />기다리고 있었어요.</> : <>혼자 퇴근해도,<br />강하는 함께.</>}</h2><p>{signup ? <>나만의 닉네임으로 합류하고,<br />퇴근 후 함께할 분대를 만나세요.</> : <>레벨도 실력도 상관없어요.<br />오늘의 마지막 작전을 함께할 동료가 기다립니다.</>}</p><small>YOUR SQUAD IS WAITING</small></div></section><section className="auth-card">{children}</section></div></div>;
}
