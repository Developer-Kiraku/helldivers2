import '@radix-ui/themes/styles.css';
import './globals.css';
import './ui.css';
import {UIProvider} from '@/components/ui';
import { CommunityProvider } from '@/components/CommunityProvider';
import Shell from '@/components/Shell';
import { getCurrentUser } from '@/lib/server/auth';

export const metadata = {
  title: { default: '헬다이버즈2 커뮤니티', template: '%s | 헬다이버즈2 커뮤니티' },
  description: '퇴근 후 함께하는 헬다이버즈2 커뮤니티 디자인 마크업',
};

export default async function RootLayout({ children }) {
  const initialUser=await getCurrentUser();
  return <html lang="ko"><body><UIProvider><CommunityProvider initialUser={initialUser}><Shell>{children}</Shell></CommunityProvider></UIProvider></body></html>;
}
