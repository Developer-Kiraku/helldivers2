import NotificationsPage from '@/components/NotificationsPage';
import { requirePageUser } from '@/lib/server/auth';
export const metadata = { title: '알림함', robots: { index: false, follow: false } };
export default async function Page() {
  await requirePageUser();
  return <NotificationsPage />;
}
