import { requirePageUser } from '@/lib/server/auth';
import RockPaperScissors from '@/components/RockPaperScissors';
export const metadata = { title: '가위바위보' };
export default async function Page() {
  await requirePageUser();
  return <RockPaperScissors />;
}
