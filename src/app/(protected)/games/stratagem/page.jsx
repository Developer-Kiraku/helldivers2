import { requirePageUser } from '@/lib/server/auth';
import StratagemChallenge from '@/components/StratagemChallenge';
export const metadata = { title: '스트라타젬 입력 챌린지' };
export default async function Page() {
  await requirePageUser();
  return <StratagemChallenge />;
}
