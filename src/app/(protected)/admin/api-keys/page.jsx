import { requirePageUser } from '@/lib/server/auth';
import ApiKeysPage from '@/components/ApiKeysPage';
export const metadata = { title: 'API 키 관리' };
export default async function Page() {
  await requirePageUser(['operator']);
  return <ApiKeysPage />;
}
