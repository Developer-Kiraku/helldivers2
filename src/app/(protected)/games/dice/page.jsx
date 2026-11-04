import { requirePageUser } from '@/lib/server/auth';
import DiceGame from '@/components/DiceGame';
export const metadata = { title: '주사위 대결' };
export default async function Page() {
  await requirePageUser();
  return <DiceGame />;
}
