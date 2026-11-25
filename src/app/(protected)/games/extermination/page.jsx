import { requirePageUser } from '@/lib/server/auth';
import ExterminationTraining from '@/components/ExterminationTraining';
export const metadata = { title: '슈퍼 지구 소탕 훈련' };
export default async function Page() {
  await requirePageUser();
  return <ExterminationTraining />;
}
