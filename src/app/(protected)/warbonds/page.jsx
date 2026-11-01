import WarbondList from '@/components/WarbondList';
import { warbondListEntries } from '@/lib/warbonds.mjs';

export const metadata = { title: '전쟁 채권 사전' };
export default function Page() {
  return <WarbondList warbonds={warbondListEntries()} />;
}
