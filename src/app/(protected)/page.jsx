import HomePage from '@/components/HomePage';
import { requirePageUser } from '@/lib/server/auth';
export default async function Page() {
  await requirePageUser();
  return <HomePage />;
}
