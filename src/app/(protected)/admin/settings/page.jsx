import { requirePageUser } from '@/lib/server/auth';
import ApiKeysPage from '@/components/ApiKeysPage';
export const metadata = { title: 'SETTING' };
export default async function Page() {
  await requirePageUser(['operator']);
  return <ApiKeysPage />;
}
