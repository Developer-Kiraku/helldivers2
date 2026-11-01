import WarbondList from '@/components/WarbondList';
import { warbondListEntries } from '@/lib/warbonds.mjs';
import { requirePageUser } from '@/lib/server/auth';

export const metadata = { title: '전쟁 채권 사전' };
export default async function Page() {
  await requirePageUser();
  return <WarbondList warbonds={warbondListEntries()} />;
}
