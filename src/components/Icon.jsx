import { CodeXml, CircleHelp, LayoutDashboard, Megaphone, BookOpenText, Crosshair, MessagesSquare, UserRound, UsersRound, ShieldCheck, LockKeyhole, ArrowRight, ArrowLeft, ThumbsUp, ThumbsDown, Camera, Check, X, Search, Link, Image, Plus, ChartNoAxesColumnIncreasing, Bold, Italic, Underline, List, Share2, LogOut, UserRoundCog, UserRoundX, Send, Save, Trash2, Monitor, Smartphone, ArrowUpRight, ClipboardCheck, PencilLine } from 'lucide-react';
import { SiDiscord, SiKakaotalk, SiYoutube } from '@icons-pack/react-simple-icons';
const icons = { code:CodeXml, question:CircleHelp, home:LayoutDashboard, flag:Megaphone, target:BookOpenText, talk:MessagesSquare, user:UserRound, users:UsersRound, approvals:ClipboardCheck, shield:ShieldCheck, lock:LockKeyhole, arrow:ArrowRight, back:ArrowLeft, up:ThumbsUp, down:ThumbsDown, camera:Camera, check:Check, close:X, search:Search, link:Link, image:Image, plus:Plus, poll:ChartNoAxesColumnIncreasing, bold:Bold, italic:Italic, underline:Underline, list:List, share:Share2, logout:LogOut, settings:UserRoundCog, expel:UserRoundX, send:Send, save:Save, delete:Trash2, desktop:Monitor, mobile:Smartphone, external:ArrowUpRight, edit:PencilLine };
export default function Icon({ name, size=20, className='', ...props }) {
 const Brand=name==='video'?SiYoutube:name==='discord'?SiDiscord:name==='kakao'?SiKakaotalk:null;
 const Glyph=Brand||icons[name]||Crosshair;
 return <Glyph size={size} {...(!Brand&&{strokeWidth:2})} className={('community-icon '+className).trim()} aria-hidden="true" focusable="false" {...props}/>;
}
