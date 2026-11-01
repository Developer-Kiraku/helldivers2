import ProfilePage from '@/components/ProfilePage';
import { requirePageUser } from '@/lib/server/auth';
export const metadata = { title: '내 정보 변경' };
export default async function Page() {
  await requirePageUser();
  return <ProfilePage />;
}
