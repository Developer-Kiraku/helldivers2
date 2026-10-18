import {Button} from './ui';
import Link from 'next/link';
import Icon from './Icon';
import KakaoSymbol from './KakaoSymbol';

export function KakaoButton({ children, onClick }) {
  return <Button type="button" className="kakao-button" onClick={onClick}><span className="kakao-login-symbol" aria-hidden="true"><KakaoSymbol/></span><span className="kakao-login-label">{children}</span></Button>;
}

export default function AuthLayout({ children, signup = false }) {
  return <div className={`auth-page ${signup ? 'signup-page' : ''}`}>{signup && <Link href="/login" className="back-link"><Icon name="back" size={16} />로그인으로 돌아가기</Link>}<div className="auth-layout"><section className="auth-art"><img src="/images/helldivers-logo.png" alt="HELLDIVERS II" /><div><span className="eyebrow">WELCOME TO THE SQUAD</span><h2>{signup ? <>새로운 동료를<br />기다리고 있었어요.</> : <>혼자 퇴근해도,<br />강하는 함께.</>}</h2><p>{signup ? <>나만의 닉네임으로 합류하고,<br />퇴근 후 함께할 분대를 만나세요.</> : <>레벨도 실력도 상관없어요.<br />오늘의 마지막 작전을 함께할 동료가 기다립니다.</>}</p><small>YOUR SQUAD IS WAITING</small></div></section><section className="auth-card">{children}</section></div></div>;
}
