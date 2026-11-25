import { requirePageUser } from '@/lib/server/auth';
import RpsHandEnhancement from '@/components/RpsHandEnhancement';
export const metadata = { title: '손 강화' };
export default async function Page() {
  await requirePageUser();
  return <RpsHandEnhancement />;
}
