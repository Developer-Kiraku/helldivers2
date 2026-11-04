import { requirePageUser } from '@/lib/server/auth';
import DiceGame from '@/components/DiceGame';
export const metadata = { title: '민주주의 주사위' };
export default async function Page() {
  await requirePageUser();
  return <DiceGame />;
}
