import MessagesPage from '@/components/MessagesPage';
import { requirePageUser } from '@/lib/server/auth';
export const metadata = { title: '쪽지함', robots: { index: false, follow: false } };
export default async function Page() {
  await requirePageUser();
  return <MessagesPage />;
}
