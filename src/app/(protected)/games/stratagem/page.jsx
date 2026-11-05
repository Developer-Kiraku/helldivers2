import { requirePageUser } from '@/lib/server/auth';
import StratagemChallenge from '@/components/StratagemChallenge';
export const metadata = { title: '스트라타젬 히어로' };
export default async function Page() {
  await requirePageUser();
  return <StratagemChallenge />;
}
